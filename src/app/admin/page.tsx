import { prisma } from "@/lib/db";
import { HISTORY_MODEL, MODEL_REGISTRY } from "@/lib/model-configs";
import Link from "next/link";

export const revalidate = 0;

export default async function AdminOverview() {
  const modelVersion = HISTORY_MODEL.id;

  let totalGames = 0;
  let winnerCorrect = 0;
  let ouCorrect = 0;
  let todayGames = 0;
  let todayCorrect = 0;
  let recentDays: { date: string; games: number; winnerPct: number }[] = [];
  let highConfidenceRecord = { correct: 0, total: 0 };
  let apiCallsToday = 0;
  let apiCallsMonth = 0;
  let engagementToday = 0;

  const today = new Date().toISOString().split("T")[0];
  const monthStart = today.slice(0, 7) + "-01";

  try {
    const [
      allRecords,
      todayRecords,
      recentRecords,
      apiToday,
      apiMonth,
      eventsToday,
    ] = await Promise.all([
      prisma.predictionRecord.findMany({
        where: { gameId: { not: 0 }, modelVersion },
        select: { winnerCorrect: true, ouCorrect: true, winnerConfidence: true },
      }),
      prisma.predictionRecord.findMany({
        where: { gameDate: today, gameId: { not: 0 }, modelVersion },
        select: { winnerCorrect: true },
      }),
      prisma.predictionRecord.findMany({
        where: {
          gameId: { not: 0 },
          modelVersion,
          gameDate: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        },
        select: { gameDate: true, winnerCorrect: true },
      }),
      prisma.apiUsageLog.count({
        where: { createdAt: { gte: new Date(today + "T00:00:00Z") } },
      }),
      prisma.apiUsageLog.count({
        where: { createdAt: { gte: new Date(monthStart + "T00:00:00Z") } },
      }),
      prisma.engagementEvent.count({
        where: { createdAt: { gte: new Date(today + "T00:00:00Z") } },
      }),
    ]);

    totalGames = allRecords.length;
    winnerCorrect = allRecords.filter((r) => r.winnerCorrect).length;
    ouCorrect = allRecords.filter((r) => r.ouCorrect).length;

    const highConf = allRecords.filter((r) => r.winnerConfidence >= 65);
    highConfidenceRecord = {
      correct: highConf.filter((r) => r.winnerCorrect).length,
      total: highConf.length,
    };

    todayGames = todayRecords.length;
    todayCorrect = todayRecords.filter((r) => r.winnerCorrect).length;

    // Group recent by date
    const byDate = new Map<string, { total: number; correct: number }>();
    for (const r of recentRecords) {
      const entry = byDate.get(r.gameDate) ?? { total: 0, correct: 0 };
      entry.total++;
      if (r.winnerCorrect) entry.correct++;
      byDate.set(r.gameDate, entry);
    }
    recentDays = Array.from(byDate.entries())
      .map(([date, s]) => ({
        date,
        games: s.total,
        winnerPct: Math.round((s.correct / s.total) * 100),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    apiCallsToday = apiToday;
    apiCallsMonth = apiMonth;
    engagementToday = eventsToday;
  } catch {
    // DB may not be available
  }

  const winnerPct =
    totalGames > 0 ? Math.round((winnerCorrect / totalGames) * 100) : 0;
  const ouPct =
    totalGames > 0 ? Math.round((ouCorrect / totalGames) * 100) : 0;
  const highConfPct =
    highConfidenceRecord.total > 0
      ? Math.round(
          (highConfidenceRecord.correct / highConfidenceRecord.total) * 100
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Season Record"
          value={`${winnerCorrect}-${totalGames - winnerCorrect}`}
          sub={`${winnerPct}% winner accuracy across ${totalGames} games`}
        />
        <SummaryCard
          label="Over/Under"
          value={`${ouPct}%`}
          sub={`${ouCorrect} of ${totalGames} correct`}
        />
        <SummaryCard
          label="High Confidence Picks"
          value={`${highConfPct}%`}
          sub={`${highConfidenceRecord.correct}/${highConfidenceRecord.total} games at 65%+ confidence`}
        />
        <SummaryCard
          label="Active Model"
          value={HISTORY_MODEL.id}
          sub={HISTORY_MODEL.name}
        />
      </div>

      {/* Today + Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Today's results */}
        <div className="bg-white border border-border-gray rounded-xl p-5">
          <h3 className="text-sm font-semibold text-charcoal mb-3">Today</h3>
          {todayGames > 0 ? (
            <div>
              <div className="text-3xl font-bold text-charcoal">
                {todayCorrect}/{todayGames}
              </div>
              <div className="text-xs text-medium-gray mt-1">
                {Math.round((todayCorrect / todayGames) * 100)}% winner accuracy
              </div>
            </div>
          ) : (
            <div className="text-sm text-medium-gray">
              No completed games tracked yet today
            </div>
          )}
        </div>

        {/* API Usage snapshot */}
        <div className="bg-white border border-border-gray rounded-xl p-5">
          <h3 className="text-sm font-semibold text-charcoal mb-3">
            API Usage
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-medium-gray">Today</span>
              <span className="font-medium text-charcoal">
                {apiCallsToday} calls
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-medium-gray">This month</span>
              <span className="font-medium text-charcoal">
                {apiCallsMonth} calls
              </span>
            </div>
          </div>
          <Link
            href="/admin/costs"
            className="text-xs text-accent-blue hover:underline mt-3 inline-block"
          >
            View cost details
          </Link>
        </div>

        {/* Engagement snapshot */}
        <div className="bg-white border border-border-gray rounded-xl p-5">
          <h3 className="text-sm font-semibold text-charcoal mb-3">
            Engagement
          </h3>
          <div className="text-3xl font-bold text-charcoal">
            {engagementToday}
          </div>
          <div className="text-xs text-medium-gray mt-1">events tracked today</div>
          <Link
            href="/admin/engagement"
            className="text-xs text-accent-blue hover:underline mt-3 inline-block"
          >
            View engagement details
          </Link>
        </div>
      </div>

      {/* Last 7 days */}
      {recentDays.length > 0 && (
        <section>
          <h2 className="font-teko text-2xl font-bold text-charcoal mb-4">
            Last 7 Days
          </h2>
          <div className="bg-white border border-border-gray rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-gray bg-light-gray">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-medium-gray">
                    Date
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-medium-gray">
                    Games
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-medium-gray">
                    Winner Accuracy
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-medium-gray">
                    Result
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-gray/50">
                {recentDays.map((day) => (
                  <tr key={day.date}>
                    <td className="px-4 py-2.5 font-medium text-charcoal">
                      {formatDateLabel(day.date)}
                    </td>
                    <td className="px-4 py-2.5 text-center text-medium-gray">
                      {day.games}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`font-semibold ${
                          day.winnerPct >= 60
                            ? "text-green-600"
                            : day.winnerPct >= 50
                              ? "text-charcoal"
                              : "text-red-500"
                        }`}
                      >
                        {day.winnerPct}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <AccuracyBar pct={day.winnerPct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Model quick info */}
      <section>
        <h2 className="font-teko text-2xl font-bold text-charcoal mb-4">
          Models
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          {MODEL_REGISTRY.map((model) => (
            <div
              key={model.id}
              className="bg-white border border-border-gray rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide bg-charcoal text-white px-2 py-0.5 rounded">
                  {model.id}
                </span>
                {model.id === HISTORY_MODEL.id && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                    Active
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-charcoal">
                {model.name}
              </div>
              <div className="text-xs text-medium-gray mt-1">
                {Object.values(model.weights).filter((w) => w > 0).length}{" "}
                factors
              </div>
            </div>
          ))}
        </div>
        <Link
          href="/admin/models"
          className="text-xs text-accent-blue hover:underline mt-3 inline-block"
        >
          View model details and comparison tools
        </Link>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white border border-border-gray rounded-xl p-5">
      <div className="text-xs font-semibold text-medium-gray uppercase tracking-wide mb-2">
        {label}
      </div>
      <div className="text-3xl font-bold text-charcoal">{value}</div>
      <div className="text-xs text-medium-gray mt-1">{sub}</div>
    </div>
  );
}

function AccuracyBar({ pct }: { pct: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <div className="w-16 bg-light-gray rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${
            pct >= 60
              ? "bg-green-500"
              : pct >= 50
                ? "bg-charcoal"
                : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
