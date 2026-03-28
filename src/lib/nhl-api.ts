import {
  NHLGame,
  NHLStandingsTeam,
  NHLClubStats,
  TeamMetrics,
  TopPlayer,
} from "./types";

const NHL_API_BASE = "https://api-web.nhle.com/v1";

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

export async function fetchStandings(): Promise<NHLStandingsTeam[]> {
  // This endpoint returns a 307 redirect, so we follow it
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

interface AggregatedTeamStats {
  totalShots: number;
  totalPPGoals: number;
  totalGoals: number;
  avgFaceoffPct: number;
  totalTOI: number;
  gamesPlayed: number;
}

function aggregatePlayerStats(clubStats: NHLClubStats): AggregatedTeamStats {
  const skaters = clubStats.skaters ?? [];
  let totalShots = 0;
  let totalPPGoals = 0;
  let totalGoals = 0;
  let faceoffSum = 0;
  let faceoffCount = 0;
  let totalTOI = 0;
  let maxGP = 0;

  for (const s of skaters) {
    totalShots += s.shots ?? 0;
    totalPPGoals += s.powerPlayGoals ?? 0;
    totalGoals += s.goals ?? 0;
    totalTOI += (s.avgTimeOnIcePerGame ?? 0) * (s.gamesPlayed ?? 0);

    if (s.faceoffWinPctg > 0) {
      faceoffSum += s.faceoffWinPctg;
      faceoffCount++;
    }

    if (s.gamesPlayed > maxGP) maxGP = s.gamesPlayed;
  }

  return {
    totalShots,
    totalPPGoals,
    totalGoals,
    avgFaceoffPct: faceoffCount > 0 ? faceoffSum / faceoffCount : 50,
    totalTOI,
    gamesPlayed: maxGP || 1,
  };
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
  injuries: { name: string; position: string; status: string }[]
): TeamMetrics {
  const gp = team.gamesPlayed || 1;
  const goalsFor = team.goalFor / gp;
  const goalsAgainst = team.goalAgainst / gp;

  let shotsPerGame = goalsFor * 10; // rough fallback
  let faceoffPct = 50;
  let powerPlayPct = 0;
  let timeOnAttack = 50;

  if (clubStats) {
    const agg = aggregatePlayerStats(clubStats);
    shotsPerGame = agg.totalShots / gp;
    faceoffPct = agg.avgFaceoffPct;

    // Estimate PP%: PP goals / (estimated PP opportunities ≈ 3.5/game)
    const estPPOpps = gp * 3.5;
    powerPlayPct = estPPOpps > 0 ? (agg.totalPPGoals / estPPOpps) * 100 : 20;

    // Time on attack approximation from total TOI and shot volume
    const avgTOIPerGame = agg.totalTOI / gp;
    timeOnAttack =
      (shotsPerGame / 35) * 40 +
      (faceoffPct / 55) * 30 +
      (avgTOIPerGame / 1000) * 30;
  } else {
    // Fallback estimates from standings data
    powerPlayPct = goalsFor > 3.5 ? 25 : goalsFor > 3 ? 22 : 19;
    timeOnAttack =
      (goalsFor / 4) * 50 + (team.winPctg ?? 0.5) * 50;
  }

  // IR impact: penalty per injured player
  const irImpact = Math.max(0, 100 - injuries.length * 8);

  // Recent form: last 10 games point percentage
  const l10Points = (team.l10Wins * 2 + team.l10OtLosses) / 20;
  const recentForm = l10Points * 100;

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
    timeOnAttack: Math.min(100, Math.max(0, timeOnAttack)),
    shotsOnGoal: shotsPerGame,
    offensiveFaceoffPct: faceoffPct,
    irImpact,
    powerPlayPct,
    recentForm,
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
