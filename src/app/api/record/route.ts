import { NextResponse } from "next/server";
import { getSeasonRecord } from "@/lib/season-record";

export const revalidate = 900;

export async function GET() {
  try {
    const record = await getSeasonRecord();
    return NextResponse.json(record, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("Failed to build season record:", error);
    return NextResponse.json(
      { error: "Failed to load season record" },
      { status: 500 }
    );
  }
}
