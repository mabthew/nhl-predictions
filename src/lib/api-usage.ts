import { prisma } from "./db";

// Cost per API call estimates (USD)
// Odds API: 20K plan at $30/month = $0.0015/call
// NHL API: free, no cost
const COST_PER_CALL: Record<string, number> = {
  "odds-api": parseFloat(process.env.ODDS_API_COST_PER_CALL ?? "0.0015"),
  "nhl-api": 0,
};

export async function logApiCall(
  provider: string,
  endpoint: string,
  statusCode: number,
  responseTime: number
): Promise<void> {
  const costEstimate = COST_PER_CALL[provider] ?? 0;

  await prisma.apiUsageLog.create({
    data: {
      provider,
      endpoint,
      statusCode,
      responseTime,
      costEstimate,
    },
  });
}
