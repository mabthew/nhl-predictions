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
  const [selectedModels, setSelectedModels] = useState<Set<string>>(
    new Set([modelIds[1] ?? modelIds[0] ?? "v2"])
  );
  const [activeModel, setActiveModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BackfillResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<BackfillStatus | null>(null);
  const [batchNum, setBatchNum] = useState(0);
  const [includeOdds, setIncludeOdds] = useState(false);
  const [liveRemaining, setLiveRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const stopRef = useRef(false);

  function toggleModel(id: string) {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  const displayModel = activeModel || Array.from(selectedModels)[0] || "";
  const syncedDates = status?.models[displayModel]?.dates ?? 0;
  const syncedGames = status?.models[displayModel]?.games ?? 0;
  const totalDates = status?.totalDates ?? 0;

  // Use live remaining from backfill responses during a run, otherwise compute from status
  const remaining = liveRemaining ?? Math.max(0, totalDates - syncedDates);
  const synced = Math.min(totalDates, totalDates - remaining);
  const progressPct = totalDates > 0 ? Math.min(100, Math.round((synced / totalDates) * 100)) : 0;

  const runAllBatches = useCallback(async () => {
    setLoading(true);
    setDone(false);
    setError(null);
    setResults([]);
    setBatchNum(0);
    setLiveRemaining(null);
    stopRef.current = false;

    const modelsToRun = Array.from(selectedModels);

    for (const modelId of modelsToRun) {
      if (stopRef.current) break;
      setActiveModel(modelId);
      let batch = 0;
      let currentRemaining = 1; // start positive to enter loop

      while (currentRemaining > 0 && !stopRef.current) {
        batch++;
        setBatchNum(batch);
        try {
          const res = await fetch(`/api/admin/backfill`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelId, batchSize: 30, includeOdds }),
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
          currentRemaining = 0;
          break;
        }
      }
    }

    setLoading(false);
    setDone(true);
    setActiveModel("");
    await fetchStatus();
    setLiveRemaining(null);
  }, [selectedModels, includeOdds, fetchStatus]);

  // Reset live state when selection changes
  useEffect(() => {
    setLiveRemaining(null);
    setResults([]);
    setDone(false);
  }, [selectedModels]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1.5">Models</label>
          <div className="flex flex-wrap gap-1.5">
            {modelIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleModel(id)}
                disabled={loading}
                className={`px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  selectedModels.has(id)
                    ? "bg-charcoal text-white"
                    : "bg-light-gray text-medium-gray hover:bg-border-gray"
                }`}
              >
                {id}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 pb-0.5 cursor-pointer group/odds relative">
          <input
            type="checkbox"
            checked={includeOdds}
            onChange={(e) => setIncludeOdds(e.target.checked)}
            disabled={loading}
            className="rounded border-border-gray"
          />
          <span className="text-xs text-medium-gray">
            Include Odds <span className="text-[10px]">(uses API quota)</span>
          </span>
          <span className="invisible group-hover/odds:visible absolute left-0 top-full mt-1 z-10 bg-charcoal text-white text-[11px] px-3 py-2 rounded-lg shadow-lg max-w-64 leading-relaxed">
            Fetches live odds from the Odds API (2 calls per batch). V2 and V3 use odds as 5% of composite score. V1 does not use odds.
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
            disabled={selectedModels.size === 0}
            className="bg-charcoal text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-50"
          >
            {selectedModels.size === 0 ? "Select Models" : `Run All (${selectedModels.size})`}
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
              {done && !loading ? (
                <span className="text-green-600 font-medium">
                  Complete — {synced} of {totalDates} dates synced for {displayModel} ({syncedGames} games)
                </span>
              ) : loading ? (
                <span className="animate-pulse">
                  {activeModel}: batch {batchNum}... {remaining} dates remaining
                </span>
              ) : remaining === 0 && displayModel ? (
                <span className="text-green-600 font-medium">
                  Fully synced — {synced} of {totalDates} dates for {displayModel} ({syncedGames} games)
                </span>
              ) : displayModel ? (
                <span>{synced} of {totalDates} dates synced for {displayModel} — {remaining} remaining</span>
              ) : (
                <span>Select models to backfill</span>
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
