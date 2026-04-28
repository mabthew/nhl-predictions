import { prisma } from "@/lib/db";

interface OutboundMetadata {
  url?: string;
  label?: string;
  partner?: string;
}

interface DestinationRow {
  url: string;
  label: string | null;
  partner: string | null;
  clicks: number;
  uniqueVisitors: number;
  lastClickedAt: Date;
}

async function getOutboundStats() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const events = await prisma.engagementEvent.findMany({
    where: {
      event: "outbound_click",
      createdAt: { gte: since },
    },
    select: {
      metadata: true,
      visitorId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const byUrl = new Map<string, DestinationRow>();
  for (const e of events) {
    const meta = (e.metadata ?? {}) as OutboundMetadata;
    const url = meta.url;
    if (!url) continue;
    const row = byUrl.get(url);
    if (row) {
      row.clicks++;
      if (e.createdAt > row.lastClickedAt) row.lastClickedAt = e.createdAt;
    } else {
      byUrl.set(url, {
        url,
        label: meta.label ?? null,
        partner: meta.partner ?? null,
        clicks: 1,
        uniqueVisitors: 0,
        lastClickedAt: e.createdAt,
      });
    }
  }

  // Second pass for unique visitor count per url
  const visitorsByUrl = new Map<string, Set<string>>();
  for (const e of events) {
    const meta = (e.metadata ?? {}) as OutboundMetadata;
    const url = meta.url;
    if (!url) continue;
    const set = visitorsByUrl.get(url) ?? new Set<string>();
    set.add(e.visitorId);
    visitorsByUrl.set(url, set);
  }
  for (const [url, row] of byUrl.entries()) {
    row.uniqueVisitors = visitorsByUrl.get(url)?.size ?? 0;
  }

  return {
    totalClicks: events.length,
    destinations: Array.from(byUrl.values()).sort(
      (a, b) => b.clicks - a.clicks
    ),
  };
}

function formatDate(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OutboundPage() {
  const { totalClicks, destinations } = await getOutboundStats();

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-teko text-3xl font-bold text-charcoal uppercase tracking-wide">
          Outbound Clicks
        </h2>
        <p className="text-sm text-medium-gray mt-1">
          Last 30 days &middot; {totalClicks} total clicks across{" "}
          {destinations.length} destinations
        </p>
      </div>

      {destinations.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-gray p-8 text-center text-medium-gray">
          No outbound clicks yet. Wrap external links with the OutboundLink
          component to start tracking.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-gray overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-light-gray border-b border-border-gray">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-medium-gray">
                  Destination
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-medium-gray">
                  Partner
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-medium-gray">
                  Clicks
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-medium-gray">
                  Unique Visitors
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-medium-gray">
                  Last Click
                </th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((d) => (
                <tr
                  key={d.url}
                  className="border-b border-border-gray last:border-b-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-charcoal">
                      {d.label ?? d.url}
                    </div>
                    <div className="text-xs text-medium-gray truncate max-w-md">
                      {d.url}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-medium-gray">
                    {d.partner ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-teko text-xl font-bold text-charcoal">
                    {d.clicks}
                  </td>
                  <td className="px-4 py-3 text-right text-charcoal">
                    {d.uniqueVisitors}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-medium-gray">
                    {formatDate(d.lastClickedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
