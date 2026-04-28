import { getSeasonRecord, type RecordRow } from "@/lib/season-record";

const perforationStyle = {
  backgroundImage: "radial-gradient(#232525 1px, transparent 1px)",
  backgroundSize: "8px 2px",
  backgroundRepeat: "repeat-x",
};

function formatRecord(row: RecordRow): string {
  if (row.category === "spread") return `${row.wins}–${row.losses}`;
  return `${row.wins}–${row.losses}–${row.pushes}`;
}

function formatWinRate(row: RecordRow): string {
  const decided = row.wins + row.losses;
  if (decided === 0) return "—";
  return `${row.winRate.toFixed(1)}%`;
}

function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }) + " ET";
}

export default async function SeasonRecordCard() {
  const record = await getSeasonRecord();
  const hasData = record.rows.some((r) => r.wins + r.losses + r.pushes > 0);
  if (!hasData) return null;

  const totalPicks = record.rows
    .filter((r) => r.category !== "overall")
    .reduce((sum, r) => sum + r.wins + r.losses + r.pushes, 0);

  // Hide individual category rows that have no graded picks yet.
  // Overall always shows once at least one category has data.
  const visibleRows = record.rows.filter(
    (r) => r.category === "overall" || r.wins + r.losses + r.pushes > 0
  );

  return (
    <section className="bg-white rounded-sm relative shadow-sm mb-6">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perforationStyle} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perforationStyle} />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-charcoal">
              Season Record
            </span>
            <span className="text-brand-primary text-base">✦</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            Win - Loss - Push
          </span>
        </div>

        <div
          className={`grid gap-y-4 sm:gap-y-0 ${
            visibleRows.length <= 2
              ? "grid-cols-2"
              : visibleRows.length === 3
                ? "grid-cols-2 sm:grid-cols-3"
                : "grid-cols-2 sm:grid-cols-4"
          }`}
        >
          {visibleRows.map((r, i) => (
            <div
              key={r.category}
              className={`px-3 sm:px-3 ${
                i !== 0 ? "sm:border-l sm:border-dashed sm:border-border-gray" : ""
              }`}
            >
              <p className="font-mono text-[10px] uppercase text-medium-gray mb-1.5">
                {r.label}
              </p>
              <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
                {formatRecord(r)}
              </p>
              <p className="text-xs font-mono font-bold text-brand-primary mt-1.5 tabular-nums">
                {formatWinRate(r)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-dashed border-border-gray flex justify-between text-[10px] font-mono uppercase text-medium-gray">
          <span>
            DegenHL &middot; 2025&ndash;26 Season &middot; {totalPicks} picks graded
          </span>
          <span>As of {formatAsOf(record.asOf)}</span>
        </div>
      </div>
    </section>
  );
}
