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
      className={`bg-white rounded-sm shadow-sm overflow-hidden hover:shadow-md transition-shadow scroll-mt-20 ${
        isLive ? "border-2 border-brand-primary/60 ring-1 ring-brand-primary/20" : "border border-border-gray"
      }`}
    >
      {/* Main Card — clicks go to detail page */}
      <Link href={`/game/${prediction.gameId}`} className="block">
        {/* Meta bar */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-brand-primary">
                <span className="h-2 w-2 rounded-full bg-brand-primary header-pulse" />
                LIVE · {prediction.liveScore?.periodLabel} {prediction.liveScore?.timeRemaining}
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-charcoal">
                {formatGameTime(prediction.startTime)}
              </span>
            )}
            {!isLive && prediction.dayIndex >= 2 && (
              <ForecastBadge tier={prediction.forecastTier} />
            )}
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-medium-gray/60">{prediction.venue}</span>
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
        {(() => {
          const puckLine = prediction.puckLine;
          const favCovers = puckLine?.favoriteCoverProbability;
          const flip = favCovers != null && favCovers < 50;
          const favoriteIsHome = puckLine ? puckLine.homeSpread < 0 : predictedWinner === "home";
          const spreadPickIsHome = puckLine
            ? (flip ? !favoriteIsHome : favoriteIsHome)
            : predictedWinner === "home";
          const spreadPickTeam = spreadPickIsHome ? homeTeam.teamAbbrev : awayTeam.teamAbbrev;
          const spreadPickLine = flip ? "+1.5" : "-1.5";
          const spreadPickConfidence = favCovers != null
            ? (flip ? 100 - favCovers : favCovers)
            : null;

          return (
            <div className={`mx-4 mb-3 px-4 py-3.5 border-t border-b border-dashed border-border-gray ${isLive ? "bg-light-gray/50" : "bg-light-gray/70"}`}>
              {/* Puck line — only show when books have posted lines. NHL spreads
                  often aren't posted until 24-48h before puck drop because goalie
                  starts (the dominant pricing variable) aren't confirmed earlier. */}
              {puckLine && (
                <>
                  <div className="flex items-center justify-center gap-6 mb-2">
                    <div className="text-center">
                      <span className="font-teko text-xl font-bold leading-none" style={{ color: TEAM_COLORS[awayTeam.teamAbbrev] ?? "#232525" }}>
                        {puckLine.awaySpread > 0 ? "+" : ""}{puckLine.awaySpread}
                      </span>
                      <span className="text-xs font-bold text-charcoal ml-1">({formatOdds(puckLine.awayOdds)})</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-medium-gray">
                      {isLive ? "Pre-Game PL" : "Puck Line"}
                    </span>
                    <div className="text-center">
                      <span className="font-teko text-xl font-bold leading-none" style={{ color: TEAM_COLORS[homeTeam.teamAbbrev] ?? "#232525" }}>
                        {puckLine.homeSpread > 0 ? "+" : ""}{puckLine.homeSpread}
                      </span>
                      <span className="text-xs font-bold text-charcoal ml-1">({formatOdds(puckLine.homeOdds)})</span>
                    </div>
                  </div>

                  {spreadPickConfidence != null && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-medium-gray">Spread Pick</span>
                      <span className="text-xs font-bold text-charcoal">{spreadPickTeam} {spreadPickLine}</span>
                      <div className="w-14 h-1.5 bg-white overflow-hidden">
                        <div
                          className={`h-full ${
                            spreadPickConfidence >= 65
                              ? "bg-green-500"
                              : spreadPickConfidence >= 55
                                ? "bg-yellow-500"
                                : "bg-brand-primary"
                          }`}
                          style={{ width: `${spreadPickConfidence}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold ${
                        spreadPickConfidence >= 65
                          ? "text-green-600"
                          : spreadPickConfidence >= 55
                            ? "text-yellow-600"
                            : "text-brand-primary"
                      }`}>
                        {spreadPickConfidence}%
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Moneyline winner pick — always renders since it's model-only */}
              <div className={`flex items-center justify-center gap-2 ${puckLine ? "pt-2 mt-2 border-t border-dashed border-border-gray/60" : ""}`}>
                <span className="text-[10px] font-mono uppercase tracking-widest text-medium-gray">Moneyline</span>
                <span className="text-xs font-bold text-charcoal">{winnerAbbrev}</span>
                <div className="w-14 h-1.5 bg-white overflow-hidden">
                  <div className="h-full bg-green-500" style={{ width: `${winnerConfidence}%` }} />
                </div>
                <span className="text-[11px] font-bold text-green-600">{winnerConfidence}%</span>
              </div>
            </div>
          );
        })()}

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
        className="w-full flex items-center justify-center gap-1.5 py-2.5 hover:bg-light-gray transition-colors border-t border-dashed border-border-gray"
        aria-label="Toggle quick view"
      >
        <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-medium-gray">
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
          <div className="border-t border-dashed border-border-gray p-5 bg-light-gray/50">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-medium-gray mb-3">
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
                <div className="bg-white border border-dashed border-border-gray p-3 flex items-center justify-center">
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
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-charcoal text-white text-xs font-mono font-semibold uppercase tracking-widest rounded-sm hover:bg-charcoal/90 transition-colors"
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

