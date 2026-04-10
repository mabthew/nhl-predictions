import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getActiveFeeds, DAILY_COST_WARNING, DAILY_COST_HARD_LIMIT, TEAMS_PER_DAY } from "@/lib/data-feeds";
import { getSecret } from "@/lib/secrets";
import { logApiCall } from "@/lib/api-usage";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();

    if (typeof body.active !== "boolean") {
      return NextResponse.json(
        { error: "Request body must include 'active' as a boolean" },
        { status: 400 }
      );
    }

    const active: boolean = body.active;

    // Look up the feed by slug
    const feed = await prisma.dataFeed.findUnique({ where: { slug } });
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Activation-only guard rails
    let warning: string | undefined;

    if (active) {
      // Check API key is available (env var or encrypted DB store)
      if (feed.authEnvVar) {
        const hasKey = process.env[feed.authEnvVar] || await getSecret(feed.authEnvVar);
        if (!hasKey) {
          return NextResponse.json(
            {
              error: "missing_api_key",
              envVarName: feed.authEnvVar,
              provider: feed.provider,
              keySetupUrl: feed.keySetupUrl,
            },
            { status: 400 }
          );
        }
      }

      // Cost guard rail: re-read active feeds from DB to avoid race conditions
      const currentActiveFeeds = await getActiveFeeds();
      const alreadyActive = currentActiveFeeds.some((f) => f.slug === slug);
      const currentDailyCost = currentActiveFeeds.reduce(
        (sum, f) => sum + f.costPerCall * TEAMS_PER_DAY,
        0
      );
      const projectedDailyCost = alreadyActive
        ? currentDailyCost
        : currentDailyCost + feed.costPerCall * TEAMS_PER_DAY;

      if (projectedDailyCost > DAILY_COST_HARD_LIMIT) {
        return NextResponse.json(
          {
            error: `Daily cost $${projectedDailyCost.toFixed(2)} exceeds the $${DAILY_COST_HARD_LIMIT.toFixed(2)} hard limit`,
          },
          { status: 400 }
        );
      }

      if (projectedDailyCost > DAILY_COST_WARNING) {
        warning = `Daily cost $${projectedDailyCost.toFixed(2)} exceeds the $${DAILY_COST_WARNING.toFixed(2)} warning threshold`;
      }
    }

    // Perform the update
    const updated = await prisma.dataFeed.update({
      where: { slug },
      data: { isActive: active },
    });

    // Audit log
    logApiCall("system", "feed-activation", 200, 0, session.email).catch(
      () => {}
    );

    const dailyCost = updated.isActive ? updated.costPerCall * TEAMS_PER_DAY : 0;

    return NextResponse.json({
      slug: updated.slug,
      name: updated.name,
      isActive: updated.isActive,
      ...(warning && { warning }),
      costImpact: {
        dailyCost: Math.round(dailyCost * 100) / 100,
        monthlyCost: Math.round(dailyCost * 30 * 100) / 100,
      },
    });
  } catch (error) {
    console.error("Feed activation error:", error);
    return NextResponse.json(
      { error: "Failed to update feed" },
      { status: 500 }
    );
  }
}
