import { NextRequest, NextResponse } from "next/server";
import type { InputJsonValue } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await prisma.builderChat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.createdBy !== session.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: chat.id,
    title: chat.title,
    messages: chat.messages,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await params;
  const chat = await prisma.builderChat.findUnique({
    where: { id: chatId },
  });

  if (!chat || chat.createdBy !== session.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const data: { title?: string; messages?: InputJsonValue } = {};
  if (typeof body.title === "string") data.title = body.title.slice(0, 60);
  if (Array.isArray(body.messages))
    data.messages = body.messages as InputJsonValue;

  const updated = await prisma.builderChat.update({
    where: { id: chatId },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
