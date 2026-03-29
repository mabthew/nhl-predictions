import { NextRequest, NextResponse } from "next/server";
import { MODEL_REGISTRY } from "@/lib/model-configs";

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.BACKFILL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ models: MODEL_REGISTRY });
}
