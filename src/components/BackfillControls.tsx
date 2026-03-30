"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface BackfillResult {
  model: string;
  processed: number;
  remaining: number;
  dates: string[];
}

interface BackfillStatus {
  totalDates: number;
  models: Record<string, { games: number; dates: number }>;
}

export default function BackfillControls({
  modelIds,
}: {
  modelIds: string[];
}) {
  const [selectedModel, setSelectedModel] = useState(modelIds[1] ?? modelIds[0] ?? "v2");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BackfillResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [batchNum, setBatchNum] = useState(0);
  const [includeOdds, setIncludeOdds] = useState(false);
  const [liveRemaining, setLiveRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  const fetchStatus = useCallback(() => {
    return fetch(`/api/admin/backfill/status`)
      .then((r) => r.json())
      .then((s: BackfillStatus) => {
        setStatus(s);
        return s;
      })
      .catch(() => null);
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const syncedDates = status?.models[selectedModel]?.dates ?? 0;
  const syncedGames = status?.models[selectedModel]?.games ?? 0;
  const totalDates = status?.totalDates ?? 0;

  // Use live remaining from backfill responses during a run, otherwise compute from status
  const remaining = liveRemaining ?? (totalDates - syncedDates);
  const synced = totalDates - remaining;
  const progressPct = totalDates > 0 ? Math.round((synced / totalDates) * 100) : 0;

  const runAllBatches = useCallback(async () => {
    setLoading(true);
    setDone(false);
    setError(null);
    setResults([]);
    setBatchNum(0);
    setLiveRemaining(null);
    stopRef.current = false;

    let batch = 0;
    let currentRemaining = remaining;

    while (currentRemaining > 0 && !stopRef.current) {
      batch++;
      setBatchNum(batch);
      try {
        const res = await fetch(`/api/admin/backfill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: selectedModel, batchSize: 30, includeOdds }),
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error ?? "Backfill failed");
        }
        const result: BackfillResult = await res.json();
        setResults((prev) => [result, ...prev]);
        currentRemaining = result.remaining;
        setLiveRemaining(result.remaining);

        if (result.processed === 0) break;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        break;
      }
    }

    setLoading(false);
    setDone(currentRemaining === 0);
    // Refresh status from DB for accurate final state
    await fetchStatus();
    setLiveRemaining(null);
  }, [selectedModel, includeOdds, remaining, fetchStatus]);

  // Reset live state when model changes
  useEffect(() => {
    setLiveRemaining(null);
    setResults([]);
    setDone(false);
  }, [selectedModel]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1">Model</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={loading}
            className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white min-w-32"
          >
            {modelIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeOdds}
            onChange={(e) => setIncludeOdds(e.target.checked)}
            disabled={loading}
            className="rounded border-border-gray"
          />
          <span className="text-xs text-medium-gray" title="Fetches live betting odds from the Odds API (2 calls per batch). Off by default to save quota. Only needed if your model uses odds data differently between versions — odds don't affect winner predictions for v1/v2.">
            Include Odds <span className="text-[10px]">(uses API quota)</span>
          </span>
        </label>

        {loading ? (
          <button
            onClick={() => { stopRef.current = true; }}
            className="bg-espn-red text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-espn-red-dark"
          >
            Stop After Current Batch
          </button>
        ) : (
          <button
            onClick={runAllBatches}
            disabled={remaining === 0}
            className="bg-charcoal text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-50"
          >
            {remaining === 0 ? "Fully Synced" : "Run All"}
          </button>
        )}
      </div>

      {/* Progress */}
      {totalDates > 0 && (
        <div className="space-y-1.5">
          <div className="w-full bg-border-gray rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                done ? "bg-green-500" : "bg-charcoal"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-medium-gray">
            <span>
              {done ? (
                <span className="text-green-600 font-medium">
                  Complete — {synced} of {totalDates} dates synced for {selectedModel} ({syncedGames} games)
                </span>
              ) : loading ? (
                <span className="animate-pulse">
                  Processing batch {batchNum}... {remaining} dates remaining
                </span>
              ) : remaining === 0 ? (
                <span className="text-green-600 font-medium">
                  Fully synced — {synced} of {totalDates} dates for {selectedModel} ({syncedGames} games)
                </span>
              ) : (
                <span>{synced} of {totalDates} dates synced for {selectedModel} — {remaining} remaining</span>
              )}
            </span>
            <span className="font-medium">{progressPct}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <details className="group">
          <summary className="text-sm font-medium text-charcoal cursor-pointer hover:text-medium-gray">
            Batch Log ({results.length} batches)
          </summary>
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className="text-xs text-medium-gray bg-light-gray rounded-lg px-3 py-2"
              >
                <span className="font-medium text-charcoal">Batch {results.length - i}</span>
                {" — "}{r.processed} dates processed, {r.remaining} remaining
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
