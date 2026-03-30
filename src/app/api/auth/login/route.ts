import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail, createSession, verifyTotp } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { email, code } = await request.json();

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
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const token = await createSession(email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("admin-session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
