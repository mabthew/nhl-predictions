import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccuracyChart from "@/components/AccuracyChart";
import HistoryCalendar from "@/components/HistoryCalendar";
import Indicator from "@/components/Indicator";
import ModelSwitcher from "@/components/ModelSwitcher";
import {
  syncHistoryBatch,
  getOverallStats,
  getAccuracyTimeline,
  HistoryDay,
} from "@/lib/history";
import { prisma } from "@/lib/db";
import { HISTORY_MODEL, MODEL_REGISTRY, getModelConfig } from "@/lib/model-configs";
import { getSession } from "@/lib/auth";

export const revalidate = 900;

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ model?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const isAdmin = !!session;
  const selectedModelId = params.model ?? HISTORY_MODEL.id;
  const selectedModel = getModelConfig(selectedModelId) ?? HISTORY_MODEL;
  const modelVersion = selectedModel.id;
  let remaining = 0;
  let stats = { totalGames: 0, winnerPct: 0, ouPct: 0, syncedDates: [] as string[] };
  let timeline: { date: string; winnerPct: number; ouPct: number; games: number }[] = [];
  const allDaysMap: Record<string, HistoryDay> = {};
  let dbAvailable = true;

  try {
    const syncResult = await syncHistoryBatch();
    remaining = syncResult.remaining;

    [stats, timeline] = await Promise.all([
      getOverallStats(modelVersion),
      getAccuracyTimeline(modelVersion),
    ]);

    const allRecords = await prisma.predictionRecord.findMany({
      where: { gameId: { not: 0 }, modelVersion },
      orderBy: { gameDate: "desc" },
    });

    for (const r of allRecords) {
      if (!allDaysMap[r.gameDate]) {
        allDaysMap[r.gameDate] = {
          date: r.gameDate,
          games: [],
          winnerAccuracy: 0,
          ouAccuracy: 0,
        };
      }
      allDaysMap[r.gameDate].games.push({
        gameId: r.gameId,
        homeAbbrev: r.homeAbbrev,
        homeName: r.homeName,
        homeLogo: r.homeLogo,
        homeScore: r.homeScore,
        awayAbbrev: r.awayAbbrev,
        awayName: r.awayName,
        awayLogo: r.awayLogo,
        awayScore: r.awayScore,
        predictedWinner: r.predictedWinner,
        actualWinner: r.actualWinner,
        winnerCorrect: r.winnerCorrect,
        winnerConfidence: r.winnerConfidence,
        ouLine: r.ouLine,
        ouPrediction: r.ouPrediction,
        ouProjectedTotal: r.ouProjectedTotal,
        actualTotal: r.actualTotal,
        ouCorrect: r.ouCorrect,
        keyFactor: r.keyFactor,
        propPlayer: r.propPlayer,
        propMarket: r.propMarket,
        propLine: r.propLine,
        propPick: r.propPick,
        homeGoalsPerGame: r.homeGoalsPerGame,
        awayGoalsPerGame: r.awayGoalsPerGame,
      });
    }

    for (const day of Object.values(allDaysMap)) {
      const wc = day.games.filter((g) => g.winnerCorrect).length;
      const oc = day.games.filter((g) => g.ouCorrect).length;
      day.winnerAccuracy = Math.round((wc / day.games.length) * 100);
      day.ouAccuracy = Math.round((oc / day.games.length) * 100);
    }
  } catch (error) {
    console.error("History DB not available:", error);
    dbAvailable = false;
  }

  const mostRecentDate = stats.syncedDates.sort().pop() ?? new Date().toISOString().split("T")[0];
  const initialDayData = allDaysMap[mostRecentDate] ?? null;

  return (
    <>
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="font-teko text-3xl font-bold text-charcoal uppercase tracking-tight">
              Prediction History
            </h2>
            <p className="text-sm text-medium-gray mt-1">
              How our predictions performed against actual results
            </p>
          </div>
          {isAdmin && (
            <ModelSwitcher
              models={MODEL_REGISTRY.map((m) => ({ id: m.id, name: m.name }))}
              currentModelId={modelVersion}
            />
          )}
        </div>

        {!dbAvailable && (
          <div className="text-center py-16">
            <p className="text-lg font-bold text-charcoal mb-1">History Unavailable</p>
            <p className="text-sm text-medium-gray">
              Prediction history is only available when running locally. Cloud deployment coming soon.
            </p>
          </div>
        )}

        {dbAvailable && stats.totalGames > 0 && (
          <div className="bg-charcoal rounded-xl p-6 mb-8 text-white overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-espn-red via-espn-red/80 to-transparent -mt-6 -mx-6 mb-5" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-teko text-4xl font-bold leading-none">
                  {stats.totalGames}
                </p>
                <p className="text-[11px] uppercase tracking-widest text-white/35 mt-1">
                  Games Tracked
                </p>
              </div>
              <div>
                <p className="font-teko text-4xl font-bold leading-none text-white flex items-center justify-center gap-2">
                  {stats.winnerPct}%
                  <Indicator above={stats.winnerPct > 50} />
                </p>
                <p className="text-[11px] uppercase tracking-widest text-white/35 mt-1">
                  Winner Accuracy
                </p>
              </div>
              <div>
                <p className="font-teko text-4xl font-bold leading-none text-white flex items-center justify-center gap-2">
                  {stats.ouPct}%
                  <Indicator above={stats.ouPct > 50} />
                </p>
                <p className="text-[11px] uppercase tracking-widest text-white/35 mt-1">
                  Over/Under Accuracy
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/35 text-center mt-4">
              Predictions use current season statistics. Past accuracy is
              retroactive and may differ from real-time predictions.
            </p>
          </div>
        )}

        {dbAvailable && timeline.length > 1 && (
          <div className="bg-white rounded-xl border border-border-gray p-6 mb-8">
            <h3 className="font-teko text-xl font-bold text-charcoal uppercase tracking-tight mb-4">
              Accuracy Over Time
            </h3>
            <AccuracyChart data={timeline} />
          </div>
        )}

        {dbAvailable && stats.totalGames > 0 && (
          <HistoryCalendar
            syncedDates={stats.syncedDates}
            initialDate={mostRecentDate}
            initialDayData={initialDayData}
            allDaysMap={allDaysMap}
          />
        )}
      </main>

      <Footer />
    </>
  );
}
