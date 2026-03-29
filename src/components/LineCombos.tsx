import { TeamLineCombos } from "@/lib/daily-faceoff";

interface LineCombosProps {
  awayLines: TeamLineCombos | null;
  homeLines: TeamLineCombos | null;
}

export default function LineCombos({ awayLines, homeLines }: LineCombosProps) {
  if (!awayLines && !homeLines) return null;

  return (
    <section className="bg-white rounded-xl border-l-4 border-purple-500 shadow-sm p-6">
      <h2 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal mb-1">
        Projected Line Combinations
      </h2>
      <p className="text-[11px] text-medium-gray mb-4">
        Source: Daily Faceoff
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {awayLines && <TeamLines combos={awayLines} />}
        {homeLines && <TeamLines combos={homeLines} />}
      </div>
    </section>
  );
}

function TeamLines({ combos }: { combos: TeamLineCombos }) {
  const evLines = combos.lines.filter((l) => l.category === "ev");
  const forwardLines = evLines.filter((l) => !l.groupName.toLowerCase().includes("pair"));
  const defensePairs = evLines.filter((l) => l.groupName.toLowerCase().includes("pair"));

  return (
    <div>
      <h3 className="text-sm font-bold text-charcoal mb-3">{combos.team}</h3>

      {forwardLines.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-medium-gray mb-2">Forwards</p>
          <div className="space-y-1.5">
            {forwardLines.map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-medium-gray/50 w-12 flex-shrink-0 pt-0.5">
                  {line.groupName}
                </span>
                <div className="flex flex-wrap gap-1">
                  {line.players.map((p, j) => (
                    <span
                      key={j}
                      className="text-[11px] bg-light-gray px-2 py-0.5 rounded text-charcoal font-medium"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {defensePairs.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-medium-gray mb-2">Defense</p>
          <div className="space-y-1.5">
            {defensePairs.map((pair, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[11px] font-bold text-medium-gray/50 w-12 flex-shrink-0 pt-0.5">
                  {pair.groupName}
                </span>
                <div className="flex flex-wrap gap-1">
                  {pair.players.map((p, j) => (
                    <span
                      key={j}
                      className="text-[11px] bg-light-gray px-2 py-0.5 rounded text-charcoal font-medium"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {forwardLines.length === 0 && defensePairs.length === 0 && (
        <p className="text-xs text-medium-gray italic">Line data unavailable</p>
      )}
    </div>
  );
}
