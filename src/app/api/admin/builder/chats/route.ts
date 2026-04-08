import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await prisma.builderChat.findMany({
    where: { createdBy: session.email },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
      messages: true,
    },
  });

  const result = chats.map((c) => ({
    id: c.id,
    title: c.title,
    updatedAt: c.updatedAt.toISOString(),
    messageCount: Array.isArray(c.messages)
      ? (c.messages as unknown[]).length
      : 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 60)
      : "New Chat";
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const chat = await prisma.builderChat.create({
    data: {
      title,
      messages,
      createdBy: session.email,
    },
  });

  return NextResponse.json({ id: chat.id, title: chat.title });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const chat = await prisma.builderChat.findUnique({ where: { id } });
  if (!chat || chat.createdBy !== session.email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.builderChat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
