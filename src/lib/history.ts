import { NHLClubStats } from "./types";
import { fetchSchedule, fetchStandings, fetchClubStats, fetchTeamStats } from "./nhl-api";
import { fetchGameOdds, fetchPlayerProps } from "./odds-api";
import { fetchInjuries } from "./injuries";
import { generatePredictions } from "./predictor";
import { prisma } from "./db";
import { HISTORY_MODEL } from "./model-configs";

const SEASON_START = "2025-10-04";
const MODEL_VERSION = HISTORY_MODEL.id;
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

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export interface SyncOptions {
  batchSize?: number;
  oldestFirst?: boolean;
  skipOdds?: boolean;
  modelVersion?: string;
  modelConfig?: import("./types").ModelConfig;
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
  const modelVersion = options?.modelVersion ?? MODEL_VERSION;

  const allDates = getDateRange(SEASON_START, getToday());

  const existingRecords = await prisma.predictionRecord.groupBy({
    by: ["gameDate"],
    where: { modelVersion, gameId: { not: 0 } },
  });
  const syncedWithGames = new Set(existingRecords.map((d) => d.gameDate));

  // Re-check recent dates (last 3 days) even if they only have a sentinel,
  // since games may not have been completed when the sentinel was written.
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentCutoff = threeDaysAgo.toISOString().split("T")[0];

  const datesToSync = allDates.filter(
    (d) => !syncedWithGames.has(d) || d >= recentCutoff
  );
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
      // Only sentinel old dates — recent dates will be rechecked
      if (date < recentCutoff) {
        await prisma.predictionRecord.upsert({
          where: { gameId_gameDate_modelVersion: { gameId: 0, gameDate: date, modelVersion } },
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
            modelVersion,
          },
        });
      }
      processedDates.push(date);
      continue;
    }

    // Remove stale sentinel if real games are now available
    await prisma.predictionRecord.deleteMany({
      where: { gameId: 0, gameDate: date, modelVersion },
    });

    try {
      const teamStatsMap = await fetchTeamStats();
      const predictions = generatePredictions(
        completedGames,
        standings,
        clubStatsMap,
        injuries,
        odds,
        playerProps,
        teamStatsMap,
        undefined, // gameDayIndex
        undefined, // futuresMap
        undefined, // playerProfileMap
        undefined, // lineCombosMap
        options?.modelConfig
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
            gameId_gameDate_modelVersion: { gameId: pred.gameId, gameDate: date, modelVersion },
          },
          update: {
            homeScore,
            awayScore,
            actualWinner,
            winnerCorrect: pred.predictedWinner === actualWinner,
            actualTotal,
            ouCorrect:
              (pred.overUnder.prediction === "OVER" &&
                actualTotal > pred.overUnder.line) ||
              (pred.overUnder.prediction === "UNDER" &&
                actualTotal < pred.overUnder.line),
          },
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
            modelVersion,
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
  date: string,
  modelVersion = MODEL_VERSION
): Promise<HistoryDay | null> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameDate: date, gameId: { not: 0 }, modelVersion },
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

export async function getAccuracyTimeline(modelVersion = MODEL_VERSION): Promise<AccuracyPoint[]> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameId: { not: 0 }, modelVersion },
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

  return dailyPoints;
}

export async function getOverallStats(modelVersion = MODEL_VERSION): Promise<{
  totalGames: number;
  winnerPct: number;
  ouPct: number;
  syncedDates: string[];
}> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameId: { not: 0 }, modelVersion },
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

export interface ModelAccuracy {
  modelVersion: string;
  totalGames: number;
  winnerPct: number;
  ouPct: number;
  syncedDates: number;
}

export async function getAccuracyByModel(): Promise<ModelAccuracy[]> {
  const records = await prisma.predictionRecord.findMany({
    where: { gameId: { not: 0 } },
  });

  const grouped = new Map<
    string,
    { total: number; winnerCorrect: number; ouCorrect: number; dates: Set<string> }
  >();

  for (const r of records) {
    const entry = grouped.get(r.modelVersion) ?? {
      total: 0,
      winnerCorrect: 0,
      ouCorrect: 0,
      dates: new Set<string>(),
    };
    entry.total++;
    if (r.winnerCorrect) entry.winnerCorrect++;
    if (r.ouCorrect) entry.ouCorrect++;
    entry.dates.add(r.gameDate);
    grouped.set(r.modelVersion, entry);
  }

  return Array.from(grouped.entries()).map(([version, stats]) => ({
    modelVersion: version,
    totalGames: stats.total,
    winnerPct: stats.total > 0 ? Math.round((stats.winnerCorrect / stats.total) * 100) : 0,
    ouPct: stats.total > 0 ? Math.round((stats.ouCorrect / stats.total) * 100) : 0,
    syncedDates: stats.dates.size,
  }));
}
