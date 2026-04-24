"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type DeviceBreakdown = { mobile: number; tablet: number; desktop: number; bot: number };

interface Bucket {
  totalEvents: number;
  uniqueVisitors: number;
  uniqueDevices: number;
  daily: Array<{ date: string; events: number; visitors: number; devices: number; newVisitors: number }>;
  topEvents: Array<{ event: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
  topReferrers: Array<{ referrer: string; count: number }>;
  devices: DeviceBreakdown;
  browsers: Array<{ browser: string; count: number }>;
  countries: Array<{ country: string; count: number }>;
  hourly: Array<{ hour: number; events: number }>;
  sessions: { total: number; avgPagesPerSession: number; bounceRate: number };
}

interface EngagementData extends Bucket {
  adminActivity: Bucket;
}

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const DEVICE_COLORS: Record<keyof DeviceBreakdown, string> = {
  desktop: "#232525",
  mobile: "#3b82f6",
  tablet: "#10b981",
  bot: "#9ca3af",
};

const DEVICE_LABELS: Record<keyof DeviceBreakdown, string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
  bot: "Bots & Crawlers",
};

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  NL: "Netherlands",
  SE: "Sweden",
  FI: "Finland",
  RU: "Russia",
  CZ: "Czech Republic",
  SK: "Slovakia",
  CH: "Switzerland",
  MX: "Mexico",
  JP: "Japan",
  KR: "South Korea",
  IN: "India",
  BR: "Brazil",
  IE: "Ireland",
  NO: "Norway",
  DK: "Denmark",
  AT: "Austria",
  PL: "Poland",
  IT: "Italy",
  ES: "Spain",
};

