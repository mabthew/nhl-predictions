"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface CostData {
  totalCalls: number;
  providers: Array<{
    provider: string;
    calls: number;
    errors: number;
    avgResponseMs: number;
    totalCost: number;
  }>;
  daily: Array<Record<string, string | number>>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  allProviders: string[];
}

interface OddsUsage {
  used: number;
  remaining: number;
  total: number;
  pct: number;
}

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const PROVIDER_COLORS: Record<string, string> = {
  "odds-api": "#3b82f6",
  "nhl-api": "#10b981",
};

// Monthly subscriptions
const SUBSCRIPTIONS = [
  {
    name: "Odds API",
    cost: 30,
    notes: "20K plan, 20,000 credits/month",
    quota: 20000,
    provider: "odds-api",
  },
  { name: "Vercel", cost: 0, notes: "Hobby plan, free tier", quota: null, provider: null },
  { name: "Neon Database", cost: 0, notes: "Free tier, 0.5 GB storage", quota: null, provider: null },
];

export default function CostsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<CostData | null>(null);
  const [oddsUsage, setOddsUsage] = useState<OddsUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [costsRes, usageRes] = await Promise.all([
        fetch(`/api/admin/costs?days=${days}`),
        fetch("/api/admin/odds-usage"),
      ]);
      if (costsRes.ok) setData(await costsRes.json());
      if (usageRes.ok) setOddsUsage(await usageRes.json());
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

  const totalMonthly = SUBSCRIPTIONS.reduce((sum, s) => sum + s.cost, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-teko text-2xl font-bold text-charcoal">
            Costs
          </h2>
          <p className="text-sm text-medium-gray">
            Monthly subscriptions, API quota usage, and call activity
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

      {/* Monthly subscriptions */}
      <div className="bg-white border border-border-gray rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-charcoal">
            Monthly Subscriptions
          </h3>
          <div className="text-xl font-bold text-charcoal">
            ${totalMonthly}/mo
          </div>
        </div>
        <div className="space-y-3">
          {SUBSCRIPTIONS.map((sub) => {
            // Use live Odds API usage if available
            const isOddsApi = sub.provider === "odds-api";
            const liveUsed = isOddsApi && oddsUsage ? oddsUsage.used : null;
            const liveTotal = isOddsApi && oddsUsage ? oddsUsage.total : sub.quota;
            const livePct = isOddsApi && oddsUsage ? oddsUsage.pct : null;

            return (
              <div
                key={sub.name}
                className="flex items-center gap-4 py-3 border-t border-border-gray first:border-0 first:pt-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-charcoal text-sm">
                      {sub.name}
                    </span>
                    <span className="text-xs text-medium-gray">
                      {sub.notes}
                    </span>
                  </div>
                  {liveTotal && liveTotal > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-medium-gray">
                          {liveUsed !== null
                            ? `${liveUsed.toLocaleString()} / ${liveTotal.toLocaleString()} credits used this month`
                            : `${liveTotal.toLocaleString()} credits/month`}
                        </span>
                        {livePct !== null && (
                          <span
                            className={`font-medium ${
                              livePct >= 80
                                ? "text-red-500"
                                : livePct >= 50
                                  ? "text-amber-500"
                                  : "text-green-600"
                            }`}
                          >
                            {livePct}%
                          </span>
                        )}
                      </div>
                      <div className="w-full bg-light-gray rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (livePct ?? 0) >= 80
                              ? "bg-red-500"
                              : (livePct ?? 0) >= 50
                                ? "bg-amber-500"
                                : "bg-green-500"
                          }`}
                          style={{ width: `${livePct ?? 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-right font-semibold text-charcoal text-sm w-16">
                  {sub.cost === 0 ? "Free" : `$${sub.cost}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading && !data && (
        <div className="text-sm text-medium-gray animate-pulse">Loading...</div>
      )}

      {data && (
        <>
          {/* API Activity */}
          {data.providers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {data.providers.map((p) => (
                <div
                  key={p.provider}
                  className="bg-white border border-border-gray rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-semibold text-medium-gray uppercase tracking-wide">
                      {p.provider}
                    </div>
                    <div className="text-xs text-medium-gray">
                      last {days} days
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-charcoal">
                    {p.calls.toLocaleString()} <span className="text-base font-normal text-medium-gray">calls</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border-gray">
                    <div>
                      <div className="text-xs text-medium-gray">Errors</div>
                      <div
                        className={`text-sm font-semibold ${
                          p.errors > 0 ? "text-red-500" : "text-charcoal"
                        }`}
                      >
                        {p.errors}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-medium-gray">
                        Average response
                      </div>
                      <div className="text-sm font-semibold text-charcoal">
                        {p.avgResponseMs}ms
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Daily usage chart */}
          {data.daily.length > 0 && (
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-4">
                Daily API Calls
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
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
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {data.allProviders.map((provider) => (
                      <Bar
                        key={provider}
                        dataKey={provider}
                        name={provider}
                        fill={PROVIDER_COLORS[provider] ?? "#8b5cf6"}
                        radius={[4, 4, 0, 0]}
                        stackId="calls"
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top endpoints */}
          {data.topEndpoints.length > 0 && (
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-4">
                Top Endpoints
              </h3>
              <div className="space-y-2">
                {data.topEndpoints.map((e) => (
                  <div
                    key={e.endpoint}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-charcoal font-mono text-xs truncate max-w-md">
                      {e.endpoint}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-light-gray rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-charcoal"
                          style={{
                            width: `${Math.min(
                              100,
                              (e.count / data.topEndpoints[0].count) * 100
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

          {data.totalCalls === 0 && data.providers.length === 0 && (
            <div className="bg-white border border-border-gray rounded-xl p-5 text-center py-12">
              <div className="text-lg font-medium text-charcoal mb-2">
                No API call data yet
              </div>
              <p className="text-sm text-medium-gray">
                API calls will be tracked here as the daily cron jobs and predictions run.
                The quota bar above will fill in as data accumulates.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
