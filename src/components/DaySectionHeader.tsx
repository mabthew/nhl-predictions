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

export default function DaySectionHeader({
  date,
  gameCount,
  forecastTier,
  isToday,
}: DaySectionHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b-2 ${
        isToday ? "border-espn-red" : "border-border-gray"
      }`}
    >
      <div className="flex items-center gap-3">
        {isToday && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-espn-red bg-espn-red/10 px-2 py-0.5 rounded">
            Today
          </span>
        )}
        <h3 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal">
          {formatSectionDate(date)}
        </h3>
        <span className="text-xs text-medium-gray">
          {gameCount} {gameCount === 1 ? "game" : "games"}
        </span>
      </div>
      <ForecastBadge tier={forecastTier} />
    </div>
  );
}