export default function EngagementPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<EngagementData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/engagement?days=${days}`);
      if (res.ok) setData(await res.json());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-teko text-2xl font-bold text-charcoal">
            Engagement
          </h2>
          <p className="text-sm text-medium-gray">
            Visitor traffic, sessions, and audience breakdowns. Admin activity is shown separately at the bottom.
          </p>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === opt.days
                  ? "bg-charcoal text-white"
                  : "bg-white border border-border-gray text-medium-gray hover:border-charcoal hover:text-charcoal"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="text-sm text-medium-gray animate-pulse">Loading...</div>
      )}

      {data && !loading && (
        <>
          <HeadlineStats bucket={data} days={days} />
          <SecondaryStrip bucket={data} days={days} />

          {data.daily.length > 0 && (
            <DailyTrafficChart daily={data.daily} formatDate={formatDate} />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <TopPagesCard pages={data.topPages} />
            <TopReferrersCard referrers={data.topReferrers} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DeviceBreakdownCard devices={data.devices} />
            <TopBrowsersCard browsers={data.browsers} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CountriesCard countries={data.countries} />
            <HourOfDayCard hourly={data.hourly} />
          </div>

          {data.topEvents.length > 0 && (
            <TopEventsCard events={data.topEvents} />
          )}

          {data.totalEvents === 0 && (
            <div className="text-center py-12 text-medium-gray">
              <div className="text-lg font-medium mb-2">No engagement data yet</div>
              <p className="text-sm">
                Events will appear here as visitors browse the site.
              </p>
            </div>
          )}

          <AdminActivityPanel admin={data.adminActivity} days={days} />
        </>
      )}
    </div>
  );
}

function HeadlineStats({ bucket, days }: { bucket: Bucket; days: number }) {
  const { sessions } = bucket;
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        label="Unique Devices"
        value={bucket.uniqueDevices.toLocaleString()}
        hint={`last ${days} days · hashed IP + user agent`}
      />
      <StatCard
        label="Sessions"
        value={sessions.total.toLocaleString()}
        hint="30-minute inactivity gap"
      />
      <StatCard
        label="Bounce Rate"
        value={`${(sessions.bounceRate * 100).toFixed(1)}%`}
        hint="single page view sessions"
      />
      <StatCard
        label="Average Pages Per Session"
        value={sessions.avgPagesPerSession.toFixed(2)}
        hint="depth of engagement"
      />
    </div>
  );
}

function SecondaryStrip({ bucket, days }: { bucket: Bucket; days: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard
        label="Total Events"
        value={bucket.totalEvents.toLocaleString()}
        hint={`last ${days} days`}
        muted
      />
      <StatCard
        label="Unique Visitors (Browsers)"
        value={bucket.uniqueVisitors.toLocaleString()}
        hint="localStorage identifier"
        muted
      />
      <StatCard
        label="Daily Average"
        value={bucket.daily.length > 0 ? Math.round(bucket.totalEvents / bucket.daily.length).toLocaleString() : "0"}
        hint="events per day"
        muted
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  muted = false,
}: {
  label: string;
  value: string;
  hint: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`border border-border-gray rounded-xl p-5 ${
        muted ? "bg-light-gray" : "bg-white"
      }`}
    >
      <div className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className={`font-bold text-charcoal ${muted ? "text-2xl" : "text-3xl"}`}>
        {value}
      </div>
      <div className="text-xs text-medium-gray mt-1">{hint}</div>
    </div>
  );
}

function DailyTrafficChart({
  daily,
  formatDate,
}: {
  daily: Bucket["daily"];
  formatDate: (s: string) => string;
}) {
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">
        Daily Traffic
      </h3>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={daily}
            margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#dddddd" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "#5b5e5e" }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 10, fill: "#5b5e5e" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#232525",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
              labelFormatter={(label) => formatDate(String(label))}
            />
            <Area
              type="monotone"
              dataKey="devices"
              name="Unique Devices"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.18}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="newVisitors"
              name="New Visitors"
              stroke="#f59e0b"
              fill="#f59e0b"
              fillOpacity={0.18}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="events"
              name="Events"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopPagesCard({ pages }: { pages: Bucket["topPages"] }) {
  if (pages.length === 0) {
    return (
      <EmptyCard title="Top Pages" message="No page views yet." />
    );
  }
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">Top Pages</h3>
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={pages}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#dddddd" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "#5b5e5e" }} />
            <YAxis
              type="category"
              dataKey="page"
              tick={{ fontSize: 10, fill: "#5b5e5e" }}
              width={130}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#232525",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
            />
            <Bar dataKey="count" name="Views" fill="#232525" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopReferrersCard({ referrers }: { referrers: Bucket["topReferrers"] }) {
  if (referrers.length === 0) {
    return (
      <EmptyCard
        title="Top Referrers"
        message="No external referrers in this window. Most traffic arrived directly or from same-origin links."
      />
    );
  }
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">Top Referrers</h3>
      <BarList items={referrers.map((r) => ({ label: r.referrer, count: r.count }))} />
    </div>
  );
}

function DeviceBreakdownCard({ devices }: { devices: DeviceBreakdown }) {
  const total = devices.mobile + devices.tablet + devices.desktop + devices.bot;
  const keys: Array<keyof DeviceBreakdown> = ["desktop", "mobile", "tablet", "bot"];

  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">Device Breakdown</h3>
      {total === 0 ? (
        <p className="text-sm text-medium-gray">No device data yet.</p>
      ) : (
        <>
          <div className="flex h-3 rounded-full overflow-hidden bg-light-gray mb-4">
            {keys.map((k) => {
              const pct = (devices[k] / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={k}
                  style={{ width: `${pct}%`, backgroundColor: DEVICE_COLORS[k] }}
                  title={`${DEVICE_LABELS[k]}: ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            {keys.map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: DEVICE_COLORS[k] }}
                />
                <span className="text-charcoal font-medium">{DEVICE_LABELS[k]}</span>
                <span className="text-medium-gray ml-auto">
                  {devices[k].toLocaleString()}{" "}
                  <span className="text-xs">
                    ({total > 0 ? ((devices[k] / total) * 100).toFixed(1) : "0"}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopBrowsersCard({ browsers }: { browsers: Bucket["browsers"] }) {
  if (browsers.length === 0) {
    return <EmptyCard title="Top Browsers" message="No browser data yet." />;
  }
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">Top Browsers</h3>
      <BarList items={browsers.map((b) => ({ label: b.browser, count: b.count }))} />
    </div>
  );
}

