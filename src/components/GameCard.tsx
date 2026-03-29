"use client";

import { useState } from "react";
import Link from "next/link";
import { GamePrediction } from "@/lib/types";
import { formatGameTime, formatDate } from "@/lib/utils";
import { TEAM_COLORS } from "@/lib/team-colors";
import MetricBar from "./MetricBar";
import OverUnder from "./OverUnder";
import PlayerProp from "./PlayerProp";
import CollapsibleFactors from "./CollapsibleFactors";
import ForecastBadge from "./ForecastBadge";

interface GameCardProps {
  prediction: GamePrediction;
}


export default function GameCard({ prediction }: GameCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { homeTeam, awayTeam, predictedWinner, winnerConfidence } = prediction;
  const winnerAbbrev = predictedWinner === "home" ? homeTeam.teamAbbrev : awayTeam.teamAbbrev;
  const winnerColor = TEAM_COLORS[winnerAbbrev] ?? "#232525";

  return (
    <div
      id={`game-${prediction.gameId}`}
      className="bg-white rounded-xl shadow-sm border border-border-gray overflow-hidden hover:shadow-md transition-shadow scroll-mt-20"
    >
      {/* Main Card — clicks go to detail page */}
      <Link href={`/game/${prediction.gameId}`} className="block">
        {/* Meta bar */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal">
              {formatGameTime(prediction.startTime)}
            </span>
            {prediction.dayIndex >= 2 && (
              <ForecastBadge tier={prediction.forecastTier} />
            )}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-medium-gray/60">{prediction.venue}</span>
        </div>

        {/* Matchup row */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {awayTeam.teamLogo && (
              <img src={awayTeam.teamLogo} alt={awayTeam.teamAbbrev} className="w-12 h-12" />
            )}
            <div>
              <p className="font-teko text-2xl font-bold uppercase leading-none" style={{ color: TEAM_COLORS[awayTeam.teamAbbrev] ?? "#232525" }}>
                {awayTeam.teamAbbrev}
              </p>
              <p className="text-[10px] text-medium-gray mt-0.5">{awayTeam.teamName}</p>
            </div>
          </div>

          <span className="text-sm font-bold text-border-gray px-3">@</span>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="text-right">
              <p className="font-teko text-2xl font-bold uppercase leading-none" style={{ color: TEAM_COLORS[homeTeam.teamAbbrev] ?? "#232525" }}>
                {homeTeam.teamAbbrev}
              </p>
              <p className="text-[10px] text-medium-gray mt-0.5">{homeTeam.teamName}</p>
            </div>
            {homeTeam.teamLogo && (
              <img src={homeTeam.teamLogo} alt={homeTeam.teamAbbrev} className="w-12 h-12" />
            )}
          </div>
        </div>

        {/* Pick zone — visually distinct */}
        <div className="mx-4 mb-3 rounded-lg px-4 py-3.5 bg-light-gray/70">
          <div className="flex flex-col items-center mb-2">
            <span className="text-[10px] uppercase tracking-widest text-medium-gray font-bold">Our Pick</span>
            <span className="font-teko text-3xl font-bold leading-none text-charcoal">
              {winnerAbbrev}
            </span>
          </div>
          <div className="h-2.5 bg-white rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${winnerConfidence}%` }} />
          </div>
          <p className="text-center text-xs font-bold text-green-600 mt-1.5">{winnerConfidence}% confidence</p>
        </div>

      </Link>

      {/* Key Factors — collapsible, red arrow style */}
      {prediction.keyFactors.length > 0 && (
        <div className="px-5 pb-3">
          <CollapsibleFactors factors={prediction.keyFactors} />
        </div>
      )}

      {/* Expand arrow */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex justify-center py-2 hover:bg-light-gray/50 transition-colors border-t border-border-gray/50"
        aria-label="Toggle quick view"
      >
        <svg
          className={`w-4 h-4 text-medium-gray transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Detail */}
      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-in-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-gray p-5 bg-light-gray/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-medium-gray mb-3">
              Matchup Breakdown
            </h3>

            <div className="mb-4">
              <MetricBar label="Shots For / Game" homeValue={homeTeam.shotsForPerGame} awayValue={awayTeam.shotsForPerGame} format={(v) => v.toFixed(1)} />
              <MetricBar label="Shots Against / Game" homeValue={homeTeam.shotsAgainstPerGame} awayValue={awayTeam.shotsAgainstPerGame} format={(v) => v.toFixed(1)} />
              <MetricBar label="Power Play %" homeValue={homeTeam.powerPlayPct} awayValue={awayTeam.powerPlayPct} format={(v) => `${v.toFixed(1)}%`} />
              <MetricBar label="Penalty Kill %" homeValue={homeTeam.penaltyKillPct} awayValue={awayTeam.penaltyKillPct} format={(v) => `${v.toFixed(1)}%`} />
              <MetricBar label="Faceoff Win %" homeValue={homeTeam.faceoffWinPct} awayValue={awayTeam.faceoffWinPct} format={(v) => `${v.toFixed(1)}%`} />
              <MetricBar label="Recent Form" homeValue={homeTeam.recentForm} awayValue={awayTeam.recentForm} homeLabel={homeTeam.l10Record} awayLabel={awayTeam.l10Record} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <OverUnder overUnder={prediction.overUnder} />
              {prediction.playerProp ? (
                <PlayerProp prop={prediction.playerProp} />
              ) : (
                <div className="bg-light-gray rounded-lg p-3 flex items-center justify-center">
                  <p className="text-xs text-medium-gray italic">
                    {prediction.forecastTier !== "full"
                      ? "Player props available closer to game time"
                      : "No player prop data available"}
                  </p>
                </div>
              )}
            </div>

            <Link
              href={`/game/${prediction.gameId}`}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-charcoal text-white text-sm font-semibold rounded-lg hover:bg-charcoal/90 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              View Full Analysis
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

