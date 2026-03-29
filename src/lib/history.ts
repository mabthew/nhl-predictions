import { NHLClubStats } from "./types";
import { fetchSchedule, fetchStandings, fetchClubStats, fetchTeamStats } from "./nhl-api";
import { fetchGameOdds, fetchPlayerProps } from "./odds-api";
import { fetchInjuries } from "./injuries";
import { generatePredictions } from "./predictor";
import { prisma } from "./db";

const SEASON_START = "2025-10-04";
const BATCH_SIZE = 7; // days per batch to avoid timeouts

function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T12:00:00");
  const end = new Date(endDate + "T12:00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export interface SyncOptions {
  batchSize?: number;
  oldestFirst?: boolean;
  skipOdds?: boolean;
}

export interface SyncResult {
  processed: number;
  remaining: number;
  dates: string[];
}

/**
 * Sync history incrementally — processes up to batchSize unsyced dates per call.
 * Returns the number of dates that still need syncing.
 */
export async function syncHistoryBatch(
  options?: SyncOptions
): Promise<SyncResult> {
  const batchSize = options?.batchSize ?? BATCH_SIZE;
  const oldestFirst = options?.oldestFirst ?? false;

  const allDates = getDateRange(SEASON_START, getYesterday());

  const existingDates = await prisma.predictionRecord.groupBy({
    by: ["gameDate"],
  });
  const syncedDates = new Set(existingDates.map((d) => d.gameDate));

  const datesToSync = allDates.filter((d) => !syncedDates.has(d));
  if (datesToSync.length === 0)
    return { processed: 0, remaining: 0, dates: [] };

  const batch = oldestFirst
    ? datesToSync.slice(0, batchSize)
    : datesToSync.slice(-batchSize);

  // Skip odds for old dates — they return current odds which won't match historical games
  const newestBatchDate = batch[batch.length - 1];
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const shouldSkipOdds =
    options?.skipOdds ?? new Date(newestBatchDate + "T12:00:00") < twoDaysAgo;

  const [standings, injuries, odds, playerProps] = await Promise.all([
    fetchStandings(),
    fetchInjuries(),
    shouldSkipOdds ? Promise.resolve([]) : fetchGameOdds(),
    shouldSkipOdds ? Promise.resolve([]) : fetchPlayerProps(),
  ]);

  // Fetch all schedules in parallel
  const scheduleResults = await Promise.all(
    batch.map(async (date) => {
      try {
        const games = await fetchSchedule(date);
        const completedGames = games.filter(
          (g) => g.gameState === "OFF" || g.gameState === "FINAL"
        );
        return { date, completedGames };
      } catch {
        console.error(`Failed to fetch schedule for ${date}`);
        return { date, completedGames: [] };
      }
    })
  );

  // Collect all unique teams across the batch and fetch stats once
  const allTeamAbbrevs = new Set<string>();
  for (const { completedGames } of scheduleResults) {
    for (const game of completedGames) {
      allTeamAbbrevs.add(game.homeTeam.abbrev);
      allTeamAbbrevs.add(game.awayTeam.abbrev);
    }
  }

  const clubStatsEntries = await Promise.all(
    Array.from(allTeamAbbrevs).map(async (abbrev) => {
      const stats = await fetchClubStats(abbrev);
      return [abbrev, stats] as [string, NHLClubStats | null];
    })
  );
  const clubStatsMap = new Map(clubStatsEntries);

  const processedDates: string[] = [];

  for (const { date, completedGames } of scheduleResults) {
    if (completedGames.length === 0) {
      // Insert a sentinel so this date is not retried
      await prisma.predictionRecord.upsert({
        where: { gameId_gameDate: { gameId: 0, gameDate: date } },
        update: {},
        create: {
          gameId: 0,
          gameDate: date,
          homeAbbrev: "",
          homeName: "",
          homeLogo: "",
          homeScore: 0,
          awayAbbrev: "",
          awayName: "",
          awayLogo: "",
          awayScore: 0,
          predictedWinner: "home",
          actualWinner: "home",
          winnerCorrect: false,
          winnerConfidence: 0,
          ouLine: 0,
          ouPrediction: "UNDER",
          actualTotal: 0,
          ouCorrect: false,
        },
      });
      processedDates.push(date);
      continue;
    }

    try {
      const teamStatsMap = await fetchTeamStats();
      const predictions = generatePredictions(
        completedGames,
        standings,
        clubStatsMap,
        injuries,
        odds,
        playerProps,
        teamStatsMap
      );

      for (const pred of predictions) {
        const gameData = completedGames.find((g) => g.id === pred.gameId);
        if (!gameData) continue;

        const homeScore = gameData.homeTeam.score ?? 0;
        const awayScore = gameData.awayTeam.score ?? 0;
        const actualWinner: "home" | "away" =
          homeScore >= awayScore ? "home" : "away";
        const actualTotal = homeScore + awayScore;

        await prisma.predictionRecord.upsert({
          where: {
            gameId_gameDate: { gameId: pred.gameId, gameDate: date },
          },
          update: {},
          create: {
            gameId: pred.gameId,
            gameDate: date,
            homeAbbrev: pred.homeTeam.teamAbbrev,
            homeName: pred.homeTeam.teamName,
            homeLogo: pred.homeTeam.teamLogo,
            homeScore,
            awayAbbrev: pred.awayTeam.teamAbbrev,
            awayName: pred.awayTeam.teamName,
            awayLogo: pred.awayTeam.teamLogo,
            awayScore,
            predictedWinner: pred.predictedWinner,
            actualWinner,
            winnerCorrect: pred.predictedWinner === actualWinner,
            winnerConfidence: pred.winnerConfidence,
            ouLine: pred.overUnder.line,
            ouPrediction: pred.overUnder.prediction,
            actualTotal,
            ouProjectedTotal: pred.overUnder.projectedTotal,
            ouCorrect:
              (pred.overUnder.prediction === "OVER" &&
                actualTotal > pred.overUnder.line) ||
              (pred.overUnder.prediction === "UNDER" &&
                actualTotal < pred.overUnder.line),
            keyFactor: pred.keyFactors[0] ?? null,
            propPlayer: pred.playerProp?.playerName ?? null,
            propMarket: pred.playerProp?.market ?? null,
            propLine: pred.playerProp?.line ?? null,
            propPick: pred.playerProp?.recommendation ?? null,
            homeGoalsPerGame: pred.homeTeam.goalsForPerGame,
            awayGoalsPerGame: pred.awayTeam.goalsForPerGame,
          },
        });
      }

      processedDates.push(date);
    } catch (error) {
      console.error(`Failed to sync history for ${date}:`, error);
    }
  }

  return {
    processed: processedDates.length,
    remaining: datesToSync.length - batch.length,
    dates: processedDates,
  };
}