function CountriesCard({ countries }: { countries: Bucket["countries"] }) {
  if (countries.length === 0) {
    return (
      <EmptyCard
        title="Top Countries"
        message="No geography data yet. Country comes from the Vercel edge header and only populates on deployed requests."
      />
    );
  }
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">Top Countries</h3>
      <BarList
        items={countries.map((c) => ({
          label: COUNTRY_NAMES[c.country] ?? c.country,
          count: c.count,
        }))}
      />
    </div>
  );
}

function HourOfDayCard({ hourly }: { hourly: Bucket["hourly"] }) {
  const max = hourly.reduce((m, h) => Math.max(m, h.events), 0);
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-1">Traffic By Hour</h3>
      <p className="text-xs text-medium-gray mb-4">Events grouped by hour of day (Coordinated Universal Time)</p>
      {max === 0 ? (
        <p className="text-sm text-medium-gray">No traffic patterns yet.</p>
      ) : (
        <div className="flex items-end gap-1 h-40">
          {hourly.map((h) => {
            const pct = max > 0 ? (h.events / max) * 100 : 0;
            return (
              <div
                key={h.hour}
                className="flex-1 flex flex-col items-center justify-end group"
                title={`${h.hour}:00 - ${h.events} events`}
              >
                <div
                  className="w-full rounded-t bg-charcoal hover:bg-blue-600 transition-colors"
                  style={{ height: `${pct}%`, minHeight: h.events > 0 ? "2px" : "0" }}
                />
                <span className="text-[9px] text-medium-gray mt-1">
                  {h.hour % 3 === 0 ? h.hour : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopEventsCard({ events }: { events: Bucket["topEvents"] }) {
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-4">Top Events</h3>
      <BarList items={events.map((e) => ({ label: formatEventName(e.event), count: e.count }))} />
    </div>
  );
}

function BarList({ items }: { items: Array<{ label: string; count: number }> }) {
  const max = items.reduce((m, i) => Math.max(m, i.count), 0);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between text-sm"
        >
          <span className="text-charcoal font-medium truncate pr-2" title={item.label}>
            {item.label}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-24 bg-light-gray rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-charcoal"
                style={{ width: `${max > 0 ? (item.count / max) * 100 : 0}%` }}
              />
            </div>
            <span className="text-xs text-medium-gray w-12 text-right">
              {item.count.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <h3 className="text-sm font-semibold text-charcoal mb-2">{title}</h3>
      <p className="text-sm text-medium-gray">{message}</p>
    </div>
  );
}

function AdminActivityPanel({ admin, days }: { admin: Bucket; days: number }) {
  return (
    <details className="bg-light-gray border border-border-gray rounded-xl p-5 group">
      <summary className="cursor-pointer select-none">
        <span className="text-sm font-semibold text-charcoal">
          Admin Activity
        </span>
        <span className="text-xs text-medium-gray ml-2">
          ({admin.totalEvents.toLocaleString()} events · {admin.uniqueDevices.toLocaleString()} devices · excluded from stats above)
        </span>
      </summary>
      <div className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            label="Admin Events"
            value={admin.totalEvents.toLocaleString()}
            hint={`last ${days} days`}
            muted
          />
          <StatCard
            label="Admin Devices"
            value={admin.uniqueDevices.toLocaleString()}
            hint="likely just you"
            muted
          />
          <StatCard
            label="Admin Sessions"
            value={admin.sessions.total.toLocaleString()}
            hint="30-minute gap"
            muted
          />
        </div>
        {admin.topPages.length > 0 && (
          <div className="bg-white border border-border-gray rounded-xl p-5">
            <h3 className="text-sm font-semibold text-charcoal mb-4">
              Top Admin Pages
            </h3>
            <BarList
              items={admin.topPages.map((p) => ({ label: p.page, count: p.count }))}
            />
          </div>
        )}
      </div>
    </details>
  );
}

function formatEventName(event: string): string {
  return event.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
