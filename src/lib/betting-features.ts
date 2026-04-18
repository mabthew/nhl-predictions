import { GamePrediction, BestBet, BetType, Parlay, ParlayLeg } from "./types";
import { americanToImpliedProbability } from "./utils";

// Edges above this threshold almost always indicate stale odds, a model bug, or a
// data feed issue rather than a real market inefficiency. Liquid NHL markets do not
// leave 20%+ edges sitting around.
const MAX_PLAUSIBLE_EDGE = 0.20;

interface CandidateBet {
  gameId: number;
  betType: BetType;
  description: string;
  confidence: number;
  odds: number;
  impliedProbability: number;
  edge: number;
  score: number;
  gameLabel: string;
  teamAbbrev?: string;
}

function americanToDecimal(odds: number): number {
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
}

function decimalToAmerican(decimal: number): number {
  return decimal >= 2
    ? Math.round((decimal - 1) * 100)
    : Math.round(-100 / (decimal - 1));
}

function scoreBet(confidence: number, odds: number): number {
  const impliedProb = americanToImpliedProbability(odds);
  const modelProb = confidence / 100;
  const edge = modelProb - impliedProb;
  const decimalOdds = americanToDecimal(odds);
  return edge * Math.sqrt(decimalOdds);
}

function getGameLabel(pred: GamePrediction): string {
  return `${pred.awayTeam.teamAbbrev} @ ${pred.homeTeam.teamAbbrev}`;
}

function getCandidateBets(pred: GamePrediction): CandidateBet[] {
  const candidates: CandidateBet[] = [];
  const label = getGameLabel(pred);
  const winnerAbbrev = pred.predictedWinner === "home"
    ? pred.homeTeam.teamAbbrev
    : pred.awayTeam.teamAbbrev;

  // Moneyline
  if (pred.moneyline) {
    const mlOdds = pred.predictedWinner === "home"
      ? pred.moneyline.homeOdds
      : pred.moneyline.awayOdds;
    const impliedProb = americanToImpliedProbability(mlOdds);
    const edge = pred.winnerConfidence / 100 - impliedProb;
    candidates.push({
      gameId: pred.gameId,
      betType: "moneyline",
      description: `${winnerAbbrev} Moneyline`,
      confidence: pred.winnerConfidence,
      odds: mlOdds,
      impliedProbability: impliedProb,
      edge,
      score: scoreBet(pred.winnerConfidence, mlOdds),
      gameLabel: label,
      teamAbbrev: winnerAbbrev,
    });
  }

  // Puck line
  if (pred.puckLine?.confidence) {
    const plOdds = pred.predictedWinner === "home"
      ? pred.puckLine.homeOdds
      : pred.puckLine.awayOdds;
    const plSpread = pred.predictedWinner === "home"
      ? pred.puckLine.homeSpread
      : pred.puckLine.awaySpread;
    const impliedProb = americanToImpliedProbability(plOdds);
    const edge = pred.puckLine.confidence / 100 - impliedProb;
    candidates.push({
      gameId: pred.gameId,
      betType: "puck_line",
      description: `${winnerAbbrev} ${plSpread > 0 ? "+" : ""}${plSpread}`,
      confidence: pred.puckLine.confidence,
      odds: plOdds,
      impliedProbability: impliedProb,
      edge,
      score: scoreBet(pred.puckLine.confidence, plOdds),
      gameLabel: label,
      teamAbbrev: winnerAbbrev,
    });
  }

  // Over/Under (standard -110 juice)
  if (pred.overUnder.confidence > 50) {
    const ouOdds = -110;
    const impliedProb = americanToImpliedProbability(ouOdds);
    const edge = pred.overUnder.confidence / 100 - impliedProb;
    candidates.push({
      gameId: pred.gameId,
      betType: "over_under",
      description: `${pred.overUnder.prediction} ${pred.overUnder.line}`,
      confidence: pred.overUnder.confidence,
      odds: ouOdds,
      impliedProbability: impliedProb,
      edge,
      score: scoreBet(pred.overUnder.confidence, ouOdds),
      gameLabel: label,
    });
  }

  // Player prop
  if (pred.playerProp) {
    const propConfidence =
      pred.playerProp.riskLevel === "LOW" ? 65
        : pred.playerProp.riskLevel === "MEDIUM" ? 55
        : 40;
    const impliedProb = americanToImpliedProbability(pred.playerProp.odds);
    const edge = propConfidence / 100 - impliedProb;
    candidates.push({
      gameId: pred.gameId,
      betType: "player_prop",
      description: `${pred.playerProp.playerName} ${pred.playerProp.recommendation} ${pred.playerProp.line} ${pred.playerProp.market}`,
      confidence: propConfidence,
      odds: pred.playerProp.odds,
      impliedProbability: impliedProb,
      edge,
      score: scoreBet(propConfidence, pred.playerProp.odds),
      gameLabel: label,
    });
  }

  return candidates.filter((c) => Math.abs(c.edge) <= MAX_PLAUSIBLE_EDGE);
}

