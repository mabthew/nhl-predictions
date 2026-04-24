// Admin-only design preview: card direction options for the homepage.
// Sits under /admin so it's gated by the existing session cookie and not public.
// Safe to delete (along with this directory) once a direction is locked in.

const RECORD_ROWS = [
  {
    category: "spread",
    label: "Spread",
    wins: 81,
    losses: 56,
    pushes: 0,
    winRate: 59.1,
  },
  {
    category: "total",
    label: "Over/Under",
    wins: 74,
    losses: 63,
    pushes: 8,
    winRate: 54.0,
  },
  {
    category: "prop",
    label: "Player Props",
    wins: 42,
    losses: 29,
    pushes: 2,
    winRate: 59.2,
  },
  {
    category: "overall",
    label: "Overall",
    wins: 197,
    losses: 148,
    pushes: 10,
    winRate: 57.1,
  },
];

const BEST_BET = {
  description: "Colorado Avalanche -1.5",
  gameLabel: "Colorado Avalanche @ Dallas Stars · 8:00 ET",
  odds: "+155",
  confidence: 72,
  edge: 8,
  betType: "Puck Line",
};

export default function PreviewCards() {
  return (
    <div>
      <header className="mb-10">
        <h1 className="font-teko text-4xl font-bold text-charcoal uppercase tracking-wide">
          Card Direction Preview
        </h1>
        <p className="text-sm text-medium-gray mt-2 max-w-2xl">
          Eight card treatments for the homepage season-record block,
          bet-of-the-day, and date chip. A–C are the original directions, D–E
          are mixes, F–H amp B with color. Scroll through and pick one to lock
          in.
        </p>
      </header>

      {/* ─────────── OPTION A ─────────── */}
      <Section
        letter="A"
        name="Broadcast Chyron"
        description="Dark top bar + thin pulsing rose rule. ESPN Bottomline energy, trading-floor ticker."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordA />
          <div className="flex flex-col gap-3">
            <TodayChipA />
            <BestBetA />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION B ─────────── */}
      <Section
        letter="B"
        name="Tote-Board Stub"
        description="Pari-mutuel ticket / racing form. Perforated edges, stamp labels, mono timestamps, handbill energy."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordB />
          <div className="flex flex-col gap-3">
            <TodayChipB />
            <BestBetB />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION C ─────────── */}
      <Section
        letter="C"
        name="Newsroom Sports Desk"
        description="Editorial restraint. Heavy black masthead bar, sharp corners, rose only on the numbers."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordC />
          <div className="flex flex-col gap-3">
            <TodayChipC />
            <BestBetC />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION D (Mix) ─────────── */}
      <Section
        letter="D"
        name="Chyron + Ticket Footer"
        description="A's chyron header (dark bar, pulse dot, uppercase Teko) + B's mono ticket footer and dashed interior dividers. Fixed number sizing so Overall doesn't wrap."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordD />
          <div className="flex flex-col gap-3">
            <TodayChipD />
            <BestBetD />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION E (Mix) ─────────── */}
      <Section
        letter="E"
        name="Stamp on Chyron"
        description="Dark bar like A, but the label lives inside a B-style outlined stamp rectangle on the bar. Mono footer. Most distinctive — doesn't look like anything else on the internet."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordE />
          <div className="flex flex-col gap-3">
            <TodayChipE />
            <BestBetE />
          </div>
        </div>
      </Section>

      <div className="my-12 border-t-2 border-dashed border-charcoal/20" />
      <p className="text-xs font-mono uppercase tracking-widest text-medium-gray mb-8">
        Tote-board color variations · B amped up
      </p>

      {/* ─────────── OPTION F ─────────── */}
      <Section
        letter="F"
        name="Filled Stamp + Status Dots"
        description="B's ticket structure, but the stamp label is rose-filled (white text on rose) and each category gets a status dot — green for winning, amber for coin-flip, red for losing. Brings color without losing the editorial feel."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordF />
          <div className="flex flex-col gap-3">
            <TodayChipF />
            <BestBetF />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION G ─────────── */}
      <Section
        letter="G"
        name="Color-Coded Categories"
        description="Each column gets its own color cap like pari-mutuel betting colors — rose for spread, amber for over/under, emerald for props, charcoal for overall. Reads like a printed racing form."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordG />
          <div className="flex flex-col gap-3">
            <TodayChipG />
            <BestBetG />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION H ─────────── */}
      <Section
        letter="H"
        name="Full-Bleed Rose Rails"
        description="B's perforated ticket, but with solid rose bands running top and bottom (behind the stamp label and the footer). Loud, unmissable, still editorial."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordH />
          <div className="flex flex-col gap-3">
            <TodayChipH />
            <BestBetH />
          </div>
        </div>
      </Section>

      <div className="my-12 border-t-2 border-dashed border-charcoal/20" />
      <p className="text-xs font-mono uppercase tracking-widest text-medium-gray mb-8">
        B with restraint · a couple pops, not a paint job
      </p>

      {/* ─────────── OPTION I ─────────── */}
      <Section
        letter="I"
        name="Rose Stamp + Rose Hit Rate"
        description="Base B. Two pops of color: the stamp label's border flips from charcoal to rose, and the percentage hit rate goes rose. Everything else stays charcoal/gray. Reads as a ticket with a clear brand mark."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordI />
          <div className="flex flex-col gap-3">
            <TodayChipI />
            <BestBetI />
          </div>
        </div>
      </Section>

      {/* ─────────── OPTION J ─────────── */}
      <Section
        letter="J"
        name="Tiny Rose Percentages"
        description="B untouched except the small percentage numbers under each stat are rose. One color moment, and it's on the stat that actually matters — the hit rate."
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <SeasonRecordJ />
          <div className="flex flex-col gap-3">
            <TodayChipJ />
            <BestBetJ />
          </div>
        </div>
      </Section>
    </div>
  );
}

