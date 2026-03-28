import {
  GamePrediction,
  NHLGame,
  NHLStandingsTeam,
  NHLClubStats,
  OverUnderPrediction,
  TeamMetrics,
  InjuryReport,
  OddsResponse,
} from "./types";
import { buildTeamMetrics } from "./nhl-api";
import {
  getConsensusTotal,
  findBestPlayerProp,
} from "./odds-api";
import { getTeamInjuries, TEAM_NAMES } from "./injuries";
import { clamp, normalize } from "./utils";

const WEIGHTS = {
  timeOnAttack: 0.25,
  shotsOnGoal: 0.22,
  offensiveFaceoffPct: 0.18,
  irImpact: 0.15,
  powerPlayPct: 0.12,
  recentForm: 0.08,
};

const HOME_ICE_BONUS = 3;

export function generatePredictions(
  games: NHLGame[],
  standings: NHLStandingsTeam[],
  clubStatsMap: Map<string, NHLClubStats | null>,
  injuries: InjuryReport[],
  odds: OddsResponse[],
  playerProps: OddsResponse[]
): GamePrediction[] {
  const teamMetricsMap = new Map<string, TeamMetrics>();

  for (const game of games) {
    for (const teamInfo of [game.homeTeam, game.awayTeam]) {
      const abbrev = teamInfo.abbrev;
      if (teamMetricsMap.has(abbrev)) continue;

      const standing = standings.find(
        (s) => s.teamAbbrev.default === abbrev
      );
      if (!standing) continue;

      const teamFullName = TEAM_NAMES[abbrev] ?? standing.teamName.default;
      const teamInjuries = getTeamInjuries(injuries, teamFullName);
      const clubStats = clubStatsMap.get(abbrev) ?? null;
      const metrics = buildTeamMetrics(standing, clubStats, teamInjuries);
      teamMetricsMap.set(abbrev, metrics);
    }
  }

  // Normalize metrics across all teams in today's slate
  const allMetrics = Array.from(teamMetricsMap.values());
  if (allMetrics.length > 0) {
    normalizeAllMetrics(allMetrics);
  }

  return games.map((game) => {
    const homeMetrics = teamMetricsMap.get(game.homeTeam.abbrev);
    const awayMetrics = teamMetricsMap.get(game.awayTeam.abbrev);

    if (!homeMetrics || !awayMetrics) {
      return createFallbackPrediction(game);
    }

    homeMetrics.compositeScore = calculateComposite(homeMetrics);
    awayMetrics.compositeScore = calculateComposite(awayMetrics);

    const delta =
      homeMetrics.compositeScore + HOME_ICE_BONUS - awayMetrics.compositeScore;
    const predictedWinner: "home" | "away" = delta >= 0 ? "home" : "away";
    const winnerConfidence = clamp(50 + Math.abs(delta) * 2.5, 50, 95);

    const homeName = `${game.homeTeam.placeName.default} ${game.homeTeam.commonName.default}`;
    const awayName = `${game.awayTeam.placeName.default} ${game.awayTeam.commonName.default}`;

    const overUnder = predictOverUnder(
      homeMetrics,
      awayMetrics,
      odds,
      homeName,
      awayName
    );

    const playerProp = findBestPlayerProp(playerProps, homeName, awayName);

    const keyFactors = generateKeyFactors(
      homeMetrics,
      awayMetrics,
      predictedWinner,
      Math.round(winnerConfidence)
    );

    return {
      gameId: game.id,
      gameDate: game.gameDate ?? "",
      startTime: game.startTimeUTC,
      venue: game.venue.default,
      homeTeam: homeMetrics,
      awayTeam: awayMetrics,
      predictedWinner,
      winnerConfidence: Math.round(winnerConfidence),
      overUnder,
      playerProp,
      keyFactors,
    };
  });
}

function calculateComposite(metrics: TeamMetrics): number {
  return (
    metrics.timeOnAttack * WEIGHTS.timeOnAttack +
    metrics.shotsOnGoal * WEIGHTS.shotsOnGoal +
    metrics.offensiveFaceoffPct * WEIGHTS.offensiveFaceoffPct +
    metrics.irImpact * WEIGHTS.irImpact +
    metrics.powerPlayPct * WEIGHTS.powerPlayPct +
    metrics.recentForm * WEIGHTS.recentForm
  );
}

function normalizeAllMetrics(allMetrics: TeamMetrics[]) {
  const fields: (keyof TeamMetrics)[] = [
    "timeOnAttack",
    "shotsOnGoal",
    "offensiveFaceoffPct",
    "powerPlayPct",
    "recentForm",
  ];

  for (const field of fields) {
    const values = allMetrics.map((m) => m[field] as number);
    const min = Math.min(...values);
    const max = Math.max(...values);

    for (const m of allMetrics) {
      (m[field] as number) = normalize(m[field] as number, min, max);
    }
  }
}

