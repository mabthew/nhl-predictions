import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackButton from "@/components/FeedbackButton";

// --- Data ---

const MODEL_SIGNALS = [
  {
    title: "Team Performance",
    icon: "goal-diff",
    body: "Goal differential is the single strongest predictor of team quality in hockey. Teams that consistently outscore opponents tend to keep doing it. Beyond the net scoring margin, we evaluate shot generation, shot suppression, and special teams efficiency across both power play and penalty kill. Penalty kill is one of the most consistent team-level skills from game to game, while power play carries higher variance but separates elite offenses from average ones.",
    bold: "single strongest predictor",
  },
  {
    title: "Goaltending",
    icon: "goalie",
    body: "Goaltending has the largest impact on any single game's outcome. A hot goalie can steal a game any night. That's why we pull the confirmed starting goalie from Daily Faceoff rather than defaulting to a team's listed number one. The announced starter matters, and we weight the signal by how confident the confirmation is. Season save percentage for whoever actually takes the ice, not the roster's primary goalie.",
    bold: "confirmed starting goalie from Daily Faceoff",
  },
  {
    title: "Roster Health and Player Momentum",
    icon: "health",
    body: "Injuries are not created equal. Losing a first-line center is far more damaging than losing a fourth-line winger. We use projected line combinations from Daily Faceoff to weight injury impact by lineup position. On the momentum side, we track individual player production against their own season averages at multiple time horizons, weighted by line position. A first line running hot matters more than a fourth line. At the team level, we also track broader form over a longer window to capture coaching adjustments and system changes that individual stats miss. Together, these two layers give a complete picture of recent performance.",
    bold: "Daily Faceoff",
  },
  {
    title: "Market Signals",
    icon: "futures",
    body: "Stanley Cup futures odds represent the betting market's aggregate wisdom on overall team quality. Contenders carry a different baseline than rebuilding teams, and futures prices capture information that box scores miss: front office moves, prospect development, coaching changes. We source odds from DraftKings via The Odds API and treat the market as a wisdom-of-crowds input alongside statistical signals.",
    bold: "betting market's aggregate wisdom",
  },
  {
    title: "Schedule and Situational Context",
    icon: "arena",
    body: "Teams playing on back-to-back nights historically win about 3 to 5 percent less often. Rest advantages, travel fatigue, and the game's place in a road trip all factor into performance. Home ice advantage is real and persistent, with home teams winning roughly 54% of games across the modern NHL. Last change, crowd energy, and familiar ice all contribute.",
    bold: "back-to-back nights",
  },
];

const PIPELINE = [
  { label: "Data Collection", sub: "NHL API, odds, injuries, goalies, lines", icon: "data" },
  { label: "Factor Scoring", sub: "Multi-signal analysis", icon: "scoring" },
  { label: "Composite Score", sub: "Combined team strength", icon: "composite" },
  { label: "Confidence", sub: "50 to 95% rating", icon: "gauge" },
  { label: "Final Pick", sub: "Higher composite wins", icon: "pick" },
];

// --- Helpers ---

