import { BestBet } from "@/lib/types";
import { formatOdds } from "@/lib/utils";

const BET_TYPE_LABELS: Record<string, string> = {
  moneyline: "Moneyline",
  puck_line: "Puck Line",
  over_under: "Over/Under",
  player_prop: "Player Prop",
};

const perforationStyle = {
  backgroundImage: "radial-gradient(#232525 1px, transparent 1px)",
  backgroundSize: "8px 2px",
  backgroundRepeat: "repeat-x",
};

interface BestBetCardProps {
  bestBet: BestBet;
}

export default function BestBetCard({ bestBet }: BestBetCardProps) {
  const edgePct = Math.round(bestBet.edge * 100);

  return (
    <section className="bg-white rounded-sm relative shadow-sm mb-6">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perforationStyle} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perforationStyle} />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-charcoal">
            &#9733; Bet Ticket
          </span>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            {BET_TYPE_LABELS[bestBet.betType] ?? bestBet.betType}
          </span>
        </div>

        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {bestBet.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{bestBet.gameLabel}</p>

        <div className="mt-4 pt-3 border-t border-dashed border-border-gray flex items-end justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">Odds</p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none mt-0.5">
              {formatOdds(bestBet.odds)}
            </p>
          </div>
          {edgePct > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase text-medium-gray">Edge</p>
              <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none mt-0.5">
                +{edgePct}%
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-dashed border-border-gray">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase text-medium-gray whitespace-nowrap">
              Confidence
            </span>
            <div className="flex-1 h-1.5 bg-light-gray overflow-hidden">
              <div
                className="h-full bg-charcoal"
                style={{ width: `${bestBet.confidence}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-brand-primary tabular-nums">
              {bestBet.confidence}%
            </span>
          </div>
        </div>

        {bestBet.reasoning && (
          <p className="text-xs text-medium-gray mt-3 leading-relaxed">
            {bestBet.reasoning}
          </p>
        )}
      </div>
    </section>
  );
}
