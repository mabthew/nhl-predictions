import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MODEL_REGISTRY } from "@/lib/model-configs";

export async function GET() {
  return NextResponse.json({ models: MODEL_REGISTRY });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
  }

  // Don't allow deleting built-in models
  if (MODEL_REGISTRY.some((m) => m.id === id)) {
    return NextResponse.json({ error: "Cannot delete built-in models" }, { status: 400 });
  }

  const model = await prisma.customModel.findUnique({ where: { id } });
  if (!model) {
    return NextResponse.json({ error: "Model not found" }, { status: 404 });
  }

  await prisma.customModel.delete({ where: { id } });

  return NextResponse.json({ deleted: true, id });
}
