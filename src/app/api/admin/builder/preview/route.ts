import { NextRequest, NextResponse } from "next/server";
import {
  fetchSchedule,
  fetchStandings,
  fetchClubStats,
  fetchTeamStats,
} from "@/lib/nhl-api";
import { fetchInjuries } from "@/lib/injuries";
import { generatePredictions } from "@/lib/predictor";
import { DEFAULT_MODEL } from "@/lib/model-configs";
import { ModelConfig, NHLGame } from "@/lib/types";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const proposed: ModelConfig = {
      id: "preview",
      name: body.name ?? "Preview Model",
      description: body.description ?? "",
      weights: body.weights,
      homeIceBonus: body.homeIceBonus ?? 2,
      enableStarPower: body.enableStarPower ?? false,
      enableFutures: body.enableFutures ?? false,
      enableStartingGoalies: body.enableStartingGoalies ?? false,
      enablePlayerMomentum: body.enablePlayerMomentum ?? false,
      enableRestFactor: body.enableRestFactor ?? false,
      confidenceMultiplier: body.confidenceMultiplier ?? 3,
    };

    const baseline = DEFAULT_MODEL;

    // Last 7 days of completed games
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dates = getDateRange(
      weekAgo.toISOString().split("T")[0],
      new Date(today.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0]
    );

    const [standings, injuries, teamStatsMap] = await Promise.all([
      fetchStandings(),
      fetchInjuries(),
      fetchTeamStats(),
    ]);

    const scheduleResults = await Promise.all(
      dates.map(async (date) => {
        try {
          const games = await fetchSchedule(date);
          return {
            date,
            games: games.filter(
              (g) => g.gameState === "OFF" || g.gameState === "FINAL"
            ),
          };
        } catch {
          return { date, games: [] as NHLGame[] };
        }
      })
    );

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

    let proposedCorrect = 0;
    let baselineCorrect = 0;
    let totalGames = 0;
    const games: Array<{
      date: string;
      home: string;
      away: string;
      score: string;
      proposedPick: string;
      proposedCorrect: boolean;
      proposedConfidence: number;
      baselinePick: string;
      baselineCorrect: boolean;
      baselineConfidence: number;
    }> = [];

    for (const { date, games: dayGames } of scheduleResults) {
      if (dayGames.length === 0) continue;

      const proposedPreds = generatePredictions(
        dayGames, standings, clubStatsMap, injuries, [], [], teamStatsMap,
        undefined, undefined, undefined, undefined, proposed
      );
      const baselinePreds = generatePredictions(
        dayGames, standings, clubStatsMap, injuries, [], [], teamStatsMap,
        undefined, undefined, undefined, undefined, baseline
      );

      for (const game of dayGames) {
        const homeScore = game.homeTeam.score ?? 0;
        const awayScore = game.awayTeam.score ?? 0;
        const actualWinner = homeScore >= awayScore ? "home" : "away";

        const pp = proposedPreds.find((p) => p.gameId === game.id);
        const bp = baselinePreds.find((p) => p.gameId === game.id);
        if (!pp || !bp) continue;

        const pCorrect = pp.predictedWinner === actualWinner;
        const bCorrect = bp.predictedWinner === actualWinner;
        if (pCorrect) proposedCorrect++;
        if (bCorrect) baselineCorrect++;
        totalGames++;

        games.push({
          date,
          home: game.homeTeam.abbrev,
          away: game.awayTeam.abbrev,
          score: `${awayScore}-${homeScore}`,
          proposedPick: pp.predictedWinner === "home"
            ? game.homeTeam.abbrev
            : game.awayTeam.abbrev,
          proposedCorrect: pCorrect,
          proposedConfidence: pp.winnerConfidence,
          baselinePick: bp.predictedWinner === "home"
            ? game.homeTeam.abbrev
            : game.awayTeam.abbrev,
          baselineCorrect: bCorrect,
          baselineConfidence: bp.winnerConfidence,
        });
      }
    }

    return NextResponse.json({
      totalGames,
      proposed: {
        correct: proposedCorrect,
        total: totalGames,
        accuracy:
          totalGames > 0
            ? Math.round((proposedCorrect / totalGames) * 1000) / 10
            : 0,
      },
      baseline: {
        id: baseline.id,
        name: baseline.name,
        correct: baselineCorrect,
        total: totalGames,
        accuracy:
          totalGames > 0
            ? Math.round((baselineCorrect / totalGames) * 1000) / 10
            : 0,
      },
      games,
    });
  } catch (error) {
    console.error("Builder preview error:", error);
    return NextResponse.json(
      { error: "Failed to run preview" },
      { status: 500 }
    );
  }
}
