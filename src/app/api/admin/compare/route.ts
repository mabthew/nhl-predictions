import { NextRequest, NextResponse } from "next/server";
import { fetchSchedule, fetchStandings, fetchClubStats, fetchTeamStats } from "@/lib/nhl-api";
import { fetchGameOdds, fetchPlayerProps } from "@/lib/odds-api";
import { fetchInjuries } from "@/lib/injuries";
import { generatePredictions } from "@/lib/predictor";
import { getModelConfig, MODEL_REGISTRY } from "@/lib/model-configs";
import { NHLGame } from "@/lib/types";

export const maxDuration = 300;

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export async function GET(request: NextRequest) {
  // Support single date or date range
  const singleDate = request.nextUrl.searchParams.get("date");
  const startDate = request.nextUrl.searchParams.get("startDate");
  const endDate = request.nextUrl.searchParams.get("endDate");

  let dates: string[];
  if (singleDate) {
    dates = [singleDate];
  } else if (startDate && endDate) {
    dates = getDateRange(startDate, endDate);
    if (dates.length > 30) {
      return NextResponse.json({ error: "Date range limited to 30 days" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Provide date or startDate+endDate" }, { status: 400 });
  }

  const modelIds = (request.nextUrl.searchParams.get("models") ?? "v1,v2").split(",");
  const models = modelIds.map((id) => getModelConfig(id.trim())).filter(Boolean);
  if (models.length === 0) {
    return NextResponse.json(
      { error: "No valid model IDs", available: MODEL_REGISTRY.map((m) => m.id) },
      { status: 400 }
    );
  }

  try {
    const skipOdds = request.nextUrl.searchParams.get("skipOdds") !== "false"; // default: skip

    const [standings, injuries, teamStatsMap, odds, playerProps] = await Promise.all([
      fetchStandings(),
      fetchInjuries(),
      fetchTeamStats(),
      skipOdds ? Promise.resolve([]) : fetchGameOdds(),
      skipOdds ? Promise.resolve([]) : fetchPlayerProps(),
    ]);

    // Fetch schedules for all dates in parallel
    const scheduleResults = await Promise.all(
      dates.map(async (date) => {
        try {
          const games = await fetchSchedule(date);
          const completed = games.filter(
            (g) => g.gameState === "OFF" || g.gameState === "FINAL"
          );
          return { date, games: completed };
        } catch {
          return { date, games: [] as NHLGame[] };
        }
      })
    );

    // Collect all teams and fetch club stats once
    const allTeamAbbrevs = new Set<string>();
    for (const { games } of scheduleResults) {
      for (const game of games) {
        allTeamAbbrevs.add(game.homeTeam.abbrev);
        allTeamAbbrevs.add(game.awayTeam.abbrev);
      }
    }
    const clubStatsEntries = await Promise.all(
      Array.from(allTeamAbbrevs).map(async (abbrev) => {
        const stats = await fetchClubStats(abbrev);
        return [abbrev, stats] as [string, typeof stats];
      })
    );
    const clubStatsMap = new Map(clubStatsEntries);

    // Process each date
    const allGameComparisons: Array<{
      gameId: number;
      date: string;
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      actualWinner: string;
      models: Record<string, {
        predictedWinner: string;
        confidence: number;
        correct: boolean;
        homeComposite: number;
        awayComposite: number;
      }>;
    }> = [];

    const dateBreakdown: Array<{
      date: string;
      games: number;
      models: Record<string, { correct: number; total: number; accuracy: number }>;
    }> = [];

    for (const { date, games } of scheduleResults) {
      if (games.length === 0) continue;

      // Run predictions for each model
      const modelResults = new Map<string, ReturnType<typeof generatePredictions>>();
      for (const model of models) {
        if (!model) continue;
        const predictions = generatePredictions(
          games, standings, clubStatsMap, injuries, odds, playerProps, teamStatsMap,
          undefined, undefined, undefined, undefined, model
        );
        modelResults.set(model.id, predictions);
      }

      // Build game comparisons for this date
      const dayModels: Record<string, { correct: number; total: number }> = {};
      for (const modelId of modelResults.keys()) {
        dayModels[modelId] = { correct: 0, total: 0 };
      }

      for (const game of games) {
        const homeScore = game.homeTeam.score ?? 0;
        const awayScore = game.awayTeam.score ?? 0;
        const actualWinner = homeScore >= awayScore ? "home" : "away";

        const modelData: Record<string, {
          predictedWinner: string;
          confidence: number;
          correct: boolean;
          homeComposite: number;
          awayComposite: number;
        }> = {};

        for (const [modelId, predictions] of modelResults) {
          const pred = predictions.find((p) => p.gameId === game.id);
          if (pred) {
            const correct = pred.predictedWinner === actualWinner;
            modelData[modelId] = {
              predictedWinner: pred.predictedWinner,
              confidence: pred.winnerConfidence,
              correct,
              homeComposite: Math.round(pred.homeTeam.compositeScore * 10) / 10,
              awayComposite: Math.round(pred.awayTeam.compositeScore * 10) / 10,
            };
            dayModels[modelId].total++;
            if (correct) dayModels[modelId].correct++;
          }
        }

        allGameComparisons.push({
          gameId: game.id,
          date,
          home: game.homeTeam.abbrev,
          away: game.awayTeam.abbrev,
          homeScore,
          awayScore,
          actualWinner,
          models: modelData,
        });
      }

      // Per-date breakdown
      const dayModelSummary: Record<string, { correct: number; total: number; accuracy: number }> = {};
      for (const [modelId, stats] of Object.entries(dayModels)) {
        dayModelSummary[modelId] = {
          ...stats,
          accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 1000) / 10 : 0,
        };
      }
      dateBreakdown.push({ date, games: games.length, models: dayModelSummary });
    }

    // Overall summary
    const summary: Record<string, { correct: number; total: number; accuracy: number }> = {};
    for (const model of models) {
      if (!model) continue;
      const results = allGameComparisons.map((g) => g.models[model.id]).filter(Boolean);
      const correct = results.filter((r) => r.correct).length;
      summary[model.id] = {
        correct,
        total: results.length,
        accuracy: results.length > 0 ? Math.round((correct / results.length) * 1000) / 10 : 0,
      };
    }

    return NextResponse.json({
      dateRange: { start: dates[0], end: dates[dates.length - 1] },
      totalGames: allGameComparisons.length,
      games: allGameComparisons,
      summary,
      dateBreakdown,
    });
  } catch (error) {
    console.error("Compare API error:", error);
    return NextResponse.json({ error: "Failed to generate comparison" }, { status: 500 });
  }
}
