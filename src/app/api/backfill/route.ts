import { NextRequest, NextResponse } from "next/server";
import { syncHistoryBatch } from "@/lib/history";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const batchSize = Math.min(
    parseInt(req.nextUrl.searchParams.get("batchSize") ?? "20", 10) || 20,
    30
  );

  const result = await syncHistoryBatch({
    batchSize,
    oldestFirst: true,
    skipOdds: true,
  });

  return NextResponse.json(result);
}
