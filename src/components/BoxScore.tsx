"use client";

import { BoxScoreData } from "@/lib/types";

interface BoxScoreProps {
  boxScore: BoxScoreData;
}

export default function BoxScore({ boxScore }: BoxScoreProps) {
  const { away, home } = boxScore;
  const isLive = boxScore.gameState === "LIVE" || boxScore.gameState === "CRIT";
  const isFinal = boxScore.gameState === "OFF" || boxScore.gameState === "FINAL";

  return (
    <div className="bg-white rounded-sm border border-border-gray shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-5 py-3 flex items-center justify-between ${isLive ? "bg-brand-primary/5 border-b border-brand-primary/30" : "bg-light-gray border-b border-border-gray"}`}>
        <div className="flex items-center gap-2">
          {isLive && <span className="h-2.5 w-2.5 rounded-full bg-brand-primary header-pulse" />}
          <h3 className="font-teko text-xl font-bold uppercase tracking-tight text-charcoal">
            {isFinal ? "Final Box Score" : "Live Box Score"}
          </h3>
        </div>
        {isLive && (
          <span className="text-[11px] font-bold text-brand-primary uppercase tracking-wider">
            {boxScore.periodLabel} {boxScore.timeRemaining}
          </span>
        )}
      </div>

      {/* Score summary */}
      <div className="px-5 py-4 border-b border-border-gray/50 bg-charcoal">
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <p className="font-teko text-2xl font-bold text-white">{away.abbrev}</p>
            <p className="font-teko text-4xl font-bold text-white">{away.score}</p>
            <p className="text-[11px] text-white/50">SOG: {away.sog}</p>
          </div>
          <div className="text-white/30 text-sm font-bold">
            {isFinal ? "FINAL" : "-"}
          </div>
          <div className="text-center">
            <p className="font-teko text-2xl font-bold text-white">{home.abbrev}</p>
            <p className="font-teko text-4xl font-bold text-white">{home.score}</p>
            <p className="text-[11px] text-white/50">SOG: {home.sog}</p>
          </div>
        </div>
      </div>

      {/* Team stats comparison */}
      <div className="grid grid-cols-2 divide-x divide-border-gray/50">
        <TeamPlayerTable team={away} label={`${away.abbrev} Skaters`} />
        <TeamPlayerTable team={home} label={`${home.abbrev} Skaters`} />
      </div>

      {/* Goalies */}
      <div className="border-t border-border-gray/50 grid grid-cols-2 divide-x divide-border-gray/50">
        <TeamGoalieTable team={away} label={`${away.abbrev} Goaltending`} />
        <TeamGoalieTable team={home} label={`${home.abbrev} Goaltending`} />
      </div>
    </div>
  );
}

function TeamPlayerTable({ team, label }: { team: BoxScoreData["away"]; label: string }) {
  const topPlayers = team.players.slice(0, 8);

  return (
    <div className="p-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-medium-gray mb-2">{label}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-medium-gray/70 border-b border-border-gray/30">
              <th className="text-left py-1 pr-2 font-semibold">Player</th>
              <th className="text-center px-1 font-semibold">G</th>
              <th className="text-center px-1 font-semibold">A</th>
              <th className="text-center px-1 font-semibold">SOG</th>
              <th className="text-center px-1 font-semibold">TOI</th>
            </tr>
          </thead>
          <tbody>
            {topPlayers.map((p, i) => (
              <tr key={i} className={`border-b border-border-gray/20 ${p.goals > 0 || p.assists > 0 ? "bg-green-50/50" : ""}`}>
                <td className="py-1.5 pr-2 font-medium text-charcoal truncate max-w-[100px]">
                  <span className="text-medium-gray/50 mr-1">#{p.sweaterNumber}</span>
                  {p.name}
                </td>
                <td className={`text-center px-1 ${p.goals > 0 ? "font-bold text-green-700" : "text-medium-gray"}`}>{p.goals}</td>
                <td className={`text-center px-1 ${p.assists > 0 ? "font-bold text-accent-blue" : "text-medium-gray"}`}>{p.assists}</td>
                <td className="text-center px-1 text-medium-gray">{p.shots}</td>
                <td className="text-center px-1 text-medium-gray">{p.toi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamGoalieTable({ team, label }: { team: BoxScoreData["away"]; label: string }) {
  if (team.goalies.length === 0) return null;

  return (
    <div className="p-3">
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-medium-gray mb-2">{label}</h4>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-medium-gray/70 border-b border-border-gray/30">
            <th className="text-left py-1 pr-2 font-semibold">Goalie</th>
            <th className="text-center px-1 font-semibold">SV%</th>
            <th className="text-center px-1 font-semibold">SV</th>
            <th className="text-center px-1 font-semibold">GA</th>
            <th className="text-center px-1 font-semibold">TOI</th>
          </tr>
        </thead>
        <tbody>
          {team.goalies.map((g, i) => (
            <tr key={i} className="border-b border-border-gray/20">
              <td className="py-1.5 pr-2 font-medium text-charcoal">
                <span className="text-medium-gray/50 mr-1">#{g.sweaterNumber}</span>
                {g.name}
              </td>
              <td className="text-center px-1 font-bold text-charcoal">{g.savePct}</td>
              <td className="text-center px-1 text-medium-gray">{g.saves}</td>
              <td className="text-center px-1 text-medium-gray">{g.goalsAgainst}</td>
              <td className="text-center px-1 text-medium-gray">{g.toi}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
