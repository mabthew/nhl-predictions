import {
  GamePrediction,
  NHLGame,
  NHLStandingsTeam,
  NHLClubStats,
  NHLTeamSummaryStats,
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
import { clamp } from "./utils";

// Revised weights based on hockey analytics research:
// - Goal differential is the most predictive single team stat
// - Shots/game correlates with scoring chances
// - PK% is a critical defensive metric (was missing entirely)
// - Faceoff% has very weak correlation with winning (r < 0.1), downweighted
// - Goalie quality has the highest single-game variance
const WEIGHTS = {
  goalDiffPerGame: 0.22,
  shotsForPerGame: 0.15,
  penaltyKillPct: 0.12,
  powerPlayPct: 0.10,
  recentForm: 0.13,
  irImpact: 0.10,
  goalie: 0.10,
  faceoffWinPct: 0.03,
  shotsAgainstPerGame: 0.05,
};

// League average baselines for normalization (2024-25 season)
const LEAGUE_AVG = {
  goalDiffPerGame: 0,
  shotsForPerGame: 30,
  shotsAgainstPerGame: 30,
  faceoffWinPct: 50,
  powerPlayPct: 22,
  penaltyKillPct: 80,
  recentForm: 50,
  irImpact: 85,
  goalieSavePct: 0.905,
};

// Standard deviations for z-score normalization
const LEAGUE_SD = {
  goalDiffPerGame: 0.5,
  shotsForPerGame: 3,
  shotsAgainstPerGame: 3,
  faceoffWinPct: 2.5,
  powerPlayPct: 4,
  penaltyKillPct: 4,
  recentForm: 18,
  irImpact: 15,
  goalieSavePct: 0.012,
};

export function generatePredictions(
  games: NHLGame[],
  standings: NHLStandingsTeam[],
  clubStatsMap: Map<string, NHLClubStats | null>,
  injuries: InjuryReport[],
  odds: OddsResponse[],
  playerProps: OddsResponse[],
  teamStatsMap: Map<string, NHLTeamSummaryStats>
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

      // Look up pre-computed team stats by full name
      const teamSummary = findTeamSummary(teamStatsMap, teamFullName);

      const metrics = buildTeamMetrics(standing, clubStats, teamInjuries, teamSummary);
      teamMetricsMap.set(abbrev, metrics);
    }
  }

  return games.map((game) => {
    const homeMetrics = teamMetricsMap.get(game.homeTeam.abbrev);
    const awayMetrics = teamMetricsMap.get(game.awayTeam.abbrev);

    if (!homeMetrics || !awayMetrics) {
      return createFallbackPrediction(game);
    }

    homeMetrics.compositeScore = calculateComposite(homeMetrics, true);
    awayMetrics.compositeScore = calculateComposite(awayMetrics, false);

    const delta = homeMetrics.compositeScore - awayMetrics.compositeScore;
    const predictedWinner: "home" | "away" = delta >= 0 ? "home" : "away";
    const winnerConfidence = clamp(50 + Math.abs(delta) * 3, 50, 95);

    const homeName = `${game.homeTeam.placeName.default} ${game.homeTeam.commonName.default}`;
    const awayName = `${game.awayTeam.placeName.default} ${game.awayTeam.commonName.default}`;

    const overUnder = predictOverUnder(
      homeMetrics,
      awayMetrics,
      odds,
      homeName,
      awayName
    );

    const playerProp = findBestPlayerProp(playerProps, homeName, awayName, clubStatsMap);

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

/**
 * Find team summary stats by name, handling slight naming differences.
 */
function findTeamSummary(
  teamStatsMap: Map<string, NHLTeamSummaryStats>,
  teamFullName: string
): NHLTeamSummaryStats | null {
  // Direct lookup
  const direct = teamStatsMap.get(teamFullName);
  if (direct) return direct;

  // Fuzzy match: try partial name matching
  const nameLower = teamFullName.toLowerCase();
  for (const [key, value] of teamStatsMap) {
    if (
      key.toLowerCase().includes(nameLower) ||
      nameLower.includes(key.toLowerCase())
    ) {
      return value;
    }
  }

  return null;
}

/**
 * Normalize a metric to a 0-100 scale using league-wide z-scores.
 * This ensures scores are consistent regardless of which teams are playing today.
 */
function zScoreNormalize(value: number, avg: number, sd: number, invert = false): number {
  const z = (value - avg) / sd;
  const adjusted = invert ? -z : z;
  // Map z-score to 0-100: z=0 → 50, z=+2 → ~90, z=-2 → ~10
  return clamp(50 + adjusted * 20, 0, 100);
}

function calculateComposite(metrics: TeamMetrics, isHome: boolean): number {
  // Normalize each metric to 0-100 using league baselines
  const goalDiffScore = zScoreNormalize(metrics.goalDiffPerGame, LEAGUE_AVG.goalDiffPerGame, LEAGUE_SD.goalDiffPerGame);
  const shotsForScore = zScoreNormalize(metrics.shotsForPerGame, LEAGUE_AVG.shotsForPerGame, LEAGUE_SD.shotsForPerGame);
  const shotsAgainstScore = zScoreNormalize(metrics.shotsAgainstPerGame, LEAGUE_AVG.shotsAgainstPerGame, LEAGUE_SD.shotsAgainstPerGame, true); // invert: fewer shots against = better
  const faceoffScore = zScoreNormalize(metrics.faceoffWinPct, LEAGUE_AVG.faceoffWinPct, LEAGUE_SD.faceoffWinPct);
  const ppScore = zScoreNormalize(metrics.powerPlayPct, LEAGUE_AVG.powerPlayPct, LEAGUE_SD.powerPlayPct);
  const pkScore = zScoreNormalize(metrics.penaltyKillPct, LEAGUE_AVG.penaltyKillPct, LEAGUE_SD.penaltyKillPct);
  const formScore = zScoreNormalize(metrics.recentForm, LEAGUE_AVG.recentForm, LEAGUE_SD.recentForm);
  const irScore = zScoreNormalize(metrics.irImpact, LEAGUE_AVG.irImpact, LEAGUE_SD.irImpact);

  // Goalie score
  let goalieScore = 50; // default to average
  if (metrics.startingGoalieSavePct) {
    goalieScore = zScoreNormalize(metrics.startingGoalieSavePct, LEAGUE_AVG.goalieSavePct, LEAGUE_SD.goalieSavePct);
  }

  let composite =
    goalDiffScore * WEIGHTS.goalDiffPerGame +
    shotsForScore * WEIGHTS.shotsForPerGame +
    shotsAgainstScore * WEIGHTS.shotsAgainstPerGame +
    faceoffScore * WEIGHTS.faceoffWinPct +
    ppScore * WEIGHTS.powerPlayPct +
    pkScore * WEIGHTS.penaltyKillPct +
    formScore * WEIGHTS.recentForm +
    irScore * WEIGHTS.irImpact +
    goalieScore * WEIGHTS.goalie;

  // Home ice advantage: ~54% historical home win rate → +2 points
  if (isHome) {
    composite += 2;
  }

  return composite;
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

  // Use realistic thresholds (NHL average ~30 shots/game)
  if (home.shotsForPerGame > 33 || away.shotsForPerGame > 33) {
    factors.push("High shot volume suggests an up-tempo game");
  }
  // NHL average PP% is ~22%
  if (home.powerPlayPct > 26 || away.powerPlayPct > 26) {
    factors.push("Strong power play conversion could boost scoring");
  }
  if (home.goalsForPerGame + away.goalsForPerGame > 6.5) {
    factors.push("Both teams averaging high goals per game");
  }
  if (home.goalsAgainstPerGame + away.goalsAgainstPerGame < 5) {
    factors.push("Strong defensive teams could keep scoring low");
  }
  // Weak PK% means more power play goals
  if (home.penaltyKillPct < 76 || away.penaltyKillPct < 76) {
    factors.push("Weak penalty kill could lead to extra power play goals");
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

  // Shot volume (realistic threshold: ~3-4 shots difference is meaningful)
  if (w.shotsForPerGame > l.shotsForPerGame + 3) {
    factors.push(
      `${w.teamAbbrev} generates ${w.shotsForPerGame.toFixed(1)} shots/game vs ${l.teamAbbrev}'s ${l.shotsForPerGame.toFixed(1)}`
    );
  }

  // Faceoffs (only mention if large gap — faceoffs weakly correlate with winning)
  if (w.faceoffWinPct > l.faceoffWinPct + 3) {
    factors.push(
      `${w.teamAbbrev} wins ${w.faceoffWinPct.toFixed(1)}% of faceoffs vs ${l.teamAbbrev}'s ${l.faceoffWinPct.toFixed(1)}%`
    );
  }

  // Power play (realistic: 3-5% difference is meaningful)
  if (w.powerPlayPct > l.powerPlayPct + 3) {
    factors.push(
      `${w.teamAbbrev}'s power play converts at ${w.powerPlayPct.toFixed(1)}%, compared to ${l.teamAbbrev}'s ${l.powerPlayPct.toFixed(1)}%`
    );
  }

  // Penalty kill
  if (w.penaltyKillPct > l.penaltyKillPct + 3) {
    factors.push(
      `${w.teamAbbrev}'s penalty kill at ${w.penaltyKillPct.toFixed(1)}% is stronger than ${l.teamAbbrev}'s ${l.penaltyKillPct.toFixed(1)}%`
    );
  }

  // Weak PK for the loser
  if (l.penaltyKillPct < 76) {
    factors.push(
      `${l.teamAbbrev}'s penalty kill at ${l.penaltyKillPct.toFixed(1)}% is a liability`
    );
  }

  // Injuries
  if (l.irImpact < 80) {
    const injurySeverity = l.irImpact < 60 ? "significant" : "notable";
    factors.push(
      `${l.teamAbbrev} has ${injurySeverity} injuries impacting their roster`
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

  // Home ice
  if (winner === "home") {
    factors.push(
      `${w.teamAbbrev} playing at home with a historical ~54% home win rate advantage`
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
  if (w.goalDiffPerGame > l.goalDiffPerGame + 0.2) {
    factors.push(
      `${w.teamAbbrev} has a stronger goal differential (${w.goalDiffPerGame > 0 ? "+" : ""}${w.goalDiffPerGame.toFixed(2)}/game vs ${l.goalDiffPerGame > 0 ? "+" : ""}${l.goalDiffPerGame.toFixed(2)})`
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
      shotsForPerGame: 30,
      shotsAgainstPerGame: 30,
      faceoffWinPct: 50,
      irImpact: 100,
      powerPlayPct: 21,
      penaltyKillPct: 80,
      recentForm: 50,
      goalDiffPerGame: 0,
      goalsForPerGame: 3,
      goalsAgainstPerGame: 3,
      compositeScore: 50,
    },
    awayTeam: {
      teamAbbrev: game.awayTeam.abbrev,
      teamName: awayName,
      teamLogo: game.awayTeam.logo,
      shotsForPerGame: 30,
      shotsAgainstPerGame: 30,
      faceoffWinPct: 50,
      irImpact: 100,
      powerPlayPct: 21,
      penaltyKillPct: 80,
      recentForm: 50,
      goalDiffPerGame: 0,
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
