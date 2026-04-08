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

interface PreviewResult {
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
  onSave,
}: {
  config: ModelConfig;
  onSave?: () => void;
}) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
  const validSum = weightSum >= 0.95 && weightSum <= 1.05;

  const sorted = Object.entries(config.weights)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxWeight = sorted[0]?.[1] ?? 1;

  async function runPreview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/builder/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
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
        body: JSON.stringify(config),
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
        <div>
          <div className="font-semibold text-charcoal text-sm">
            {config.name}
          </div>
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

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={runPreview}
          disabled={loading || !validSum}
          className="bg-charcoal text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-charcoal/90 disabled:opacity-50"
        >
          {loading ? "Running..." : "Preview vs Default"}
        </button>
        <button
          onClick={saveModel}
          disabled={saving || saved || !validSum}
          className="bg-white border border-border-gray text-charcoal px-4 py-1.5 rounded-lg text-xs font-semibold hover:border-charcoal disabled:opacity-50"
        >
          {saved ? "Saved" : saving ? "Saving..." : "Save Model"}
        </button>
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
