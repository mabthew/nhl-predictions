import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, generateTotp, verifyTotp, createSession, setSessionCookie, parseJsonBody } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Generate a new TOTP secret for an admin email
export async function POST(request: NextRequest) {
  const body = await parseJsonBody<{ email: string }>(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email } = body;

  if (!email || !isAdminEmail(email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check if already verified
  const existing = await prisma.adminTotp.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing?.verified) {
    return NextResponse.json(
      { error: "Authenticator already set up. Use login instead." },
      { status: 400 }
    );
  }

  const totp = generateTotp(normalizedEmail);
  const uri = totp.toString();

  await prisma.adminTotp.upsert({
    where: { email: normalizedEmail },
    update: { secret: totp.secret.base32, verified: false },
    create: { email: normalizedEmail, secret: totp.secret.base32 },
  });

  return NextResponse.json({ uri, secret: totp.secret.base32 });
}

// Confirm TOTP setup with a valid code
export async function PUT(request: NextRequest) {
  const body = await parseJsonBody<{ email: string; code: string }>(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, code } = body;

  if (!email || !code || !isAdminEmail(email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const record = await prisma.adminTotp.findUnique({
    where: { email: normalizedEmail },
  });

  if (!record) {
    return NextResponse.json(
      { error: "No setup in progress. Generate a secret first." },
      { status: 400 }
    );
  }

  if (!verifyTotp(record.secret, code)) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return NextResponse.json({ error: "Invalid code. Try again." }, { status: 400 });
  }

  await prisma.adminTotp.update({
    where: { email: normalizedEmail },
    data: { verified: true },
  });

  const token = await createSession(normalizedEmail);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, token);

  return response;
}
