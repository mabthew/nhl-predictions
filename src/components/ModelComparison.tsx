"use client";

import { useState } from "react";

interface GameComparison {
  gameId: number;
  date: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  actualWinner: string;
  models: Record<
    string,
    {
      predictedWinner: string;
      confidence: number;
      correct: boolean;
      homeComposite: number;
      awayComposite: number;
    }
  >;
}

interface CompareResponse {
  dateRange: { start: string; end: string };
  totalGames: number;
  games: GameComparison[];
  summary: Record<string, { correct: number; total: number; accuracy: number }>;
  dateBreakdown: Array<{
    date: string;
    games: number;
    models: Record<string, { correct: number; total: number; accuracy: number }>;
  }>;
}

const RANGE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
];

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ModelComparison({
  modelIds: availableModels,
}: {
  modelIds: string[];
}) {
  const [startDate, setStartDate] = useState(getDateNDaysAgo(7));
  const [endDate, setEndDate] = useState(getDateNDaysAgo(1));
  const [modelA, setModelA] = useState(availableModels[0] ?? "v1");
  const [modelB, setModelB] = useState(availableModels[1] ?? availableModels[0] ?? "v2");
  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitsOnly, setSplitsOnly] = useState(false);
  const [includeOdds, setIncludeOdds] = useState(false);

  async function runComparison() {
    setLoading(true);
    setError(null);
    try {
      const models = modelA === modelB ? modelA : `${modelA},${modelB}`;
      const skipOdds = includeOdds ? "false" : "true";
      const res = await fetch(
        `/api/admin/compare?startDate=${startDate}&endDate=${endDate}&models=${models}&skipOdds=${skipOdds}`
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Request failed");
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(days: number) {
    setStartDate(getDateNDaysAgo(days));
    setEndDate(getDateNDaysAgo(1));
  }

  const resultModelIds = data ? Object.keys(data.summary) : [];
  const isTwoModels = resultModelIds.length === 2;

  // Filter games
  const filteredGames = data?.games.filter((game) => {
    if (!splitsOnly || !isTwoModels) return true;
    return game.models[resultModelIds[0]]?.predictedWinner !== game.models[resultModelIds[1]]?.predictedWinner;
  }) ?? [];

  // Group by date
  const gamesByDate = new Map<string, GameComparison[]>();
  for (const game of filteredGames) {
    const list = gamesByDate.get(game.date) ?? [];
    list.push(game);
    gamesByDate.set(game.date, list);
  }

  // Count splits
  const splitCount = isTwoModels
    ? (data?.games ?? []).filter(
        (g) => g.models[resultModelIds[0]]?.predictedWinner !== g.models[resultModelIds[1]]?.predictedWinner
      ).length
    : 0;

  // Count split wins per model
  const splitWins: Record<string, number> = {};
  if (isTwoModels) {
    for (const id of resultModelIds) splitWins[id] = 0;
    for (const game of data?.games ?? []) {
      const a = game.models[resultModelIds[0]];
      const b = game.models[resultModelIds[1]];
      if (a?.predictedWinner !== b?.predictedWinner) {
        if (a?.correct) splitWins[resultModelIds[0]]++;
        if (b?.correct) splitWins[resultModelIds[1]]++;
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Date range */}
      <div>
        <label className="block text-sm font-semibold text-charcoal mb-2">Date Range</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {RANGE_PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => applyPreset(p.days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                startDate === getDateNDaysAgo(p.days) && endDate === getDateNDaysAgo(1)
                  ? "bg-charcoal text-white"
                  : "bg-white border border-border-gray text-medium-gray hover:border-charcoal hover:text-charcoal"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white"
          />
          <span className="text-medium-gray text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      {/* Model selectors + Compare */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1">Model A</label>
          <select
            value={modelA}
            onChange={(e) => setModelA(e.target.value)}
            className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white min-w-32"
          >
            {availableModels.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        <div className="pb-2 text-medium-gray font-medium text-sm">vs</div>
        <div>
          <label className="block text-sm font-semibold text-charcoal mb-1">Model B</label>
          <select
            value={modelB}
            onChange={(e) => setModelB(e.target.value)}
            className="border border-border-gray rounded-lg px-3 py-2 text-sm bg-white min-w-32"
          >
            {availableModels.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        </div>
        <button
          onClick={runComparison}
          disabled={loading}
          className="bg-charcoal text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-charcoal/90 disabled:opacity-50"
        >
          {loading ? "Running..." : "Compare"}
        </button>
        <label className="flex items-center gap-2 pb-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeOdds}
            onChange={(e) => setIncludeOdds(e.target.checked)}
            className="rounded border-border-gray"
          />
          <span className="text-xs text-medium-gray" title="Fetches live betting odds from the Odds API (2 calls per request). Off by default to save quota. Only needed if your model uses odds data differently between versions — odds don't affect winner predictions for v1/v2.">
            Include Odds <span className="text-[10px]">(uses API quota)</span>
          </span>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Aggregate summary bar */}
          <div className="bg-white border border-border-gray rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-6">
              {resultModelIds.map((id) => {
                const s = data.summary[id];
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wide bg-charcoal text-white px-2 py-0.5 rounded">
                      {id}
                    </span>
                    <span className="text-xl font-bold text-charcoal">{s.accuracy}%</span>
                    <span className="text-xs text-medium-gray">({s.correct}/{s.total})</span>
                  </div>
                );
              })}
              {isTwoModels && (
                <>
                  <div className="h-8 w-px bg-border-gray" />
                  <div className="text-sm text-medium-gray">
                    <span className="font-semibold text-charcoal">{data.totalGames}</span> games
                    {splitCount > 0 && (
                      <>
                        {" "}&middot;{" "}
                        <span className="font-semibold text-amber-600">{splitCount} splits</span>
                        {" "}({resultModelIds.map((id) => `${id}: ${splitWins[id]}`).join(", ")})
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Splits toggle */}
          {isTwoModels && splitCount > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={splitsOnly}
                onChange={(e) => setSplitsOnly(e.target.checked)}
                className="rounded border-border-gray"
              />
              <span className="text-charcoal font-medium">
                Show splits only ({splitCount} games where models disagree)
              </span>
            </label>
          )}

          {/* Game table grouped by date */}
          {filteredGames.length > 0 && (
            <div className="space-y-4">
              {Array.from(gamesByDate.entries()).map(([date, games]) => (
                <div key={date} className="bg-white border border-border-gray rounded-xl overflow-hidden">
                  <div className="bg-light-gray px-4 py-2 border-b border-border-gray">
                    <span className="text-xs font-semibold text-charcoal">{formatDateLabel(date)}</span>
                    <span className="text-xs text-medium-gray ml-2">{games.length} games</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-gray">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-medium-gray">Matchup</th>
                        <th className="px-4 py-2 text-center text-xs font-semibold text-medium-gray">Score</th>
                        {resultModelIds.map((id) => (
                          <th key={id} className="px-4 py-2 text-center text-xs font-semibold text-medium-gray">
                            {id}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-gray/50">
                      {games.map((game) => {
                        const isSplit =
                          isTwoModels &&
                          game.models[resultModelIds[0]]?.predictedWinner !==
                            game.models[resultModelIds[1]]?.predictedWinner;
                        return (
                          <tr
                            key={game.gameId}
                            className={isSplit ? "bg-amber-50/50" : ""}
                          >
                            <td className="px-4 py-2.5 font-medium text-charcoal">
                              {game.away} @ {game.home}
                              {isSplit && (
                                <span className="ml-2 text-[10px] font-semibold text-amber-600 uppercase">
                                  Split
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center text-medium-gray">
                              {game.awayScore} - {game.homeScore}
                            </td>
                            {resultModelIds.map((id) => {
                              const m = game.models[id];
                              if (!m) return <td key={id} className="px-4 py-2.5 text-center text-medium-gray">-</td>;
                              return (
                                <td
                                  key={id}
                                  className={`px-4 py-2.5 text-center font-medium ${
                                    m.correct
                                      ? "text-green-600 bg-green-50/50"
                                      : "text-red-500 bg-red-50/30"
                                  }`}
                                >
                                  {m.predictedWinner === "home" ? game.home : game.away}
                                  <span className="text-xs opacity-60 ml-1">({m.confidence}%)</span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {filteredGames.length === 0 && (
            <p className="text-sm text-medium-gray text-center py-6">
              {splitsOnly
                ? "No split decisions in this date range — both models agree on every game."
                : "No completed games found in this date range."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