function predictOverUnder(
  home: TeamMetrics,
  away: TeamMetrics,
  odds: OddsResponse[],
  homeName: string,
  awayName: string
): OverUnderPrediction {
  const consensusLine = getConsensusTotal(odds, homeName, awayName);
  const line = consensusLine ? Math.round(consensusLine * 2) / 2 : 5.5;

  const projectedTotal =
    (home.goalsForPerGame +
      away.goalsForPerGame +
      home.goalsAgainstPerGame +
      away.goalsAgainstPerGame) /
    2;

  const diff = projectedTotal - line;
  const prediction: "OVER" | "UNDER" = diff > 0 ? "OVER" : "UNDER";
  const confidence = clamp(50 + Math.abs(diff) * 15, 50, 90);

  const factors: string[] = [];

  if (home.shotsOnGoal > 60 || away.shotsOnGoal > 60) {
    factors.push("High shot volume suggests an up-tempo game");
  }
  if (home.powerPlayPct > 60 || away.powerPlayPct > 60) {
    factors.push("Strong power play conversion could boost scoring");
  }
  if (home.goalsForPerGame + away.goalsForPerGame > 6.5) {
    factors.push("Both teams averaging high goals per game");
  }
  if (home.goalsAgainstPerGame + away.goalsAgainstPerGame < 5) {
    factors.push("Strong defensive teams could keep scoring low");
  }
  if (home.timeOnAttack > 60 && away.timeOnAttack > 60) {
    factors.push("Both teams with high offensive zone time");
  }

  if (factors.length === 0) {
    factors.push(
      `Projected total of ${projectedTotal.toFixed(1)} goals based on season averages`
    );
  }

  return {
    line,
    prediction,
    projectedTotal: Math.round(projectedTotal * 10) / 10,
    confidence: Math.round(confidence),
    justification: `Projected ${projectedTotal.toFixed(1)} total goals vs. line of ${line}. ${factors[0]}.`,
    factors,
  };
}

