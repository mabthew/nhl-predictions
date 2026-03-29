import { NHLClubStats, NHLGame, NHLTeamSummaryStats, PredictionsResponse, ForecastTier, GameStatus, LiveGameScore, FuturesOdds, PlayerProfile } from "./types";
import { fetchUpcomingGames, fetchStandings, fetchClubStats, fetchTeamStats, fetchLiveScores, fetchPlayerProfile } from "./nhl-api";
import { fetchGameOdds, fetchPlayerProps, fetchStanleyCupFutures } from "./odds-api";
import { fetchInjuries } from "./injuries";
import { generatePredictions } from "./predictor";
import { fetchLineCombos, TeamLineCombos } from "./daily-faceoff";

function getForecastTier(dayIndex: number): ForecastTier {
  if (dayIndex <= 1) return "full";
  if (dayIndex <= 3) return "early";
  return "preliminary";
}

export async function getPredictions(): Promise<PredictionsResponse | null> {
  try {
    const [upcomingDays, standings, injuries, odds, playerProps, teamStatsMap, liveScores, futures] =
      await Promise.all([
        fetchUpcomingGames(),
        fetchStandings(),
        fetchInjuries(),
        fetchGameOdds(),
        fetchPlayerProps(),
        fetchTeamStats(),
        fetchLiveScores(),
        fetchStanleyCupFutures(),
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

    const [clubStatsEntries, lineComboEntries] = await Promise.all([
      Promise.all(
        Array.from(teamAbbrevs).map(async (abbrev) => {
          const stats = await fetchClubStats(abbrev);
          return [abbrev, stats] as [string, NHLClubStats | null];
        })
      ),
      Promise.all(
        Array.from(teamAbbrevs).map(async (abbrev) => {
          const combos = await fetchLineCombos(abbrev);
          return [abbrev, combos] as [string, TeamLineCombos | null];
        })
      ),
    ]);
    const clubStatsMap = new Map<string, NHLClubStats | null>(clubStatsEntries);
    const lineCombosMap = new Map<string, TeamLineCombos | null>(lineComboEntries);

    // Build futures map: team name -> implied probability
    const futuresMap = new Map<string, number>();
    for (const f of futures) {
      futuresMap.set(f.team.toLowerCase(), f.impliedProbability);
    }

    // Fetch player profiles for star power calculation (top player per team)
    const playerProfileEntries = await Promise.all(
      Array.from(teamAbbrevs).map(async (abbrev) => {
        const clubStats = clubStatsMap.get(abbrev);
        if (!clubStats?.skaters?.length) return [abbrev, null] as [string, PlayerProfile | null];
        const topSkater = [...clubStats.skaters].sort((a, b) => b.points - a.points)[0];
        const profile = await fetchPlayerProfile(topSkater.playerId);
        return [abbrev, profile] as [string, PlayerProfile | null];
      })
    );
    const playerProfileMap = new Map<string, PlayerProfile | null>(playerProfileEntries);

    const predictions = generatePredictions(
      finalGames,
      standings,
      clubStatsMap,
      injuries,
      odds,
      playerProps,
      teamStatsMap,
      gameDayIndex,
      futuresMap,
      playerProfileMap,
      lineCombosMap
    );

    // Enrich each prediction with forecast tier, data availability, and live status
    for (const pred of predictions) {
      const dayIdx = gameDayIndex.get(pred.gameId) ?? 0;
      pred.dayIndex = dayIdx;
      pred.forecastTier = getForecastTier(dayIdx);
      pred.dataAvailability = {
        hasOdds: pred.overUnder.line !== 5.5 || pred.overUnder.justification !== "Insufficient data — using league averages",
        hasPlayerProps: pred.playerProp !== null,
      };

      // Determine game status from live scores
      const live = liveScores.get(pred.gameId);
      if (live) {
        pred.gameStatus = "live";
        pred.liveScore = {
          homeScore: live.homeScore,
          awayScore: live.awayScore,
          period: live.period,
          periodLabel: live.periodLabel,
          timeRemaining: live.timeRemaining,
          homeSog: live.homeSog,
          awaySog: live.awaySog,
        };
      } else {
        pred.gameStatus = "upcoming";
      }
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
