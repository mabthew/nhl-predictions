import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const logs = await prisma.apiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    // By provider
    const providerStats = new Map<
      string,
      { calls: number; errors: number; avgMs: number; cost: number; totalMs: number }
    >();
    for (const log of logs) {
      const stats = providerStats.get(log.provider) ?? {
        calls: 0,
        errors: 0,
        avgMs: 0,
        cost: 0,
        totalMs: 0,
      };
      stats.calls++;
      stats.totalMs += log.responseTime;
      stats.cost += log.costEstimate;
      if (log.statusCode >= 400) stats.errors++;
      providerStats.set(log.provider, stats);
    }

    const providers = Array.from(providerStats.entries()).map(
      ([provider, stats]) => ({
        provider,
        calls: stats.calls,
        errors: stats.errors,
        avgResponseMs: Math.round(stats.totalMs / stats.calls),
        totalCost: Math.round(stats.cost * 1000) / 1000,
      })
    );

    // Daily breakdown
    const dailyCalls = new Map<string, Map<string, number>>();
    for (const log of logs) {
      const date = log.createdAt.toISOString().split("T")[0];
      const byProvider = dailyCalls.get(date) ?? new Map<string, number>();
      byProvider.set(log.provider, (byProvider.get(log.provider) ?? 0) + 1);
      dailyCalls.set(date, byProvider);
    }

    const allProviders = Array.from(providerStats.keys());
    const daily = Array.from(dailyCalls.entries())
      .map(([date, byProvider]) => {
        const row: Record<string, string | number> = { date };
        for (const p of allProviders) {
          row[p] = byProvider.get(p) ?? 0;
        }
        row.total = Array.from(byProvider.values()).reduce((a, b) => a + b, 0);
        return row;
      })
      .sort((a, b) =>
        (a.date as string).localeCompare(b.date as string)
      );

    // Top endpoints
    const endpointCounts = new Map<string, number>();
    for (const log of logs) {
      const key = `${log.provider}: ${log.endpoint}`;
      endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);
    }
    const topEndpoints = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalCalls: logs.length,
      providers,
      daily,
      topEndpoints,
      allProviders,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch cost data" },
      { status: 500 }
    );
  }
}
