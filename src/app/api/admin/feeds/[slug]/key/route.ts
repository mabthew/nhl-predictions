import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveSecret, hasSecret, pushToVercel, getSecret } from "@/lib/secrets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const feed = await prisma.dataFeed.findUnique({ where: { slug } });
  if (!feed) {
    return NextResponse.json({ error: "Feed not found" }, { status: 404 });
  }
  if (!feed.authEnvVar) {
    return NextResponse.json({ hasKey: true, reason: "no_key_required" });
  }

  const inEnv = !!process.env[feed.authEnvVar];
  const inDb = await hasSecret(feed.authEnvVar);

  return NextResponse.json({ hasKey: inEnv || inDb });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { slug } = await params;
    const body = await request.json();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

    if (!apiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const feed = await prisma.dataFeed.findUnique({ where: { slug } });
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }
    if (!feed.authEnvVar) {
      return NextResponse.json(
        { error: "This feed does not require an API key" },
        { status: 400 }
      );
    }

    // Validate the key by making a test call to the feed endpoint
    const testUrl = feed.endpoint
      .replace("{team}", "TOR")
      .replace("{date}", new Date().toISOString().slice(0, 10))
      .replace("{apiKey}", apiKey);

    try {
      const testRes = await fetch(testUrl, {
        signal: AbortSignal.timeout(10_000),
      });
      if (testRes.status === 401 || testRes.status === 403) {
        return NextResponse.json(
          { error: "Invalid API key. The provider rejected it." },
          { status: 400 }
        );
      }
      // Accept any non-auth-error response as valid (the endpoint might return
      // 404 for a missing team/date combo, which is fine -- it means auth worked)
    } catch {
      // Network/timeout errors during validation are non-fatal -- the endpoint
      // may be unreachable but the key format could still be correct.
      // We'll save it and let the cron job surface real errors later.
    }

    // Save encrypted to database
    await saveSecret(feed.authEnvVar, apiKey);

    // Push to Vercel (best-effort)
    const vercelSynced = await pushToVercel(feed.authEnvVar, apiKey);

    return NextResponse.json({
      valid: true,
      vercelSynced,
      ...(!vercelSynced && {
        vercelNote: "Key saved to database. Vercel sync requires VERCEL_TOKEN to be configured.",
      }),
    });
  } catch (error) {
    console.error("Key save error:", error);
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}
