import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.ODDS_API_KEY_PAID ?? process.env.ODDS_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  try {
    // Lightweight call to get usage headers (this endpoint is free / low cost)
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports?apiKey=${key}`,
      { cache: "no-store" }
    );

    const used = res.headers.get("x-requests-used");
    const remaining = res.headers.get("x-requests-remaining");

    if (used === null && remaining === null) {
      return NextResponse.json({ error: "No usage headers returned" }, { status: 502 });
    }

    const usedNum = parseInt(used ?? "0", 10);
    const remainingNum = parseInt(remaining ?? "0", 10);
    const total = usedNum + remainingNum;

    return NextResponse.json({
      used: usedNum,
      remaining: remainingNum,
      total,
      pct: total > 0 ? Math.round((usedNum / total) * 1000) / 10 : 0,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 500 });
  }
}
