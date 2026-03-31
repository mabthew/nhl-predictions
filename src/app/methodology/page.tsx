import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackButton from "@/components/FeedbackButton";

// --- Data ---

const PRIMARY_FACTORS = [
  { pct: 18, label: "Goal Differential", desc: "Net goals scored minus goals allowed, per game. This is the single best predictor of team quality in hockey. Teams that consistently outscore opponents tend to keep doing it.", bold: "single best predictor", icon: "goal-diff" },
  { pct: 12, label: "Shots Per Game", desc: "Average shots on goal generated per game. More shots on net means more scoring chances and sustained offensive zone pressure.", bold: "more scoring chances", icon: "shots-for" },
  { pct: 12, label: "Goalie Quality", desc: "Confirmed starting goalie save percentage, sourced from Daily Faceoff. Goaltending has the largest single-game impact of any position in hockey. We use the actual confirmed starter, not just the team's primary goalie, and weight the signal by confirmation status.", bold: "largest single-game impact", icon: "goalie" },
];

const SUPPORTING_FACTORS = [
  { pct: 11, label: "Penalty Kill", desc: "How well a team defends when short-handed. A strong penalty kill prevents easy goals and is one of the most consistent team skills from game to game.", bold: "most consistent team skills", icon: "penalty-kill" },
  { pct: 9, label: "Power Play", desc: "Conversion rate on power play opportunities. It matters, but carries high variance from night to night. The best teams convert 25 to 30 percent, league average sits around 21.", bold: "high variance", icon: "lightning" },
  { pct: 9, label: "Roster Health", desc: "Injury impact weighted by player importance using line combinations from Daily Faceoff. Losing a first-line center is far more damaging than a fourth-line winger. Falls back to points-per-game estimates when line data is unavailable.", bold: "Daily Faceoff", icon: "health" },
  { pct: 8, label: "Player Momentum", desc: "Per-player last-5-game production compared to their season average, weighted by line position. A first line running hot matters more than a fourth line. Captures individual streaks that team-level win/loss records miss entirely.", bold: "individual streaks", icon: "streak" },
];

const MINOR_FACTORS = [
  { pct: 5, label: "Team Form", desc: "Point percentage over the last 10 games. Captures coaching adjustments, system changes, and team-level dynamics that individual player stats can miss. Works alongside Player Momentum for a complete picture of recent performance.", bold: "coaching adjustments", icon: "streak" },
  { pct: 5, label: "Schedule Fatigue", desc: "Teams playing on back-to-back nights historically win about 3 to 5 percent less often. We penalize back-to-back teams and boost well-rested teams facing a fatigued opponent. Derived from the NHL schedule data.", bold: "3 to 5 percent less often", icon: "arena" },
  { pct: 5, label: "Futures Market", desc: "Stanley Cup championship odds represent the betting market's aggregate view of team quality. Contenders get a boost, rebuilding teams get a penalty. Sourced from DraftKings via The Odds API.", bold: "aggregate view of team quality", icon: "futures" },
  { pct: 4, label: "Shots Against Per Game", desc: "Average shots allowed per game. Fewer shots against generally indicates better defensive structure and more puck possession.", bold: "better defensive structure", icon: "shots-against" },
  { pct: 2, label: "Faceoff Win Rate", desc: "Team faceoff win percentage. Despite its reputation, the research shows faceoff rate has a very weak correlation with winning games. We weight it accordingly.", bold: "very weak correlation", icon: "faceoff" },
];

const PIPELINE = [
  { label: "Data Collection", sub: "NHL API, odds, injuries, goalies, lines", icon: "data" },
  { label: "Factor Scoring", sub: "12 weighted metrics", icon: "scoring" },
  { label: "Composite Score", sub: "Weighted sum + bonus", icon: "composite" },
  { label: "Confidence", sub: "50 to 95% rating", icon: "gauge" },
  { label: "Final Pick", sub: "Higher composite wins", icon: "pick" },
];

// --- Helpers ---

function renderDesc(desc: string, boldPhrase: string) {
  const idx = desc.indexOf(boldPhrase);
  if (idx === -1) return <>{desc}</>;
  return (
    <>
      {desc.slice(0, idx)}
      <strong className="font-semibold text-charcoal">{boldPhrase}</strong>
      {desc.slice(idx + boldPhrase.length)}
    </>
  );
}

