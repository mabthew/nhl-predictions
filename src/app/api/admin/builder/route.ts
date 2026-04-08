import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const models = await prisma.customModel.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        createdBy: true,
        createdAt: true,
      },
    });
    return NextResponse.json(models);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await prisma.customModel.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
