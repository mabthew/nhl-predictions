import { BestBet } from "@/lib/types";
import { formatOdds } from "@/lib/utils";

const BET_TYPE_LABELS: Record<string, string> = {
  moneyline: "Moneyline",
  puck_line: "Puck Line",
  over_under: "Over/Under",
  player_prop: "Player Prop",
};

interface BestBetCardProps {
  bestBet: BestBet;
}

export default function BestBetCard({ bestBet }: BestBetCardProps) {
  const edgePct = Math.round(bestBet.edge * 100);

  return (
    <div className="bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden mb-6 border-l-4 border-l-espn-red">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-espn-red" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-widest text-espn-red">
              Bet of the Day
            </span>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-medium-gray">
            {BET_TYPE_LABELS[bestBet.betType] ?? bestBet.betType}
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-teko text-2xl font-bold text-charcoal leading-none">
              {bestBet.description}
            </p>
            <p className="text-xs text-medium-gray mt-1">{bestBet.gameLabel}</p>
          </div>
          <div className="text-right">
            <p className="font-teko text-2xl font-bold text-charcoal leading-none">
              {formatOdds(bestBet.odds)}
            </p>
            <p className="text-[11px] text-medium-gray mt-1">Odds</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[11px] font-bold text-medium-gray uppercase tracking-wider">
              Confidence
            </span>
            <div className="flex-1 h-2 bg-light-gray rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${bestBet.confidence}%` }}
              />
            </div>
            <span className="text-xs font-bold text-green-600">
              {bestBet.confidence}%
            </span>
          </div>
          {edgePct > 0 && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-bold text-medium-gray uppercase tracking-wider">
                Edge
              </span>
              <span className="text-xs font-bold text-accent-blue">
                +{edgePct}%
              </span>
            </div>
          )}
        </div>

        {bestBet.reasoning && (
          <p className="text-xs text-medium-gray mt-3 leading-relaxed">
            {bestBet.reasoning}
          </p>
        )}
      </div>
    </div>
  );
}
