import { prisma } from "./db";
import { HISTORY_MODEL } from "./model-configs";

const SEASON_START = "2025-10-04";

export interface RecordRow {
  category: "spread" | "total" | "prop" | "overall";
  label: string;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
}

export interface SeasonRecord {
  seasonStart: string;
  asOf: string;
  rows: RecordRow[];
}

function rate(wins: number, losses: number): number {
  const decided = wins + losses;
  if (decided === 0) return 0;
  return Math.round((wins / decided) * 1000) / 10;
}

/**
 * Build a public-facing season record by category.
 * Pushes do not count toward win rate (industry standard).
 */
export async function getSeasonRecord(
  modelVersion = HISTORY_MODEL.id
): Promise<SeasonRecord> {
  const records = await prisma.predictionRecord.findMany({
    where: {
      modelVersion,
      gameId: { not: 0 },
      gameDate: { gte: SEASON_START },
    },
    select: {
      winnerCorrect: true,
      ouCorrect: true,
      ouResult: true,
      ouLine: true,
      actualTotal: true,
      propCorrect: true,
      propResult: true,
    },
  });

  let spreadW = 0,
    spreadL = 0;
  let totalW = 0,
    totalL = 0,
    totalP = 0;
  let propW = 0,
    propL = 0,
    propP = 0;

  for (const r of records) {
    if (r.winnerCorrect) spreadW++;
    else spreadL++;

    // Prefer the new ouResult field; fall back to legacy ouCorrect/line comparison
    // for rows settled before prop + push grading shipped.
    if (r.ouResult) {
      if (r.ouResult === "WIN") totalW++;
      else if (r.ouResult === "LOSS") totalL++;
      else if (r.ouResult === "PUSH") totalP++;
    } else if (r.actualTotal === r.ouLine) {
      totalP++;
    } else if (r.ouCorrect) {
      totalW++;
    } else {
      totalL++;
    }

    if (r.propResult) {
      if (r.propResult === "WIN") propW++;
      else if (r.propResult === "LOSS") propL++;
      else if (r.propResult === "PUSH") propP++;
    }
  }

  const overallW = spreadW + totalW + propW;
  const overallL = spreadL + totalL + propL;
  const overallP = totalP + propP;

  const rows: RecordRow[] = [
    {
      category: "spread",
      label: "Spread",
      wins: spreadW,
      losses: spreadL,
      pushes: 0,
      winRate: rate(spreadW, spreadL),
    },
    {
      category: "total",
      label: "Over/Under",
      wins: totalW,
      losses: totalL,
      pushes: totalP,
      winRate: rate(totalW, totalL),
    },
    {
      category: "prop",
      label: "Player Props",
      wins: propW,
      losses: propL,
      pushes: propP,
      winRate: rate(propW, propL),
    },
    {
      category: "overall",
      label: "Overall",
      wins: overallW,
      losses: overallL,
      pushes: overallP,
      winRate: rate(overallW, overallL),
    },
  ];

  return {
    seasonStart: SEASON_START,
    asOf: new Date().toISOString(),
    rows,
  };
}
