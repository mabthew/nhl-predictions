import { NHLClubStats, NHLGame, PredictionsResponse } from "./types";
import { getTomorrowDate, getTodayDate } from "./utils";
import { fetchSchedule, fetchStandings, fetchClubStats } from "./nhl-api";
import { fetchGameOdds, fetchPlayerProps } from "./odds-api";
import { fetchInjuries } from "./injuries";
import { generatePredictions } from "./predictor";

export async function getPredictions(): Promise<PredictionsResponse | null> {
  try {
    const today = getTodayDate();
    const tomorrow = getTomorrowDate();

    const [todayGames, tomorrowGames, standings, injuries, odds, playerProps] =
      await Promise.all([
        fetchSchedule(today),
        fetchSchedule(tomorrow),
        fetchStandings(),
        fetchInjuries(),
        fetchGameOdds(),
        fetchPlayerProps(),
      ]);

    // Filter today's games to only those that haven't started yet
    const now = new Date();
    const upcomingToday = todayGames.filter(
      (g) => new Date(g.startTimeUTC) > now
    );

    // Combine: today's upcoming games + all tomorrow's games
    let finalGames: NHLGame[] = [...upcomingToday, ...tomorrowGames];
    let finalDate = upcomingToday.length > 0 ? today : tomorrow;

    // If nothing upcoming, fall back to all of today's games (even started ones)
    if (finalGames.length === 0 && todayGames.length > 0) {
      finalGames = todayGames;
      finalDate = today;
    }

    if (finalGames.length === 0) {
      return {
        date: tomorrow,
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
      playerProps
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
