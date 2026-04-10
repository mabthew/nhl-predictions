import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { validateDynamicWeights, validateFeedSlugs, validateFeedCosts } from "@/lib/data-feeds";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, description, weights } = body;

    if (!name || !description || !weights) {
      return NextResponse.json(
        { error: "Missing name, description, or weights" },
        { status: 400 }
      );
    }

    // Validate total weights sum (fixed 12 + dynamic)
    const fixedSum = Object.values(weights as Record<string, number>).reduce(
      (a, b) => a + b,
      0
    );
    const dynamicWeights: Record<string, number> = body.dynamicWeights ?? {};
    const dynamicSum = Object.values(dynamicWeights).reduce(
      (a: number, b: number) => a + b,
      0
    );
    const totalSum = fixedSum + dynamicSum;

    if (totalSum < 0.95 || totalSum > 1.05) {
      return NextResponse.json(
        {
          error: `Weights sum to ${totalSum.toFixed(3)} (fixed: ${fixedSum.toFixed(3)}, dynamic: ${dynamicSum.toFixed(3)}), must be between 0.95 and 1.05`,
        },
        { status: 400 }
      );
    }

    // Validate gate/weight consistency for fixed factors
    if (weights.futuresMarket > 0 && !body.enableFutures) {
      return NextResponse.json(
        { error: "enableFutures must be true when futuresMarket weight > 0" },
        { status: 400 }
      );
    }
    if (weights.restFactor > 0 && !body.enableRestFactor) {
      return NextResponse.json(
        { error: "enableRestFactor must be true when restFactor weight > 0" },
        { status: 400 }
      );
    }
    if (weights.playerMomentum > 0 && !body.enablePlayerMomentum) {
      return NextResponse.json(
        {
          error:
            "enablePlayerMomentum must be true when playerMomentum weight > 0",
        },
        { status: 400 }
      );
    }

    // Validate dynamic weights match real DataFeed factorKeys
    if (dynamicSum > 0) {
      const { valid, invalidKeys } = await validateDynamicWeights(dynamicWeights);
      if (!valid) {
        return NextResponse.json(
          { error: `Unknown dynamic weight keys: ${invalidKeys.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate enabled feed slugs exist (unknown = error, inactive = warning)
    const enabledFeeds: string[] = body.enabledFeeds ?? [];
    let feedWarning: string | undefined;
    let inactiveFeedSlugs: string[] = [];
    if (enabledFeeds.length > 0) {
      const { valid, unknownSlugs, inactiveSlugs } = await validateFeedSlugs(enabledFeeds);
      if (!valid) {
        return NextResponse.json(
          { error: `Unknown feeds: ${unknownSlugs.join(", ")}` },
          { status: 400 }
        );
      }
      if (inactiveSlugs.length > 0) {
        inactiveFeedSlugs = inactiveSlugs;
        feedWarning = `Inactive feeds included: ${inactiveSlugs.join(", ")}. Their factors will use neutral scores until activated.`;
      }
    }

    // Cost guard rails
    if (enabledFeeds.length > 0) {
      const costCheck = await validateFeedCosts(enabledFeeds);
      if (!costCheck.ok) {
        return NextResponse.json(
          { error: costCheck.error },
          { status: 400 }
        );
      }
    }

    const config = {
      weights,
      homeIceBonus: body.homeIceBonus ?? 2,
      enableStarPower: body.enableStarPower ?? false,
      enableFutures: body.enableFutures ?? false,
      enableStartingGoalies: body.enableStartingGoalies ?? false,
      enablePlayerMomentum: body.enablePlayerMomentum ?? false,
      enableRestFactor: body.enableRestFactor ?? false,
      confidenceMultiplier: body.confidenceMultiplier ?? 3,
      ...(dynamicSum > 0 && { dynamicWeights }),
      ...(enabledFeeds.length > 0 && { enabledFeeds }),
    };

    const chatId =
      typeof body.chatId === "string" && body.chatId ? body.chatId : undefined;

    const saved = await prisma.customModel.create({
      data: {
        name,
        description,
        config,
        createdBy: session.email,
        chatId,
      },
    });

    return NextResponse.json({
      id: saved.id,
      name: saved.name,
      ...(feedWarning && { warning: feedWarning, inactiveSlugs: inactiveFeedSlugs }),
    });
  } catch (error) {
    console.error("Save model error:", error);
    return NextResponse.json(
      { error: "Failed to save model" },
      { status: 500 }
    );
  }
}
