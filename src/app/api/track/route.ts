import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, page, visitorId, metadata } = body;

    if (!event || !page || !visitorId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await prisma.engagementEvent.create({
      data: {
        event,
        page,
        visitorId,
        metadata: metadata ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