function renderNarrative(text: string, boldPhrase: string) {
  const idx = text.indexOf(boldPhrase);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-charcoal">{boldPhrase}</strong>
      {text.slice(idx + boldPhrase.length)}
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
    case "goalie":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18V6a2 2 0 012-2h8a2 2 0 012 2v12" /><path strokeLinecap="round" d="M6 18h12" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 14h6v4H9z" /></svg>;
    case "health":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12h3l1.5-3 2 6 1.5-3h3" /></svg>;
    case "futures":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M2 7l4.41-1.41L12 2l5.59 3.59L22 7l-1.41 4.41L24 17l-5.59 1.41L12 22l-5.59-3.59L2 17l1.41-4.41L0 7z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "arena":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 21V10l8-6 8 6v11" /><path strokeLinecap="round" d="M9 21v-6h6v6" /></svg>;
    case "data":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 1.1 3.6 2 8 2s8-.9 8-2V7" /><ellipse cx="12" cy="7" rx="8" ry="2" /><path strokeLinecap="round" d="M4 12c0 1.1 3.6 2 8 2s8-.9 8-2" /></svg>;
    case "scoring":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6M9 11h6M9 15h4" /><rect x="4" y="3" width="16" height="18" rx="2" /></svg>;
    case "composite":
      return <svg {...props}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" /></svg>;
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

// --- Metadata ---

export const metadata: Metadata = {
  title: "How Our NHL Predictions Work | DegenHL",
  description:
    "Learn how DegenHL predicts NHL games using a 5-factor composite scoring model covering team performance, goaltending, roster health, market signals, and schedule context.",
};

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
          Every prediction combines multiple data signals, including{" "}
          <strong className="font-semibold text-charcoal">team performance, goaltending, roster health, betting market sentiment, schedule context, and player-level momentum</strong>,
          into a composite view of each team&apos;s strength on game day.
        </p>
        <p className="text-sm text-medium-gray mb-8">
          Each signal is scored and combined into a{" "}
          <strong className="font-semibold text-charcoal">composite score</strong> from 0 to 100 for each team.
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

        {/* What the Model Considers */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-charcoal/50 mb-3">
          What the Model Considers
        </p>

        {/* Full-width cards: Team Performance, Goaltending */}
        <div className="space-y-4 mb-4">
          {MODEL_SIGNALS.slice(0, 2).map((s) => (
            <div key={s.title} className="bg-white rounded-xl border border-border-gray p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <FactorIcon icon={s.icon} className="w-4 h-4 text-accent-blue" />
                </div>
                <h3 className="text-sm font-bold text-charcoal">{s.title}</h3>
              </div>
              <p className="text-xs text-medium-gray leading-relaxed">
                {renderNarrative(s.body, s.bold)}
              </p>
            </div>
          ))}
        </div>

        {/* 2-column cards: Roster Health, Market Signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {MODEL_SIGNALS.slice(2, 4).map((s) => (
            <div key={s.title} className="bg-white rounded-xl border border-border-gray p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <FactorIcon icon={s.icon} className="w-4 h-4 text-accent-blue" />
                </div>
                <h3 className="text-sm font-bold text-charcoal">{s.title}</h3>
              </div>
              <p className="text-xs text-medium-gray leading-relaxed">
                {renderNarrative(s.body, s.bold)}
              </p>
            </div>
          ))}
        </div>

        {/* Final full-width card: Schedule */}
        <div className="mb-10">
          <div className="bg-white rounded-xl border border-border-gray p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center">
                <FactorIcon icon={MODEL_SIGNALS[4].icon} className="w-4 h-4 text-accent-blue" />
              </div>
              <h3 className="text-sm font-bold text-charcoal">{MODEL_SIGNALS[4].title}</h3>
            </div>
            <p className="text-xs text-medium-gray leading-relaxed">
              {renderNarrative(MODEL_SIGNALS[4].body, MODEL_SIGNALS[4].bold)}
            </p>
          </div>
        </div>

        {/* Home Ice Advantage */}
        <div className="bg-light-gray rounded-xl border border-border-gray p-5 mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FactorIcon icon="arena" className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-sm font-bold text-charcoal">Home Ice Advantage</h3>
          </div>
          <p className="text-xs text-medium-gray leading-relaxed">
            Home teams win{" "}
            <strong className="font-semibold text-charcoal">about 54% of NHL games</strong>{" "}
            historically. Last change, crowd energy, and familiar ice all contribute.
            Our model accounts for this built-in advantage when calculating composite scores.
          </p>
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
                multiple bookmakers via The Odds API. If odds are unavailable, we default to 6.0.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-accent-blue font-bold text-[10px]">2</span>
              </div>
              <div>
                <p className="font-semibold text-charcoal mb-0.5">Our Projected Total</p>
                <p>We project an expected game total by combining each team&apos;s{" "}
                <strong className="font-semibold text-charcoal">offensive production</strong>{" "}
                with the scoring they typically allow. This gives us a data-driven estimate of how many goals the game should produce.</p>
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
