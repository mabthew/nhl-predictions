import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

function hashDevice(ip: string, ua: string): string {
  const salt = process.env.ENGAGEMENT_SALT ?? "";
  return createHash("sha256").update(`${ip}|${ua}|${salt}`).digest("hex").slice(0, 16);
}

function normalizeReferrer(ref: unknown, req: NextRequest): string | null {
  if (typeof ref !== "string" || ref.length === 0) return null;
  try {
    const url = new URL(ref);
    const host = req.headers.get("host");
    if (host && url.host === host) return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, page, visitorId, metadata, referrer } = body;

    if (!event || !page || !visitorId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? "";
    const country = request.headers.get("x-vercel-ip-country");
    const deviceHash = hashDevice(ip, userAgent);
    const isAdmin = typeof page === "string" && page.startsWith("/admin");
    const normalizedReferrer = normalizeReferrer(referrer, request);

    await prisma.engagementEvent.create({
      data: {
        event,
        page,
        visitorId,
        deviceHash,
        userAgent: userAgent || null,
        referrer: normalizedReferrer,
        country: country || null,
        isAdmin,
        metadata: metadata ?? undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to track" }, { status: 500 });
  }
}
