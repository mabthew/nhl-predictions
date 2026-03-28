"use client";

import Link from "next/link";
import { GamePrediction } from "@/lib/types";
import { formatGameTime } from "@/lib/utils";

interface TickerProps {
  predictions: GamePrediction[];
}

export default function Ticker({ predictions }: TickerProps) {
  if (predictions.length === 0) return null;

  // Duplicate content for seamless loop
  const items = [...predictions, ...predictions];

  return (
    <div className="relative z-10 bg-charcoal border-b-2 border-espn-red overflow-hidden isolate">
      <div className="animate-ticker flex whitespace-nowrap py-3 bg-charcoal">
        {items.map((game, i) => (
          <Link
            key={`${game.gameId}-${i}`}
            href={`/game/${game.gameId}`}
            className="flex-none flex items-center gap-4 px-6 border-r border-medium-gray/30 hover:bg-white/5 transition-colors"
          >
            {/* Away Team */}
            <div className="flex items-center gap-2">
              {game.awayTeam.teamLogo && (
                <img
                  src={game.awayTeam.teamLogo}
                  alt={game.awayTeam.teamAbbrev}
                  className="w-6 h-6"
                />
              )}
              <span
                className={`text-base font-semibold ${
                  game.predictedWinner === "away"
                    ? "text-espn-red"
                    : "text-white/90"
                }`}
              >
                {game.awayTeam.teamAbbrev}
              </span>
            </div>

            <span className="text-white/60 text-sm">@</span>

            {/* Home Team */}
            <div className="flex items-center gap-2">
              {game.homeTeam.teamLogo && (
                <img
                  src={game.homeTeam.teamLogo}
                  alt={game.homeTeam.teamAbbrev}
                  className="w-6 h-6"
                />
              )}
              <span
                className={`text-base font-semibold ${
                  game.predictedWinner === "home"
                    ? "text-espn-red"
                    : "text-white/90"
                }`}
              >
                {game.homeTeam.teamAbbrev}
              </span>
            </div>

            {/* Time & O/U */}
            <div className="flex flex-col items-end">
              <span className="text-xs text-white/70">
                {game.gameDate.slice(5).replace("-", "/")} &middot; {formatGameTime(game.startTime)}
              </span>
              <span className="text-xs text-white/60">
                O/U {game.overUnder.line}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
