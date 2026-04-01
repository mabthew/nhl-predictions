import { NextResponse } from "next/server";
import { fetchSchedule, fetchStandings, fetchClubStats, fetchTeamStats } from "@/lib/nhl-api";
import { loadOddsFromCache } from "@/lib/odds-cache";
import { fetchInjuries } from "@/lib/injuries";
import { generatePredictions } from "@/lib/predictor";
import { getTomorrowDate, getTodayDate } from "@/lib/utils";
import { NHLClubStats, PredictionsResponse } from "@/lib/types";

export const revalidate = 3600;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const targetDate = dateParam ?? getTomorrowDate();

  try {
    const [games, standings, injuries, oddsCache, teamStatsMap] = await Promise.all([
      fetchSchedule(targetDate),
      fetchStandings(),
      fetchInjuries(),
      loadOddsFromCache(),
      fetchTeamStats(),
    ]);

    const { gameOdds: odds, playerProps } = oddsCache;

    // If no games for target date and no explicit date param, try today
    let finalGames = games;
    let finalDate = targetDate;

    if (games.length === 0 && !dateParam) {
      const todayGames = await fetchSchedule(getTodayDate());
      if (todayGames.length > 0) {
        finalGames = todayGames;
        finalDate = getTodayDate();
      }
    }

    // Collect unique team abbreviations and fetch club stats in parallel
    const teamAbbrevs = new Set<string>();
    for (const game of finalGames) {
      teamAbbrevs.add(game.homeTeam.abbrev);
      teamAbbrevs.add(game.awayTeam.abbrev);
    }

    const clubStatsEntries = await Promise.all(
      Array.from(teamAbbrevs).map(async (abbrev) => {
        const stats = await fetchClubStats(abbrev);
        return [abbrev, stats] as [string, NHLClubStats | null];
      })
    );
    const clubStatsMap = new Map<string, NHLClubStats | null>(clubStatsEntries);

    const predictions = generatePredictions(
      finalGames,
      standings,
      clubStatsMap,
      injuries,
      odds,
      playerProps,
      teamStatsMap
    );

    const response: PredictionsResponse = {
      date: finalDate,
      generatedAt: new Date().toISOString(),
      predictions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Prediction generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate predictions" },
      { status: 500 }
    );
  }
}
