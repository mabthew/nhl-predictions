import { PlayerPropPick } from "@/lib/types";
import { formatOdds } from "@/lib/utils";

interface PlayerPropProps {
  prop: PlayerPropPick;
}

export default function PlayerProp({ prop }: PlayerPropProps) {
  const riskColors = {
    HIGH: "bg-espn-red/10 border-espn-red text-espn-red",
    MEDIUM: "bg-yellow-500/10 border-yellow-500 text-yellow-600",
    LOW: "bg-green-500/10 border-green-500 text-green-600",
  };

  return (
    <div className="bg-light-gray rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-medium-gray">
          Best Player Prop
        </span>
        <span
          className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskColors[prop.riskLevel]}`}
        >
          {prop.riskLevel} Risk
        </span>
      </div>

      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-charcoal">
          {prop.playerName}
        </span>
        <span className="text-sm font-extrabold text-espn-red">
          {formatOdds(prop.odds)}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-accent-blue">
          {prop.recommendation} {prop.line}
        </span>
        <span className="text-xs text-medium-gray capitalize">
          {prop.market}
        </span>
      </div>

      <p className="text-xs text-medium-gray leading-relaxed">
        {prop.justification}
      </p>
    </div>
  );
}
