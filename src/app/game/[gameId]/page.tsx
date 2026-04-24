import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConfidenceMeter from "@/components/ConfidenceMeter";
import MetricBar from "@/components/MetricBar";
import OverUnder from "@/components/OverUnder";
import PlayerProp from "@/components/PlayerProp";
import PlayerHeadshot from "@/components/PlayerHeadshot";
import BoxScore from "@/components/BoxScore";
import PlayerCareerCard from "@/components/PlayerCareerCard";
import LineCombos from "@/components/LineCombos";
import { getPredictions } from "@/lib/get-predictions";
import { fetchBoxScore, fetchPlayerProfile } from "@/lib/nhl-api";
import { fetchLineCombos } from "@/lib/daily-faceoff";
import { formatGameTime, formatDate, formatOdds } from "@/lib/utils";
import { TeamMetrics } from "@/lib/types";
import { TEAM_COLORS } from "@/lib/team-colors";
import CollapsibleFactors from "@/components/CollapsibleFactors";

export const revalidate = 900;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  const data = await getPredictions();

  if (!data) return {};

  const game = data.predictions.find((p) => String(p.gameId) === gameId);
  if (!game) return {};

  const { homeTeam, awayTeam, predictedWinner, winnerConfidence } = game;
  const winner = predictedWinner === "home" ? homeTeam : awayTeam;
  const title = `${awayTeam.teamName} vs ${homeTeam.teamName} Prediction | DegenHL`;
  const description = `Our model picks ${winner.teamName} with ${winnerConfidence}% confidence. Get the full matchup breakdown, over/under prediction, and player prop pick.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const [data, boxScore] = await Promise.all([
    getPredictions(),
    fetchBoxScore(Number(gameId)),
  ]);

  if (!data) notFound();

  const game = data.predictions.find((p) => String(p.gameId) === gameId);
  if (!game) notFound();

  const { homeTeam, awayTeam, predictedWinner, winnerConfidence } = game;
  const winner = predictedWinner === "home" ? homeTeam : awayTeam;
  const awayTopPlayer = awayTeam.topPlayers?.[0];
  const homeTopPlayer = homeTeam.topPlayers?.[0];

  // Fetch career profiles + line combos in parallel
  const playerIds = [awayTopPlayer?.playerId, homeTopPlayer?.playerId].filter(Boolean) as number[];
  const [profiles, awayLines, homeLines] = await Promise.all([
    Promise.all(playerIds.map((id) => fetchPlayerProfile(id))),
    fetchLineCombos(awayTeam.teamAbbrev),
    fetchLineCombos(homeTeam.teamAbbrev),
  ]);
  const profileMap = new Map(profiles.filter(Boolean).map((p) => [p!.playerId, p!]));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: `${awayTeam.teamName} at ${homeTeam.teamName}`,
            startDate: game.gameDate,
            location: {
              "@type": "Place",
              name: game.venue,
            },
            homeTeam: {
              "@type": "SportsTeam",
              name: homeTeam.teamName,
            },
            awayTeam: {
              "@type": "SportsTeam",
              name: awayTeam.teamName,
            },
            eventStatus:
              game.gameStatus === "final"
                ? "https://schema.org/EventCompleted"
                : "https://schema.org/EventScheduled",
          }),
        }}
      />
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-medium-gray hover:text-charcoal transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Predictions
        </Link>

        {/* Hero Matchup Section */}
        <div className="rounded-2xl overflow-hidden mb-8 bg-white border border-border-gray relative">

          {/* Game meta bar */}
          <div className={`px-6 py-2.5 flex items-center justify-between border-b ${game.gameStatus === "live" ? "bg-brand-primary/5 border-brand-primary/30" : "bg-light-gray border-border-gray"}`}>
            <div className="flex items-center gap-2">
              {game.gameStatus === "live" && (
                <span className="h-2.5 w-2.5 rounded-full bg-brand-primary header-pulse" />
              )}
              <span className={`text-[11px] font-bold uppercase tracking-widest ${game.gameStatus === "live" ? "text-brand-primary" : "text-charcoal"}`}>
                {game.gameStatus === "live" ? "LIVE" : ""} {awayTeam.teamAbbrev} @ {homeTeam.teamAbbrev} &middot; {formatDate(game.gameDate)}
              </span>
            </div>
            <span className="text-[11px] font-medium text-medium-gray">
              {game.gameStatus === "live" && game.liveScore
                ? `${game.liveScore.periodLabel} ${game.liveScore.timeRemaining}`
                : `${formatGameTime(game.startTime)} \u00B7 ${game.venue}`}
            </span>
          </div>

          {/* Live score banner */}
          {game.gameStatus === "live" && game.liveScore && (
            <div className="px-6 py-4 bg-charcoal flex items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                {awayTeam.teamLogo && (
                  <img src={awayTeam.teamLogo} alt={awayTeam.teamAbbrev} className="w-10 h-10" />
                )}
                <span className="font-teko text-4xl font-bold text-white">{game.liveScore.awayScore}</span>
              </div>
              <div className="text-center">
                <span className="text-white/60 text-xs font-bold uppercase tracking-wider">{game.liveScore.periodLabel}</span>
                <p className="text-white text-lg font-bold">{game.liveScore.timeRemaining}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-teko text-4xl font-bold text-white">{game.liveScore.homeScore}</span>
                {homeTeam.teamLogo && (
                  <img src={homeTeam.teamLogo} alt={homeTeam.teamAbbrev} className="w-10 h-10" />
                )}
              </div>
              <div className="flex items-center gap-4 ml-4 text-white/50 text-xs">
                <span>SOG: {game.liveScore.awaySog} - {game.liveScore.homeSog}</span>
              </div>
            </div>
          )}

          {/* 3-column layout */}
          <div className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-stretch gap-4 sm:gap-0">
            {/* Away column */}
            <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${predictedWinner === "away" ? "bg-green-50 rounded-lg p-4 ring-2 ring-green-500" : "p-4"}`}>
              <div className="flex items-center gap-3">
                {awayTeam.teamLogo && (
                  <img src={awayTeam.teamLogo} alt={awayTeam.teamAbbrev} className="w-14 h-14" />
                )}
                <div>
                  <p className="font-teko text-3xl sm:text-4xl font-bold uppercase leading-none" style={{ color: TEAM_COLORS[awayTeam.teamAbbrev] ?? "#232525" }}>
                    {awayTeam.teamAbbrev}
                  </p>
                  <p className="text-[11px] text-medium-gray">{awayTeam.teamName}</p>
                </div>
              </div>
              {awayTopPlayer && (
                <div className="flex flex-col items-center gap-1 pt-2 border-t border-border-gray/50 w-full">
                  <PlayerHeadshot src={awayTopPlayer.headshot} name={`${awayTopPlayer.firstName} ${awayTopPlayer.lastName}`} size={72} />
                  <p className="text-sm font-bold text-charcoal">{awayTopPlayer.firstName[0]}. {awayTopPlayer.lastName}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-medium-gray"><span className="font-bold text-charcoal">{awayTopPlayer.goals}</span> G</span>
                    <span className="text-xs text-medium-gray"><span className="font-bold text-charcoal">{awayTopPlayer.assists}</span> A</span>
                    <span className="text-xs text-medium-gray"><span className="font-bold text-charcoal">{awayTopPlayer.points}</span> P</span>
                  </div>
                </div>
              )}
            </div>

            {/* Center — puck line (primary) + winner pick (secondary) */}
            <div className="flex flex-col items-center justify-center px-2 sm:px-10 sm:min-w-[220px] py-2 sm:py-0 border-y sm:border-y-0 border-border-gray/50">
              {game.gameStatus === "live" && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-primary mb-1">Pre-Game Analysis</span>
              )}
              {game.puckLine ? (
                <>
                  <p className="text-[10px] uppercase tracking-widest text-medium-gray font-bold mb-2">Puck Line</p>
                  <div className="flex gap-6 items-center">
                    <div className="text-center">
                      <p className="font-teko text-2xl sm:text-3xl font-bold leading-none" style={{ color: TEAM_COLORS[awayTeam.teamAbbrev] ?? "#232525" }}>
                        {awayTeam.teamAbbrev} {game.puckLine.awaySpread > 0 ? "+" : ""}{game.puckLine.awaySpread}
                      </p>
                      <p className="text-sm font-bold text-charcoal mt-0.5">{formatOdds(game.puckLine.awayOdds)}</p>
                    </div>
                    <span className="text-xs text-medium-gray/40 font-bold">vs</span>
                    <div className="text-center">
                      <p className="font-teko text-2xl sm:text-3xl font-bold leading-none" style={{ color: TEAM_COLORS[homeTeam.teamAbbrev] ?? "#232525" }}>
                        {homeTeam.teamAbbrev} {game.puckLine.homeSpread > 0 ? "+" : ""}{game.puckLine.homeSpread}
                      </p>
                      <p className="text-sm font-bold text-charcoal mt-0.5">{formatOdds(game.puckLine.homeOdds)}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border-gray/40 w-full max-w-[240px] flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-medium-gray font-bold">Winner</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: TEAM_COLORS[winner.teamAbbrev] ?? "#232525" }}>{winner.teamAbbrev}</span>
                      <div className="w-16 h-2 bg-border-gray rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${winnerConfidence}%` }} />
                      </div>
                      <span className="text-xs font-bold text-green-600">{winnerConfidence}%</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-teko text-2xl sm:text-3xl leading-none">
                    <span className="text-medium-gray font-bold">Pick: </span>
                    <span className="font-bold" style={{ color: TEAM_COLORS[winner.teamAbbrev] ?? "#232525" }}>{winner.teamAbbrev}</span>
                  </p>
                  <p className="text-base sm:text-lg text-medium-gray font-semibold mt-1">{winnerConfidence}% confidence</p>
                  <div className="w-full max-w-[200px] mt-2 h-3 bg-border-gray rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${winnerConfidence}%` }} />
                  </div>
                </>
              )}
            </div>

            {/* Home column */}
            <div className={`flex-1 flex flex-col items-center justify-center gap-3 ${predictedWinner === "home" ? "bg-green-50 rounded-lg p-4 ring-2 ring-green-500" : "p-4"}`}>
              <div className="flex items-center gap-3">
                {homeTeam.teamLogo && (
                  <img src={homeTeam.teamLogo} alt={homeTeam.teamAbbrev} className="w-14 h-14" />
                )}
                <div>
                  <p className="font-teko text-3xl sm:text-4xl font-bold uppercase leading-none" style={{ color: TEAM_COLORS[homeTeam.teamAbbrev] ?? "#232525" }}>
                    {homeTeam.teamAbbrev}
                  </p>
                  <p className="text-[11px] text-medium-gray">{homeTeam.teamName}</p>
                </div>
              </div>
              {homeTopPlayer && (
                <div className="flex flex-col items-center gap-1 pt-2 border-t border-border-gray/50 w-full">
                  <PlayerHeadshot src={homeTopPlayer.headshot} name={`${homeTopPlayer.firstName} ${homeTopPlayer.lastName}`} size={72} />
                  <p className="text-sm font-bold text-charcoal">{homeTopPlayer.firstName[0]}. {homeTopPlayer.lastName}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-medium-gray"><span className="font-bold text-charcoal">{homeTopPlayer.goals}</span> G</span>
                    <span className="text-xs text-medium-gray"><span className="font-bold text-charcoal">{homeTopPlayer.assists}</span> A</span>
                    <span className="text-xs text-medium-gray"><span className="font-bold text-charcoal">{homeTopPlayer.points}</span> P</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Box Score — shown for live and completed games */}
        {boxScore && (
          <div className="mb-8">
            <BoxScore boxScore={boxScore} />
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: Metrics (spans 2 cols on large) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Matchup Breakdown */}
            <section className="bg-white rounded-xl border-l-4 border-brand-primary shadow-sm p-6">
              <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-4">
                Matchup Breakdown
              </h2>
              <div className="flex items-center justify-between mb-4 text-xs font-semibold uppercase tracking-wider">
                <span className="text-accent-blue">{awayTeam.teamAbbrev} (Away)</span>
                <span className="text-brand-primary">{homeTeam.teamAbbrev} (Home)</span>
              </div>
              <div className="space-y-1">
                <MetricBar label="Shots For Per Game" homeValue={homeTeam.shotsForPerGame} awayValue={awayTeam.shotsForPerGame} format={(v) => v.toFixed(1)} />
                <MetricBar label="Shots Against Per Game" homeValue={homeTeam.shotsAgainstPerGame} awayValue={awayTeam.shotsAgainstPerGame} format={(v) => v.toFixed(1)} />
                <MetricBar label="Power Play" homeValue={homeTeam.powerPlayPct} awayValue={awayTeam.powerPlayPct} format={(v) => `${v.toFixed(1)}%`} />
                <MetricBar label="Penalty Kill" homeValue={homeTeam.penaltyKillPct} awayValue={awayTeam.penaltyKillPct} format={(v) => `${v.toFixed(1)}%`} />
                <MetricBar label="Faceoff Win" homeValue={homeTeam.faceoffWinPct} awayValue={awayTeam.faceoffWinPct} format={(v) => `${v.toFixed(1)}%`} />
                <MetricBar label="Roster Health" homeValue={homeTeam.irImpact} awayValue={awayTeam.irImpact} />
                <MetricBar label="Recent Form" homeValue={homeTeam.recentForm} awayValue={awayTeam.recentForm} homeLabel={homeTeam.l10Record} awayLabel={awayTeam.l10Record} />
              </div>
            </section>

            {/* Player Career Context */}
            {(profileMap.size > 0) && (
              <section className="bg-white rounded-xl border-l-4 border-yellow-500 shadow-sm p-6">
                <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-4">
                  Star Player Profiles
                </h2>
                <p className="text-[11px] text-medium-gray mb-4">Last 3 seasons + career awards</p>
                <div className="space-y-4">
                  {awayTopPlayer && profileMap.has(awayTopPlayer.playerId) && (
                    <PlayerCareerCard profile={profileMap.get(awayTopPlayer.playerId)!} />
                  )}
                  {homeTopPlayer && profileMap.has(homeTopPlayer.playerId) && (
                    <PlayerCareerCard profile={profileMap.get(homeTopPlayer.playerId)!} />
                  )}
                </div>
              </section>
            )}

            {/* Line Combinations */}
            <LineCombos awayLines={awayLines} homeLines={homeLines} />

            {/* Scoring Stats */}
            <section className="bg-white rounded-xl border-l-4 border-accent-blue shadow-sm p-6">
              <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-4">
                Scoring Averages
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <TeamStatCard team={awayTeam} side="away" />
                <TeamStatCard team={homeTeam} side="home" />
              </div>
            </section>

            {/* Composite Score Comparison */}
            <section className="bg-white rounded-xl border-l-4 border-charcoal/30 shadow-sm p-6">
              <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-4">
                Composite Score
              </h2>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-charcoal">{awayTeam.teamAbbrev}</span>
                    <span className="text-sm font-bold text-charcoal">{awayTeam.compositeScore.toFixed(1)}</span>
                  </div>
                  <div className="h-4 bg-border-gray rounded-full overflow-hidden">
                    <div className="h-full bg-accent-blue rounded-full transition-all duration-500" style={{ width: `${Math.min(100, awayTeam.compositeScore)}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-charcoal">{homeTeam.teamAbbrev}</span>
                    <span className="text-sm font-bold text-charcoal">{homeTeam.compositeScore.toFixed(1)}</span>
                  </div>
                  <div className="h-4 bg-border-gray rounded-full overflow-hidden">
                    <div className="h-full bg-brand-primary rounded-full transition-all duration-500" style={{ width: `${Math.min(100, homeTeam.compositeScore)}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-medium-gray mt-3">
                Composite score reflects all model factors including home ice advantage for {homeTeam.teamAbbrev}.
              </p>
            </section>
          </div>

          {/* Right column: Sidebar */}
          <div className="space-y-6">

            {/* Key Factors */}
            <section className="bg-white rounded-xl border border-border-gray shadow-sm p-6">
              <CollapsibleFactors factors={game.keyFactors} />
            </section>

            {/* Puck Line */}
            {game.puckLine && (
              <section className="bg-white rounded-xl border-l-4 border-green-500 shadow-sm p-6">
                <h2 className="font-teko text-lg font-bold uppercase tracking-tight text-charcoal mb-3">
                  Puck Line (Spread)
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-light-gray">
                    <span className="font-semibold text-sm text-charcoal">{awayTeam.teamAbbrev}</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-charcoal">{game.puckLine.awaySpread > 0 ? "+" : ""}{game.puckLine.awaySpread}</span>
                      <span className="text-sm text-medium-gray ml-2">({formatOdds(game.puckLine.awayOdds)})</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-light-gray">
                    <span className="font-semibold text-sm text-charcoal">{homeTeam.teamAbbrev}</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-charcoal">{game.puckLine.homeSpread > 0 ? "+" : ""}{game.puckLine.homeSpread}</span>
                      <span className="text-sm text-medium-gray ml-2">({formatOdds(game.puckLine.homeOdds)})</span>
                    </div>
                  </div>
                </div>
                {game.puckLine.confidence != null && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-gray/40">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-medium-gray">
                      Spread Confidence
                    </span>
                    <div className="flex-1 h-2 bg-light-gray rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          game.puckLine.confidence >= 50
                            ? "bg-green-500"
                            : game.puckLine.confidence >= 35
                              ? "bg-yellow-500"
                              : "bg-brand-primary"
                        }`}
                        style={{ width: `${game.puckLine.confidence}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${
                      game.puckLine.confidence >= 50
                        ? "text-green-600"
                        : game.puckLine.confidence >= 35
                          ? "text-yellow-600"
                          : "text-brand-primary"
                    }`}>
                      {game.puckLine.confidence}%
                    </span>
                  </div>
                )}
                <p className="text-[11px] text-medium-gray mt-3">
                  The puck line is always -1.5/+1.5. The favorite must win by 2 or more goals to cover.
                </p>
              </section>
            )}

            {/* Over/Under */}
            <section className="bg-white rounded-xl border border-border-gray shadow-sm p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-teko text-lg font-bold uppercase tracking-tight text-charcoal">
                  Over/Under
                </h2>
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                  game.overUnder.prediction === "OVER"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-brand-primary"
                }`}>
                  {game.overUnder.prediction}
                </span>
              </div>
              <OverUnder overUnder={game.overUnder} />
              {game.overUnder.factors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-gray">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-medium-gray mb-2">
                    Over/Under Factors
                  </p>
                  <ul className="space-y-1">
                    {game.overUnder.factors.map((factor, i) => (
                      <li key={i} className="text-xs text-medium-gray flex items-start gap-1.5">
                        <span className="text-medium-gray mt-0.5">&#8226;</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Player Prop — always shown with fallback */}
            <section className="bg-white rounded-xl border border-border-gray shadow-sm p-6">
              <h2 className="font-teko text-lg font-bold uppercase tracking-tight text-charcoal mb-3">
                Player Prop Pick
              </h2>
              {game.playerProp ? (
                <PlayerProp prop={game.playerProp} />
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-medium-gray">
                    No player prop data available for this game.
                  </p>
                  <p className="text-xs text-medium-gray/60 mt-1">
                    Props appear when odds data is available from sportsbooks.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function TeamStatCard({ team, side }: { team: TeamMetrics; side: "home" | "away" }) {
  const accentColor = side === "home" ? "text-brand-primary" : "text-accent-blue";
  const borderColor = side === "home" ? "border-brand-primary/20" : "border-accent-blue/20";

  return (
    <div className={`rounded-lg border ${borderColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        {team.teamLogo && (
          <img src={team.teamLogo} alt={team.teamAbbrev} className="w-6 h-6" />
        )}
        <span className={`text-sm font-bold ${accentColor}`}>{team.teamAbbrev}</span>
        <span className="text-[11px] uppercase tracking-wider text-medium-gray">
          {side === "home" ? "Home" : "Away"}
        </span>
      </div>
      <div className="space-y-2">
        <StatRow label="Goals For Per Game" value={team.goalsForPerGame.toFixed(2)} />
        <StatRow label="Goals Against Per Game" value={team.goalsAgainstPerGame.toFixed(2)} />
        <StatRow
          label="Goal Differential Per Game"
          value={(team.goalsForPerGame - team.goalsAgainstPerGame).toFixed(2)}
          highlight={team.goalsForPerGame - team.goalsAgainstPerGame > 0}
        />
      </div>
    </div>
  );
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-medium-gray">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-green-600" : "text-charcoal"}`}>
        {value}
      </span>
    </div>
  );
}
