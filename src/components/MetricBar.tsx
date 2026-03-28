interface MetricBarProps {
  label: string;
  homeValue: number;
  awayValue: number;
  homeLabel?: string;
  awayLabel?: string;
  format?: (v: number) => string;
}

export default function MetricBar({
  label,
  homeValue,
  awayValue,
  homeLabel,
  awayLabel,
  format = (v) => v.toFixed(0),
}: MetricBarProps) {
  const total = homeValue + awayValue || 1;
  const homePct = (homeValue / total) * 100;
  const awayPct = (awayValue / total) * 100;

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
