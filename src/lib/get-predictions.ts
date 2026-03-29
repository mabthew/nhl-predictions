import { NHLClubStats, NHLGame, NHLTeamSummaryStats, PredictionsResponse, ForecastTier } from "./types";
import { fetchUpcomingGames, fetchStandings, fetchClubStats, fetchTeamStats } from "./nhl-api";
import { fetchGameOdds, fetchPlayerProps } from "./odds-api";
import { fetchInjuries } from "./injuries";
import { generatePredictions } from "./predictor";

function getForecastTier(dayIndex: number): ForecastTier {
  if (dayIndex <= 1) return "full";
  if (dayIndex <= 3) return "early";
  return "preliminary";
}

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

    // Show the full week of upcoming games (up to 7 days)
    const finalGames: NHLGame[] = upcomingDays.flatMap((d) => d.games);
    const finalDate = upcomingDays[0]?.date ?? new Date().toISOString().split("T")[0];

    // Build a map of gameId -> dayIndex for confidence degradation
    const gameDayIndex = new Map<number, number>();
    for (let i = 0; i < upcomingDays.length; i++) {
      for (const game of upcomingDays[i].games) {
        gameDayIndex.set(game.id, i);
      }
    }

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
      teamStatsMap,
      gameDayIndex
    );

    // Enrich each prediction with forecast tier and data availability
    for (const pred of predictions) {
      const dayIdx = gameDayIndex.get(pred.gameId) ?? 0;
      pred.dayIndex = dayIdx;
      pred.forecastTier = getForecastTier(dayIdx);
      pred.dataAvailability = {
        hasOdds: pred.overUnder.line !== 5.5 || pred.overUnder.justification !== "Insufficient data — using league averages",
        hasPlayerProps: pred.playerProp !== null,
      };
    }

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
