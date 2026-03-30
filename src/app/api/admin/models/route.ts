import { NextResponse } from "next/server";
import { MODEL_REGISTRY } from "@/lib/model-configs";

export async function GET() {
  return NextResponse.json({ models: MODEL_REGISTRY });
}
