import { NextResponse } from "next/server";
import { fetchGameOdds, fetchPlayerProps, fetchStanleyCupFutures } from "@/lib/odds-api";
import { saveOddsToCache, saveGameOddsToCache, saveOddsSnapshot } from "@/lib/odds-cache";

// Runs hourly. Game odds fetch every run (cheap, user-facing freshness).
// Props + futures only run once per day at 14:00 UTC to conserve API credits.
const FULL_REFRESH_HOUR_UTC = 14;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isFullRefresh = new Date().getUTCHours() === FULL_REFRESH_HOUR_UTC;

  try {
    if (isFullRefresh) {
      const [gameOdds, playerProps, futures] = await Promise.all([
        fetchGameOdds(),
        fetchPlayerProps(),
        fetchStanleyCupFutures(),
      ]);

      await saveOddsToCache(gameOdds, playerProps, futures);

      const today = new Date().toISOString().split("T")[0];
      await saveOddsSnapshot(today, gameOdds, futures);

      return NextResponse.json({
        ok: true,
        mode: "full",
        cached: {
          games: gameOdds.length,
          playerProps: playerProps.length,
          futures: futures.length,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    const gameOdds = await fetchGameOdds();
    await saveGameOddsToCache(gameOdds);

    return NextResponse.json({
      ok: true,
      mode: "games-only",
      cached: { games: gameOdds.length },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Odds cron failed:", error);
    return NextResponse.json(
      { error: "Failed to refresh odds cache" },
      { status: 500 }
    );
  }
}
