"use client";

import { useState } from "react";
import BuilderPreviewResults from "./BuilderPreviewResults";

interface ModelConfig {
  name: string;
  description: string;
  weights: Record<string, number>;
  homeIceBonus: number;
  enableStarPower: boolean;
  enableFutures: boolean;
  enableStartingGoalies: boolean;
  enablePlayerMomentum: boolean;
  enableRestFactor: boolean;
  confidenceMultiplier: number;
}

interface DataAvailability {
  futures: boolean;
  rest: boolean;
  starPower: boolean;
  playerMomentum: boolean;
  startingGoalies: boolean;
  odds: boolean;
  oddsDaysAvailable: number;
  oddsDaysTotal: number;
  playerProps: boolean;
}

interface PreviewResult {
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  totalGames: number;
  proposed: { correct: number; total: number; accuracy: number };
  baseline: { id: string; name: string; correct: number; total: number; accuracy: number };
  games: Array<{
    date: string;
    home: string;
    away: string;
    score: string;
    proposedPick: string;
    proposedCorrect: boolean;
    proposedConfidence: number;
    baselinePick: string;
    baselineCorrect: boolean;
    baselineConfidence: number;
  }>;
  dataAvailability?: DataAvailability;
}

type RangePreset = "7d" | "14d" | "30d" | "season" | "last-season" | "custom";

