import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { classifyUserAgent, type DeviceType } from "@/lib/userAgent";
import { computeSessionStats } from "@/lib/engagementSessions";

interface EventRow {
  event: string;
  page: string;
  visitorId: string;
  deviceHash: string | null;
  userAgent: string | null;
  referrer: string | null;
  country: string | null;
  isAdmin: boolean;
  createdAt: Date;
}

interface Bucket {
  totalEvents: number;
  uniqueVisitors: number;
  uniqueDevices: number;
  daily: Array<{ date: string; events: number; visitors: number; devices: number; newVisitors: number }>;
  topEvents: Array<{ event: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  devices: Record<DeviceType, number>;
  browsers: Array<{ browser: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
  hourly: Array<{ hour: number; events: number }>;
  sessions: { total: number; avgPagesPerSession: number; bounceRate: number };
}

function toDateKey(d: Date): string {
  return d.toISOString().split("T")[0];
}

function topN<T extends string>(counts: Map<T, number>, n: number, key: "event" | "page" | "referrer" | "browser" | "country") {
  return Array.from(counts.entries())
    .map(([v, count]) => ({ [key]: v, count }) as Record<string, string | number>)
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, n);
}

function buildBucket(events: EventRow[], firstSeenByVisitor: Map<string, string>): Bucket {
  const dailyEvents = new Map<string, number>();
  const dailyVisitors = new Map<string, Set<string>>();
  const dailyDevices = new Map<string, Set<string>>();
  const dailyNewVisitors = new Map<string, number>();

  const eventCounts = new Map<string, number>();
  const pageCounts = new Map<string, number>();
  const referrerCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const devices: Record<DeviceType, number> = { mobile: 0, tablet: 0, desktop: 0, bot: 0 };
  const hourly = new Array(24).fill(0).map((_, hour) => ({ hour, events: 0 }));

  const visitors = new Set<string>();
  const deviceKeys = new Set<string>();

  for (const e of events) {
    const date = toDateKey(e.createdAt);
    dailyEvents.set(date, (dailyEvents.get(date) ?? 0) + 1);

    const visitorsOnDay = dailyVisitors.get(date) ?? new Set<string>();
    visitorsOnDay.add(e.visitorId);
    dailyVisitors.set(date, visitorsOnDay);

    const deviceKey = e.deviceHash ?? `v:${e.visitorId}`;
    const devicesOnDay = dailyDevices.get(date) ?? new Set<string>();
    devicesOnDay.add(deviceKey);
    dailyDevices.set(date, devicesOnDay);

    eventCounts.set(e.event, (eventCounts.get(e.event) ?? 0) + 1);
    pageCounts.set(e.page, (pageCounts.get(e.page) ?? 0) + 1);

    if (e.referrer) {
      try {
        const host = new URL(e.referrer).host;
        if (host) referrerCounts.set(host, (referrerCounts.get(host) ?? 0) + 1);
      } catch {
        // skip malformed
      }
    }

    if (e.country) {
      countryCounts.set(e.country, (countryCounts.get(e.country) ?? 0) + 1);
    }

    const uaInfo = classifyUserAgent(e.userAgent);
    devices[uaInfo.device] += 1;
    browserCounts.set(uaInfo.browser, (browserCounts.get(uaInfo.browser) ?? 0) + 1);

    hourly[e.createdAt.getUTCHours()].events += 1;

    visitors.add(e.visitorId);
    if (e.deviceHash) deviceKeys.add(e.deviceHash);
  }

  for (const [visitorId, firstDate] of firstSeenByVisitor) {
    if (visitors.has(visitorId) && dailyEvents.has(firstDate)) {
      dailyNewVisitors.set(firstDate, (dailyNewVisitors.get(firstDate) ?? 0) + 1);
    }
  }

  const daily = Array.from(dailyEvents.keys())
    .sort()
    .map((date) => ({
      date,
      events: dailyEvents.get(date) ?? 0,
      visitors: dailyVisitors.get(date)?.size ?? 0,
      devices: dailyDevices.get(date)?.size ?? 0,
      newVisitors: dailyNewVisitors.get(date) ?? 0,
    }));

  const sessions = computeSessionStats(
    events.map((e) => ({ visitorId: e.visitorId, deviceHash: e.deviceHash, createdAt: e.createdAt }))
  );

  return {
    totalEvents: events.length,
    uniqueVisitors: visitors.size,
    uniqueDevices: deviceKeys.size,
    daily,
    topEvents: topN(eventCounts, 10, "event") as Array<{ event: string; count: number }>,
    topPages: topN(pageCounts, 10, "page") as Array<{ page: string; count: number }>,
    topReferrers: topN(referrerCounts, 10, "referrer") as Array<{ referrer: string; count: number }>,
    devices,
    browsers: (topN(browserCounts, 5, "browser") as Array<{ browser: string; count: number }>),
    countries: (topN(countryCounts, 10, "country") as Array<{ country: string; count: number }>),
    hourly,
    sessions,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const events: EventRow[] = await prisma.engagementEvent.findMany({
      where: { createdAt: { gte: since } },
      select: {
        event: true,
        page: true,
        visitorId: true,
        deviceHash: true,
        userAgent: true,
        referrer: true,
        country: true,
        isAdmin: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const visitorIdsInWindow = Array.from(new Set(events.map((e) => e.visitorId)));
    const firstSeenRows = visitorIdsInWindow.length > 0
      ? await prisma.engagementEvent.groupBy({
          by: ["visitorId"],
          where: { visitorId: { in: visitorIdsInWindow } },
          _min: { createdAt: true },
        })
      : [];

    const firstSeenByVisitor = new Map<string, string>();
    for (const row of firstSeenRows) {
      if (row._min.createdAt) {
        firstSeenByVisitor.set(row.visitorId, toDateKey(row._min.createdAt));
      }
    }

    const realEvents = events.filter((e) => !e.isAdmin);
    const adminEvents = events.filter((e) => e.isAdmin);

    const main = buildBucket(realEvents, firstSeenByVisitor);
    const adminActivity = buildBucket(adminEvents, firstSeenByVisitor);

    return NextResponse.json({ ...main, adminActivity });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch engagement data" },
      { status: 500 }
    );
  }
}
