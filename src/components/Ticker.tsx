"use client";

import Link from "next/link";
import { GamePrediction } from "@/lib/types";
import { formatGameTime } from "@/lib/utils";

interface TickerProps {
  predictions: GamePrediction[];
}

function formatTickerDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function Ticker({ predictions }: TickerProps) {
  if (predictions.length === 0) return null;

  // Group games by date to insert date dividers
  const items = [...predictions, ...predictions];

  return (
    <div className="relative z-10 bg-charcoal border-b-2 border-espn-red overflow-hidden isolate">
      <div
        className="animate-ticker flex whitespace-nowrap items-center py-2.5 bg-charcoal"
        style={{ animationDuration: `${Math.max(20, items.length * 1.5)}s` }}
      >
        {items.map((game, i) => {
          const prevDate = i > 0 ? items[i - 1].gameDate : null;
          const showDate = game.gameDate !== prevDate;

          return (
            <div key={`${game.gameId}-${i}`} className="flex-none flex items-center">
              {/* Date divider when date changes */}
              {showDate && (
                <div className="flex items-center px-4 border-r border-espn-red/40">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-espn-red">
                    {formatTickerDate(game.gameDate)}
                  </span>
                </div>
              )}

              <Link
                href={`/game/${game.gameId}`}
                className="flex items-center gap-3 px-5 py-0.5 border-r border-medium-gray/20 hover:bg-white/5 transition-colors"
              >
                {/* Away */}
                <div className="flex items-center gap-1.5">
                  {game.awayTeam.teamLogo && (
                    <img src={game.awayTeam.teamLogo} alt={game.awayTeam.teamAbbrev} className="w-5 h-5" />
                  )}
                  <span className={`text-sm font-semibold ${game.predictedWinner === "away" ? "text-espn-red" : "text-white/90"}`}>
                    {game.awayTeam.teamAbbrev}
                  </span>
                </div>

                <span className="text-white/40 text-xs">@</span>

                {/* Home */}
                <div className="flex items-center gap-1.5">
                  {game.homeTeam.teamLogo && (
                    <img src={game.homeTeam.teamLogo} alt={game.homeTeam.teamAbbrev} className="w-5 h-5" />
                  )}
                  <span className={`text-sm font-semibold ${game.predictedWinner === "home" ? "text-espn-red" : "text-white/90"}`}>
                    {game.homeTeam.teamAbbrev}
                  </span>
                </div>

                {/* Time + O/U inline */}
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-[11px] text-white/50">{formatGameTime(game.startTime)}</span>
                  <span className="text-[10px] text-white/35">O/U {game.overUnder.line}</span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
