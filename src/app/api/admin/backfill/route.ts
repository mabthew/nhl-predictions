import { NextRequest, NextResponse } from "next/server";
import { syncHistoryBatch } from "@/lib/history";
import { getModelConfig, MODEL_REGISTRY } from "@/lib/model-configs";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const modelId = body.modelId as string;
    const batchSize = Math.min(Math.max(body.batchSize ?? 10, 1), 30);
    const includeOdds = body.includeOdds === true;
    const force = body.force === true;

    const modelConfig = getModelConfig(modelId);
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Unknown model: ${modelId}`, available: MODEL_REGISTRY.map((m) => m.id) },
        { status: 400 }
      );
    }

    const result = await syncHistoryBatch({
      batchSize,
      oldestFirst: false,
      skipOdds: !includeOdds,
      modelVersion: modelConfig.id,
      modelConfig,
      force,
    });

    return NextResponse.json({
      model: modelConfig.id,
      ...result,
    });
  } catch (error) {
    console.error("Admin backfill error:", error);
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 });
  }
}
