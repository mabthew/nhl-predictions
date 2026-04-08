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
    restFactor: 0,
    playerMomentum: 0,
  },
  homeIceBonus: 2,
  enableStarPower: false,
  enableFutures: false,
  enableStartingGoalies: false,
  enablePlayerMomentum: false,
  enableRestFactor: false,
  confidenceMultiplier: 3,
};

/**
 * v2: 10-factor model with futures market and star power.
 */
export const MODEL_V2: ModelConfig = {
  id: "v2",
  name: "10-Factor + Futures",
  description:
    "Model with Stanley Cup futures as a team quality proxy and star power confidence modifier.",
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
    restFactor: 0,
    playerMomentum: 0,
  },
  homeIceBonus: 2,
  enableStarPower: true,
  enableFutures: true,
  enableStartingGoalies: false,
  enablePlayerMomentum: false,
  enableRestFactor: false,
  confidenceMultiplier: 3,
};

/**
 * v3: 12-factor model with DailyFaceoff enhanced data.
 * Adds confirmed starting goalie, back-to-back detection, and player-level momentum.
 * Recent form weight reduced in favor of more granular player momentum signal.
 * Goalie weight increased due to higher data quality from confirmed starters.
 */
export const MODEL_V3: ModelConfig = {
  id: "v3",
  name: "12-Factor + DailyFaceoff Enhanced",
  description:
    "Enhanced model with confirmed starting goalies, back-to-back fatigue detection, and player-level momentum from DailyFaceoff.",
  weights: {
    goalDiffPerGame: 0.18,
    shotsForPerGame: 0.12,
    penaltyKillPct: 0.11,
    powerPlayPct: 0.09,
    recentForm: 0.05,
    irImpact: 0.09,
    goalie: 0.12,
    futuresMarket: 0.05,
    shotsAgainstPerGame: 0.04,
    faceoffWinPct: 0.02,
    restFactor: 0.05,
    playerMomentum: 0.08,
  },
  homeIceBonus: 2,
  enableStarPower: true,
  enableFutures: true,
  enableStartingGoalies: true,
  enablePlayerMomentum: true,
  enableRestFactor: true,
  confidenceMultiplier: 3,
};

export const DEFAULT_MODEL = MODEL_V3;
export const HISTORY_MODEL = MODEL_V2;

export const MODEL_REGISTRY: ModelConfig[] = [MODEL_V1, MODEL_V2, MODEL_V3];

export function getModelConfig(id: string): ModelConfig | undefined {
  return MODEL_REGISTRY.find((m) => m.id === id);
}

export async function getModelConfigAsync(
  id: string
): Promise<ModelConfig | undefined> {
  const sync = MODEL_REGISTRY.find((m) => m.id === id);
  if (sync) return sync;
  const { prisma } = await import("./db");
  const custom = await prisma.customModel.findUnique({ where: { id } });
  if (!custom || !custom.isActive) return undefined;
  const cfg = custom.config as Record<string, unknown>;
  return {
    ...(cfg as Omit<ModelConfig, "id" | "name" | "description">),
    id: custom.id,
    name: custom.name,
    description: custom.description,
  };
}

export interface ModelWithMeta extends ModelConfig {
  createdAt?: string;
  createdBy?: string;
  chatId?: string | null;
  isCustom?: boolean;
}

export async function getAllModels(): Promise<ModelWithMeta[]> {
  const { prisma } = await import("./db");
  const customModels = await prisma.customModel.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const dbConfigs: ModelWithMeta[] = customModels.map((m) => {
    const cfg = m.config as Record<string, unknown>;
    return {
      ...(cfg as Omit<ModelConfig, "id" | "name" | "description">),
      id: m.id,
      name: m.name,
      description: m.description,
      createdAt: m.createdAt.toISOString(),
      createdBy: m.createdBy,
      chatId: m.chatId,
      isCustom: true,
    };
  });
  return [...MODEL_REGISTRY, ...dbConfigs];
}
