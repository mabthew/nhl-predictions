import { NextRequest, NextResponse } from "next/server";
import {
  fetchSchedule,
  fetchStandings,
  fetchClubStats,
  fetchTeamStats,
  fetchPlayerProfile,
  detectRestInfo,
} from "@/lib/nhl-api";
import { fetchInjuries } from "@/lib/injuries";
import { generatePredictions } from "@/lib/predictor";
import { DEFAULT_MODEL } from "@/lib/model-configs";
import { loadOddsFromCache, loadOddsSnapshot } from "@/lib/odds-cache";
import { fetchLineCombos } from "@/lib/daily-faceoff";
import { loadFeedDataRange, getFeedMetadata } from "@/lib/data-feeds";
import type { ModelConfig, NHLGame, NHLClubStats, PlayerProfile, OddsResponse, FuturesOdds } from "@/lib/types";
import type { TeamLineCombos } from "@/lib/daily-faceoff";
import type { RestInfo } from "@/lib/nhl-api";

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
      dynamicWeights: body.dynamicWeights,
      enabledFeeds: body.enabledFeeds,
    };

    const baseline = DEFAULT_MODEL;

    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000)
      .toISOString()
      .split("T")[0];

    let startDate: string;
    let endDate: string = yesterday;

    if (typeof body.startDate === "string" && typeof body.endDate === "string") {
      startDate = body.startDate;
      endDate = body.endDate;
    } else {
      const days =
        typeof body.days === "number" && body.days > 0 ? body.days : 7;
      const start = new Date(today);
      start.setDate(start.getDate() - days);
      startDate = start.toISOString().split("T")[0];
    }

    const dates = getDateRange(startDate, endDate);

    // Fetch shared data in parallel
    const [standings, injuries, teamStatsMap, oddsCache] = await Promise.all([
      fetchStandings(),
      fetchInjuries(),
      fetchTeamStats(),
      loadOddsFromCache(),
    ]);

    // Build futures map from cache
    const futuresMap = new Map<string, number>();
    for (const f of oddsCache.futures) {
      futuresMap.set(f.team.toLowerCase(), f.impliedProbability);
    }

    // Fetch schedules for all dates
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

    // Collect all teams involved
    const allTeamAbbrevs = new Set<string>();
    for (const { games } of scheduleResults) {
      for (const game of games) {
        allTeamAbbrevs.add(game.homeTeam.abbrev);
        allTeamAbbrevs.add(game.awayTeam.abbrev);
      }
    }

    // Fetch club stats, line combos, and previous-day schedules in parallel
    const teamList = Array.from(allTeamAbbrevs);
    const [clubStatsEntries, lineComboEntries] = await Promise.all([
      Promise.all(
        teamList.map(async (abbrev) => {
          const stats = await fetchClubStats(abbrev);
          return [abbrev, stats] as [string, NHLClubStats | null];
        })
      ),
      Promise.all(
        teamList.map(async (abbrev) => {
          const combos = await fetchLineCombos(abbrev);
          return [abbrev, combos] as [string, TeamLineCombos | null];
        })
      ),
    ]);
    const clubStatsMap = new Map(clubStatsEntries);
    const lineCombosMap = new Map(lineComboEntries);

    // Fetch player profiles for star power (top scorer per team)
    const playerProfileEntries = await Promise.all(
      teamList.map(async (abbrev) => {
        const clubStats = clubStatsMap.get(abbrev);
        if (!clubStats?.skaters?.length) return [abbrev, null] as [string, PlayerProfile | null];
        const topSkater = [...clubStats.skaters].sort((a, b) => b.points - a.points)[0];
        const profile = await fetchPlayerProfile(topSkater.playerId);
        return [abbrev, profile] as [string, PlayerProfile | null];
      })
    );
    const playerProfileMap = new Map(playerProfileEntries);

    // Compute rest maps per date (need previous day's schedule)
    const restMaps = new Map<string, Map<string, RestInfo>>();
    // Build a lookup of which teams played on each date from our schedule data
    const teamsPlayingByDate = new Map<string, Set<string>>();
    for (const { date, games } of scheduleResults) {
      const teams = new Set<string>();
      for (const g of games) {
        teams.add(g.homeTeam.abbrev);
        teams.add(g.awayTeam.abbrev);
      }
      teamsPlayingByDate.set(date, teams);
    }

    // For each date, compute rest from previous day
    await Promise.all(
      dates.map(async (date) => {
        const prevDate = new Date(date + "T12:00:00");
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split("T")[0];

        let prevTeams = teamsPlayingByDate.get(prevDateStr);
        if (!prevTeams) {
          // Fetch previous day's schedule
          prevTeams = new Set<string>();
          try {
            const prevGames = await fetchSchedule(prevDateStr);
            for (const g of prevGames) {
              prevTeams.add(g.homeTeam.abbrev);
              prevTeams.add(g.awayTeam.abbrev);
            }
          } catch {
            // If fetch fails, rest data defaults to well-rested
          }
        }

        const restMap = new Map<string, RestInfo>();
        const dayTeams = teamsPlayingByDate.get(date) ?? new Set();
        for (const abbrev of dayTeams) {
          restMap.set(abbrev, detectRestInfo(prevTeams, abbrev));
        }
        restMaps.set(date, restMap);
      })
    );

    // Load archived odds snapshots per date
    const oddsSnapshots = new Map<string, OddsResponse[]>();
    let oddsDaysAvailable = 0;
    await Promise.all(
      dates.map(async (date) => {
        const snapshot = await loadOddsSnapshot(date);
        if (snapshot) {
          oddsSnapshots.set(date, snapshot.gameOdds);
          oddsDaysAvailable++;
        }
      })
    );

    // Load paid feed data from cache (never live fetch during preview)
    const feedSlugs = proposed.enabledFeeds ?? [];
    const [feedDataByDate, feedMetadataMap] = feedSlugs.length > 0
      ? await Promise.all([
          loadFeedDataRange(feedSlugs, dates),
          getFeedMetadata(feedSlugs),
        ])
      : [new Map(), new Map()] as const;

    let feedDaysAvailable = 0;
    if (feedSlugs.length > 0) {
      for (const date of dates) {
        if (feedDataByDate.has(date)) feedDaysAvailable++;
      }
    }

    // Run predictions
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

      const dateOdds = oddsSnapshots.get(date) ?? [];
      const dateRestMap = restMaps.get(date);

      const dateFeedData = feedDataByDate.get(date);
      const proposedPreds = generatePredictions(
        dayGames, standings, clubStatsMap, injuries, dateOdds, [], teamStatsMap,
        undefined, futuresMap, playerProfileMap, lineCombosMap, proposed, undefined, dateRestMap,
        dateFeedData, feedMetadataMap.size > 0 ? feedMetadataMap : undefined
      );
      const baselinePreds = generatePredictions(
        dayGames, standings, clubStatsMap, injuries, dateOdds, [], teamStatsMap,
        undefined, futuresMap, playerProfileMap, lineCombosMap, baseline, undefined, dateRestMap
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
      startDate,
      endDate,
      totalDays: dates.length,
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
      dataAvailability: {
        futures: futuresMap.size > 0,
        rest: true,
        starPower: playerProfileMap.size > 0,
        playerMomentum: lineCombosMap.size > 0,
        startingGoalies: false,
        odds: oddsDaysAvailable > 0,
        oddsDaysAvailable,
        oddsDaysTotal: dates.length,
        playerProps: false,
        feeds: feedSlugs.length > 0 ? {
          enabled: feedSlugs,
          daysAvailable: feedDaysAvailable,
          daysTotal: dates.length,
        } : undefined,
      },
    });
  } catch (error) {
    console.error("Builder preview error:", error);
    return NextResponse.json(
      { error: "Failed to run preview" },
      { status: 500 }
    );
  }
}
