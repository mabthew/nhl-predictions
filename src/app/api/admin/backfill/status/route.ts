import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SEASON_START = "2025-10-04";

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const totalDates = getDateRange(SEASON_START, yesterday.toISOString().split("T")[0]).length;

  // Count ALL synced dates per model (including sentinels — dates with no games)
  // This matches how syncHistoryBatch determines "already synced"
  const syncedDatesByModel = await prisma.$queryRaw<
    Array<{ modelVersion: string; dateCount: bigint; gameCount: bigint }>
  >`SELECT "modelVersion",
    COUNT(DISTINCT "gameDate")::bigint as "dateCount",
    COUNT(CASE WHEN "gameId" != 0 THEN 1 END)::bigint as "gameCount"
  FROM "PredictionRecord"
  GROUP BY "modelVersion"`;

  const models: Record<string, { games: number; dates: number }> = {};
  for (const row of syncedDatesByModel) {
    models[row.modelVersion] = {
      games: Number(row.gameCount),
      dates: Number(row.dateCount),
    };
  }

  return NextResponse.json({ totalDates, models });
}
