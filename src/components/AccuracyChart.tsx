"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { AccuracyPoint } from "@/lib/history";

interface AccuracyChartProps {
  data: AccuracyPoint[];
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "Season", days: 0 },
] as const;

export default function AccuracyChart({ data }: AccuracyChartProps) {
  const [range, setRange] = useState<number>(30);

  const filtered = useMemo(() => {
    let source = data;
    if (range > 0 && data.length > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - range);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      source = data.filter((d) => d.date >= cutoffStr);
    }
    if (source.length === 0) return source;

    // Fill in missing dates with nulls so the line breaks
    const dataMap = new Map(source.map((d) => [d.date, d]));
    const start = new Date(source[0].date + "T12:00:00");
    const end = new Date(source[source.length - 1].date + "T12:00:00");
    const filled: { date: string; winnerPct: number | null; ouPct: number | null; games: number }[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const point = dataMap.get(dateStr);
      if (point) {
        filled.push(point);
      } else {
        filled.push({ date: dateStr, winnerPct: null, ouPct: null, games: 0 });
      }
    }
    return filled;
  }, [data, range]);

  if (data.length < 2) {
    return (
      <div className="text-center py-8 text-sm text-medium-gray">
        Not enough data for a chart yet. Check back after more games are synced.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div>
      {/* Range buttons */}
      <div className="flex items-center gap-1.5 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.days)}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              range === r.days
                ? "bg-charcoal text-white"
                : "bg-light-gray text-medium-gray hover:bg-border-gray"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dddddd" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "#5b5e5e" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "#5b5e5e" }}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#232525",
                border: "none",
                borderRadius: 8,
                fontSize: 12,
                color: "#fff",
              }}
              labelFormatter={(label) => formatDate(String(label))}
              formatter={(value, name) => [
                `${value}%`,
                name === "winnerPct" ? "Winner Picks" : "Over/Under Picks",
              ]}
            />
            <ReferenceLine
              y={50}
              stroke="#5b5e5e"
              strokeDasharray="6 4"
              label={{
                value: "Coin Flip",
                position: "right",
                fontSize: 10,
                fill: "#5b5e5e",
              }}
            />
            <Line
              type="monotone"
              dataKey="winnerPct"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="winnerPct"
            />
            <Line
              type="monotone"
              dataKey="ouPct"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
              name="ouPct"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-500 rounded" />
          <span className="text-[11px] text-medium-gray">Winner Accuracy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-amber-500 rounded" />
          <span className="text-[11px] text-medium-gray">Over/Under Accuracy</span>
        </div>
      </div>
    </div>
  );
}
