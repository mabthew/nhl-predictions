"use client";

import { useState } from "react";
import { FuturesOdds } from "@/lib/types";
import { formatOdds } from "@/lib/utils";

interface FuturesTableProps {
  futures: FuturesOdds[];
}

export default function FuturesTable({ futures }: FuturesTableProps) {
  const [showAll, setShowAll] = useState(false);
  if (futures.length === 0) return null;

  const displayed = showAll ? futures : futures.slice(0, 10);

  return (
    <div className="bg-white rounded-sm shadow-sm border border-border-gray overflow-hidden">
      <div className="px-5 py-4 border-b border-border-gray bg-light-gray/50 flex items-center justify-between">
        <div>
          <h3 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal">
            Stanley Cup Futures
          </h3>
          <p className="text-[11px] text-medium-gray mt-0.5">
            Championship odds via {futures[0]?.bookmaker ?? "DraftKings"}
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-widest text-medium-gray font-bold">2025-26</span>
        </div>
      </div>

      <div className="divide-y divide-border-gray/50">
        {displayed.map((team, i) => (
          <div
            key={team.team}
            className="px-5 py-3 flex items-center justify-between hover:bg-light-gray/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-medium-gray w-6 text-right">{i + 1}</span>
              <span className="text-sm font-semibold text-charcoal">{team.team}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-medium-gray">{team.impliedProbability}%</span>
              <span
                className={`text-sm font-bold min-w-[70px] text-right ${
                  team.odds > 0 ? "text-green-600" : "text-charcoal"
                }`}
              >
                {formatOdds(team.odds)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {futures.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-3 text-[11px] font-semibold uppercase tracking-wider text-medium-gray hover:bg-light-gray transition-colors border-t border-border-gray/50"
        >
          {showAll ? "Show Less" : `Show All ${futures.length} Teams`}
        </button>
      )}
    </div>
  );
}