// ── Query functions ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRecord(g: any): HistoryGame {
  return {
    gameId: g.gameId,
    homeAbbrev: g.homeAbbrev,
    homeName: g.homeName,
    homeLogo: g.homeLogo,
    homeScore: g.homeScore,
    awayAbbrev: g.awayAbbrev,
    awayName: g.awayName,
    awayLogo: g.awayLogo,
    awayScore: g.awayScore,
    predictedWinner: g.predictedWinner,
    actualWinner: g.actualWinner,
    winnerCorrect: g.winnerCorrect,
    winnerConfidence: g.winnerConfidence,
    ouLine: g.ouLine,
    ouPrediction: g.ouPrediction,
    ouProjectedTotal: g.ouProjectedTotal ?? null,
    actualTotal: g.actualTotal,
    ouCorrect: g.ouCorrect,
    keyFactor: g.keyFactor ?? null,
    propPlayer: g.propPlayer ?? null,
    propMarket: g.propMarket ?? null,
    propLine: g.propLine ?? null,
    propPick: g.propPick ?? null,
    homeGoalsPerGame: g.homeGoalsPerGame ?? null,
    awayGoalsPerGame: g.awayGoalsPerGame ?? null,
  };
}

export interface HistoryGame {
  gameId: number;
  homeAbbrev: string;
  homeName: string;
  homeLogo: string;
  homeScore: number;
  awayAbbrev: string;
  awayName: string;
  awayLogo: string;
  awayScore: number;
  predictedWinner: string;
  actualWinner: string;
  winnerCorrect: boolean;
  winnerConfidence: number;
  ouLine: number;
  ouPrediction: string;
  ouProjectedTotal: number | null;
  actualTotal: number;
  ouCorrect: boolean;
  keyFactor: string | null;
  propPlayer: string | null;
  propMarket: string | null;
  propLine: number | null;
  propPick: string | null;
  homeGoalsPerGame: number | null;
  awayGoalsPerGame: number | null;
}