function FactorIcon({ icon, className = "w-5 h-5 text-espn-red" }: { icon: string; className?: string }) {
  const props = { className, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.5 };
  switch (icon) {
    case "goal-diff":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>;
    case "gauge":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 110-18 9 9 0 010 18z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 12l3.5-3.5" /><circle cx="12" cy="12" r="1.5" /></svg>;
    case "shots-for":
      return <svg {...props}><circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M20 12h-2M6 12H4M12 4v2M12 18v2" /></svg>;
    case "streak":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1.001A3.75 3.75 0 0012 18z" /></svg>;
    case "penalty-kill":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
    case "lightning":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M13 2L4 14h7l-2 8 9-12h-7l2-8z" /></svg>;
    case "goalie":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18V6a2 2 0 012-2h8a2 2 0 012 2v12" /><path strokeLinecap="round" d="M6 18h12" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6v4H9z" /></svg>;
    case "health":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12h3l1.5-3 2 6 1.5-3h3" /></svg>;
    case "shots-against":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8 4v6c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z" /><path strokeLinecap="round" d="M15 9l-6 6M9 9l6 6" /></svg>;
    case "futures":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2 7l4.41-1.41L12 2l5.59 3.59L22 7l-1.41 4.41L24 17l-5.59 1.41L12 22l-5.59-3.59L2 17l1.41-4.41L0 7z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "faceoff":
      return <svg {...props}><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" d="M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4" /></svg>;
    case "arena":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 21V10l8-6 8 6v11" /><path strokeLinecap="round" d="M9 21v-6h6v6" /></svg>;
    case "data":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7" /><ellipse cx="12" cy="7" rx="8" ry="2" /><path strokeLinecap="round" d="M4 12c0 1.1 3.6 2 8 2s8-.9 8-2" /></svg>;
    case "scoring":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 11h6M9 15h4" /><rect x="4" y="3" width="16" height="18" rx="2" /></svg>;
    case "composite":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" /></svg>;
    case "confidence":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /><path d="M12 2a10 10 0 110 20 10 10 0 010-20z" /></svg>;
    case "pick":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    default:
      return null;
  }
}

function PipelineIcon({ icon }: { icon: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-charcoal/10 flex items-center justify-center mx-auto mb-2">
      <FactorIcon icon={icon} className="w-5 h-5 text-charcoal" />
    </div>
  );
}

