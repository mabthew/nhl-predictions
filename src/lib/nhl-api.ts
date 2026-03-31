import {
  NHLGame,
  NHLStandingsTeam,
  NHLClubStats,
  NHLTeamSummaryStats,
  TeamMetrics,
  TopPlayer,
  BoxScoreData,
  BoxScorePlayer,
  BoxScoreGoalie,
  PlayerProfile,
  PlayerSeasonStats,
  PlayerAward,
} from "./types";
import { TeamLineCombos, StartingGoalieInfo } from "./daily-faceoff";

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

// Game states that should be shown on the predictions page
const VISIBLE_GAME_STATES = new Set(["FUT", "PRE", "LIVE", "CRIT"]);

/** Fetch upcoming + live games from the current week */
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
        .filter((g) => VISIBLE_GAME_STATES.has(g.gameState))
        .map((g) => ({ ...g, gameDate: day.date })),
    }))
    .filter((day) => day.games.length > 0);
}

/** Fetch live scores for all in-progress games */
export async function fetchLiveScores(): Promise<Map<number, { homeScore: number; awayScore: number; period: number; periodLabel: string; timeRemaining: string; homeSog: number; awaySog: number }>> {
  const map = new Map<number, { homeScore: number; awayScore: number; period: number; periodLabel: string; timeRemaining: string; homeSog: number; awaySog: number }>();

  try {
    const res = await fetch(`${NHL_API_BASE}/score/now`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return map;

    const data = await res.json();
    const games = data.games ?? [];

    for (const game of games) {
      if (game.gameState === "LIVE" || game.gameState === "CRIT") {
        const period = game.periodDescriptor?.number ?? 0;
        const periodType = game.periodDescriptor?.periodType ?? "REG";
        let periodLabel = `P${period}`;
        if (periodType === "OT") periodLabel = period > 3 ? `${period - 3}OT` : "OT";
        if (periodType === "SO") periodLabel = "SO";

        map.set(game.id, {
          homeScore: game.homeTeam?.score ?? 0,
          awayScore: game.awayTeam?.score ?? 0,
          period,
          periodLabel,
          timeRemaining: game.clock?.timeRemaining ?? "",
          homeSog: game.homeTeam?.sog ?? 0,
          awaySog: game.awayTeam?.sog ?? 0,
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch live scores:", error);
  }

  return map;
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
  teamSummary: NHLTeamSummaryStats | null,
  lineCombos?: TeamLineCombos | null,
  goalieInfo?: StartingGoalieInfo | null,
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

  // IR impact: weight injuries by player importance (enhanced with line combo data)
  const irImpact = calculateIrImpact(injuries, clubStats, lineCombos);

  // Recent form: last 10 games point percentage
  const l10Points = (team.l10Wins * 2 + team.l10OtLosses) / 20;
  const recentForm = l10Points * 100;

  // Goal differential per game
  const goalDiffPerGame = goalsFor - goalsAgainst;

  // Top players
  const topPlayers = clubStats ? getTopPlayers(clubStats) : [];

  // Starting goalie: prefer DailyFaceoff confirmed starter, fall back to "most games started"
  let startingGoalieSavePct: number | undefined;
  let startingGoalieGAA: number | undefined;
  let startingGoalieName: string | undefined;
  let startingGoalieConfirmation: "Confirmed" | "Likely" | "Unconfirmed" | "Unknown" | undefined;
  let startingGoalieDFRating: number | undefined;

  if (goalieInfo && goalieInfo.name) {
    // Use DailyFaceoff confirmed starter data
    startingGoalieSavePct = goalieInfo.savePct ?? undefined;
    startingGoalieGAA = goalieInfo.gaa ?? undefined;
    startingGoalieName = goalieInfo.name;
    startingGoalieConfirmation = goalieInfo.confirmationStatus;
    startingGoalieDFRating = goalieInfo.dailyFaceoffRating ?? undefined;
  }

  // Fall back to NHL API "most games started" goalie if DailyFaceoff didn't provide data
  if (!startingGoalieSavePct && clubStats) {
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
      if (!startingGoalieName) {
        startingGoalieName = `${starter.firstName.default[0]}. ${starter.lastName.default}`;
      }
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
    startingGoalieConfirmation,
    startingGoalieDFRating,
  };
}

/**
 * Calculate IR impact weighted by player importance.
 * Uses line combo data (when available) + points/TOI from club stats to weight each injured player.
 */
function calculateIrImpact(
  injuries: { name: string; position: string; status: string }[],
  clubStats: NHLClubStats | null,
  lineCombos?: TeamLineCombos | null
): number {
  if (injuries.length === 0) return 100;

  let totalPenalty = 0;

  for (const injury of injuries) {
    const nameLower = injury.name.toLowerCase();
    let penalty = 3; // default for unknown players

    // First try to determine penalty from line combo data (more accurate)
    if (lineCombos) {
      const linePosition = findPlayerLinePosition(nameLower, lineCombos);
      if (linePosition !== null) {
        penalty = linePosition;
        // Skip the PPG-based fallback since we have line data
        totalPenalty += penalty;
        continue;
      }
    }

    if (clubStats) {
      // Fallback: use PPG-based estimation
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

/**
 * Find an injured player's line position and return the appropriate penalty.
 * Returns null if player not found in line data.
 */
function findPlayerLinePosition(nameLower: string, lineCombos: TeamLineCombos): number | null {
  for (const line of lineCombos.lines) {
    for (const player of line.players) {
      const playerNameLower = player.name.toLowerCase();
      if (playerNameLower === nameLower || nameLower.includes(playerNameLower) || playerNameLower.includes(nameLower)) {
        const group = line.groupName.toLowerCase();
        if (group.includes("1st")) return 20; // 1st line/pair
        if (group.includes("2nd")) return 14; // 2nd line/pair
        if (group.includes("3rd")) return 7;  // 3rd line/pair
        if (group.includes("4th")) return 3;  // 4th line
        return 7; // default if line number unclear
      }
    }
  }
  return null;
}

/** Fetch box score for a specific game */
export async function fetchBoxScore(gameId: number): Promise<BoxScoreData | null> {
  try {
    const res = await fetch(`${NHL_API_BASE}/gamecenter/${gameId}/boxscore`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) return null;
    const data = await res.json();

    const gameState = data.gameState ?? "FUT";
    // Only return box score for live or completed games
    if (gameState === "FUT" || gameState === "PRE") return null;

    const period = data.periodDescriptor?.number ?? 0;
    const periodType = data.periodDescriptor?.periodType ?? "REG";
    let periodLabel = `P${period}`;
    if (periodType === "OT") periodLabel = period > 3 ? `${period - 3}OT` : "OT";
    if (periodType === "SO") periodLabel = "SO";

    function parseTeamBoxScore(teamData: Record<string, unknown>, side: "away" | "home") {
      const teamObj = (data as Record<string, unknown>)[side === "away" ? "awayTeam" : "homeTeam"] as Record<string, unknown> | undefined;
      const abbrev = ((teamObj?.abbrev as string) ?? "").toString();
      const score = (teamObj?.score as number) ?? 0;
      const sog = (teamObj?.sog as number) ?? 0;

      // Parse player stats from playerByGameStats
      const playerStats = data.playerByGameStats ?? {};
      const teamPlayerStats = (playerStats as Record<string, unknown>)[side === "away" ? "awayTeam" : "homeTeam"] as Record<string, unknown[]> | undefined;

      const players: BoxScorePlayer[] = [];
      const goalies: BoxScoreGoalie[] = [];

      if (teamPlayerStats) {
        for (const position of ["forwards", "defense"]) {
          const posPlayers = (teamPlayerStats[position] ?? []) as Record<string, unknown>[];
          for (const p of posPlayers) {
            const name = (p.name as { default?: string })?.default ?? "";
            players.push({
              name,
              sweaterNumber: (p.sweaterNumber as number) ?? 0,
              position: (p.positionCode as string) ?? "",
              goals: (p.goals as number) ?? 0,
              assists: (p.assists as number) ?? 0,
              points: ((p.goals as number) ?? 0) + ((p.assists as number) ?? 0),
              shots: (p.shots as number) ?? 0,
              hits: (p.hits as number) ?? 0,
              blockedShots: (p.blockedShots as number) ?? 0,
              toi: (p.toi as string) ?? "0:00",
            });
          }
        }

        const goalieList = (teamPlayerStats.goalies ?? []) as Record<string, unknown>[];
        for (const g of goalieList) {
          const name = (g.name as { default?: string })?.default ?? "";
          const savePctg = (g.savePctg as number) ?? 0;
          goalies.push({
            name,
            sweaterNumber: (g.sweaterNumber as number) ?? 0,
            savePct: savePctg > 0 ? (savePctg * 100).toFixed(1) + "%" : "-",
            saves: (g.saves as number) ?? 0,
            shotsAgainst: (g.shotsAgainst as number) ?? 0,
            goalsAgainst: (g.goalsAgainst as number) ?? 0,
            toi: (g.toi as string) ?? "0:00",
          });
        }
      }

      return {
        abbrev,
        score,
        sog,
        faceoffPct: "",
        powerPlay: "",
        pim: 0,
        hits: players.reduce((sum, p) => sum + p.hits, 0),
        blockedShots: players.reduce((sum, p) => sum + p.blockedShots, 0),
        players: players.sort((a, b) => b.points - a.points || b.goals - a.goals),
        goalies,
      };
    }

    return {
      gameId,
      gameState,
      period,
      periodLabel,
      timeRemaining: (data.clock as Record<string, unknown>)?.timeRemaining as string ?? "",
      away: parseTeamBoxScore(data, "away"),
      home: parseTeamBoxScore(data, "home"),
    };
  } catch (error) {
    console.error("Failed to fetch box score:", error);
    return null;
  }
}

/** Fetch player profile with career stats and awards */
export async function fetchPlayerProfile(playerId: number): Promise<PlayerProfile | null> {
  try {
    const res = await fetch(`${NHL_API_BASE}/player/${playerId}/landing`, {
      next: { revalidate: 86400 }, // cache for 24 hours — career data changes rarely
    });

    if (!res.ok) return null;
    const data = await res.json();

    const fullName = `${(data.firstName as { default: string })?.default ?? ""} ${(data.lastName as { default: string })?.default ?? ""}`.trim();
    const position = (data.position as string) ?? "";
    const currentTeam = (data.currentTeamAbbrev as string) ?? "";

    // Extract last 3 NHL seasons from seasonTotals
    const seasonTotals = (data.seasonTotals ?? []) as Record<string, unknown>[];
    const nhlSeasons = seasonTotals
      .filter((s) => s.leagueAbbrev === "NHL" && s.gameTypeId === 2) // regular season only
      .sort((a, b) => ((b.season as number) ?? 0) - ((a.season as number) ?? 0))
      .slice(0, 3);

    const recentSeasons: PlayerSeasonStats[] = nhlSeasons.map((s) => {
      const seasonNum = (s.season as number) ?? 0;
      const startYear = Math.floor(seasonNum / 10000);
      const endYear = seasonNum % 10000;
      return {
        season: `${startYear}-${String(endYear).slice(2)}`,
        teamAbbrev: (s.teamName as { default: string })?.default ?? "",
        gamesPlayed: (s.gamesPlayed as number) ?? 0,
        goals: (s.goals as number) ?? 0,
        assists: (s.assists as number) ?? 0,
        points: (s.points as number) ?? 0,
        plusMinus: (s.plusMinus as number) ?? 0,
        pim: (s.pim as number) ?? 0,
        powerPlayGoals: (s.powerPlayGoals as number) ?? 0,
        shots: (s.shots as number) ?? 0,
        shootingPct: Math.round(((s.shootingPctg as number) ?? 0) * 1000) / 10,
        avgToi: (s.avgToi as string) ?? "",
      };
    });

    // Extract awards
    const awardsData = (data.awards ?? []) as Record<string, unknown>[];
    const awards: PlayerAward[] = awardsData.map((a) => {
      const trophy = (a.trophy as { default: string })?.default ?? "";
      const awardSeasons = ((a.seasons as Record<string, unknown>[]) ?? []).map((s) => {
        const sId = (s.seasonId as number) ?? 0;
        const sy = Math.floor(sId / 10000);
        return `${sy}-${String((sId % 10000)).slice(2)}`;
      });
      return { trophy, seasons: awardSeasons };
    });

    return {
      playerId,
      fullName,
      position,
      currentTeam,
      recentSeasons,
      awards,
    };
  } catch (error) {
    console.error(`Failed to fetch player profile ${playerId}:`, error);
    return null;
  }
}

export interface RestInfo {
  isBackToBack: boolean;
  restDays: number; // 0=B2B, 1=one day rest, 2+=well rested
}

/**
 * Detect back-to-back situations for teams playing on a given date.
 * Uses the previous day's schedule to check if a team played the day before.
 */
export function detectRestInfo(
  previousDayTeams: Set<string>,
  teamAbbrev: string
): RestInfo {
  const isB2B = previousDayTeams.has(teamAbbrev);
  return {
    isBackToBack: isB2B,
    restDays: isB2B ? 0 : 1, // simplified: 0 for B2B, 1 otherwise (full rest analysis would need more schedule history)
  };
}