function generateKeyFactors(
  home: TeamMetrics,
  away: TeamMetrics,
  winner: "home" | "away",
  winnerConfidence: number = 60
): string[] {
  const factors: string[] = [];
  const w = winner === "home" ? home : away;
  const l = winner === "home" ? away : home;

  // Scoring output
  if (w.goalsForPerGame > l.goalsForPerGame + 0.3) {
    factors.push(
      `${w.teamAbbrev} averages ${w.goalsForPerGame.toFixed(1)} goals/game vs ${l.teamAbbrev}'s ${l.goalsForPerGame.toFixed(1)}`
    );
  }

  // Defensive strength
  if (w.goalsAgainstPerGame < l.goalsAgainstPerGame - 0.3) {
    factors.push(
      `${w.teamAbbrev} allows just ${w.goalsAgainstPerGame.toFixed(1)} goals/game, tighter defensively than ${l.teamAbbrev} (${l.goalsAgainstPerGame.toFixed(1)})`
    );
  }

  // Shot volume
  if (w.shotsOnGoal > l.shotsOnGoal + 5) {
    factors.push(
      `${w.teamAbbrev} out-shoots opponents with ${w.shotsOnGoal.toFixed(0)} shots/game vs ${l.shotsOnGoal.toFixed(0)}`
    );
  }

  // Faceoffs
  if (w.offensiveFaceoffPct > l.offensiveFaceoffPct + 5) {
    factors.push(
      `${w.teamAbbrev} controls possession with a ${w.offensiveFaceoffPct.toFixed(0)}% offensive faceoff rate vs ${l.offensiveFaceoffPct.toFixed(0)}%`
    );
  }

  // Time on attack
  if (w.timeOnAttack > l.timeOnAttack + 5) {
    factors.push(
      `${w.teamAbbrev} spends more time in the offensive zone (${w.timeOnAttack.toFixed(0)} vs ${l.timeOnAttack.toFixed(0)} attack rating)`
    );
  }

  // Power play
  if (w.powerPlayPct > l.powerPlayPct + 5) {
    factors.push(
      `${w.teamAbbrev}'s power play converts at ${w.powerPlayPct.toFixed(0)}%, compared to ${l.teamAbbrev}'s ${l.powerPlayPct.toFixed(0)}%`
    );
  }

  // Injuries
  if (l.irImpact < 80) {
    const injuryCount = Math.round((100 - l.irImpact) / 8);
    factors.push(
      `${l.teamAbbrev} weakened with ~${injuryCount} key players on injured reserve`
    );
  }

  // Recent form — winner hot
  if (w.recentForm > l.recentForm + 10) {
    factors.push(
      `${w.teamAbbrev} in strong form, going ${w.l10Record ?? "?"} over their last 10 games vs ${l.teamAbbrev}'s ${l.l10Record ?? "?"}`
    );
  }

  // Recent form — loser cold
  if (l.recentForm < 30 && w.recentForm >= l.recentForm + 10) {
    factors.push(
      `${l.teamAbbrev} struggling, going ${l.l10Record ?? "?"} over their last 10 games`
    );
  }

  // Loser defensive weakness
  if (l.goalsAgainstPerGame > w.goalsAgainstPerGame + 0.5) {
    factors.push(
      `${l.teamAbbrev} leaking goals at ${l.goalsAgainstPerGame.toFixed(1)}/game, a defensive liability`
    );
  }

  // Loser weak power play
  if (l.powerPlayPct < 15 && w.powerPlayPct > l.powerPlayPct + 5) {
    factors.push(
      `${l.teamAbbrev}'s power play converting at just ${l.powerPlayPct.toFixed(0)}%, struggling to capitalize`
    );
  }

  // Home ice
  if (winner === "home") {
    factors.push(
      `${w.teamAbbrev} playing at home with a +3 composite score boost`
    );
  }

  // Goalie advantage
  if (w.startingGoalieSavePct && l.startingGoalieSavePct && w.startingGoalieSavePct > l.startingGoalieSavePct + 0.005) {
    factors.push(
      `${w.teamAbbrev}'s ${w.startingGoalieName ?? "starter"} has a ${(w.startingGoalieSavePct * 100).toFixed(1)}% save pct vs ${l.startingGoalieName ?? "starter"}'s ${(l.startingGoalieSavePct * 100).toFixed(1)}%`
    );
  }

  if (w.startingGoalieGAA && l.startingGoalieGAA && w.startingGoalieGAA < l.startingGoalieGAA - 0.3) {
    factors.push(
      `${w.teamAbbrev}'s goaltending allows ${w.startingGoalieGAA.toFixed(2)} GAA, significantly better than ${l.teamAbbrev}'s ${l.startingGoalieGAA.toFixed(2)}`
    );
  }

  // Goal differential
  const wDiff = w.goalsForPerGame - w.goalsAgainstPerGame;
  const lDiff = l.goalsForPerGame - l.goalsAgainstPerGame;
  if (wDiff > lDiff + 0.2) {
    factors.push(
      `${w.teamAbbrev} has a stronger goal differential (${wDiff > 0 ? "+" : ""}${wDiff.toFixed(2)}/game vs ${lDiff > 0 ? "+" : ""}${lDiff.toFixed(2)})`
    );
  }

  if (factors.length === 0) {
    factors.push(
      `Closely matched teams, ${w.teamAbbrev} holds a slight edge with a ${w.compositeScore.toFixed(1)} vs ${l.compositeScore.toFixed(1)} composite score`
    );
  }

  // 2-3 factors normally, 4 only for high-confidence picks (80%+)
  const maxFactors = winnerConfidence >= 80 ? 4 : 3;
  return factors.slice(0, Math.max(2, maxFactors));
}

function createFallbackPrediction(game: NHLGame): GamePrediction {
  const homeName = `${game.homeTeam.placeName.default} ${game.homeTeam.commonName.default}`;
  const awayName = `${game.awayTeam.placeName.default} ${game.awayTeam.commonName.default}`;

  return {
    gameId: game.id,
    gameDate: game.gameDate ?? "",
    startTime: game.startTimeUTC,
    venue: game.venue.default,
    homeTeam: {
      teamAbbrev: game.homeTeam.abbrev,
      teamName: homeName,
      teamLogo: game.homeTeam.logo,
      timeOnAttack: 50,
      shotsOnGoal: 50,
      offensiveFaceoffPct: 50,
      irImpact: 100,
      powerPlayPct: 50,
      recentForm: 50,
      goalsForPerGame: 3,
      goalsAgainstPerGame: 3,
      compositeScore: 50,
    },
    awayTeam: {
      teamAbbrev: game.awayTeam.abbrev,
      teamName: awayName,
      teamLogo: game.awayTeam.logo,
      timeOnAttack: 50,
      shotsOnGoal: 50,
      offensiveFaceoffPct: 50,
      irImpact: 100,
      powerPlayPct: 50,
      recentForm: 50,
      goalsForPerGame: 3,
      goalsAgainstPerGame: 3,
      compositeScore: 50,
    },
    predictedWinner: "home",
    winnerConfidence: 52,
    overUnder: {
      line: 5.5,
      prediction: "OVER",
      projectedTotal: 6,
      confidence: 52,
      justification: "Insufficient data — using league averages",
      factors: ["Limited data available for prediction"],
    },
    playerProp: null,
    keyFactors: ["Home ice advantage (data limited)"],
  };
}
