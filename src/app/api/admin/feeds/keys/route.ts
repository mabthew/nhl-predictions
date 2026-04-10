import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { hasSecret } from "@/lib/secrets";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const feeds = await prisma.dataFeed.findMany({
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      provider: true,
      authEnvVar: true,
      keySetupUrl: true,
      costPerCall: true,
      isActive: true,
    },
  });

  const result = await Promise.all(
    feeds.map(async (f) => ({
      slug: f.slug,
      name: f.name,
      provider: f.provider,
      authEnvVar: f.authEnvVar,
      keySetupUrl: f.keySetupUrl,
      costPerCall: f.costPerCall,
      isActive: f.isActive,
      hasKey: f.authEnvVar
        ? !!(process.env[f.authEnvVar] || await hasSecret(f.authEnvVar))
        : true,
    }))
  );

  return NextResponse.json(result);
}
