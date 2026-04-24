import { ForecastTier } from "@/lib/types";
import ForecastBadge from "./ForecastBadge";

interface DaySectionHeaderProps {
  date: string;
  gameCount: number;
  forecastTier: ForecastTier;
  isToday: boolean;
}

function formatSectionDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatChipDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function DaySectionHeader({
  date,
  gameCount,
  forecastTier,
  isToday,
}: DaySectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-dashed ${
        isToday ? "border-charcoal" : "border-border-gray"
      }`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {isToday ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-charcoal bg-white">
            <span className="font-mono text-[10px] uppercase tracking-wider text-charcoal">
              Today
            </span>
            <span className="font-teko text-sm tracking-[0.2em] uppercase text-charcoal font-bold">
              {formatChipDate(date)}
            </span>
            <span className="h-2.5 w-2.5 rounded-full bg-brand-primary header-pulse" />
          </div>
        ) : (
          <h3 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal">
            {formatSectionDate(date)}
          </h3>
        )}
        <span className="text-xs text-medium-gray">
          {gameCount} {gameCount === 1 ? "game" : "games"}
        </span>
      </div>
      <ForecastBadge tier={forecastTier} />
    </div>
  );
}
