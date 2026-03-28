import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackButton from "@/components/FeedbackButton";

const WEIGHTS = [
  { pct: 25, label: "Time on Attack", desc: "How much time a team spends in the offensive zone, creating scoring chances." },
  { pct: 22, label: "Shots on Goal", desc: "Average shots on goal per game. More shots generally means more opportunities to score." },
  { pct: 18, label: "Offensive Faceoff Win %", desc: "Percentage of faceoffs won in the offensive zone, which drives possession and pressure." },
  { pct: 15, label: "Roster Health", desc: "Impact of injured reserve players. Teams missing key players get penalized." },
  { pct: 12, label: "Power Play Conversion Rate", desc: "How efficiently a team converts power play opportunities into goals." },
  { pct: 8, label: "Last 10 Games Record", desc: "Recent form based on the last 10 games played. Hot streaks and slumps matter." },
];

const ADDITIONAL_FACTORS = [
  { label: "Goaltending", desc: "Starting goalie save percentage and goals against average. A hot goalie can single-handedly steal a game." },
  { label: "Scoring Output", desc: "Goals per game averages for each team. Teams that consistently put up numbers have a clear advantage." },
  { label: "Defensive Strength", desc: "Goals allowed per game. Low-event teams that limit chances are harder to beat." },
  { label: "Goal Differential", desc: "Net goals per game. The most reliable single-number indicator of team quality." },
  { label: "Home Ice Advantage", desc: "Home teams receive a +3 composite score boost. Last change, crowd energy, and familiar ice all matter." },
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
          Every game prediction is built from six weighted factors derived from
          real NHL data. Here's what goes into each pick.
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
          Additional Factors
        </h2>
        <p className="text-sm text-medium-gray mb-4">
          Beyond the weighted composite score, our key factor analysis also considers:
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
            Home ice advantage adds +3 to the home team's composite score.
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
