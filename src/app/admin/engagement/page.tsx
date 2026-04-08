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

interface EngagementData {
  totalEvents: number;
  uniqueVisitors: number;
  daily: Array<{ date: string; events: number; visitors: number }>;
  topEvents: Array<{ event: string; count: number }>;
  topPages: Array<{ page: string; count: number }>;
}

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

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
            Page views, feature usage, and visitor metrics
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
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <div className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-2">
                Total Events
              </div>
              <div className="text-3xl font-bold text-charcoal">
                {data.totalEvents.toLocaleString()}
              </div>
              <div className="text-xs text-medium-gray mt-1">
                last {days} days
              </div>
            </div>
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <div className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-2">
                Unique Visitors
              </div>
              <div className="text-3xl font-bold text-charcoal">
                {data.uniqueVisitors.toLocaleString()}
              </div>
              <div className="text-xs text-medium-gray mt-1">
                last {days} days
              </div>
            </div>
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <div className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-2">
                Daily Average
              </div>
              <div className="text-3xl font-bold text-charcoal">
                {data.daily.length > 0
                  ? Math.round(data.totalEvents / data.daily.length)
                  : 0}
              </div>
              <div className="text-xs text-medium-gray mt-1">
                events per day
              </div>
            </div>
          </div>

          {/* Daily traffic chart */}
          {data.daily.length > 0 && (
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-4">
                Daily Traffic
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.daily}
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
                      dataKey="visitors"
                      name="Unique Visitors"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.15}
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
          )}

          {/* Top pages and events */}
          <div className="grid gap-4 md:grid-cols-2">
            {data.topPages.length > 0 && (
              <div className="bg-white border border-border-gray rounded-xl p-5">
                <h3 className="text-sm font-semibold text-charcoal mb-4">
                  Top Pages
                </h3>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topPages}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#dddddd"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "#5b5e5e" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="page"
                        tick={{ fontSize: 10, fill: "#5b5e5e" }}
                        width={120}
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
                      <Bar
                        dataKey="count"
                        name="Views"
                        fill="#232525"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {data.topEvents.length > 0 && (
              <div className="bg-white border border-border-gray rounded-xl p-5">
                <h3 className="text-sm font-semibold text-charcoal mb-4">
                  Top Events
                </h3>
                <div className="space-y-2">
                  {data.topEvents.map((e) => (
                    <div
                      key={e.event}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-charcoal font-medium">
                        {formatEventName(e.event)}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-light-gray rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-charcoal"
                            style={{
                              width: `${Math.min(
                                100,
                                (e.count / data.topEvents[0].count) * 100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-medium-gray w-12 text-right">
                          {e.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {data.totalEvents === 0 && (
            <div className="text-center py-12 text-medium-gray">
              <div className="text-lg font-medium mb-2">No engagement data yet</div>
              <p className="text-sm">
                Events will appear here as visitors browse the site.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatEventName(event: string): string {
  return event
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
