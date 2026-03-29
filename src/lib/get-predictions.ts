import { NHLClubStats, NHLGame, NHLTeamSummaryStats, PredictionsResponse } from "./types";
import { fetchUpcomingGames, fetchStandings, fetchClubStats, fetchTeamStats } from "./nhl-api";
import { fetchGameOdds, fetchPlayerProps } from "./odds-api";
import { fetchInjuries } from "./injuries";
import { generatePredictions } from "./predictor";

export async function getPredictions(): Promise<PredictionsResponse | null> {
  try {
    const [upcomingDays, standings, injuries, odds, playerProps, teamStatsMap] =
      await Promise.all([
        fetchUpcomingGames(),
        fetchStandings(),
        fetchInjuries(),
        fetchGameOdds(),
        fetchPlayerProps(),
        fetchTeamStats(),
      ]);

    // Take games from the first two days that have upcoming games
    const daysToShow = upcomingDays.slice(0, 2);
    const finalGames: NHLGame[] = daysToShow.flatMap((d) => d.games);
    const finalDate = daysToShow[0]?.date ?? new Date().toISOString().split("T")[0];

    if (finalGames.length === 0) {
      return {
        date: finalDate,
        generatedAt: new Date().toISOString(),
        predictions: [],
      };
    }

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

    return {
      date: finalDate,
      generatedAt: new Date().toISOString(),
      predictions,
    };
  } catch (error) {
    console.error("Failed to load predictions:", error);
    return null;
  }
}
