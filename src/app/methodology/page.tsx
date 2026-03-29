import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackButton from "@/components/FeedbackButton";

const WEIGHTS = [
  { pct: 22, label: "Goal Differential", desc: "Per-game goal differential (GF - GA). The most predictive single stat in hockey for measuring overall team quality." },
  { pct: 15, label: "Shots For Per Game", desc: "Average shots on goal generated per game. More shots means more scoring opportunities and offensive zone pressure." },
  { pct: 13, label: "Recent Form (L10)", desc: "Point percentage over the last 10 games. Captures current momentum, hot/cold streaks, and recent lineup changes." },
  { pct: 12, label: "Penalty Kill %", desc: "Percentage of opponent power plays successfully killed. A strong PK prevents easy goals and is a repeatable team skill." },
  { pct: 10, label: "Power Play %", desc: "Conversion rate on power play opportunities. A real but high-variance factor — elite teams convert 25-30%, league average is ~21%." },
  { pct: 10, label: "Goalie Quality", desc: "Starting goalie save percentage. Goaltending has the highest single-game impact of any position in hockey." },
  { pct: 10, label: "Roster Health", desc: "Impact of injuries weighted by player importance. A missing star player hurts far more than a depth player." },
  { pct: 5, label: "Shots Against Per Game", desc: "Average shots allowed per game. Fewer shots against indicates better defensive structure and puck possession." },
  { pct: 3, label: "Faceoff Win %", desc: "Team faceoff win rate. Despite popular belief, research shows faceoff% has a very weak correlation with winning." },
];

const ADDITIONAL_FACTORS = [
  { label: "Scoring Output", desc: "Goals per game averages for each team. Teams that consistently put up numbers have a clear advantage." },
  { label: "Defensive Strength", desc: "Goals allowed per game. Low-event teams that limit chances are harder to beat." },
  { label: "Goal Differential", desc: "Net goals per game. The most reliable single-number indicator of team quality." },
  { label: "Home Ice Advantage", desc: "Home teams historically win ~54% of NHL games. The advantage comes from last change, crowd energy, and familiar ice." },
  { label: "Goaltending Matchup", desc: "Starting goalie save percentage and GAA. A hot goalie can single-handedly steal a game." },
  { label: "Special Teams", desc: "Power play and penalty kill differentials. Games with more penalties amplify special teams advantages." },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
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
        <p className="text-sm text-medium-gray mb-8">
          Every game prediction is built from nine weighted factors derived from
          real NHL data. Stats are sourced directly from the NHL Stats API — actual
          team-level power play %, penalty kill %, shots per game, and faceoff win rates.
        </p>

        <div className="space-y-4 mb-10">
          {WEIGHTS.map((w) => (
            <div
              key={w.label}
              className="bg-white rounded-xl border border-border-gray p-5 flex items-start gap-4"
            >
              <div className="font-teko text-3xl font-bold text-espn-red leading-none flex-none w-16 text-right">
                {w.pct}%
              </div>
              <div>
                <h3 className="text-sm font-bold text-charcoal">{w.label}</h3>
                <p className="text-xs text-medium-gray mt-1">{w.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="font-teko text-2xl font-bold text-charcoal uppercase tracking-tight mb-4">
          Key Factor Analysis
        </h2>
        <p className="text-sm text-medium-gray mb-4">
          Beyond the weighted composite score, our key factor analysis highlights the biggest edges:
        </p>
        <div className="space-y-3 mb-10">
          {ADDITIONAL_FACTORS.map((f) => (
            <div
              key={f.label}
              className="bg-white rounded-xl border border-border-gray p-4 flex items-start gap-4"
            >
              <div>
                <h3 className="text-sm font-bold text-charcoal">{f.label}</h3>
                <p className="text-xs text-medium-gray mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-charcoal rounded-xl p-6 text-white">
          <h2 className="font-teko text-xl font-bold uppercase tracking-tight mb-3">
            Confidence Scores
          </h2>
          <p className="text-sm text-white/60 mb-4">
            Each prediction includes a confidence percentage from 50% to 95%.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="h-3 bg-espn-red rounded-full mb-2" />
              <p className="text-xs text-white/40">50-59%</p>
              <p className="text-[10px] text-white/30">Toss-up</p>
            </div>
            <div>
              <div className="h-3 bg-yellow-500 rounded-full mb-2" />
              <p className="text-xs text-white/40">60-74%</p>
              <p className="text-[10px] text-white/30">Moderate edge</p>
            </div>
            <div>
              <div className="h-3 bg-green-500 rounded-full mb-2" />
              <p className="text-xs text-white/40">75-95%</p>
              <p className="text-[10px] text-white/30">Strong edge</p>
            </div>
          </div>
          <p className="text-[10px] text-white/30 mt-4">
            Home ice advantage adds ~2 points to the home team's composite score, reflecting the ~54% historical home win rate.
            All metrics are normalized using league-wide z-scores for consistency across game slates.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-medium-gray">
            Have thoughts on how to improve or tune our methodology? We want to hear them.
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
