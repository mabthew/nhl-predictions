"use client";

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

export default function AccuracyChart({ data }: AccuracyChartProps) {
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
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dddddd" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 10, fill: "#5b5e5e" }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[30, 80]}
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
              name === "winnerPct" ? "Winner Picks" : "O/U Picks",
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
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="winnerPct"
          />
          <Line
            type="monotone"
            dataKey="ouPct"
            stroke="#e52534"
            strokeWidth={2}
            dot={false}
            name="ouPct"
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-green-500 rounded" />
          <span className="text-[10px] text-medium-gray">Winner Picks (7-day avg)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-espn-red rounded" />
          <span className="text-[10px] text-medium-gray">O/U Picks (7-day avg)</span>
        </div>
      </div>
    </div>
  );
}
