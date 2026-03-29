import {
  NHLGame,
  NHLStandingsTeam,
  NHLClubStats,
  NHLTeamSummaryStats,
  TeamMetrics,
  TopPlayer,
} from "./types";

const NHL_API_BASE = "https://api-web.nhle.com/v1";
const NHL_STATS_API_BASE = "https://api.nhle.com/stats/rest/en";

export async function fetchSchedule(date: string): Promise<NHLGame[]> {
  const res = await fetch(`${NHL_API_BASE}/schedule/${date}`, {
    next: { revalidate: 180 },
  });

  if (!res.ok) {
    throw new Error(`NHL schedule API error: ${res.status}`);
  }

  const data = await res.json();
  const gameWeek = data.gameWeek ?? [];
  const dayEntry = gameWeek.find(
    (d: { date: string }) => d.date === date
  );

  return (dayEntry?.games ?? []).map((g: NHLGame) => ({
    ...g,
    gameDate: date,
  }));
}

/** Fetch upcoming (FUT) games from the current week — no timezone dependency */
export async function fetchUpcomingGames(): Promise<{ date: string; games: NHLGame[] }[]> {
  const res = await fetch(`${NHL_API_BASE}/schedule/now`, {
    next: { revalidate: 180 },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`NHL schedule API error: ${res.status}`);
  }

  const data = await res.json();
  const gameWeek: { date: string; games: NHLGame[] }[] = data.gameWeek ?? [];

  return gameWeek
    .map((day) => ({
      date: day.date,
      games: day.games
        .filter((g) => g.gameState === "FUT")
        .map((g) => ({ ...g, gameDate: day.date })),
    }))
    .filter((day) => day.games.length > 0);
}

export async function fetchStandings(): Promise<NHLStandingsTeam[]> {
  const res = await fetch(`${NHL_API_BASE}/standings/now`, {
    next: { revalidate: 180 },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`NHL standings API error: ${res.status}`);
  }

  const data = await res.json();
  return data.standings ?? [];
}

/**
 * Fetch pre-computed team-level stats from the NHL Stats API.
 * Returns actual PP%, PK%, shots/game, faceoff%, etc. for all 32 teams.
 */
export async function fetchTeamStats(): Promise<Map<string, NHLTeamSummaryStats>> {
  const seasonId = getCurrentSeasonId();
  const map = new Map<string, NHLTeamSummaryStats>();

  try {
    const res = await fetch(
      `${NHL_STATS_API_BASE}/team/summary?cayenneExp=seasonId=${seasonId}`,
      { next: { revalidate: 180 } }
    );

    if (!res.ok) {
      console.error(`NHL team stats API error: ${res.status}`);
      return map;
    }

    const data = await res.json();
    const teams: NHLTeamSummaryStats[] = data.data ?? [];

    for (const team of teams) {
      // Map team full name to stats for lookup
      map.set(team.teamFullName, team);
    }
  } catch (error) {
    console.error("Failed to fetch team stats:", error);
  }

  return map;
}

function getCurrentSeasonId(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // NHL season spans Oct-Jun: if before July, season started previous year
  const startYear = month >= 7 ? year : year - 1;
  return startYear * 10000 + (startYear + 1);
}

