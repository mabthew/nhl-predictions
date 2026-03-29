import { ModelConfig } from "./types";

/**
 * v1: Original 9-factor model (no futures market, no star power).
 * The 5% futures weight is redistributed proportionally across the other 9 factors.
 */
export const MODEL_V1: ModelConfig = {
  id: "v1",
  name: "9-Factor Original",
  description:
    "Original model without futures market or star power modifiers. Weights distributed across 9 core factors.",
  weights: {
    goalDiffPerGame: 0.211,
    shotsForPerGame: 0.147,
    penaltyKillPct: 0.126,
    powerPlayPct: 0.105,
    recentForm: 0.126,
    irImpact: 0.105,
    goalie: 0.105,
    futuresMarket: 0,
    shotsAgainstPerGame: 0.053,
    faceoffWinPct: 0.022,
  },
  homeIceBonus: 2,
  enableStarPower: false,
  enableFutures: false,
  confidenceMultiplier: 3,
};

/**
 * v2: Current 10-factor model with futures market and star power.
 * Matches the weights currently hardcoded in predictor.ts.
 */
export const MODEL_V2: ModelConfig = {
  id: "v2",
  name: "10-Factor + Futures",
  description:
    "Current production model with Stanley Cup futures as a team quality proxy and star power confidence modifier.",
  weights: {
    goalDiffPerGame: 0.2,
    shotsForPerGame: 0.14,
    penaltyKillPct: 0.12,
    powerPlayPct: 0.1,
    recentForm: 0.12,
    irImpact: 0.1,
    goalie: 0.1,
    futuresMarket: 0.05,
    shotsAgainstPerGame: 0.05,
    faceoffWinPct: 0.02,
  },
  homeIceBonus: 2,
  enableStarPower: true,
  enableFutures: true,
  confidenceMultiplier: 3,
};

export const DEFAULT_MODEL = MODEL_V2;

export const MODEL_REGISTRY: ModelConfig[] = [MODEL_V1, MODEL_V2];

export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}
