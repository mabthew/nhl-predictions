import { PlayerProfile } from "@/lib/types";

interface PlayerCareerCardProps {
  profile: PlayerProfile;
}

export default function PlayerCareerCard({ profile }: PlayerCareerCardProps) {
  const { recentSeasons, awards } = profile;
  if (recentSeasons.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-border-gray/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-charcoal">{profile.fullName}</p>
          <p className="text-[11px] text-medium-gray">{profile.position} &middot; {profile.currentTeam}</p>
        </div>
        {awards.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {awards.slice(0, 3).map((award, i) => (
              <span
                key={i}
                className="text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full"
                title={`${award.trophy}: ${award.seasons.join(", ")}`}
              >
                {abbreviateTrophy(award.trophy)}
              </span>
            ))}
          </div>
        )}
      </div>

      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-medium-gray/70 border-b border-border-gray/30">
            <th className="text-left py-1 pr-2 font-semibold">Season</th>
            <th className="text-center px-1 font-semibold">GP</th>
            <th className="text-center px-1 font-semibold">G</th>
            <th className="text-center px-1 font-semibold">A</th>
            <th className="text-center px-1 font-semibold">P</th>
            <th className="text-center px-1 font-semibold">+/-</th>
            <th className="text-center px-1 font-semibold">PPG</th>
          </tr>
        </thead>
        <tbody>
          {recentSeasons.map((season, i) => (
            <tr key={i} className="border-b border-border-gray/20">
              <td className="py-1.5 pr-2 font-medium text-charcoal">{season.season}</td>
              <td className="text-center px-1 text-medium-gray">{season.gamesPlayed}</td>
              <td className="text-center px-1 text-charcoal font-bold">{season.goals}</td>
              <td className="text-center px-1 text-charcoal font-bold">{season.assists}</td>
              <td className="text-center px-1 text-charcoal font-bold">{season.points}</td>
              <td className={`text-center px-1 ${season.plusMinus > 0 ? "text-green-600" : season.plusMinus < 0 ? "text-espn-red" : "text-medium-gray"}`}>
                {season.plusMinus > 0 ? "+" : ""}{season.plusMinus}
              </td>
              <td className="text-center px-1 text-medium-gray">{season.powerPlayGoals}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Trend indicator */}
      {recentSeasons.length >= 2 && (
        <div className="mt-2 pt-2 border-t border-border-gray/30">
          <TrendIndicator seasons={recentSeasons} />
        </div>
      )}
    </div>
  );
}

function TrendIndicator({ seasons }: { seasons: PlayerProfile["recentSeasons"] }) {
  if (seasons.length < 2) return null;

  const current = seasons[0];
  const previous = seasons[1];
  const currentPpg = current.gamesPlayed > 0 ? current.points / current.gamesPlayed : 0;
  const prevPpg = previous.gamesPlayed > 0 ? previous.points / previous.gamesPlayed : 0;
  const diff = currentPpg - prevPpg;

  if (Math.abs(diff) < 0.05) {
    return <span className="text-[11px] text-medium-gray">Steady production</span>;
  }

  const isUp = diff > 0;
  return (
    <span className={`text-[11px] font-medium ${isUp ? "text-green-600" : "text-espn-red"}`}>
      {isUp ? "\u25B2" : "\u25BC"} {Math.abs(diff).toFixed(2)} P/GP vs last season
    </span>
  );
}

function abbreviateTrophy(name: string): string {
  const map: Record<string, string> = {
    "Hart Memorial Trophy": "Hart",
    "Art Ross Trophy": "Art Ross",
    "Maurice Richard Trophy": "Rocket",
    "Ted Lindsay Award": "Lindsay",
    "Conn Smythe Trophy": "Smythe",
    "James Norris Memorial Trophy": "Norris",
    "Calder Memorial Trophy": "Calder",
    "Frank J. Selke Trophy": "Selke",
    "Vezina Trophy": "Vezina",
    "Lady Byng Memorial Trophy": "Byng",
    "Mark Messier NHL Leadership Award": "Messier",
  };

  for (const [full, short] of Object.entries(map)) {
    if (name.includes(full) || name.toLowerCase().includes(full.toLowerCase())) return short;
  }

  // Fallback: use first word
  return name.split(" ")[0] ?? name;
}