export interface HistoryDay {
  date: string;
  games: HistoryGame[];
  winnerAccuracy: number;
  ouAccuracy: number;
}

export async function getHistoryForDate(
  date: string
): Promise<HistoryDay | null> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameDate: date, gameId: { not: 0 } },
  });
  if (records.length === 0) return null;

  const winnerCorrectCount = records.filter((g) => g.winnerCorrect).length;
  const ouCorrectCount = records.filter((g) => g.ouCorrect).length;

  return {
    date,
    games: records.map(mapRecord),
    winnerAccuracy: Math.round((winnerCorrectCount / records.length) * 100),
    ouAccuracy: Math.round((ouCorrectCount / records.length) * 100),
  };
}

export interface AccuracyPoint {
  date: string;
  winnerPct: number;
  ouPct: number;
  games: number;
}

export async function getAccuracyTimeline(): Promise<AccuracyPoint[]> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameId: { not: 0 } },
    orderBy: { gameDate: "asc" },
  });

  const grouped = new Map<
    string,
    { total: number; winnerCorrect: number; ouCorrect: number }
  >();
  for (const r of records) {
    const entry = grouped.get(r.gameDate) ?? {
      total: 0,
      winnerCorrect: 0,
      ouCorrect: 0,
    };
    entry.total++;
    if (r.winnerCorrect) entry.winnerCorrect++;
    if (r.ouCorrect) entry.ouCorrect++;
    grouped.set(r.gameDate, entry);
  }

  // 7-day rolling average
  const dailyPoints = Array.from(grouped.entries()).map(([date, stats]) => ({
    date,
    winnerPct: Math.round((stats.winnerCorrect / stats.total) * 100),
    ouPct: Math.round((stats.ouCorrect / stats.total) * 100),
    games: stats.total,
  }));

  if (dailyPoints.length <= 7) return dailyPoints;

  const rolling: AccuracyPoint[] = [];
  for (let i = 6; i < dailyPoints.length; i++) {
    const window = dailyPoints.slice(i - 6, i + 1);
    const totalGames = window.reduce((s, p) => s + p.games, 0);
    const totalWinnerCorrect = window.reduce(
      (s, p) => s + Math.round((p.winnerPct / 100) * p.games),
      0
    );
    const totalOuCorrect = window.reduce(
      (s, p) => s + Math.round((p.ouPct / 100) * p.games),
      0
    );
    rolling.push({
      date: dailyPoints[i].date,
      winnerPct: totalGames > 0 ? Math.round((totalWinnerCorrect / totalGames) * 100) : 50,
      ouPct: totalGames > 0 ? Math.round((totalOuCorrect / totalGames) * 100) : 50,
      games: dailyPoints[i].games,
    });
  }

  return rolling;
}

export async function getOverallStats(): Promise<{
  totalGames: number;
  winnerPct: number;
  ouPct: number;
  syncedDates: string[];
}> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameId: { not: 0 } },
  });
  const totalGames = records.length;
  const winnerCorrect = records.filter((r) => r.winnerCorrect).length;
  const ouCorrect = records.filter((r) => r.ouCorrect).length;

  const dates = [...new Set(records.map((r) => r.gameDate))];

  return {
    totalGames,
    winnerPct: totalGames > 0 ? Math.round((winnerCorrect / totalGames) * 100) : 0,
    ouPct: totalGames > 0 ? Math.round((ouCorrect / totalGames) * 100) : 0,
    syncedDates: dates,
  };
}
