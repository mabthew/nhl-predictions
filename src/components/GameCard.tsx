"use client";

import { useState } from "react";
import Link from "next/link";
import { GamePrediction } from "@/lib/types";
import { formatGameTime, formatDate, formatOdds } from "@/lib/utils";
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
  const isLive = prediction.gameStatus === "live";

  return (
    <div
      id={`game-${prediction.gameId}`}
      className={`bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow scroll-mt-20 ${
        isLive ? "border-2 border-espn-red/60 ring-1 ring-espn-red/20" : "border border-border-gray"
      }`}
    >
      {/* Main Card — clicks go to detail page */}
      <Link href={`/game/${prediction.gameId}`} className="block">
        {/* Meta bar */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-espn-red">
                <span className="h-2 w-2 rounded-full bg-espn-red header-pulse" />
                LIVE — {prediction.liveScore?.periodLabel} {prediction.liveScore?.timeRemaining}
              </span>
            ) : (
              <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal">
                {formatGameTime(prediction.startTime)}
              </span>
            )}
            {!isLive && prediction.dayIndex >= 2 && (
              <ForecastBadge tier={prediction.forecastTier} />
            )}
          </div>
          <span className="text-[11px] uppercase tracking-wider text-medium-gray/60">{prediction.venue}</span>
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
              <p className="text-[11px] text-medium-gray mt-0.5">{awayTeam.teamName}</p>
            </div>
            {isLive && prediction.liveScore && (
              <span className="font-teko text-3xl font-bold text-charcoal ml-auto">
                {prediction.liveScore.awayScore}
              </span>
            )}
          </div>

          {isLive ? (
            <span className="text-sm font-bold text-border-gray px-3">-</span>
          ) : (
            <span className="text-sm font-bold text-border-gray px-3">@</span>
          )}

          <div className="flex items-center gap-3 flex-1 justify-end">
            {isLive && prediction.liveScore && (
              <span className="font-teko text-3xl font-bold text-charcoal mr-auto">
                {prediction.liveScore.homeScore}
              </span>
            )}
            <div className="text-right">
              <p className="font-teko text-2xl font-bold uppercase leading-none" style={{ color: TEAM_COLORS[homeTeam.teamAbbrev] ?? "#232525" }}>
                {homeTeam.teamAbbrev}
              </p>
              <p className="text-[11px] text-medium-gray mt-0.5">{homeTeam.teamName}</p>
            </div>
            {homeTeam.teamLogo && (
              <img src={homeTeam.teamLogo} alt={homeTeam.teamAbbrev} className="w-12 h-12" />
            )}
          </div>
        </div>

        {/* Live game mini-stats */}
        {isLive && prediction.liveScore && (
          <div className="mx-5 mb-3 flex items-center justify-center gap-6 text-[11px] text-medium-gray">
            <span>SOG: {prediction.liveScore.awaySog}</span>
            <span className="text-border-gray">|</span>
            <span>SOG: {prediction.liveScore.homeSog}</span>
          </div>
        )}

        {/* Pick zone — visually distinct */}
        <div className={`mx-4 mb-3 rounded-lg px-4 py-3.5 ${isLive ? "bg-light-gray/50 border border-border-gray" : "bg-light-gray/70"}`}>
          {/* Puck Line — primary pick */}
          {prediction.puckLine ? (
            <>
              <div className="flex items-center justify-center gap-6 mb-2">
                <div className="text-center">
                  <span className="font-teko text-xl font-bold leading-none" style={{ color: TEAM_COLORS[awayTeam.teamAbbrev] ?? "#232525" }}>
                    {prediction.puckLine.awaySpread > 0 ? "+" : ""}{prediction.puckLine.awaySpread}
                  </span>
                  <span className="text-xs font-bold text-charcoal ml-1">({formatOdds(prediction.puckLine.awayOdds)})</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-medium-gray font-bold">
                  {isLive ? "Pre-Game PL" : "Puck Line"}
                </span>
                <div className="text-center">
                  <span className="font-teko text-xl font-bold leading-none" style={{ color: TEAM_COLORS[homeTeam.teamAbbrev] ?? "#232525" }}>
                    {prediction.puckLine.homeSpread > 0 ? "+" : ""}{prediction.puckLine.homeSpread}
                  </span>
                  <span className="text-xs font-bold text-charcoal ml-1">({formatOdds(prediction.puckLine.homeOdds)})</span>
                </div>
              </div>
              {/* Winner pick */}
              <div className="pt-2 mt-2 border-t border-border-gray/40 flex items-center justify-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-medium-gray font-bold">Favorite</span>
                <span className="text-xs font-bold text-charcoal">{winnerAbbrev}</span>
                <div className="w-14 h-1.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${winnerConfidence}%` }} />
                </div>
                <span className="text-[11px] font-bold text-green-600">{winnerConfidence}%</span>
              </div>
            </>
          ) : (
            /* Fallback when no puck line data */
            <>
              <div className="flex flex-col items-center mb-2">
                <span className="text-[11px] uppercase tracking-widest text-medium-gray font-bold">
                  {isLive ? "Pre-Game Pick" : "Our Pick"}
                </span>
                <span className="font-teko text-3xl font-bold leading-none text-charcoal">
                  {winnerAbbrev}
                </span>
              </div>
              <div className="h-2.5 bg-white rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${winnerConfidence}%` }} />
              </div>
              <p className="text-center text-xs font-bold text-green-600 mt-1.5">{winnerConfidence}% confidence</p>
            </>
          )}
        </div>

      </Link>

      {/* Key Factors — collapsible, red arrow style */}
      {prediction.keyFactors.length > 0 && (
        <div className="px-5 pb-3">
          <CollapsibleFactors factors={prediction.keyFactors} />
        </div>
      )}

      {/* Expand bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 hover:bg-light-gray transition-colors border-t border-border-gray/50"
        aria-label="Toggle quick view"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-medium-gray">
          {expanded ? "Hide" : "Quick View"}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-medium-gray transition-transform duration-200 ${
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
              <MetricBar label="Shots For Per Game" homeValue={homeTeam.shotsForPerGame} awayValue={awayTeam.shotsForPerGame} format={(v) => v.toFixed(1)} />
              <MetricBar label="Shots Against Per Game" homeValue={homeTeam.shotsAgainstPerGame} awayValue={awayTeam.shotsAgainstPerGame} format={(v) => v.toFixed(1)} />
              <MetricBar label="Power Play" homeValue={homeTeam.powerPlayPct} awayValue={awayTeam.powerPlayPct} format={(v) => `${v.toFixed(1)}%`} />
              <MetricBar label="Penalty Kill" homeValue={homeTeam.penaltyKillPct} awayValue={awayTeam.penaltyKillPct} format={(v) => `${v.toFixed(1)}%`} />
              <MetricBar label="Faceoff Win" homeValue={homeTeam.faceoffWinPct} awayValue={awayTeam.faceoffWinPct} format={(v) => `${v.toFixed(1)}%`} />
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

