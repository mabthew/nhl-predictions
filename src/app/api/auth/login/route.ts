import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, createSession, verifyTotp, setSessionCookie, parseJsonBody } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ email: string; code: string }>(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, code } = body;

  if (!email || !code) {
    return NextResponse.json(
      { error: "Email and code are required" },
      { status: 400 }
    );
  }

  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const record = await prisma.adminTotp.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!record || !record.verified) {
    return NextResponse.json(
      { error: "Authenticator not set up. Please complete setup first." },
      { status: 401 }
    );
  }

  if (!verifyTotp(record.secret, code)) {
    // Delay response on failure to slow brute-force attempts
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const token = await createSession(email);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);

  return response;
}