function getSeasonStart(date: Date): string {
  const year = date.getMonth() >= 9 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}-10-01`;
}

function getPresetDates(preset: RangePreset): { start: string; end: string; label: string } {
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000).toISOString().split("T")[0];

  if (preset === "season") {
    return { start: getSeasonStart(today), end: yesterday, label: "This Season" };
  }
  if (preset === "last-season") {
    const thisStart = new Date(getSeasonStart(today) + "T12:00:00");
    const prevEnd = new Date(thisStart.getTime() - 86400000).toISOString().split("T")[0];
    const prevYear = thisStart.getFullYear() - 1;
    return { start: `${prevYear}-10-01`, end: prevEnd, label: "Last Season" };
  }

  const days = preset === "7d" ? 7 : preset === "14d" ? 14 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  return { start: start.toISOString().split("T")[0], end: yesterday, label: `Last ${days} Days` };
}

function estimatePreview(startDate: string, endDate: string) {
  const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  const games = Math.round(days * 7);
  // NHL API: 3 shared + schedule/day + prev-day-schedule/day + 32 clubStats + 32 profiles
  const nhlCalls = 3 + days * 2 + 32 + 32;
  const dfCalls = 32; // DailyFaceoff line combos per team
  const secs = Math.max(3, Math.ceil(days * 0.5 + 5));
  const duration = secs < 60 ? `~${secs}s` : `~${Math.ceil(secs / 60)}m`;
  return { days, games, nhlCalls, dfCalls, duration };
}

const WEIGHT_NAMES: Record<string, string> = {
  goalDiffPerGame: "Goal Differential",
  shotsForPerGame: "Shots For",
  penaltyKillPct: "Penalty Kill",
  powerPlayPct: "Power Play",
  recentForm: "Recent Form",
  irImpact: "Injury Impact",
  goalie: "Goalie Quality",
  futuresMarket: "Futures Market",
  shotsAgainstPerGame: "Shots Against",
  faceoffWinPct: "Faceoff Win",
  restFactor: "Rest Factor",
  playerMomentum: "Player Momentum",
};

export default function ModelPreviewCard({
  config,
  chatId,
  onSave,
}: {
  config: ModelConfig;
  chatId?: string;
  onSave?: () => void;
}) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState(config.name);
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const weightSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
  const validSum = weightSum >= 0.95 && weightSum <= 1.05;

  const sorted = Object.entries(config.weights)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxWeight = sorted[0]?.[1] ?? 1;

  function getDateRange() {
    if (rangePreset === "custom") {
      return { startDate: customStart, endDate: customEnd };
    }
    const { start, end } = getPresetDates(rangePreset);
    return { startDate: start, endDate: end };
  }

  const { startDate: selectedStart, endDate: selectedEnd } = getDateRange();
  const est = selectedStart && selectedEnd ? estimatePreview(selectedStart, selectedEnd) : null;

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange();
      const res = await fetch("/api/admin/builder/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, startDate, endDate }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Preview failed");
      }
      setPreview(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function saveModel() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/builder/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, name: editName, chatId }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Save failed");
      }
      setSaved(true);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-light-gray border border-border-gray rounded-xl p-4 my-2 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="font-semibold text-charcoal text-sm bg-transparent border-b border-transparent hover:border-border-gray focus:border-charcoal focus:outline-none w-full"
            disabled={saved}
          />
          <div className="text-xs text-medium-gray">{config.description}</div>
        </div>
        <div
          className={`text-xs font-medium px-2 py-0.5 rounded ${
            validSum
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          Sum: {weightSum.toFixed(3)}
        </div>
      </div>

      {/* Weight bars */}
      <div className="space-y-1">
        {sorted.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-32 text-medium-gray truncate">
              {WEIGHT_NAMES[key] ?? key}
            </span>
            <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-charcoal"
                style={{ width: `${(value / maxWeight) * 100}%` }}
              />
            </div>
            <span className="w-10 text-right font-medium text-charcoal">
              {(value * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>

      {/* Feature gates + scalars */}
      <div className="flex flex-wrap gap-1.5">
        {config.enableFutures && (
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
            Futures
          </span>
        )}
        {config.enableStarPower && (
          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            Star Power
          </span>
        )}
        {config.enableStartingGoalies && (
          <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
            Starting Goalies
          </span>
        )}
        {config.enablePlayerMomentum && (
          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
            Player Momentum
          </span>
        )}
        {config.enableRestFactor && (
          <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded">
            Rest Factor
          </span>
        )}
        <span className="text-[10px] bg-gray-100 text-medium-gray px-1.5 py-0.5 rounded">
          Home +{config.homeIceBonus}
        </span>
        <span className="text-[10px] bg-gray-100 text-medium-gray px-1.5 py-0.5 rounded">
          Confidence {config.confidenceMultiplier}x
        </span>
      </div>

      {/* Preview range */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap gap-1">
          {(["7d", "14d", "30d", "season", "last-season", "custom"] as RangePreset[]).map((p) => {
            const labels: Record<RangePreset, string> = {
              "7d": "7 Days",
              "14d": "14 Days",
              "30d": "30 Days",
              season: "This Season",
              "last-season": "Last Season",
              custom: "Custom",
            };
            return (
              <button
                key={p}
                onClick={() => setRangePreset(p)}
                disabled={loading}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  rangePreset === p
                    ? "bg-charcoal text-white"
                    : "bg-white border border-border-gray text-medium-gray hover:border-charcoal hover:text-charcoal"
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {rangePreset === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="border border-border-gray rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-charcoal"
            />
            <span className="text-xs text-medium-gray">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="border border-border-gray rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-charcoal"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runPreview}
            disabled={loading || !validSum || (rangePreset === "custom" && (!customStart || !customEnd))}
            className="bg-charcoal text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-50"
          >
            {loading ? "Running..." : "Preview vs Default"}
          </button>
          {est && (
            <div className="text-[10px] text-medium-gray space-y-0.5">
              <div>~{est.games} games &middot; {est.duration} estimated</div>
              <div>
                <span className="text-green-600 font-medium">$0.00</span>
                {" "}&mdash; NHL API: {est.nhlCalls} calls (free) &middot; DailyFaceoff: {est.dfCalls} calls (free) &middot; Odds API: 0 calls
              </div>
            </div>
          )}
          <button
            onClick={saveModel}
            disabled={saving || saved || !validSum}
            className="bg-white border border-border-gray text-charcoal px-4 py-1.5 rounded-lg text-xs font-semibold hover:border-charcoal disabled:opacity-50"
          >
            {saved ? "Saved" : saving ? "Saving..." : "Save Model"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {preview && <BuilderPreviewResults data={preview} />}
    </div>
  );
}
