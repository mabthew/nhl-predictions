"use client";

import { useState } from "react";
import { HistoryDay } from "@/lib/history";
import HistoryGameCard from "./HistoryGameCard";

interface HistoryCalendarProps {
  syncedDates: string[];
  initialDate: string;
  initialDayData: HistoryDay | null;
  allDaysMap: Record<string, HistoryDay>;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function HistoryCalendar({
  syncedDates,
  initialDate,
  initialDayData,
  allDaysMap,
}: HistoryCalendarProps) {
  const syncedSet = new Set(syncedDates);
  const today = new Date();
  const initDate = new Date(initialDate + "T12:00:00");

  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialDate);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Don't allow navigating past current month or before Oct 2025
  const canGoNext =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());
  const canGoPrev = viewYear > 2025 || (viewYear === 2025 && viewMonth > 9);

  const selectedDayData = allDaysMap[selectedDate] ?? null;

  return (
    <div>
      {/* Calendar + Games side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Calendar */}
        <div className="bg-white rounded-sm border border-border-gray p-4 h-fit">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              disabled={!canGoPrev}
              className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-light-gray disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-bold text-charcoal">{monthLabel}</span>
            <button
              onClick={nextMonth}
              disabled={!canGoNext}
              className="w-8 h-8 flex items-center justify-center rounded-sm hover:bg-light-gray disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-charcoal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-[11px] font-semibold text-medium-gray text-center py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9" />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatYMD(viewYear, viewMonth, day);
              const isSynced = syncedSet.has(dateStr);
              const isSelected = dateStr === selectedDate;
              const isFuture = new Date(dateStr + "T12:00:00") > today;
              const dayData = allDaysMap[dateStr];
              const accuracy = dayData?.winnerAccuracy;

              return (
                <button
                  key={day}
                  onClick={() => !isFuture && setSelectedDate(dateStr)}
                  disabled={isFuture}
                  className={`h-9 rounded-sm text-xs font-semibold relative transition-colors ${
                    isSelected
                      ? "bg-charcoal text-white"
                      : isFuture
                        ? "text-border-gray cursor-not-allowed"
                        : isSynced
                          ? "text-charcoal hover:bg-light-gray cursor-pointer"
                          : "text-medium-gray/40 hover:bg-light-gray/50 cursor-pointer"
                  }`}
                >
                  {day}
                  {/* Accuracy dot */}
                  {isSynced && !isSelected && accuracy !== undefined && (
                    <span
                      className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        accuracy >= 60 ? "bg-green-500" : accuracy >= 50 ? "bg-yellow-500" : "bg-brand-primary"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-border-gray">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-medium-gray">60%+</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              <span className="text-[11px] text-medium-gray">50-59%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              <span className="text-[11px] text-medium-gray">&lt;50%</span>
            </div>
          </div>
        </div>

        {/* Selected date's games */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-teko text-xl font-bold text-charcoal uppercase">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h3>
            {selectedDayData && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-medium-gray">
                  Picks:{" "}
                  <span
                    className={`font-bold ${
                      selectedDayData.winnerAccuracy >= 60
                        ? "text-green-600"
                        : "text-brand-primary"
                    }`}
                  >
                    {selectedDayData.winnerAccuracy}%
                  </span>
                </span>
                <span className="text-xs text-medium-gray">
                  Over/Under:{" "}
                  <span
                    className={`font-bold ${
                      selectedDayData.ouAccuracy >= 60
                        ? "text-green-600"
                        : "text-brand-primary"
                    }`}
                  >
                    {selectedDayData.ouAccuracy}%
                  </span>
                </span>
              </div>
            )}
          </div>

          {selectedDayData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedDayData.games.map((game) => (
                <HistoryGameCard key={game.gameId} game={game} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-sm border border-border-gray">
              <p className="text-sm text-medium-gray">
                No prediction data for this date.
              </p>
              <p className="text-xs text-medium-gray/60 mt-1">
                Data may still be syncing, or no games were played.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
