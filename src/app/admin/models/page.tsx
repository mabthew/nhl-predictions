import { getAllModels, type ModelWithMeta } from "@/lib/model-configs";
import Link from "next/link";
import { getAccuracyByModel, getAccuracyTimeline } from "@/lib/history";
import ModelComparison from "@/components/ModelComparison";
import BackfillControls from "@/components/BackfillControls";
import ModelAccuracyChart from "@/components/ModelAccuracyChart";

export const revalidate = 0;

export default async function ModelsPage() {
  let modelAccuracy: Awaited<ReturnType<typeof getAccuracyByModel>> = [];
  const chartModels: Array<{
    modelId: string;
    modelName: string;
    data: Array<{ date: string; winnerPct: number; games: number }>;
  }> = [];

  const allModels = await getAllModels();

  try {
    modelAccuracy = await getAccuracyByModel();

    for (const ma of modelAccuracy) {
      const timeline = await getAccuracyTimeline(ma.modelVersion);
      const registryEntry = allModels.find((m) => m.id === ma.modelVersion);
      chartModels.push({
        modelId: ma.modelVersion,
        modelName: registryEntry?.name ?? ma.modelVersion,
        data: timeline,
      });
    }
  } catch {
    // DB may not be available
  }

  const modelIds = allModels.map((m) => m.id);

  return (
    <div className="space-y-10">
      {/* Section 1: Accuracy Overview */}
      {modelAccuracy.length > 0 && (
        <section>
          <h2 className="font-teko text-2xl font-bold text-charcoal mb-4">
            Accuracy Overview
          </h2>
          {modelAccuracy.length === 1 && (
            <p className="text-sm text-medium-gray mb-4">
              Only one model has backfilled data. Use the Backfill section below to
              generate historical predictions for other models.
            </p>
          )}

          {/* Accuracy cards */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            {modelAccuracy.map((ma) => {
              const registryEntry = allModels.find((m) => m.id === ma.modelVersion);
              return (
                <div
                  key={ma.modelVersion}
                  className="bg-white border border-border-gray rounded-xl p-5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wide bg-charcoal text-white px-2 py-0.5 rounded">
                      {ma.modelVersion}
                    </span>
                    {registryEntry && (
                      <span className="text-sm font-medium text-charcoal">
                        {registryEntry.name}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="text-3xl font-bold text-charcoal">
                        {ma.winnerPct}%
                      </div>
                      <div className="text-xs text-medium-gray">Winner Accuracy</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-charcoal">
                        {ma.ouPct}%
                      </div>
                      <div className="text-xs text-medium-gray">Over/Under Accuracy</div>
                    </div>
                    <div className="text-xs text-medium-gray pt-2 border-t border-border-gray">
                      {ma.totalGames} games across {ma.syncedDates} dates
                    </div>
                    {registryEntry && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {registryEntry.enableFutures && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Futures
                          </span>
                        )}
                        {registryEntry.enableStarPower && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            Star Power
                          </span>
                        )}
                        <span className="text-[10px] bg-gray-100 text-medium-gray px-1.5 py-0.5 rounded">
                          {Object.values(registryEntry.weights).filter((w) => w > 0).length} factors
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Accuracy chart */}
          {chartModels.length > 0 && (
            <div className="bg-white border border-border-gray rounded-xl p-5">
              <h3 className="text-sm font-semibold text-charcoal mb-3">
                Winner Accuracy Over Time
              </h3>
              <ModelAccuracyChart models={chartModels} />
            </div>
          )}
        </section>
      )}

      {/* Section 2: Quick Compare */}
      <section>
        <h2 className="font-teko text-2xl font-bold text-charcoal mb-4">
          Quick Compare
        </h2>
        <p className="text-sm text-medium-gray mb-4">
          Run both models against completed games and compare predictions in real time.
          No backfill needed — results are computed on the fly.
        </p>
        <ModelComparison modelIds={modelIds} />
      </section>

      {/* Section 3: Backfill */}
      <section>
        <h2 className="font-teko text-2xl font-bold text-charcoal mb-4">
          Backfill
        </h2>
        <p className="text-sm text-medium-gray mb-4">
          Generate historical predictions for a model version. Stores results in the
          database for long-term accuracy tracking. Processes most recent dates first.
        </p>
        <BackfillControls modelIds={modelIds} />
      </section>

      {/* Section 4: Model Registry (collapsible) */}
      <section>
        <details className="group">
          <summary className="font-teko text-2xl font-bold text-charcoal cursor-pointer flex items-center gap-2">
            Model Registry
            <svg
              className="w-5 h-5 text-medium-gray transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {allModels.map((model) => {
              const meta = model as ModelWithMeta;
              return (
                <div
                  key={model.id}
                  className="bg-white border border-border-gray rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide bg-charcoal text-white px-2 py-0.5 rounded">
                          {model.id.length > 6 ? model.id.slice(0, 6) : model.id}
                        </span>
                        {meta.isCustom && (
                          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-charcoal mt-1">
                        {model.name}
                      </h3>
                    </div>
                    <div className="text-right text-xs text-medium-gray">
                      {model.enableFutures && (
                        <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded mr-1">
                          Futures
                        </span>
                      )}
                      {model.enableStarPower && (
                        <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Star Power
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-medium-gray">{model.description}</p>

                  <div className="space-y-1.5">
                    {(() => {
                      const sorted = Object.entries(model.weights)
                        .filter(([, v]) => v > 0)
                        .sort(([, a], [, b]) => b - a);
                      const maxWeight = sorted[0]?.[1] ?? 1;
                      return sorted.map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="w-36 text-medium-gray truncate">
                            {formatWeightName(key)}
                          </span>
                          <div className="flex-1 bg-light-gray rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-charcoal"
                              style={{ width: `${(value / maxWeight) * 100}%` }}
                            />
                          </div>
                          <span className="w-10 text-right font-medium text-charcoal">
                            {(value * 100).toFixed(1)}%
                          </span>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-medium-gray pt-2 border-t border-border-gray">
                    <span>
                      Home Ice Bonus: <strong className="text-charcoal">+{model.homeIceBonus}</strong>
                    </span>
                    <span>
                      Confidence Multiplier: <strong className="text-charcoal">{model.confidenceMultiplier}x</strong>
                    </span>
                    {meta.createdAt && (
                      <span>
                        Created: <strong className="text-charcoal">{formatRelativeDate(meta.createdAt)}</strong>
                      </span>
                    )}
                    {meta.createdBy && (
                      <span>
                        By: <strong className="text-charcoal">{meta.createdBy}</strong>
                      </span>
                    )}
                  </div>
                  {meta.chatId && (
                    <div className="pt-1">
                      <Link
                        href={`/admin/builder?chat=${meta.chatId}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View Chat &rarr;
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      </section>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatWeightName(key: string): string {
  const names: Record<string, string> = {
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
  };
  return names[key] ?? key;
}
