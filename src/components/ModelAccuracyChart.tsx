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
  Legend,
} from "recharts";

interface ModelTimelineData {
  modelId: string;
  modelName: string;
  data: Array<{ date: string; winnerPct: number; games: number }>;
}

interface Props {
  models: ModelTimelineData[];
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "Season", days: 0 },
] as const;

const MODEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function ModelAccuracyChart({ models }: Props) {
  const [range, setRange] = useState<number>(30);

  const merged = useMemo(() => {
    // Collect all dates across all models
    const dateSet = new Set<string>();
    for (const m of models) {
      for (const d of m.data) dateSet.add(d.date);
    }

    let allDates = Array.from(dateSet).sort();

    // Filter by range
    if (range > 0 && allDates.length > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - range);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      allDates = allDates.filter((d) => d >= cutoffStr);
    }

    // Build merged data: each row has date + one winnerPct per model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataMap = new Map<string, Record<string, any>>();
    for (const m of models) {
      const lookup = new Map(m.data.map((d) => [d.date, d.winnerPct]));
      for (const date of allDates) {
        const row = dataMap.get(date) ?? { date };
        row[m.modelId] = lookup.get(date) ?? null;
        dataMap.set(date, row);
      }
    }

    return Array.from(dataMap.values());
  }, [models, range]);

  if (models.length === 0 || merged.length < 2) {
    return (
      <div className="text-center py-8 text-sm text-medium-gray">
        Not enough data for a chart. Backfill at least two models to see a comparison.
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div>
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

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
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
              formatter={(value, name) => {
                const model = models.find((m) => m.modelId === String(name));
                return [`${value}%`, model?.modelName ?? String(name)];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const model = models.find((m) => m.modelId === value);
                return model?.modelName ?? value;
              }}
              wrapperStyle={{ fontSize: 11 }}
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
            {models.map((m, i) => (
              <Line
                key={m.modelId}
                type="monotone"
                dataKey={m.modelId}
                stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                name={m.modelId}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
