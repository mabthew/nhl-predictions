import { NextResponse } from "next/server";
import { getActiveFeeds, fetchAndCacheFeedData } from "@/lib/data-feeds";
import { TEAM_NAMES } from "@/lib/injuries";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const feeds = await getActiveFeeds();

    if (feeds.length === 0) {
      return NextResponse.json({ ok: true, message: "No active feeds", results: [] });
    }

    const teamAbbrevs = Object.keys(TEAM_NAMES);
    const today = new Date().toISOString().split("T")[0];

    const results = await Promise.all(
      feeds.map(async (feed) => {
        const result = await fetchAndCacheFeedData(
          {
            slug: feed.slug,
            provider: feed.provider,
            endpoint: feed.endpoint,
            authEnvVar: feed.authEnvVar,
            costPerCall: feed.costPerCall,
            cacheDurationS: feed.cacheDurationS,
          },
          teamAbbrevs,
          today
        );
        return { slug: feed.slug, ...result };
      })
    );

    return NextResponse.json({
      ok: true,
      date: today,
      results,
    });
  } catch (error) {
    console.error("Feed cron error:", error);
    return NextResponse.json(
      { error: "Feed data fetch failed" },
      { status: 500 }
    );
  }
}