function PipelineArrow({ direction }: { direction: "right" | "down" }) {
  if (direction === "right") {
    return (
      <div className="flex-none hidden sm:flex items-center justify-center w-8">
        <svg className="w-5 h-5 text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex-none sm:hidden flex items-center justify-center py-1">
      <svg className="w-5 h-5 text-charcoal/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
      </svg>
    </div>
  );
}

// --- Page ---

export default function MethodologyPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-medium-gray hover:text-charcoal transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <h1 className="font-teko text-3xl font-bold text-charcoal uppercase tracking-tight mb-2">
          How Predictions Work
        </h1>
        <p className="text-sm text-medium-gray mb-4">
          Every prediction is built from <strong className="font-semibold text-charcoal">twelve weighted factors</strong> pulled from
          the NHL Stats API, betting markets, confirmed starting goalies, and line combination data from Daily Faceoff.
        </p>
        <p className="text-sm text-medium-gray mb-8">
          Each factor is scored and combined into a <strong className="font-semibold text-charcoal">composite score</strong> from 0 to 100 for each team.
          The team with the higher composite is our pick, and the gap between the two scores determines confidence.
        </p>

        {/* Pipeline */}
        <div className="bg-white rounded-xl border border-border-gray p-5 mb-10">
          <h2 className="font-teko text-lg font-bold uppercase tracking-tight text-charcoal mb-4">
            How It All Comes Together
          </h2>
          <div className="flex flex-col sm:flex-row items-center">
            {PIPELINE.map((step, i) => (
              <div key={step.label} className="flex flex-col sm:flex-row items-center flex-1 w-full sm:w-auto">
                <div className="flex-1 text-center py-2">
                  <PipelineIcon icon={step.icon} />
                  <p className="text-xs font-bold text-charcoal">{step.label}</p>
                  <p className="text-[11px] text-medium-gray mt-0.5">{step.sub}</p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <>
                    <PipelineArrow direction="right" />
                    <PipelineArrow direction="down" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Primary Drivers */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-accent-blue mb-3">
          Primary Drivers
        </p>
        <div className="space-y-4 mb-8">
          {PRIMARY_FACTORS.map((f) => (
            <div
              key={f.label}
              className="bg-white rounded-xl border border-border-gray border-l-4 border-l-accent-blue shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <FactorIcon icon={f.icon} className="w-5 h-5 text-accent-blue" />
                <h3 className="text-sm font-bold text-charcoal flex-1">{f.label}</h3>
                <span className="font-teko text-2xl font-bold text-accent-blue leading-none">{f.pct}%</span>
              </div>
              <div className="h-2 bg-border-gray rounded-full overflow-hidden mb-3">
                <div className="h-full bg-accent-blue rounded-full" style={{ width: `${f.pct}%` }} />
              </div>
              <p className="text-xs text-medium-gray leading-relaxed">
                {renderDesc(f.desc, f.bold)}
              </p>
            </div>
          ))}
        </div>

        {/* Supporting Factors */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/50 mb-3">
          Supporting Factors
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {SUPPORTING_FACTORS.map((f) => (
            <div
              key={f.label}
              className="bg-white rounded-xl border border-border-gray p-4"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <FactorIcon icon={f.icon} className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-charcoal flex-1">{f.label}</h3>
                <span className="font-teko text-xl font-bold text-teal-700 leading-none">{f.pct}%</span>
              </div>
              <div className="h-1.5 bg-border-gray rounded-full overflow-hidden mb-2">
                <div className="h-full bg-teal-500 rounded-full" style={{ width: `${f.pct}%` }} />
              </div>
              <p className="text-xs text-medium-gray leading-relaxed">
                {renderDesc(f.desc, f.bold)}
              </p>
            </div>
          ))}
        </div>

        {/* Minor Factors */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/30 mb-3">
          Minor Factors
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {MINOR_FACTORS.map((f) => (
            <div
              key={f.label}
              className="bg-white rounded-lg border border-border-gray p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <FactorIcon icon={f.icon} className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-charcoal flex-1">{f.label}</h3>
                <span className="font-teko text-lg font-bold text-amber-700 leading-none">{f.pct}%</span>
              </div>
              <div className="h-1 bg-border-gray rounded-full overflow-hidden mb-2">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${f.pct}%` }} />
              </div>
              <p className="text-[11px] text-medium-gray leading-relaxed">
                {renderDesc(f.desc, f.bold)}
              </p>
            </div>
          ))}
        </div>

        {/* Home Ice Advantage */}
        <div className="bg-light-gray rounded-xl border border-border-gray p-5 mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FactorIcon icon="arena" className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-sm font-bold text-charcoal flex-1">Home Ice Advantage</h3>
            <span className="font-teko text-2xl font-bold text-green-600 leading-none">+2 pts</span>
          </div>
          <p className="text-xs text-medium-gray leading-relaxed">
            Home teams win <strong className="font-semibold text-charcoal">about 54% of NHL games</strong> historically. Last change, crowd energy, and familiar ice
            all contribute. We add a flat 2-point bonus to the home team&apos;s composite score.
          </p>
        </div>

        {/* Additional Modifiers */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/50 mb-3">
          Additional Modifiers
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <div className="bg-white rounded-xl border border-border-gray p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <FactorIcon icon="futures" className="w-4 h-4 text-yellow-600" />
              </div>
              <h3 className="text-sm font-bold text-charcoal flex-1">Star Power</h3>
              <span className="font-teko text-lg font-bold text-yellow-600 leading-none">&plusmn;2%</span>
            </div>
            <p className="text-xs text-medium-gray leading-relaxed">
              Players who have won <strong className="font-semibold text-charcoal">major trophies</strong> (Hart, Art Ross, Rocket Richard, Norris, Vezina) or are trending up
              in points per game will nudge the confidence score. We look at the last three seasons of career data plus all awards from the NHL player profile API.
            </p>
          </div>
          <div className="bg-white rounded-xl border border-border-gray p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <FactorIcon icon="data" className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-bold text-charcoal flex-1">Line Combinations</h3>
            </div>
            <p className="text-xs text-medium-gray leading-relaxed">
              Projected line combinations from <strong className="font-semibold text-charcoal">Daily Faceoff</strong> serve double duty: they weight injury impact by line position (first-line players cost more than fourth-liners),
              and they power the Player Momentum factor by providing per-player last-5-game and last-10-game statistics. When line data is unavailable, we fall back to points-per-game estimates.
            </p>
          </div>
        </div>

        {/* Confidence Scores */}
        <div className="bg-white rounded-xl border border-border-gray shadow-sm p-6 mb-8">
          <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-1">
            Confidence Scores
          </h2>
          <p className="text-xs text-medium-gray mb-5">
            Every prediction includes a confidence percentage from <strong className="font-semibold text-charcoal">50% to 95%</strong>, based on the gap between the two teams&apos; composite scores.
          </p>

          {/* Gradient bar */}
          <div className="relative mb-3">
            <div className="h-4 rounded-full overflow-hidden confidence-gradient" />
            {/* Tick marks */}
            <div className="absolute top-0 left-0 right-0 h-4 flex items-center pointer-events-none">
              <div className="absolute h-full w-px bg-white/60" style={{ left: "22.2%" }} />
              <div className="absolute h-full w-px bg-white/60" style={{ left: "55.5%" }} />
            </div>
          </div>

          {/* Labels */}
          <div className="flex">
            <div className="flex-1">
              <p className="text-xs font-bold text-espn-red">50 to 59%</p>
              <p className="text-[11px] text-medium-gray">Toss-up</p>
            </div>
            <div className="flex-[1.5] text-center">
              <p className="text-xs font-bold text-yellow-600">60 to 74%</p>
              <p className="text-[11px] text-medium-gray">Moderate Edge</p>
            </div>
            <div className="flex-1 text-right">
              <p className="text-xs font-bold text-green-600">75 to 95%</p>
              <p className="text-[11px] text-medium-gray">Strong Edge</p>
            </div>
          </div>
        </div>

        {/* Over/Under Predictions */}
        <div className="bg-white rounded-xl border border-border-gray shadow-sm p-6 mb-8">
          <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-1">
            Over/Under Predictions
          </h2>
          <p className="text-xs text-medium-gray mb-4">
            Every game includes an over/under prediction on total goals scored.
          </p>
          <div className="space-y-3 text-xs text-medium-gray leading-relaxed">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-blue font-bold text-[10px]">1</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal mb-0.5">The Line</p>
                <p>The over/under line (e.g. 5.5, 6.0) comes from <strong className="font-semibold text-charcoal">consensus Vegas odds</strong>, averaged across
                multiple bookmakers via The Odds API. If odds are unavailable, we default to 5.5.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-blue font-bold text-[10px]">2</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal mb-0.5">Our Projected Total</p>
                <p>We calculate an expected total from team stats: <strong className="font-semibold text-charcoal">(home goals for + away goals for + home goals against + away goals against) / 2</strong>.
                This averages each team&apos;s offensive output with what they typically allow.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-blue font-bold text-[10px]">3</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal mb-0.5">The Prediction</p>
                <p>If our projected total exceeds the Vegas line, we predict <strong className="font-semibold text-charcoal">OVER</strong>. If it falls below, <strong className="font-semibold text-charcoal">UNDER</strong>.
                Confidence scales with how far our projection diverges from the line.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-light-gray rounded-lg">
            <p className="text-[11px] text-medium-gray">
              <strong className="text-charcoal">Important distinction:</strong> The line comes from Vegas. The over/under call is ours.
              We use the betting market as a benchmark, then compare it against our own scoring projections from team statistics.
            </p>
          </div>
        </div>

        {/* Player Props */}
        <div className="bg-white rounded-xl border border-border-gray shadow-sm p-6 mb-8">
          <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-1">
            Player Prop Picks
          </h2>
          <p className="text-xs text-medium-gray mb-4">
            For each game, we surface the single best-value player prop.
          </p>
          <div className="space-y-3 text-xs text-medium-gray leading-relaxed">
            <p>
              Player props are sourced from <strong className="font-semibold text-charcoal">The Odds API</strong> and filtered for quality:
              minimum 20 games played, 0.3 or more points per game, goal lines capped at 0.5, and maximum odds of +350.
            </p>
            <p>
              Each prop is scored by <strong className="font-semibold text-charcoal">expected value</strong>, comparing the player&apos;s
              recent statistical average against the bookmaker&apos;s line and odds. Established players with strong track records receive a bonus,
              while lesser-known players are penalized slightly.
            </p>
            <p>
              Every pick includes a risk level (low, medium, high) and a justification explaining why the prop has value
              based on recent performance.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-sm text-medium-gray">
            Thoughts on how to improve our methodology?
          </p>
          <div className="mt-2">
            <FeedbackButton />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
