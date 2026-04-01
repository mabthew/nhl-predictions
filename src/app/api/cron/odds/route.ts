import { NextResponse } from "next/server";
import { fetchGameOdds, fetchPlayerProps, fetchStanleyCupFutures } from "@/lib/odds-api";
import { saveOddsToCache } from "@/lib/odds-cache";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [gameOdds, playerProps, futures] = await Promise.all([
      fetchGameOdds(),
      fetchPlayerProps(),
      fetchStanleyCupFutures(),
    ]);

    await saveOddsToCache(gameOdds, playerProps, futures);

    return NextResponse.json({
      ok: true,
      cached: {
        games: gameOdds.length,
        playerProps: playerProps.length,
        futures: futures.length,
      },
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
