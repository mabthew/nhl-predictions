"use client";

import { useRef, useEffect } from "react";
import { ForecastTier } from "@/lib/types";

interface DatePill {
  date: string;
  gameCount: number;
  forecastTier: ForecastTier;
  isToday: boolean;
}

interface DateStripProps {
  dates: DatePill[];
  activeDate: string;
  onDateSelect: (date: string) => void;
}

function formatPillDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function formatPillDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.getDate().toString();
}

export default function DateStrip({ dates, activeDate, onDateSelect }: DateStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll active pill into view
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeDate]);

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-border-gray">
      <div
        ref={scrollRef}
        className="flex gap-1 px-4 py-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {dates.map((d) => {
          const isActive = d.date === activeDate;
          const tierOpacity =
            d.forecastTier === "preliminary" ? "opacity-60" : "";

          return (
            <button
              key={d.date}
              ref={isActive ? activeRef : undefined}
              onClick={() => onDateSelect(d.date)}
              className={`flex-none flex flex-col items-center px-4 py-2 rounded-sm transition-colors relative ${
                d.isToday ? "ring-2 ring-brand-primary" : ""
              } ${
                isActive
                  ? "bg-charcoal text-white"
                  : `bg-light-gray hover:bg-border-gray text-charcoal ${tierOpacity}`
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider leading-none">
                {formatPillDay(d.date)}
              </span>
              <span className="text-lg font-bold font-teko leading-none mt-0.5">
                {formatPillDate(d.date)}
              </span>
              <span
                className={`text-[11px] font-semibold leading-none mt-1 ${
                  isActive ? "text-white/60" : "text-medium-gray"
                }`}
              >
                {d.gameCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
