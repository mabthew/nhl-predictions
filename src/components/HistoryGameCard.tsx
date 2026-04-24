import { HistoryGame } from "@/lib/history";

export default function HistoryGameCard({ game }: { game: HistoryGame }) {
  const pickTeam =
    game.predictedWinner === "home" ? game.homeAbbrev : game.awayAbbrev;

  return (
    <div className="bg-white rounded-sm border border-border-gray shadow-sm overflow-hidden">
      {/* Matchup + Score */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {game.awayLogo && (
              <img src={game.awayLogo} alt={game.awayAbbrev} className="w-8 h-8" />
            )}
            <span className="text-sm font-bold text-charcoal">
              {game.awayAbbrev}
            </span>
            <span className="font-teko text-xl font-bold text-charcoal tabular-nums">
              {game.awayScore}
            </span>
          </div>

          <span className="text-[10px] font-mono text-medium-gray uppercase tracking-widest">FINAL</span>

          <div className="flex items-center gap-2">
            <span className="font-teko text-xl font-bold text-charcoal tabular-nums">
              {game.homeScore}
            </span>
            <span className="text-sm font-bold text-charcoal">
              {game.homeAbbrev}
            </span>
            {game.homeLogo && (
              <img src={game.homeLogo} alt={game.homeAbbrev} className="w-8 h-8" />
            )}
          </div>
        </div>

        {/* Prediction results */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className={`border border-dashed px-3 py-2 text-xs ${
              game.winnerCorrect
                ? "border-green-500/60 bg-green-50 text-green-700"
                : "border-brand-primary/60 bg-red-50 text-brand-primary"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{game.winnerCorrect ? "✓" : "✗"}</span>
              <span className="font-semibold">
                Picked {pickTeam} ({game.winnerConfidence}%)
              </span>
            </div>
          </div>

          <div
            className={`border border-dashed px-3 py-2 text-xs ${
              game.ouCorrect
                ? "border-green-500/60 bg-green-50 text-green-700"
                : "border-brand-primary/60 bg-red-50 text-brand-primary"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{game.ouCorrect ? "✓" : "✗"}</span>
              <span className="font-semibold">
                {game.ouPrediction} {game.ouLine} (Actual: {game.actualTotal})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Extra details */}
      <div className="px-4 pb-3 pt-2 border-t border-dashed border-border-gray bg-light-gray/30 space-y-2">
        {/* Scoring averages */}
        {game.homeGoalsPerGame != null && game.awayGoalsPerGame != null && (
          <div className="flex items-center justify-between text-[11px] text-medium-gray">
            <span>
              {game.awayAbbrev}{" "}
              <span className="font-semibold text-charcoal">
                {game.awayGoalsPerGame.toFixed(1)}
              </span>{" "}
              GPG
            </span>
            <span className="text-[11px] uppercase tracking-wider">Season Avg</span>
            <span>
              {game.homeAbbrev}{" "}
              <span className="font-semibold text-charcoal">
                {game.homeGoalsPerGame.toFixed(1)}
              </span>{" "}
              GPG
            </span>
          </div>
        )}

        {/* Projected total */}
        {game.ouProjectedTotal != null && (
          <div className="text-[11px] text-medium-gray">
            Projected total:{" "}
            <span className="font-semibold text-charcoal">
              {game.ouProjectedTotal.toFixed(1)}
            </span>{" "}
            goals vs line of {game.ouLine}
          </div>
        )}

        {/* Key factor */}
        {game.keyFactor && (
          <div className="text-[11px] text-medium-gray italic flex items-start gap-1.5">
            <span className="text-brand-primary mt-px">&#9656;</span>
            {game.keyFactor}
          </div>
        )}

        {/* Player prop */}
        {game.propPlayer && (
          <div className="text-[11px] flex items-center gap-1.5">
            <span className="bg-charcoal text-white text-[10px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5">
              Player Prop
            </span>
            <span className="text-medium-gray">
              {game.propPlayer}{" "}
              <span className="font-semibold text-charcoal">
                {game.propPick} {game.propLine}
              </span>{" "}
              {game.propMarket}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
