import { ForecastTier } from "@/lib/types";

const TIER_CONFIG: Record<ForecastTier, { label: string; icon: string; className: string }> = {
  full: {
    label: "Full Forecast",
    icon: "\u25CF", // ●
    className: "bg-green-500/10 text-green-700 border border-green-500/30",
  },
  early: {
    label: "Early Look",
    icon: "\u25D1", // ◑
    className: "bg-yellow-500/10 text-yellow-700 border border-yellow-500/30",
  },
  preliminary: {
    label: "Preliminary",
    icon: "\u25CB", // ○
    className: "bg-medium-gray/10 text-medium-gray border border-medium-gray/30",
  },
};

export default function ForecastBadge({ tier }: { tier: ForecastTier }) {
  const config = TIER_CONFIG[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${config.className}`}
    >
      <span className="text-[8px] leading-none">{config.icon}</span>
      {config.label}
    </span>
  );
}
