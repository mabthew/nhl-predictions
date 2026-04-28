import { getSeasonRecord, type RecordRow } from "@/lib/season-record";

function formatRecord(row: RecordRow): string {
  if (row.category === "spread") return `${row.wins}-${row.losses}`;
  return `${row.wins}-${row.losses}-${row.pushes}`;
}

function formatWinRate(row: RecordRow): string {
  const decided = row.wins + row.losses;
  if (decided === 0) return "—";
  return `${row.winRate.toFixed(1)}%`;
}

export default async function SeasonRecordCard() {
  const record = await getSeasonRecord();
  const hasData = record.rows.some((r) => r.wins + r.losses + r.pushes > 0);
  if (!hasData) return null;

  return (
    <div className="bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden mb-6 border-l-4 border-l-espn-red">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-espn-red"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 3v18h18M7 14l3-3 4 4 5-6"
              />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-widest text-espn-red">
              Season Record
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-medium-gray">
            Win - Loss - Push
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {record.rows.map((row) => (
            <div
              key={row.category}
              className={`rounded-lg p-3 ${
                row.category === "overall"
                  ? "bg-charcoal text-white"
                  : "bg-light-gray"
              }`}
            >
              <p
                className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  row.category === "overall" ? "text-white/60" : "text-medium-gray"
                }`}
              >
                {row.label}
              </p>
              <p
                className={`font-teko text-2xl font-bold leading-none ${
                  row.category === "overall" ? "text-white" : "text-charcoal"
                }`}
              >
                {formatRecord(row)}
              </p>
              <p
                className={`text-xs mt-1 ${
                  row.category === "overall" ? "text-white/70" : "text-medium-gray"
                }`}
              >
                {formatWinRate(row)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
