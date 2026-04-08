import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const events = await prisma.engagementEvent.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });

    // Daily event counts
    const dailyCounts = new Map<string, number>();
    const eventCounts = new Map<string, number>();
    const pageCounts = new Map<string, number>();
    const visitors = new Set<string>();

    for (const e of events) {
      const date = e.createdAt.toISOString().split("T")[0];
      dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
      eventCounts.set(e.event, (eventCounts.get(e.event) ?? 0) + 1);
      pageCounts.set(e.page, (pageCounts.get(e.page) ?? 0) + 1);
      visitors.add(e.visitorId);
    }

    // Daily unique visitors
    const dailyVisitors = new Map<string, Set<string>>();
    for (const e of events) {
      const date = e.createdAt.toISOString().split("T")[0];
      const set = dailyVisitors.get(date) ?? new Set();
      set.add(e.visitorId);
      dailyVisitors.set(date, set);
    }

    return NextResponse.json({
      totalEvents: events.length,
      uniqueVisitors: visitors.size,
      daily: Array.from(dailyCounts.entries())
        .map(([date, count]) => ({
          date,
          events: count,
          visitors: dailyVisitors.get(date)?.size ?? 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topEvents: Array.from(eventCounts.entries())
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topPages: Array.from(pageCounts.entries())
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch engagement data" },
      { status: 500 }
    );
  }
}