export async function fetchClubStats(
  teamAbbrev: string
): Promise<NHLClubStats | null> {
  try {
    const res = await fetch(
      `${NHL_API_BASE}/club-stats/${teamAbbrev}/now`,
      { next: { revalidate: 180 }, redirect: "follow" }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getTopPlayers(
  clubStats: NHLClubStats,
  count: number = 1
): TopPlayer[] {
  const skaters = clubStats.skaters ?? [];
  const sorted = [...skaters].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.goals - a.goals;
  });

  return sorted.slice(0, count).map((s) => ({
    playerId: s.playerId,
    firstName: s.firstName.default,
    lastName: s.lastName.default,
    positionCode: s.positionCode,
    headshot: s.headshot ?? `https://assets.nhle.com/mugs/nhl/20252026/default/${s.playerId}.png`,
    goals: s.goals,
    assists: s.assists,
    points: s.points,
    gamesPlayed: s.gamesPlayed,
  }));
}

export function buildTeamMetrics(
  team: NHLStandingsTeam,
  clubStats: NHLClubStats | null,
  injuries: { name: string; position: string; status: string }[],
  teamSummary: NHLTeamSummaryStats | null
): TeamMetrics {
  const gp = team.gamesPlayed || 1;
  const goalsFor = team.goalFor / gp;
  const goalsAgainst = team.goalAgainst / gp;

  // Use real team stats from the NHL Stats API when available
  let shotsForPerGame: number;
  let shotsAgainstPerGame: number;
  let faceoffWinPct: number;
  let powerPlayPct: number;
  let penaltyKillPct: number;

  if (teamSummary) {
    shotsForPerGame = teamSummary.shotsForPerGame;
    shotsAgainstPerGame = teamSummary.shotsAgainstPerGame;
    faceoffWinPct = teamSummary.faceoffWinPct * 100; // API returns 0-1, display as 0-100
    powerPlayPct = teamSummary.powerPlayPct * 100;
    penaltyKillPct = teamSummary.penaltyKillPct * 100;
  } else {
    // Fallback to standings-based estimates (rarely needed)
    shotsForPerGame = 30; // league average
    shotsAgainstPerGame = 30;
    faceoffWinPct = 50;
    powerPlayPct = goalsFor > 3.5 ? 25 : goalsFor > 3 ? 22 : 19;
    penaltyKillPct = goalsAgainst < 2.8 ? 82 : goalsAgainst < 3.2 ? 79 : 76;
  }

  // IR impact: weight injuries by player importance
  const irImpact = calculateIrImpact(injuries, clubStats);

  // Recent form: last 10 games point percentage
  const l10Points = (team.l10Wins * 2 + team.l10OtLosses) / 20;
  const recentForm = l10Points * 100;

  // Goal differential per game
  const goalDiffPerGame = goalsFor - goalsAgainst;

  // Top players
  const topPlayers = clubStats ? getTopPlayers(clubStats) : [];

  // Starting goalie (most games started)
  let startingGoalieSavePct: number | undefined;
  let startingGoalieGAA: number | undefined;
  let startingGoalieName: string | undefined;
  if (clubStats) {
    const goalies = (clubStats as unknown as Record<string, unknown>).goalies as {
      playerId: number;
      firstName: { default: string };
      lastName: { default: string };
      gamesStarted: number;
      savePercentage: number;
      goalsAgainstAverage: number;
    }[] | undefined;
    if (goalies && goalies.length > 0) {
      const starter = [...goalies].sort((a, b) => b.gamesStarted - a.gamesStarted)[0];
      startingGoalieSavePct = starter.savePercentage;
      startingGoalieGAA = starter.goalsAgainstAverage;
      startingGoalieName = `${starter.firstName.default[0]}. ${starter.lastName.default}`;
    }
  }

  return {
    teamAbbrev: team.teamAbbrev.default,
    teamName: team.teamName.default,
    teamLogo: team.teamLogo,
    teamDarkLogo: team.teamLogo.replace("_light", "_dark"),
    shotsForPerGame,
    shotsAgainstPerGame,
    faceoffWinPct,
    irImpact,
    powerPlayPct,
    penaltyKillPct,
    recentForm,
    goalDiffPerGame,
    l10Record: `${team.l10Wins}-${team.l10Losses}-${team.l10OtLosses}`,
    goalsForPerGame: goalsFor,
    goalsAgainstPerGame: goalsAgainst,
    compositeScore: 0,
    topPlayers,
    startingGoalieSavePct,
    startingGoalieGAA,
    startingGoalieName,
  };
}

/**
 * Calculate IR impact weighted by player importance.
 * Uses points and TOI from club stats to weight each injured player.
 */
function calculateIrImpact(
  injuries: { name: string; position: string; status: string }[],
  clubStats: NHLClubStats | null
): number {
  if (injuries.length === 0) return 100;

  let totalPenalty = 0;

  for (const injury of injuries) {
    const nameLower = injury.name.toLowerCase();
    let penalty = 3; // default for unknown players

    if (clubStats) {
      // Try to find the injured player in the roster
      const skaters = clubStats.skaters ?? [];
      const player = skaters.find((s) => {
        const fullName = `${s.firstName.default} ${s.lastName.default}`.toLowerCase();
        return fullName === nameLower || fullName.includes(nameLower) || nameLower.includes(s.lastName.default.toLowerCase());
      });

      if (player) {
        const ppg = player.gamesPlayed > 0 ? player.points / player.gamesPlayed : 0;
        if (ppg >= 1.0) {
          penalty = 18; // star player (PPG or above)
        } else if (ppg >= 0.6) {
          penalty = 12; // top-6 forward / top-4 D
        } else if (ppg >= 0.3) {
          penalty = 7; // middle-6 contributor
        } else {
          penalty = 3; // depth player
        }
      } else {
        // Check if it's a goalie
        const goalies = (clubStats as unknown as Record<string, unknown>).goalies as {
          firstName: { default: string };
          lastName: { default: string };
          gamesStarted: number;
        }[] | undefined;
        const goalie = goalies?.find((g) => {
          const fullName = `${g.firstName.default} ${g.lastName.default}`.toLowerCase();
          return fullName === nameLower || nameLower.includes(g.lastName.default.toLowerCase());
        });
        if (goalie) {
          penalty = goalie.gamesStarted > 20 ? 20 : 8; // starter vs backup
        }
      }
    }

    totalPenalty += penalty;
  }

  return Math.max(0, 100 - totalPenalty);
}
