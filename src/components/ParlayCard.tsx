"use client";

import { useState } from "react";
import { Parlay } from "@/lib/types";
import { formatOdds } from "@/lib/utils";

const BET_TYPE_LABELS: Record<string, string> = {
  moneyline: "ML",
  puck_line: "PL",
  over_under: "O/U",
  player_prop: "Prop",
};

interface ParlayCardProps {
  parlay: Parlay;
}

export default function ParlayCard({ parlay }: ParlayCardProps) {
  const [expanded, setExpanded] = useState(false);
  const probPct = Math.round(parlay.combinedProbability * 100);

  return (
    <div className="bg-white rounded-xl border border-border-gray shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-light-gray/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-600">
            3-Leg Parlay
          </span>
          <span className="font-teko text-lg font-bold text-charcoal leading-none ml-2">
            {formatOdds(parlay.combinedOdds)}
          </span>
          <span className="text-[11px] text-medium-gray ml-1">
            &middot; ${parlay.potentialPayout.toFixed(2)} on $10
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-medium-gray transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 pb-4 border-t border-border-gray/50">
            <div className="space-y-2 mt-3">
              {parlay.legs.map((leg, i) => (
                <div
                  key={`${leg.gameId}-${leg.betType}`}
                  className="flex items-center gap-3 bg-light-gray/70 rounded-lg px-3 py-2"
                >
                  <span className="w-5 h-5 rounded-full bg-charcoal text-white text-[11px] font-bold flex items-center justify-center flex-none">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-charcoal truncate">
                      {leg.description}
                    </p>
                    <p className="text-[11px] text-medium-gray">
                      {leg.gameLabel}
                      <span className="text-medium-gray/50 mx-1">&middot;</span>
                      {BET_TYPE_LABELS[leg.betType]}
                    </p>
                    {leg.reasoning && (
                      <p className="text-[11px] text-medium-gray/80 mt-1 leading-relaxed">
                        {leg.reasoning}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-none">
                    <p className="text-xs font-bold text-green-600">{leg.confidence}%</p>
                    <p className="text-[11px] text-medium-gray">{formatOdds(leg.odds)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-gray/50">
              <span className="text-[11px] text-medium-gray">
                Combined Probability:{" "}
                <span className="font-bold text-charcoal">{probPct}%</span>
              </span>
              <span className="text-sm font-bold text-charcoal">
                $10 &rarr; ${parlay.potentialPayout.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
