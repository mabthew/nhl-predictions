"use client";

import { useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { GamePrediction } from "@/lib/types";
import { formatGameTime } from "@/lib/utils";

// Constant scroll speed in pixels per second — tune this one number
const SCROLL_SPEED = 65;

interface TickerProps {
  predictions: GamePrediction[];
}

function formatTickerDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function TickerItem({ game, showDate }: { game: GamePrediction; showDate: boolean }) {
  const isLive = game.gameStatus === "live";

  return (
    <div className="flex-none flex items-center">
      {showDate && (
        <div className="flex items-center px-4 border-r border-espn-red/40">
          <span className="text-[11px] font-bold uppercase tracking-widest text-espn-red">
            {formatTickerDate(game.gameDate)}
          </span>
        </div>
      )}
      <Link
        href={`/game/${game.gameId}`}
        className="flex items-center gap-3 px-5 py-1.5 border-r border-medium-gray/60 hover:bg-white/5 transition-colors"
      >
        {isLive && (
          <span className="h-2 w-2 rounded-full bg-espn-red header-pulse flex-shrink-0" />
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 flex-shrink-0">
            {(game.awayTeam.teamDarkLogo || game.awayTeam.teamLogo) && (
              <img src={game.awayTeam.teamDarkLogo || game.awayTeam.teamLogo} alt={game.awayTeam.teamAbbrev} className="w-5 h-5" />
            )}
          </div>
          <span className={`text-sm font-semibold text-white ${game.predictedWinner === "away" ? "underline underline-offset-2 decoration-espn-red" : ""}`}>
            {game.awayTeam.teamAbbrev}
          </span>
          {isLive && game.liveScore && (
            <span className="text-sm font-bold text-white">{game.liveScore.awayScore}</span>
          )}
        </div>
        {isLive ? (
          <span className="text-white/35 text-xs">-</span>
        ) : (
          <span className="text-white/35 text-xs">@</span>
        )}
        <div className="flex items-center gap-1.5">
          {isLive && game.liveScore && (
            <span className="text-sm font-bold text-white">{game.liveScore.homeScore}</span>
          )}
          <div className="w-5 h-5 flex-shrink-0">
            {(game.homeTeam.teamDarkLogo || game.homeTeam.teamLogo) && (
              <img src={game.homeTeam.teamDarkLogo || game.homeTeam.teamLogo} alt={game.homeTeam.teamAbbrev} className="w-5 h-5" />
            )}
          </div>
          <span className={`text-sm font-semibold text-white ${game.predictedWinner === "home" ? "underline underline-offset-2 decoration-espn-red" : ""}`}>
            {game.homeTeam.teamAbbrev}
          </span>
        </div>
        <div className="flex items-center gap-2 ml-1">
          {isLive ? (
            <span className="text-[11px] text-espn-red font-semibold">{game.liveScore?.periodLabel} {game.liveScore?.timeRemaining}</span>
          ) : (
            <span className="text-[11px] text-white/60">{formatGameTime(game.startTime)}</span>
          )}
          <span className="text-[11px] text-white/35">O/U {game.overUnder.line}</span>
        </div>
      </Link>
    </div>
  );
}

function renderItems(predictions: GamePrediction[], keyPrefix: string) {
  return predictions.map((game, i) => {
    const showDate = i === 0 || game.gameDate !== predictions[i - 1].gameDate;
    return <TickerItem key={`${keyPrefix}-${i}`} game={game} showDate={showDate} />;
  });
}

export default function Ticker({ predictions }: TickerProps) {
  if (predictions.length === 0) return null;

  const containerRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(0);
  const pausedRef = useRef(false);
  const copyWidthRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const copyEl = copyRef.current;
    const containerEl = containerRef.current;
    if (!copyEl || !containerEl) return;

    // Cancel any existing animation loop
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startLoop = () => {
      copyWidthRef.current = copyEl.offsetWidth;
      if (copyWidthRef.current === 0) return;

      let lastTime = performance.now();

      const tick = (now: number) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        if (!pausedRef.current && copyWidthRef.current > 0) {
          positionRef.current -= SCROLL_SPEED * dt;
          if (positionRef.current <= -copyWidthRef.current) {
            positionRef.current += copyWidthRef.current;
          }
          containerEl.style.transform = `translateX(${positionRef.current}px)`;
        } else {
          lastTime = now;
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    // Wait for all images to load before measuring
    const images = copyEl.querySelectorAll("img");
    let loaded = 0;
    const total = images.length;

    if (total === 0) {
      startLoop();
    } else {
      const onReady = () => {
        loaded++;
        if (loaded >= total) startLoop();
      };

      images.forEach((img) => {
        if (img.complete) {
          loaded++;
        } else {
          img.addEventListener("load", onReady, { once: true });
          img.addEventListener("error", onReady, { once: true });
        }
      });

      if (loaded >= total) startLoop();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [predictions]);

  return (
    <div
      className="relative z-10 bg-charcoal border-b-2 border-espn-red overflow-hidden isolate"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div
        ref={containerRef}
        className="flex whitespace-nowrap items-center py-2.5 bg-charcoal will-change-transform"
      >
        {/* First copy — measured for width */}
        <div ref={copyRef} className="flex-none flex items-center">
          {renderItems(predictions, "a")}
        </div>
        {/* Second copy — identical */}
        <div className="flex-none flex items-center">
          {renderItems(predictions, "b")}
        </div>
      </div>
    </div>
  );
}
