"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { GamePrediction, ForecastTier } from "@/lib/types";
import DateStrip from "./DateStrip";
import DaySectionHeader from "./DaySectionHeader";
import GameCard from "./GameCard";

interface WeekViewProps {
  predictions: GamePrediction[];
}

const TIER_BANNERS: Partial<Record<ForecastTier, string>> = {
  early: "Odds and lineups may change before game time.",
  preliminary:
    "Based on season statistics. Odds, lineups, and injuries may change significantly before game time.",
};

const LIVE_BANNER = "Games in progress — pre-game analysis and picks are locked in. Scores update every few minutes.";

function getToday(): string {
  // Use local timezone, not UTC — so "today" matches the user's actual date
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function WeekView({ predictions }: WeekViewProps) {
  // Group predictions by date
  const dateMap = new Map<string, GamePrediction[]>();
  for (const pred of predictions) {
    const existing = dateMap.get(pred.gameDate) ?? [];
    existing.push(pred);
    dateMap.set(pred.gameDate, existing);
  }
  const sortedDates = [...dateMap.keys()].sort();

  const today = getToday();
  const [activeDate, setActiveDate] = useState(sortedDates[0] ?? today);
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const isScrolling = useRef(false);

  const datePills = sortedDates.map((date) => {
    const games = dateMap.get(date)!;
    return {
      date,
      gameCount: games.length,
      forecastTier: games[0].forecastTier,
      isToday: date === today,
    };
  });

  // IntersectionObserver to sync active date with scroll
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    for (const date of sortedDates) {
      const el = sectionRefs.current.get(date);
      if (!el) continue;

      const observer = new IntersectionObserver(
        (entries) => {
          if (isScrolling.current) return;
          for (const entry of entries) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
              setActiveDate(date);
            }
          }
        },
        { threshold: 0.1, rootMargin: "-80px 0px -60% 0px" }
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [sortedDates]);

  const handleDateSelect = useCallback((date: string) => {
    setActiveDate(date);
    const el = sectionRefs.current.get(date);
    if (el) {
      isScrolling.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrolling.current = false;
      }, 800);
    }
  }, []);

  const setSectionRef = useCallback(
    (date: string) => (el: HTMLElement | null) => {
      if (el) sectionRefs.current.set(date, el);
    },
    []
  );

  return (
    <>
      <DateStrip
        dates={datePills}
        activeDate={activeDate}
        onDateSelect={handleDateSelect}
      />

      <div className="space-y-10 mt-6">
        {sortedDates.map((date) => {
          const games = dateMap.get(date)!;
          const tier = games[0].forecastTier;
          const banner = TIER_BANNERS[tier];

          const hasLiveGames = games.some((g) => g.gameStatus === "live");

          return (
            <section
              key={date}
              id={`date-${date}`}
              ref={setSectionRef(date)}
              className="scroll-mt-24"
            >
              <DaySectionHeader
                date={date}
                gameCount={games.length}
                forecastTier={tier}
                isToday={date === today}
              />

              {hasLiveGames && (
                <div className="flex items-start gap-2 bg-espn-red/5 border-l-4 border-espn-red rounded-r-lg px-4 py-3 mb-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-espn-red header-pulse flex-none mt-0.5" />
                  <p className="text-xs text-espn-red font-medium">{LIVE_BANNER}</p>
                </div>
              )}

              {!hasLiveGames && banner && (
                <div className="flex items-start gap-2 bg-accent-blue/5 border-l-4 border-accent-blue rounded-r-lg px-4 py-3 mb-4">
                  <svg
                    className="w-4 h-4 text-accent-blue flex-none mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs text-accent-blue">{banner}</p>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {games.map((prediction) => (
                  <GameCard key={prediction.gameId} prediction={prediction} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
