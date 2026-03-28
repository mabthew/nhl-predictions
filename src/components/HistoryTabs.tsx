"use client";

import { useState } from "react";
import { HistoryDay } from "@/lib/history";
import HistoryGameCard from "./HistoryGameCard";

interface HistoryTabsProps {
  days: HistoryDay[];
}

export default function HistoryTabs({ days }: HistoryTabsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (days.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-bold text-charcoal mb-1">No History Yet</p>
        <p className="text-sm text-medium-gray">
          Prediction history will appear here once past games are synced.
        </p>
      </div>
    );
  }

  const selectedDay = days[selectedIndex];

  return (
    <div>
      {/* Date tabs — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {days.map((day, i) => {
          const dateLabel = new Date(day.date + "T12:00:00").toLocaleDateString(
            "en-US",
            { weekday: "short", month: "short", day: "numeric" }
          );
          const isActive = i === selectedIndex;

          return (
            <button
              key={day.date}
              onClick={() => setSelectedIndex(i)}
              className={`flex-none px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                isActive
                  ? "bg-charcoal text-white"
                  : "bg-white text-medium-gray border border-border-gray hover:bg-light-gray"
              }`}
            >
              <span className="block">{dateLabel}</span>
              <span
                className={`block text-[10px] mt-0.5 ${
                  isActive ? "text-white/60" : "text-medium-gray/60"
                }`}
              >
                {day.games.length} games &middot; {day.winnerAccuracy}% picks
              </span>
            </button>
          );
        })}
      </div>

      {/* Day accuracy banner */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-medium-gray">
            Winner Picks:
          </span>
          <span
            className={`text-sm font-bold ${
              selectedDay.winnerAccuracy >= 60
                ? "text-green-600"
                : "text-espn-red"
            }`}
          >
            {selectedDay.winnerAccuracy}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-medium-gray">
            O/U Picks:
          </span>
          <span
            className={`text-sm font-bold ${
              selectedDay.ouAccuracy >= 60 ? "text-green-600" : "text-espn-red"
            }`}
          >
            {selectedDay.ouAccuracy}%
          </span>
        </div>
      </div>

      {/* Game cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedDay.games.map((game) => (
          <HistoryGameCard key={game.gameId} game={game} />
        ))}
      </div>
    </div>
  );
}
