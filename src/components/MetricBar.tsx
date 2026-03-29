interface MetricBarProps {
  label: string;
  homeValue: number;
  awayValue: number;
  homeLabel?: string;
  awayLabel?: string;
  format?: (v: number) => string;
  /** "relative" splits bar by ratio (default). "absolute" centers at 50% for percentage stats. */
  mode?: "relative" | "absolute";
}

export default function MetricBar({
  label,
  homeValue,
  awayValue,
  homeLabel,
  awayLabel,
  format = (v) => v.toFixed(0),
  mode = "relative",
}: MetricBarProps) {
  let homePct: number;
  let awayPct: number;

  if (mode === "absolute") {
    // For percentage stats: each side shows its own percentage relative to 100
    // The bar visually represents each team's stat independently
    const total = homeValue + awayValue || 1;
    homePct = (homeValue / total) * 100;
    awayPct = (awayValue / total) * 100;
  } else {
    const total = homeValue + awayValue || 1;
    homePct = (homeValue / total) * 100;
    awayPct = (awayValue / total) * 100;
  }

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs font-semibold text-medium-gray mb-1">
        <span>{homeLabel ?? format(homeValue)}</span>
        <span className="uppercase tracking-wider">{label}</span>
        <span>{awayLabel ?? format(awayValue)}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-border-gray">
        <div
          className="bg-espn-red transition-all duration-500"
          style={{ width: `${homePct}%` }}
        />
        <div
          className="bg-accent-blue transition-all duration-500"
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}
