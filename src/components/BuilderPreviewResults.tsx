"use client";

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

interface PreviewData {
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  totalGames: number;
  proposed: { correct: number; total: number; accuracy: number };
  baseline: {
    id: string;
    name: string;
    correct: number;
    total: number;
    accuracy: number;
  };
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

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DATA_SOURCES: Array<{
  key: keyof DataAvailability;
  label: string;
  unavailableReason: string;
}> = [
  { key: "futures", label: "Futures", unavailableReason: "No cached futures data" },
  { key: "rest", label: "Rest", unavailableReason: "Could not compute rest data" },
  { key: "starPower", label: "Star Power", unavailableReason: "No player profiles available" },
  { key: "playerMomentum", label: "Momentum", unavailableReason: "No line combo data available" },
  { key: "startingGoalies", label: "Goalies", unavailableReason: "Not available for completed games" },
  { key: "playerProps", label: "Props", unavailableReason: "Only available for upcoming games" },
];

export default function BuilderPreviewResults({
  data,
}: {
  data: PreviewData;
}) {
  const diff = data.proposed.accuracy - data.baseline.accuracy;
  const avail = data.dataAvailability;

  return (
    <div className="space-y-3 pt-2 border-t border-border-gray">
      <div className="text-xs font-semibold text-charcoal">
        Preview:{" "}
        {data.startDate && data.endDate
          ? `${formatShortDate(data.startDate)} \u2013 ${formatShortDate(data.endDate)}`
          : `Last ${data.totalDays ?? 7} Days`}{" "}
        ({data.totalGames} games)
      </div>

      {/* Data availability */}
      {avail && (
        <div className="flex flex-wrap gap-1.5">
          {DATA_SOURCES.map(({ key, label, unavailableReason }) => {
            const available = avail[key];
            return (
              <span
                key={key}
                title={available ? `${label}: available` : unavailableReason}
                className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                  available
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-100 text-medium-gray"
                }`}
              >
                <span>{available ? "\u2713" : "\u2013"}</span>
                {label}
              </span>
            );
          })}
          {/* Odds gets special treatment -- partial availability */}
          <span
            title={
              avail.odds
                ? `Archived odds available for ${avail.oddsDaysAvailable}/${avail.oddsDaysTotal} days`
                : "No archived odds data. Odds archiving starts from next cron run."
            }
            className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
              avail.odds
                ? avail.oddsDaysAvailable === avail.oddsDaysTotal
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-medium-gray"
            }`}
          >
            <span>{avail.odds ? (avail.oddsDaysAvailable === avail.oddsDaysTotal ? "\u2713" : "~") : "\u2013"}</span>
            Odds{avail.odds ? ` (${avail.oddsDaysAvailable}/${avail.oddsDaysTotal})` : ""}
          </span>
        </div>
      )}

      {/* Summary bar */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-charcoal text-white px-2 py-0.5 rounded">
            Proposed
          </span>
          <span className="text-lg font-bold text-charcoal">
            {data.proposed.accuracy}%
          </span>
          <span className="text-xs text-medium-gray">
            ({data.proposed.correct}/{data.proposed.total})
          </span>
        </div>
        <div className="text-xs text-medium-gray">vs</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-medium-gray text-white px-2 py-0.5 rounded">
            {data.baseline.id}
          </span>
          <span className="text-lg font-bold text-charcoal">
            {data.baseline.accuracy}%
          </span>
          <span className="text-xs text-medium-gray">
            ({data.baseline.correct}/{data.baseline.total})
          </span>
        </div>
        {diff !== 0 && (
          <span
            className={`text-sm font-bold ${
              diff > 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Game results */}
      {data.games.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-medium-gray border-b border-border-gray">
                <th className="text-left py-1 font-semibold">Game</th>
                <th className="text-center py-1 font-semibold">Score</th>
                <th className="text-center py-1 font-semibold">Proposed</th>
                <th className="text-center py-1 font-semibold">
                  {data.baseline.id}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-gray/30">
              {data.games.map((g, i) => (
                <tr key={i}>
                  <td className="py-1 text-charcoal">
                    {g.away} @ {g.home}
                  </td>
                  <td className="py-1 text-center text-medium-gray">
                    {g.score}
                  </td>
                  <td
                    className={`py-1 text-center font-medium ${
                      g.proposedCorrect ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {g.proposedPick}
                    <span className="opacity-50 ml-0.5">
                      {g.proposedConfidence}%
                    </span>
                  </td>
                  <td
                    className={`py-1 text-center font-medium ${
                      g.baselineCorrect ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {g.baselinePick}
                    <span className="opacity-50 ml-0.5">
                      {g.baselineConfidence}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