const AMBER = "#f59e0b";
const EMERALD = "#10b981";
const CREAM = "#faf7ed";

function statusColor(rate: number, decided: number): string {
  if (decided === 0) return "#9ca3af";
  if (rate >= 55) return EMERALD;
  if (rate >= 50) return AMBER;
  return "#dc2626";
}

function Section({
  letter,
  name,
  description,
  children,
}: {
  letter: string;
  name: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-16">
      <div className="flex items-baseline gap-4 mb-5">
        <span className="font-teko text-6xl font-bold text-charcoal leading-none">
          {letter}
        </span>
        <div>
          <h2 className="font-teko text-2xl font-bold text-charcoal uppercase tracking-wide leading-none">
            {name}
          </h2>
          <p className="text-xs text-medium-gray mt-1 max-w-xl">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION A — Broadcast Chyron
// ══════════════════════════════════════════════════════════

function SeasonRecordA() {
  return (
    <section className="bg-white rounded-lg overflow-hidden shadow-[0_1px_0_#dddddd,0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="bg-charcoal text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary header-pulse" />
          <span className="font-teko text-base tracking-[0.2em] uppercase">
            Season Record
          </span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50 tabular-nums">
          W · L · P
        </span>
      </div>
      <div className="h-px bg-gradient-to-r from-brand-primary via-brand-primary/40 to-transparent" />
      <div className="grid grid-cols-4 divide-x divide-border-gray">
        {RECORD_ROWS.map((r) => (
          <div key={r.category} className="px-4 py-4 text-center">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-medium-gray mb-2">
              {r.label}
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {r.wins}
              <span className="text-medium-gray font-normal mx-0.5">-</span>
              {r.losses}
              <span className="text-medium-gray font-normal mx-0.5">-</span>
              {r.pushes}
            </p>
            <p className="text-xs text-brand-primary font-semibold tabular-nums mt-1.5">
              {r.winRate.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BestBetA() {
  return (
    <section className="bg-white rounded-lg overflow-hidden w-80 shadow-[0_1px_0_#dddddd,0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="bg-charcoal text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary header-pulse" />
          <span className="font-teko text-base tracking-[0.2em] uppercase">
            Bet of the Day
          </span>
        </div>
        <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">
          {BEST_BET.betType}
        </span>
      </div>
      <div className="h-px bg-gradient-to-r from-brand-primary via-brand-primary/40 to-transparent" />
      <div className="p-4">
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-teko text-3xl font-bold text-brand-primary tabular-nums leading-none">
            {BEST_BET.odds}
          </span>
          <div className="text-right">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-xl font-bold text-charcoal tabular-nums leading-none">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TodayChipA() {
  return (
    <div className="bg-charcoal text-white inline-flex items-center gap-2 px-3 py-1.5 rounded w-fit">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-primary header-pulse" />
      <span className="font-teko text-sm tracking-[0.3em] uppercase">
        Today · Fri Apr 24
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION B — Tote-Board Stub
// ══════════════════════════════════════════════════════════

function SeasonRecordB() {
  const perforationStyle = {
    backgroundImage: "radial-gradient(#232525 1px, transparent 1px)",
    backgroundSize: "8px 2px",
    backgroundRepeat: "repeat-x",
  };
  return (
    <section className="bg-white rounded-sm relative shadow-sm">
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={perforationStyle}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-[2px]"
        style={perforationStyle}
      />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-charcoal">
              Season Record
            </span>
            <span className="text-brand-primary text-base">✦</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            W-L-P
          </span>
        </div>
        <div className="grid grid-cols-4 gap-0">
          {RECORD_ROWS.map((r, i) => (
            <div
              key={r.category}
              className={`px-3 ${
                i !== 0 ? "border-l border-dashed border-border-gray" : ""
              }`}
            >
              <p className="font-mono text-[10px] uppercase text-medium-gray mb-1.5">
                {r.label}
              </p>
              <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
                {r.wins}–{r.losses}–{r.pushes}
              </p>
              <p className="text-xs font-mono text-charcoal mt-1.5 tabular-nums">
                {r.winRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-3 border-t border-dashed border-border-gray flex justify-between text-[10px] font-mono uppercase text-medium-gray">
          <span>DegenHL · Ticket #7829</span>
          <span>AS OF 11:42 ET</span>
        </div>
      </div>
    </section>
  );
}

function BestBetB() {
  const perforationStyle = {
    backgroundImage: "radial-gradient(#232525 1px, transparent 1px)",
    backgroundSize: "8px 2px",
    backgroundRepeat: "repeat-x",
  };
  return (
    <section className="bg-white rounded-sm relative shadow-sm w-80">
      <div
        className="absolute top-0 inset-x-0 h-[2px]"
        style={perforationStyle}
      />
      <div
        className="absolute bottom-0 inset-x-0 h-[2px]"
        style={perforationStyle}
      />
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-charcoal">
            ★ Bet Ticket
          </span>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            {BEST_BET.betType}
          </span>
        </div>
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray flex items-end justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-2xl font-bold text-charcoal tabular-nums leading-none">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-mono uppercase text-medium-gray text-center">
          # 0428-AVAL-PL
        </div>
      </div>
    </section>
  );
}

function TodayChipB() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-charcoal bg-white w-fit">
      <span className="font-mono text-[10px] uppercase text-charcoal">
        TODAY
      </span>
      <span className="font-teko text-sm tracking-[0.2em] uppercase text-charcoal">
        Fri · Apr 24
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION C — Newsroom Sports Desk
// ══════════════════════════════════════════════════════════

function SeasonRecordC() {
  return (
    <section className="bg-white shadow-sm">
      <div className="bg-charcoal text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-teko text-2xl font-bold tracking-wide uppercase">
            Season Record
          </span>
          <span className="text-[10px] tracking-[0.3em] uppercase text-white/40">
            The Book 2025–26
          </span>
        </div>
        <span className="text-[10px] tracking-[0.25em] uppercase text-white/40 tabular-nums">
          Win / Loss / Push
        </span>
      </div>
      <div className="grid grid-cols-4">
        {RECORD_ROWS.map((r, i) => (
          <div
            key={r.category}
            className={`px-5 py-5 ${
              i !== 0 ? "border-l border-border-gray" : ""
            }`}
          >
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-medium-gray mb-3">
              {r.label}
            </p>
            <p className="font-teko text-[2.25rem] font-bold text-charcoal tabular-nums leading-[0.9]">
              {r.wins}
              <span className="text-border-gray mx-0.5">/</span>
              {r.losses}
              <span className="text-border-gray mx-0.5">/</span>
              {r.pushes}
            </p>
            <p className="text-sm font-bold text-brand-primary tabular-nums mt-2">
              {r.winRate.toFixed(1)}%{" "}
              <span className="text-medium-gray font-normal text-[10px] uppercase tracking-wider">
                hit rate
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BestBetC() {
  return (
    <section className="bg-white shadow-sm w-80">
      <div className="bg-charcoal text-white px-4 py-3 flex items-center justify-between">
        <span className="font-teko text-lg font-bold tracking-wide uppercase">
          Bet of the Day
        </span>
        <span className="text-[10px] tracking-[0.25em] uppercase text-white/40">
          {BEST_BET.betType}
        </span>
      </div>
      <div className="p-4">
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 grid grid-cols-2">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none mt-1">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="border-l border-border-gray pl-4">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-3xl font-bold text-brand-primary tabular-nums leading-none mt-1">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TodayChipC() {
  return (
    <div className="inline-flex items-stretch bg-charcoal w-fit">
      <div className="px-3 py-1.5">
        <span className="font-teko text-sm font-bold tracking-[0.25em] uppercase text-white">
          TODAY
        </span>
      </div>
      <div className="bg-white px-3 py-1.5 border border-charcoal">
        <span className="font-teko text-sm font-bold tracking-wide uppercase text-charcoal">
          Fri Apr 24
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION D — Chyron + Ticket Footer  (A + B mix, keeps it loud)
// ══════════════════════════════════════════════════════════

function SeasonRecordD() {
  return (
    <section className="bg-white rounded-lg overflow-hidden shadow-[0_1px_0_#dddddd,0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      {/* chyron */}
      <div className="bg-charcoal text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary header-pulse" />
          <span className="font-teko text-base tracking-[0.25em] uppercase">
            Season Record
          </span>
        </div>
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/50 tabular-nums">
          W · L · P
        </span>
      </div>
      <div className="h-px bg-gradient-to-r from-brand-primary via-brand-primary/40 to-transparent" />

      <div className="grid grid-cols-4">
        {RECORD_ROWS.map((r, i) => (
          <div
            key={r.category}
            className={`px-4 py-4 text-center ${
              i !== 0 ? "border-l border-dashed border-border-gray" : ""
            }`}
          >
            <p className="font-mono text-[10px] tracking-widest uppercase text-medium-gray mb-2">
              {r.label}
            </p>
            <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
              {r.wins}
              <span className="text-medium-gray/50 font-normal mx-0.5">–</span>
              {r.losses}
              <span className="text-medium-gray/50 font-normal mx-0.5">–</span>
              {r.pushes}
            </p>
            <p className="font-mono text-[11px] text-brand-primary tabular-nums mt-1.5">
              {r.winRate.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-border-gray px-4 py-2 flex justify-between text-[10px] font-mono uppercase text-medium-gray">
        <span>DegenHL · 2025–26 · 357 picks</span>
        <span>As of 11:42 ET</span>
      </div>
    </section>
  );
}

function BestBetD() {
  return (
    <section className="bg-white rounded-lg overflow-hidden w-80 shadow-[0_1px_0_#dddddd,0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="bg-charcoal text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-primary header-pulse" />
          <span className="font-teko text-base tracking-[0.25em] uppercase">
            Bet of the Day
          </span>
        </div>
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/50">
          {BEST_BET.betType}
        </span>
      </div>
      <div className="h-px bg-gradient-to-r from-brand-primary via-brand-primary/40 to-transparent" />

      <div className="px-4 py-4">
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray grid grid-cols-2">
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none mt-0.5">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-widest uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-3xl font-bold text-brand-primary tabular-nums leading-none mt-0.5">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-border-gray px-4 py-2 text-[10px] font-mono uppercase text-medium-gray text-center">
        # 0428-AVAL-PL
      </div>
    </section>
  );
}

function TodayChipD() {
  return (
    <div className="bg-charcoal text-white inline-flex items-center gap-2 px-3 py-1.5 rounded w-fit">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-primary header-pulse" />
      <span className="font-teko text-sm tracking-[0.3em] uppercase">
        Today
      </span>
      <span className="font-mono text-[10px] uppercase text-white/60">
        Fri · Apr 24
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION E — Stamp on Chyron  (most distinctive)
// ══════════════════════════════════════════════════════════

function SeasonRecordE() {
  return (
    <section className="bg-white rounded-sm overflow-hidden shadow-[0_1px_0_#dddddd,0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      {/* dark bar with stamp label */}
      <div className="bg-charcoal px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block border border-white/80 px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-white">
            Season Record
          </span>
          <span className="h-1 w-1 rounded-full bg-brand-primary header-pulse" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/45">
          W · L · P
        </span>
      </div>
      <div className="h-[2px] bg-brand-primary" />

      <div className="grid grid-cols-4">
        {RECORD_ROWS.map((r, i) => (
          <div
            key={r.category}
            className={`px-4 py-5 text-center ${
              i !== 0 ? "border-l border-dashed border-border-gray" : ""
            }`}
          >
            <p className="font-mono text-[10px] tracking-widest uppercase text-medium-gray mb-2.5">
              {r.label}
            </p>
            <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
              {r.wins}
              <span className="text-border-gray font-normal mx-0.5">–</span>
              {r.losses}
              <span className="text-border-gray font-normal mx-0.5">–</span>
              {r.pushes}
            </p>
            <p className="font-mono text-[11px] text-brand-primary tabular-nums mt-2">
              {r.winRate.toFixed(1)}%
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-border-gray px-3 py-2 flex justify-between text-[10px] font-mono uppercase text-medium-gray">
        <span>DegenHL · 2025–26 Season · 357 picks graded</span>
        <span>As of 11:42 ET</span>
      </div>
    </section>
  );
}

function BestBetE() {
  return (
    <section className="bg-white rounded-sm overflow-hidden w-80 shadow-[0_1px_0_#dddddd,0_8px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="bg-charcoal px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block border border-white/80 px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-white">
            ★ Bet Ticket
          </span>
          <span className="h-1 w-1 rounded-full bg-brand-primary header-pulse" />
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/45">
          {BEST_BET.betType}
        </span>
      </div>
      <div className="h-[2px] bg-brand-primary" />

      <div className="px-4 py-4">
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray grid grid-cols-2">
          <div>
            <p className="font-mono text-[10px] tracking-widest uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none mt-0.5">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] tracking-widest uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-3xl font-bold text-brand-primary tabular-nums leading-none mt-0.5">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-dashed border-border-gray px-3 py-2 text-[10px] font-mono uppercase text-medium-gray text-center">
        # 0428-AVAL-PL · Conf 72
      </div>
    </section>
  );
}

function TodayChipE() {
  return (
    <div className="inline-flex items-stretch bg-charcoal w-fit rounded-sm overflow-hidden">
      <div className="border border-white/80 m-1 px-2 py-0.5">
        <span className="font-teko text-xs font-bold tracking-[0.3em] uppercase text-white">
          Today
        </span>
      </div>
      <div className="flex items-center pr-2 pl-1">
        <span className="font-mono text-[10px] tracking-wider uppercase text-white/70">
          Fri · Apr 24
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION F — Filled Stamp + Status Dots (color-amped B)
// ══════════════════════════════════════════════════════════

const perf = {
  backgroundImage: "radial-gradient(#232525 1px, transparent 1px)",
  backgroundSize: "8px 2px",
  backgroundRepeat: "repeat-x",
};

function SeasonRecordF() {
  return (
    <section className="bg-white rounded-sm relative shadow-sm">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-block bg-brand-primary px-2.5 py-1 font-teko text-sm tracking-[0.3em] uppercase text-white shadow-[2px_2px_0_#232525]">
              Season Record
            </span>
            <span className="text-lg" style={{ color: AMBER }}>
              ✦
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            W-L-P
          </span>
        </div>

        <div className="grid grid-cols-4 gap-0">
          {RECORD_ROWS.map((r, i) => {
            const decided = r.wins + r.losses;
            const color = statusColor(r.winRate, decided);
            return (
              <div
                key={r.category}
                className={`px-3 ${
                  i !== 0 ? "border-l border-dashed border-border-gray" : ""
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <p className="font-mono text-[10px] uppercase text-medium-gray">
                    {r.label}
                  </p>
                </div>
                <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
                  {r.wins}–{r.losses}–{r.pushes}
                </p>
                <p
                  className="text-xs font-mono font-bold mt-1.5 tabular-nums"
                  style={{ color }}
                >
                  {r.winRate.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-dashed border-brand-primary/40 flex justify-between text-[10px] font-mono uppercase text-medium-gray">
          <span>
            <span className="text-brand-primary font-bold">DegenHL</span> ·
            Ticket #7829
          </span>
          <span>AS OF 11:42 ET</span>
        </div>
      </div>
    </section>
  );
}

function BestBetF() {
  return (
    <section className="bg-white rounded-sm relative shadow-sm w-80">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block bg-brand-primary px-2.5 py-1 font-teko text-xs tracking-[0.3em] uppercase text-white shadow-[2px_2px_0_#232525]">
            ★ Bet Ticket
          </span>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            {BEST_BET.betType}
          </span>
        </div>
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray flex items-end justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Edge
            </p>
            <p
              className="font-teko text-3xl font-bold tabular-nums leading-none"
              style={{ color: EMERALD }}
            >
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-mono uppercase text-brand-primary text-center font-bold">
          # 0428-AVAL-PL · Conf 72
        </div>
      </div>
    </section>
  );
}

function TodayChipF() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-primary w-fit shadow-[2px_2px_0_#232525]">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">
        Today
      </span>
      <span className="font-teko text-sm tracking-[0.2em] uppercase text-white font-bold">
        Fri · Apr 24
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION G — Color-Coded Categories (racing form)
// ══════════════════════════════════════════════════════════

const CATEGORY_COLORS: Record<string, string> = {
  spread: "#e11d48", // rose
  total: AMBER, // amber
  prop: EMERALD, // emerald
  overall: "#232525", // charcoal
};

function SeasonRecordG() {
  return (
    <section
      className="rounded-sm relative shadow-sm"
      style={{ backgroundColor: CREAM }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-charcoal">
              Season Record
            </span>
            <span className="text-brand-primary text-base">✦</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            Racing Form · 2025–26
          </span>
        </div>

        <div className="grid grid-cols-4 gap-0 border-t border-charcoal/20">
          {RECORD_ROWS.map((r, i) => {
            const color = CATEGORY_COLORS[r.category] ?? "#232525";
            return (
              <div
                key={r.category}
                className={`relative pt-6 pb-2 px-3 ${
                  i !== 0 ? "border-l border-dashed border-border-gray" : ""
                }`}
              >
                {/* color cap */}
                <div
                  className="absolute top-0 left-0 right-0 h-4 flex items-center justify-center"
                  style={{ backgroundColor: color }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white font-bold">
                    {r.label}
                  </span>
                </div>
                <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap mt-1">
                  {r.wins}–{r.losses}–{r.pushes}
                </p>
                <p
                  className="text-xs font-mono font-bold mt-1.5 tabular-nums"
                  style={{ color }}
                >
                  {r.winRate.toFixed(1)}%
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-3 border-t border-dashed border-border-gray flex justify-between text-[10px] font-mono uppercase text-medium-gray">
          <span>DegenHL · Ticket #7829</span>
          <span>AS OF 11:42 ET</span>
        </div>
      </div>
    </section>
  );
}

function BestBetG() {
  return (
    <section
      className="rounded-sm relative shadow-sm w-80"
      style={{ backgroundColor: CREAM }}
    >
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-4 pt-6 pb-5">
        {/* color cap for "puck line" */}
        <div
          className="inline-block px-2 py-0.5 mb-3 font-mono text-[10px] uppercase tracking-widest text-white font-bold"
          style={{ backgroundColor: CATEGORY_COLORS.spread }}
        >
          {BEST_BET.betType}
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-charcoal">
            ★ Bet Ticket
          </span>
        </div>
        <p className="font-teko text-2xl font-bold text-charcoal leading-none mt-2">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray flex items-end justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Edge
            </p>
            <p
              className="font-teko text-3xl font-bold tabular-nums leading-none"
              style={{ color: EMERALD }}
            >
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-mono uppercase text-medium-gray text-center">
          # 0428-AVAL-PL
        </div>
      </div>
    </section>
  );
}

function TodayChipG() {
  return (
    <div className="inline-flex items-stretch w-fit shadow-sm">
      <div className="bg-brand-primary px-2 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white font-bold">
          Today
        </span>
      </div>
      <div
        className="px-3 py-1.5 border-2 border-dashed border-charcoal border-l-0"
        style={{ backgroundColor: CREAM }}
      >
        <span className="font-teko text-sm tracking-[0.2em] uppercase text-charcoal font-bold">
          Fri · Apr 24
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION H — Full-Bleed Rose Rails
// ══════════════════════════════════════════════════════════

function SeasonRecordH() {
  return (
    <section className="bg-white rounded-sm overflow-hidden shadow-sm">
      {/* top rose rail */}
      <div className="bg-brand-primary px-5 py-2 flex items-baseline justify-between">
        <span className="inline-block border border-white/80 px-2.5 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-white">
          Season Record
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/75">
          W–L–P · 2025–26
        </span>
      </div>

      <div className="px-5 py-5">
        <div className="grid grid-cols-4 gap-0">
          {RECORD_ROWS.map((r, i) => (
            <div
              key={r.category}
              className={`px-3 ${
                i !== 0 ? "border-l border-dashed border-border-gray" : ""
              }`}
            >
              <p className="font-mono text-[10px] uppercase text-medium-gray mb-1.5">
                {r.label}
              </p>
              <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
                {r.wins}
                <span className="text-brand-primary/60 mx-0.5">–</span>
                {r.losses}
                <span className="text-brand-primary/60 mx-0.5">–</span>
                {r.pushes}
              </p>
              <p className="text-xs font-mono font-bold mt-1.5 tabular-nums text-brand-primary">
                {r.winRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* bottom rose rail */}
      <div className="bg-brand-primary px-5 py-1.5 flex justify-between text-[10px] font-mono uppercase tracking-widest text-white/75">
        <span>DegenHL · Ticket #7829 · 357 picks</span>
        <span>AS OF 11:42 ET</span>
      </div>
    </section>
  );
}

function BestBetH() {
  return (
    <section className="bg-white rounded-sm overflow-hidden shadow-sm w-80">
      <div className="bg-brand-primary px-4 py-2 flex items-baseline justify-between">
        <span className="inline-block border border-white/80 px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-white">
          ★ Bet Ticket
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/75">
          {BEST_BET.betType}
        </span>
      </div>

      <div className="px-4 py-4">
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray grid grid-cols-2">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-3xl font-bold text-brand-primary tabular-nums leading-none">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-brand-primary px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest text-white/75 text-center">
        # 0428-AVAL-PL · Conf 72
      </div>
    </section>
  );
}

function TodayChipH() {
  return (
    <div className="inline-flex items-stretch bg-brand-primary w-fit rounded-sm overflow-hidden shadow-sm">
      <div className="border border-white/80 m-1 px-2 py-0.5">
        <span className="font-teko text-xs font-bold tracking-[0.3em] uppercase text-white">
          Today
        </span>
      </div>
      <div className="flex items-center pr-2 pl-1">
        <span className="font-mono text-[10px] tracking-widest uppercase text-white/85">
          Fri · Apr 24
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION I — Rose Stamp + Rose Hit Rate (restrained B)
// ══════════════════════════════════════════════════════════

function SeasonRecordI() {
  return (
    <section className="bg-white rounded-sm relative shadow-sm">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-block border-2 border-brand-primary px-2 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-charcoal">
              Season Record
            </span>
            <span className="text-brand-primary text-base">✦</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            W-L-P
          </span>
        </div>

        <div className="grid grid-cols-4 gap-0">
          {RECORD_ROWS.map((r, i) => (
            <div
              key={r.category}
              className={`px-3 ${
                i !== 0 ? "border-l border-dashed border-border-gray" : ""
              }`}
            >
              <p className="font-mono text-[10px] uppercase text-medium-gray mb-1.5">
                {r.label}
              </p>
              <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
                {r.wins}–{r.losses}–{r.pushes}
              </p>
              <p className="text-xs font-mono font-bold text-brand-primary mt-1.5 tabular-nums">
                {r.winRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-dashed border-border-gray flex justify-between text-[10px] font-mono uppercase text-medium-gray">
          <span>DegenHL · Ticket #7829</span>
          <span>AS OF 11:42 ET</span>
        </div>
      </div>
    </section>
  );
}

function BestBetI() {
  return (
    <section className="bg-white rounded-sm relative shadow-sm w-80">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="inline-block border-2 border-brand-primary px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-charcoal">
              ★ Bet Ticket
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            {BEST_BET.betType}
          </span>
        </div>
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray flex items-end justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-3xl font-bold text-brand-primary tabular-nums leading-none">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-mono uppercase text-medium-gray text-center">
          # 0428-AVAL-PL
        </div>
      </div>
    </section>
  );
}

function TodayChipI() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-brand-primary bg-white w-fit">
      <span className="font-mono text-[10px] uppercase text-charcoal">
        TODAY
      </span>
      <span className="font-teko text-sm tracking-[0.2em] uppercase text-charcoal font-bold">
        Fri · Apr 24
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OPTION J — Overall Row Only (most restrained)
// ══════════════════════════════════════════════════════════

function SeasonRecordJ() {
  return (
    <section className="bg-white rounded-sm relative shadow-sm">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-baseline justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-sm tracking-[0.3em] uppercase text-charcoal">
              Season Record
            </span>
            <span className="text-brand-primary text-base">✦</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            W-L-P
          </span>
        </div>

        <div className="grid grid-cols-4 gap-0">
          {RECORD_ROWS.map((r, i) => (
            <div
              key={r.category}
              className={`px-3 ${
                i !== 0 ? "border-l border-dashed border-border-gray" : ""
              }`}
            >
              <p className="font-mono text-[10px] uppercase text-medium-gray mb-1.5">
                {r.label}
              </p>
              <p className="font-teko text-[1.75rem] font-bold text-charcoal tabular-nums leading-none whitespace-nowrap">
                {r.wins}–{r.losses}–{r.pushes}
              </p>
              <p className="text-xs font-mono font-bold text-brand-primary mt-1.5 tabular-nums">
                {r.winRate.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-dashed border-border-gray flex justify-between text-[10px] font-mono uppercase text-medium-gray">
          <span>DegenHL · Ticket #7829</span>
          <span>AS OF 11:42 ET</span>
        </div>
      </div>
    </section>
  );
}

function BestBetJ() {
  return (
    <section className="bg-white rounded-sm relative shadow-sm w-80">
      <div className="absolute top-0 inset-x-0 h-[2px]" style={perf} />
      <div className="absolute bottom-0 inset-x-0 h-[2px]" style={perf} />
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-block border-2 border-charcoal px-2 py-0.5 font-teko text-xs tracking-[0.3em] uppercase text-charcoal">
            ★ Bet Ticket
          </span>
          <span className="text-[10px] font-mono uppercase text-medium-gray">
            {BEST_BET.betType}
          </span>
        </div>
        <p className="font-teko text-2xl font-bold text-charcoal leading-none">
          {BEST_BET.description}
        </p>
        <p className="text-xs text-medium-gray mt-1">{BEST_BET.gameLabel}</p>
        <div className="mt-4 pt-3 border-t border-dashed border-border-gray flex items-end justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Odds
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              {BEST_BET.odds}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase text-medium-gray">
              Edge
            </p>
            <p className="font-teko text-3xl font-bold text-charcoal tabular-nums leading-none">
              +{BEST_BET.edge}%
            </p>
          </div>
        </div>
        <div className="mt-3 text-[10px] font-mono uppercase text-medium-gray text-center">
          # 0428-AVAL-PL
        </div>
      </div>
    </section>
  );
}

function TodayChipJ() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-dashed border-charcoal bg-white w-fit">
      <span className="font-mono text-[10px] uppercase text-charcoal">
        TODAY
      </span>
      <span className="font-teko text-sm tracking-[0.2em] uppercase text-charcoal font-bold">
        Fri · Apr 24
      </span>
      <span className="h-2.5 w-2.5 rounded-full bg-brand-primary header-pulse" />
    </div>
  );
}