function buildReasoning(bet: CandidateBet, pred: GamePrediction): string {
  const edgePct = Math.round(bet.edge * 100);
  const parts: string[] = [];

  if (bet.betType === "moneyline") {
    parts.push(`Our model gives ${bet.teamAbbrev} a ${bet.confidence}% chance to win, but the odds imply only ${Math.round(bet.impliedProbability * 100)}% — that's a ${edgePct}% edge.`);
    if (pred.keyFactors[0]) parts.push(pred.keyFactors[0] + ".");
  } else if (bet.betType === "puck_line") {
    parts.push(`${bet.confidence}% spread confidence vs ${Math.round(bet.impliedProbability * 100)}% implied by odds — ${edgePct}% edge on the puck line.`);
    const winner = pred.predictedWinner === "home" ? pred.homeTeam : pred.awayTeam;
    const loser = pred.predictedWinner === "home" ? pred.awayTeam : pred.homeTeam;
    if (winner.goalsForPerGame > 3.2) {
      parts.push(`${bet.teamAbbrev} averages ${winner.goalsForPerGame.toFixed(1)} goals per game.`);
    }
    if (loser.goalsAgainstPerGame > 3.2) {
      parts.push(`Opponent allows ${loser.goalsAgainstPerGame.toFixed(1)} goals per game.`);
    }
  } else if (bet.betType === "over_under") {
    parts.push(`Projected total of ${pred.overUnder.projectedTotal} goals vs the ${pred.overUnder.line} line — ${pred.overUnder.confidence}% model confidence.`);
    if (pred.overUnder.factors[0]) parts.push(pred.overUnder.factors[0] + ".");
  } else if (bet.betType === "player_prop" && pred.playerProp) {
    parts.push(pred.playerProp.justification);
  }

  return parts.join(" ");
}

export function findBestBet(dayGames: GamePrediction[]): BestBet | null {
  const candidatesWithPreds: { candidate: CandidateBet; pred: GamePrediction }[] = [];
  for (const pred of dayGames) {
    if (pred.gameStatus === "live") continue;
    for (const candidate of getCandidateBets(pred)) {
      candidatesWithPreds.push({ candidate, pred });
    }
  }

  // Only consider bets with positive edge
  const valueBets = candidatesWithPreds.filter((c) => c.candidate.edge > 0);
  if (valueBets.length === 0) return null;

  valueBets.sort((a, b) => b.candidate.score - a.candidate.score);
  const best = valueBets[0];
  return {
    ...best.candidate,
    reasoning: buildReasoning(best.candidate, best.pred),
  };
}

function buildLegReasoning(bet: CandidateBet, pred: GamePrediction): string {
  if (bet.betType === "moneyline") {
    const factor = pred.keyFactors[0];
    return factor ? factor + "." : `${bet.confidence}% model confidence vs ${Math.round(bet.impliedProbability * 100)}% implied.`;
  }
  if (bet.betType === "puck_line") {
    const winner = pred.predictedWinner === "home" ? pred.homeTeam : pred.awayTeam;
    if (winner.goalsForPerGame > 3.0) {
      return `${bet.teamAbbrev} scores ${winner.goalsForPerGame.toFixed(1)} goals per game — built to cover.`;
    }
    return `${bet.confidence}% spread confidence vs ${Math.round(bet.impliedProbability * 100)}% implied by odds.`;
  }
  if (bet.betType === "over_under") {
    return `Projected ${pred.overUnder.projectedTotal} total goals vs ${pred.overUnder.line} line.`;
  }
  if (bet.betType === "player_prop" && pred.playerProp) {
    return pred.playerProp.justification;
  }
  return "";
}

export function buildParlay(dayGames: GamePrediction[]): Parlay | null {
  const upcomingGames = dayGames.filter((g) => g.gameStatus !== "live");
  if (upcomingGames.length < 3) return null;

  const candidatesWithPreds: { candidate: CandidateBet; pred: GamePrediction }[] = [];
  for (const pred of upcomingGames) {
    for (const candidate of getCandidateBets(pred)) {
      candidatesWithPreds.push({ candidate, pred });
    }
  }

  // Sort by confidence for parlay stability
  candidatesWithPreds.sort((a, b) => b.candidate.confidence - a.candidate.confidence);

  const legs: ParlayLeg[] = [];
  const usedGames = new Set<number>();

  for (const { candidate, pred } of candidatesWithPreds) {
    if (usedGames.has(candidate.gameId)) continue;
    if (legs.length >= 3) break;
    if (candidate.confidence < 55) continue;

    legs.push({
      gameId: candidate.gameId,
      betType: candidate.betType,
      description: candidate.description,
      confidence: candidate.confidence,
      odds: candidate.odds,
      teamAbbrev: candidate.teamAbbrev,
      gameLabel: candidate.gameLabel,
      reasoning: buildLegReasoning(candidate, pred),
    });
    usedGames.add(candidate.gameId);
  }

  if (legs.length < 3) return null;

  const combinedDecimal = legs.reduce(
    (acc, leg) => acc * americanToDecimal(leg.odds),
    1
  );
  const combinedOdds = decimalToAmerican(combinedDecimal);
  const combinedProbability = legs.reduce(
    (acc, leg) => acc * (leg.confidence / 100),
    1
  );
  const potentialPayout = Math.round(combinedDecimal * 10 * 100) / 100;

  return { legs, combinedOdds, combinedProbability, potentialPayout };
}
