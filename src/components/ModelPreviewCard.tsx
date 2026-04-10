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
  dynamicWeights?: Record<string, number>;
  enabledFeeds?: string[];
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
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [inactiveFeeds, setInactiveFeeds] = useState<InactiveFeed[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editName, setEditName] = useState(config.name);
  const [rangePreset, setRangePreset] = useState<RangePreset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fixedSum = Object.values(config.weights).reduce((a, b) => a + b, 0);
  const dynamicSum = config.dynamicWeights
    ? Object.values(config.dynamicWeights).reduce((a, b) => a + b, 0)
    : 0;
  const weightSum = fixedSum + dynamicSum;
  const validSum = weightSum >= 0.95 && weightSum <= 1.05;

  const sorted = Object.entries(config.weights)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const maxWeight = sorted[0]?.[1] ?? 1;

  const dynamicSorted = config.dynamicWeights
    ? Object.entries(config.dynamicWeights)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
    : [];

  const dailyFeedCost = config.enabledFeeds?.length
    ? (config.enabledFeeds.length * 32 * 0.003) // rough estimate per feed
    : 0;

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
    setSaveWarning(null);
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
      const body = await res.json();
      if (body.warning) {
        setSaveWarning(body.warning);
        setInactiveFeeds(body.inactiveFeeds ?? []);
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
        {dynamicSorted.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className="w-32 text-amber-600 truncate flex items-center gap-1">
              <span className="text-[9px]">$</span>
              {WEIGHT_NAMES[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            </span>
            <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${(value / maxWeight) * 100}%` }}
              />
            </div>
            <span className="w-10 text-right font-medium text-amber-600">
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
        {config.enabledFeeds?.map((slug) => (
          <span key={slug} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
            $ {slug}
          </span>
        ))}
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
                <span className="text-green-600 font-medium">Preview: $0.00</span>
                {" "}&mdash; NHL API: {est.nhlCalls} calls (free) &middot; DailyFaceoff: {est.dfCalls} calls (free) &middot; Odds API: 0 calls
              </div>
              {dailyFeedCost > 0 && (
                <div>
                  <span className={`font-medium ${dailyFeedCost > 1 ? "text-amber-600" : "text-medium-gray"}`}>
                    Daily production: ~${dailyFeedCost.toFixed(2)}/day
                  </span>
                  {" "}&mdash; {config.enabledFeeds?.length} paid feed{(config.enabledFeeds?.length ?? 0) > 1 ? "s" : ""} &times; 32 teams
                  {dailyFeedCost > 1 && <span className="text-amber-600 ml-1">(exceeds $1/day warning)</span>}
                </div>
              )}
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

      {saveWarning && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 space-y-2">
          <div className="text-amber-800 font-medium">Inactive feeds included</div>
          <p className="text-amber-700">
            These feeds will use neutral scores until activated.
            Once active, data will be available after the next scheduled feed run.
          </p>
          {inactiveFeeds.length > 0 && (
            <div className="space-y-1.5">
              {inactiveFeeds.map((feed) => (
                <InlineActivateButton
                  key={feed.slug}
                  feed={feed}
                  onActivated={(s) => {
                    setInactiveFeeds((prev) => prev.filter((f) => f.slug !== s));
                    if (inactiveFeeds.length <= 1) setSaveWarning(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {preview && <BuilderPreviewResults data={preview} />}
    </div>
  );
}

interface InactiveFeed {
  slug: string;
  name: string;
  costPerCall: number;
  authEnvVar: string | null;
  hasKey: boolean;
  keySetupUrl: string | null;
}

function InlineActivateButton({
  feed,
  onActivated,
}: {
  feed: InactiveFeed;
  onActivated: (slug: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [needsKey, setNeedsKey] = useState(!!feed.authEnvVar && !feed.hasKey);

  const dailyCost = feed.costPerCall * 32;

  async function handleActivate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/feeds/${feed.slug}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === "missing_api_key") {
          setNeedsKey(true);
          setShowKeyInput(true);
        } else {
          setError(body.error ?? "Activation failed");
        }
        return;
      }
      setActivated(true);
      onActivated(feed.slug);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveKeyAndActivate() {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setError(null);
    try {
      // Save and validate the key
      const keyRes = await fetch(`/api/admin/feeds/${feed.slug}/key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const keyBody = await keyRes.json();
      if (!keyRes.ok) {
        setError(keyBody.error ?? "Failed to save key");
        return;
      }

      // Now activate the feed
      const actRes = await fetch(`/api/admin/feeds/${feed.slug}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      if (!actRes.ok) {
        const actBody = await actRes.json();
        setError(actBody.error ?? "Activation failed after key save");
        return;
      }

      setActivated(true);
      onActivated(feed.slug);
    } catch {
      setError("Network error");
    } finally {
      setSavingKey(false);
    }
  }

  if (activated) {
    return (
      <div className="flex items-center justify-between bg-green-50 rounded-lg px-2.5 py-1.5">
        <div>
          <span className="text-[11px] font-medium text-green-800">{feed.name}</span>
          <span className="text-[10px] text-green-600 ml-2">Activated</span>
        </div>
        <span className="text-[10px] text-green-600">Data available after next feed run</span>
      </div>
    );
  }

  return (
    <div className="space-y-1" role="status" aria-live="polite">
      <div className="flex items-center justify-between bg-white border border-border-gray rounded-lg px-2.5 py-1.5">
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-charcoal">{feed.name}</span>
          {feed.costPerCall === 0 ? (
            <span className="text-[10px] text-green-700 ml-2">Free</span>
          ) : (
            <span className="text-[10px] text-amber-700 ml-2">~${dailyCost.toFixed(2)}/day</span>
          )}
        </div>
        {needsKey && !showKeyInput ? (
          <button
            onClick={() => setShowKeyInput(true)}
            className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer transition-colors shrink-0"
          >
            Add API Key
          </button>
        ) : !needsKey ? (
          <button
            onClick={handleActivate}
            disabled={loading}
            aria-label={`Activate ${feed.name}`}
            className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 ${
              loading
                ? "opacity-50 cursor-not-allowed bg-charcoal text-white"
                : "bg-charcoal text-white hover:bg-charcoal/80 cursor-pointer"
            }`}
          >
            {loading ? "..." : "Activate"}
          </button>
        ) : null}
      </div>

      {showKeyInput && (
        <div className="bg-white border border-border-gray rounded-lg px-2.5 py-2 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={feed.authEnvVar ?? "API key"}
              className="flex-1 text-[11px] border border-border-gray rounded px-2 py-1 bg-light-gray focus:outline-none focus:border-charcoal font-mono"
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveKeyAndActivate(); }}
            />
            <button
              onClick={handleSaveKeyAndActivate}
              disabled={savingKey || !apiKey.trim()}
              className="px-2.5 py-1 rounded text-[10px] font-medium bg-charcoal text-white hover:bg-charcoal/80 disabled:opacity-50 cursor-pointer shrink-0 transition-colors"
            >
              {savingKey ? "..." : "Save & Activate"}
            </button>
          </div>
          {feed.keySetupUrl && (
            <a
              href={feed.keySetupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-accent-blue hover:underline"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Get an API key
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="text-[10px] bg-red-50 rounded px-2.5 py-1.5">
          <div className="text-red-700">{error}</div>
        </div>
      )}
    </div>
  );
}
