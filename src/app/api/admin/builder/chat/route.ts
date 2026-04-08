import { streamText, tool, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { logApiCall } from "@/lib/api-usage";
import { MODEL_REGISTRY } from "@/lib/model-configs";

export const maxDuration = 60;

const modelConfigSchema = z.object({
  name: z.string().describe("Short model name, e.g. 'Goalie-Heavy v1'"),
  description: z
    .string()
    .describe("One-sentence description of the model's philosophy"),
  weights: z.object({
    goalDiffPerGame: z.number().min(0).max(1),
    shotsForPerGame: z.number().min(0).max(1),
    penaltyKillPct: z.number().min(0).max(1),
    powerPlayPct: z.number().min(0).max(1),
    recentForm: z.number().min(0).max(1),
    irImpact: z.number().min(0).max(1),
    goalie: z.number().min(0).max(1),
    futuresMarket: z.number().min(0).max(1),
    shotsAgainstPerGame: z.number().min(0).max(1),
    faceoffWinPct: z.number().min(0).max(1),
    restFactor: z.number().min(0).max(1),
    playerMomentum: z.number().min(0).max(1),
  }),
  homeIceBonus: z.number().min(0).max(5),
  enableStarPower: z.boolean(),
  enableFutures: z.boolean(),
  enableStartingGoalies: z.boolean(),
  enablePlayerMomentum: z.boolean(),
  enableRestFactor: z.boolean(),
  confidenceMultiplier: z.number().min(1).max(10),
});

const existingModels = MODEL_REGISTRY.map(
  (m) =>
    `${m.id} "${m.name}": weights=${JSON.stringify(m.weights)}, homeIceBonus=${m.homeIceBonus}, confidenceMultiplier=${m.confidenceMultiplier}, gates: futures=${m.enableFutures}, starPower=${m.enableStarPower}, startingGoalies=${m.enableStartingGoalies}, playerMomentum=${m.enablePlayerMomentum}, restFactor=${m.enableRestFactor}`
).join("\n");

const SYSTEM_PROMPT = `You are a prediction model architect for NHL game predictions. You help admins design ModelConfig objects by adjusting factor weights and feature gates.

The prediction system computes a composite score for each team in a matchup. Each factor is z-score normalized to a 0-100 scale, then multiplied by its weight. The weighted sum becomes the team's composite. The team with the higher composite is predicted to win.

FACTORS (12 total, weights must sum to approximately 1.0):

- goalDiffPerGame: Goals scored minus goals allowed per game. The single strongest predictor of team quality. Typically the highest weight (0.18-0.21).
- shotsForPerGame: Average shots on goal per game. Measures offensive volume and zone time.
- penaltyKillPct: Penalty kill success rate. League average around 80%.
- powerPlayPct: Power play conversion rate. League average around 22%.
- recentForm: Last 10 games win percentage. Captures hot/cold streaks. Can be noisy.
- irImpact: Injury roster impact score 0-100 (100 = fully healthy). Higher weight means injuries matter more.
- goalie: Starting goalie save percentage. Best used with enableStartingGoalies for confirmed starter data.
- futuresMarket: Stanley Cup futures implied probability. Proxy for overall team quality as perceived by oddsmakers. Requires enableFutures=true.
- shotsAgainstPerGame: Shots allowed per game. Defensive volume metric (inverted in scoring).
- faceoffWinPct: Faceoff win percentage. Weakly correlated with winning. Usually low weight (0.01-0.03).
- restFactor: Days of rest (back-to-back detection). Requires enableRestFactor=true.
- playerMomentum: Last-5-game production from top players. Requires enablePlayerMomentum=true.

FEATURE GATES (boolean toggles):
- enableFutures: Must be true if futuresMarket weight > 0
- enableStartingGoalies: Enables confirmed goalie data from DailyFaceoff (improves goalie factor accuracy)
- enableStarPower: Adds confidence modifier based on award-winning players (does not need a weight)
- enableRestFactor: Must be true if restFactor weight > 0
- enablePlayerMomentum: Must be true if playerMomentum weight > 0

SCALARS:
- homeIceBonus: Points added to home team composite. Typically 2. Range 0-5.
- confidenceMultiplier: Scales the composite delta into a confidence percentage. Typically 3. Range 1-10. Higher = more extreme confidence values.

CONSTRAINTS:
- All weights must be >= 0
- Weights must sum to approximately 1.0 (0.98-1.02 is acceptable)
- If a feature gate is off, its associated weight MUST be 0
- If a weight is > 0, its associated feature gate MUST be on

EXISTING MODELS FOR REFERENCE:
${existingModels}

GUIDELINES:
- Ask clarifying questions if the request is vague
- Explain your reasoning when proposing weights
- When the user seems ready, call the propose_model tool with a complete config
- You can propose multiple iterations as the user gives feedback
- Keep explanations concise and hockey-knowledgeable`;

export async function POST(request: Request) {
  const { messages } = await request.json();
  const start = Date.now();

  const result = streamText({
    model: anthropic("claude-sonnet-4-5"),
    system: SYSTEM_PROMPT,
    messages,
    tools: {
      propose_model: tool({
        description:
          "Propose a model configuration for the user to preview and test against recent games",
        inputSchema: modelConfigSchema,
      }),
    },
    stopWhen: stepCountIs(2),
    onFinish: () => {
      const elapsed = Date.now() - start;
      logApiCall("anthropic", "builder-chat", 200, elapsed).catch(() => {});
    },
  });

  return result.toUIMessageStreamResponse();
}
