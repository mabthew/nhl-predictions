/**
 * Fetch line combinations and starting goalie data from Daily Faceoff.
 * Both pages embed structured JSON via __NEXT_DATA__ script tags.
 */

// ── Starting Goalie Types ──

export interface StartingGoalieInfo {
  name: string;
  team: string; // team slug (e.g. "boston-bruins")
  confirmationStatus: "Confirmed" | "Likely" | "Unconfirmed" | "Unknown";
  savePct: number | null;
  gaa: number | null;
  dailyFaceoffRating: number | null;
}

// ── Line Combination Types ──

export interface PlayerStats {
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
}

export interface LinePlayer {
  name: string;
  position: string;
  seasonStats?: PlayerStats;
  last5Stats?: { goals: number; assists: number; points: number };
  last10Stats?: { goals: number; assists: number; points: number };
  injuryStatus?: string | null;
  gameTimeDecision?: boolean;
}

export interface LineCombination {
  groupName: string; // "1st Line", "2nd Line", "1st Pair", etc.
  category: string; // "ev" (even strength), "pp" (power play), "pk" (penalty kill)
  players: LinePlayer[];
}

export interface TeamLineCombos {
  team: string;
  lines: LineCombination[];
}

// ── Team Slug Mapping ──

const TEAM_SLUGS: Record<string, string> = {
  ANA: "anaheim-ducks",
  ARI: "utah-hockey-club",
  BOS: "boston-bruins",
  BUF: "buffalo-sabres",
  CAR: "carolina-hurricanes",
  CBJ: "columbus-blue-jackets",
  CGY: "calgary-flames",
  CHI: "chicago-blackhawks",
  COL: "colorado-avalanche",
  DAL: "dallas-stars",
  DET: "detroit-red-wings",
  EDM: "edmonton-oilers",
  FLA: "florida-panthers",
  LAK: "los-angeles-kings",
  MIN: "minnesota-wild",
  MTL: "montreal-canadiens",
  NJD: "new-jersey-devils",
  NSH: "nashville-predators",
  NYI: "new-york-islanders",
  NYR: "new-york-rangers",
  OTT: "ottawa-senators",
  PHI: "philadelphia-flyers",
  PIT: "pittsburgh-penguins",
  SEA: "seattle-kraken",
  SJS: "san-jose-sharks",
  STL: "st-louis-blues",
  TBL: "tampa-bay-lightning",
  TOR: "toronto-maple-leafs",
  UTA: "utah-hockey-club",
  VAN: "vancouver-canucks",
  VGK: "vegas-golden-knights",
  WPG: "winnipeg-jets",
  WSH: "washington-capitals",
};

// Reverse lookup: slug -> abbreviation
const SLUG_TO_ABBREV: Record<string, string> = {};
for (const [abbrev, slug] of Object.entries(TEAM_SLUGS)) {
  // Prefer the non-ARI entry for utah-hockey-club
  if (!SLUG_TO_ABBREV[slug] || abbrev === "UTA") {
    SLUG_TO_ABBREV[slug] = abbrev;
  }
}

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; NHLPredictionsBot/1.0)",
  Accept: "text/html",
};

// ── Starting Goalies ──

/**
 * Fetch confirmed starting goalies for today's games from Daily Faceoff.
 * Returns a Map keyed by team abbreviation.
 */
export async function fetchStartingGoalies(): Promise<Map<string, StartingGoalieInfo>> {
  const result = new Map<string, StartingGoalieInfo>();

  try {
    const res = await fetch("https://www.dailyfaceoff.com/starting-goalies/", {
      headers: FETCH_HEADERS,
      next: { revalidate: 900 }, // 15-minute cache — goalies get confirmed throughout game day
    });

    if (!res.ok) return result;
    const html = await res.text();

    const games = extractNextData<DFStartingGoalieGame[]>(html, extractGoalieData);
    if (!games) return result;

    for (const game of games) {
      // Home goalie
      const homeAbbrev = SLUG_TO_ABBREV[game.homeTeamSlug];
      if (homeAbbrev) {
        result.set(homeAbbrev, {
          name: game.homeGoalieName ?? "",
          team: game.homeTeamSlug ?? "",
          confirmationStatus: parseConfirmation(game.homeNewsStrengthName),
          savePct: parseFloat(game.homeGoalieSavePercentage) || null,
          gaa: parseFloat(game.homeGoalieGoalsAgainstAvg) || null,
          dailyFaceoffRating: game.homeGoalieOverallScore ?? null,
        });
      }

      // Away goalie
      const awayAbbrev = SLUG_TO_ABBREV[game.awayTeamSlug];
      if (awayAbbrev) {
        result.set(awayAbbrev, {
          name: game.awayGoalieName ?? "",
          team: game.awayTeamSlug ?? "",
          confirmationStatus: parseConfirmation(game.awayNewsStrengthName),
          savePct: parseFloat(game.awayGoalieSavePercentage) || null,
          gaa: parseFloat(game.awayGoalieGoalsAgainstAvg) || null,
          dailyFaceoffRating: game.awayGoalieOverallScore ?? null,
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch starting goalies:", error);
  }

  return result;
}

function parseConfirmation(status: string | null | undefined): StartingGoalieInfo["confirmationStatus"] {
  if (!status) return "Unknown";
  const lower = status.toLowerCase();
  if (lower === "confirmed") return "Confirmed";
  if (lower === "likely") return "Likely";
  if (lower === "unconfirmed") return "Unconfirmed";
  return "Unknown";
}

// ── Line Combinations ──

export async function fetchLineCombos(teamAbbrev: string): Promise<TeamLineCombos | null> {
  const slug = TEAM_SLUGS[teamAbbrev];
  if (!slug) return null;

  try {
    const url = `https://www.dailyfaceoff.com/teams/${slug}/line-combinations/`;
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      next: { revalidate: 21600 }, // cache for 6 hours
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Try __NEXT_DATA__ first (structured JSON with full stats)
    const players = extractNextData<DFLinePlayer[]>(html, extractLineComboPlayers);
    if (players && players.length > 0) {
      return buildLineCombosFromNextData(teamAbbrev, players);
    }

    // Fallback: parse HTML structure
    return parseLineCombosFromHTML(teamAbbrev, html);
  } catch (error) {
    console.error(`Failed to fetch line combos for ${teamAbbrev}:`, error);
    return null;
  }
}

/**
 * Calculate player momentum from line combo last-5 stats.
 * Compares each player's last-5 production to their season average,
 * weighted by line position (1st line = 4x, 2nd = 3x, 3rd = 2x, 4th = 1x).
 * Returns 0-100 where 50 = neutral, >50 = team is hot, <50 = cold.
 */
export function calculatePlayerMomentum(lineCombos: TeamLineCombos): number {
  let weightedMomentum = 0;
  let totalWeight = 0;

  for (const line of lineCombos.lines) {
    if (line.category !== "ev") continue;

    const lineWeight = getLineWeight(line.groupName);

    for (const player of line.players) {
      if (!player.last5Stats || !player.seasonStats) continue;
      if (player.seasonStats.gamesPlayed < 10) continue;

      const seasonPpg = player.seasonStats.points / player.seasonStats.gamesPlayed;
      if (seasonPpg <= 0) continue;

      const last5Ppg = player.last5Stats.points / 5;
      const momentumRatio = last5Ppg / seasonPpg;

      weightedMomentum += momentumRatio * lineWeight;
      totalWeight += lineWeight;
    }
  }

  if (totalWeight === 0) return 50;

  const avgMomentum = weightedMomentum / totalWeight;
  // ratio of 1.0 = 50 (neutral), 2.0 = 100, 0.0 = 0
  return Math.max(0, Math.min(100, avgMomentum * 50));
}

function getLineWeight(groupName: string): number {
  const lower = groupName.toLowerCase();
  if (lower.includes("1")) return 4;
  if (lower.includes("2")) return 3;
  if (lower.includes("3")) return 2;
  return 1;
}

// ── __NEXT_DATA__ Extraction Helpers ──

/**
 * Extract and transform data from the __NEXT_DATA__ script tag.
 * The extractor function navigates the parsed JSON to find the relevant data.
 */
function extractNextData<T>(html: string, extractor: (data: unknown) => T | null): T | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;

  try {
    const nextData = JSON.parse(match[1]);
    return extractor(nextData);
  } catch {
    return null;
  }
}

// ── Starting Goalie Data Types (internal) ──

interface DFStartingGoalieGame {
  homeTeamSlug: string;
  homeGoalieName: string;
  homeGoalieSavePercentage: string;
  homeGoalieGoalsAgainstAvg: string;
  homeNewsStrengthName: string | null;
  homeGoalieOverallScore: number | null;
  awayTeamSlug: string;
  awayGoalieName: string;
  awayGoalieSavePercentage: string;
  awayGoalieGoalsAgainstAvg: string;
  awayNewsStrengthName: string | null;
  awayGoalieOverallScore: number | null;
}

function extractGoalieData(nextData: unknown): DFStartingGoalieGame[] | null {
  try {
    // Navigate: props.pageProps.data
    const props = (nextData as Record<string, unknown>).props as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;
    const data = pageProps?.data;
    if (!Array.isArray(data)) return null;
    return data as DFStartingGoalieGame[];
  } catch {
    return null;
  }
}

// ── Line Combo Data Types (internal) ──

interface DFLinePlayer {
  playerId: number;
  name: string;
  positionIdentifier: string;
  groupIdentifier: string;
  groupName: string;
  categoryIdentifier: string;
  injuryStatus: string | null;
  gameTimeDecision: boolean;
  season?: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    points: number;
  };
  last5?: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    points: number;
  };
  last10?: {
    gamesPlayed: number;
    goals: number;
    assists: number;
    points: number;
  };
}

function extractLineComboPlayers(nextData: unknown): DFLinePlayer[] | null {
  try {
    const props = (nextData as Record<string, unknown>).props as Record<string, unknown> | undefined;
    const pageProps = props?.pageProps as Record<string, unknown> | undefined;

    // The player data may be under different keys depending on the page version
    // Try common locations
    const players = pageProps?.players ?? pageProps?.data ?? pageProps?.lineups;
    if (Array.isArray(players)) return players as DFLinePlayer[];

    // Search one level deeper if needed
    for (const value of Object.values(pageProps ?? {})) {
      if (Array.isArray(value) && value.length > 0 && value[0]?.groupIdentifier) {
        return value as DFLinePlayer[];
      }
    }

    return null;
  } catch {
    return null;
  }
}

// Group identifier mapping for display names
const GROUP_DISPLAY_NAMES: Record<string, string> = {
  f1: "1st Line",
  f2: "2nd Line",
  f3: "3rd Line",
  f4: "4th Line",
  d1: "1st Pair",
  d2: "2nd Pair",
  d3: "3rd Pair",
  pp1: "1st Power Play",
  pp2: "2nd Power Play",
  pk1: "1st Penalty Kill",
  pk2: "2nd Penalty Kill",
};

const GROUP_CATEGORIES: Record<string, string> = {
  f1: "ev", f2: "ev", f3: "ev", f4: "ev",
  d1: "ev", d2: "ev", d3: "ev",
  pp1: "pp", pp2: "pp",
  pk1: "pk", pk2: "pk",
};

function buildLineCombosFromNextData(teamAbbrev: string, players: DFLinePlayer[]): TeamLineCombos {
  // Group players by their group identifier
  const groups = new Map<string, DFLinePlayer[]>();
  for (const player of players) {
    const groupId = player.groupIdentifier;
    if (!groupId || groupId === "g") continue; // skip goalies
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId)!.push(player);
  }

  const lines: LineCombination[] = [];

  for (const [groupId, groupPlayers] of groups) {
    const groupName = GROUP_DISPLAY_NAMES[groupId] ?? groupPlayers[0]?.groupName ?? groupId;
    const category = GROUP_CATEGORIES[groupId] ?? "ev";

    const linePlayers: LinePlayer[] = groupPlayers.map((p) => {
      const player: LinePlayer = {
        name: p.name,
        position: p.positionIdentifier?.toUpperCase() ?? (groupId.startsWith("d") ? "D" : "F"),
        injuryStatus: p.injuryStatus,
        gameTimeDecision: p.gameTimeDecision,
      };

      if (p.season) {
        player.seasonStats = {
          gamesPlayed: p.season.gamesPlayed,
          goals: p.season.goals,
          assists: p.season.assists,
          points: p.season.points,
        };
      }

      if (p.last5) {
        player.last5Stats = {
          goals: p.last5.goals,
          assists: p.last5.assists,
          points: p.last5.points,
        };
      }

      if (p.last10) {
        player.last10Stats = {
          goals: p.last10.goals,
          assists: p.last10.assists,
          points: p.last10.points,
        };
      }

      return player;
    });

    lines.push({ groupName, category, players: linePlayers });
  }

  return { team: teamAbbrev, lines };
}

// ── HTML Fallback Parser ──

function parseLineCombosFromHTML(teamAbbrev: string, html: string): TeamLineCombos | null {
  const lines: LineCombination[] = [];

  // Also try JSON-LD
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (jsonLdMatch) {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      if (jsonLd.lines && Array.isArray(jsonLd.lines)) {
        const structuredLines: LineCombination[] = [];
        for (const line of jsonLd.lines) {
          const groupName = line.groupName ?? line.groupIdentifier ?? "";
          const category = line.categoryIdentifier ?? "ev";
          const players = (line.players ?? []).map((p: { name: string; position: string }) => ({
            name: p.name ?? "",
            position: p.position ?? "",
          }));
          if (groupName && players.length > 0) {
            structuredLines.push({ groupName, category, players });
          }
        }
        if (structuredLines.length > 0) {
          return { team: teamAbbrev, lines: structuredLines };
        }
      }
    } catch {
      // JSON-LD parse failed, fall through
    }
  }

  // HTML regex fallback
  const lineSections = html.split(/(?=<(?:h[2-4]|div)[^>]*(?:1st|2nd|3rd|4th)\s*(?:Line|Pair))/i);

  for (const section of lineSections) {
    const headerMatch = section.match(/(1st|2nd|3rd|4th)\s*(Line|Pair)/i);
    if (!headerMatch) continue;

    const groupName = `${headerMatch[1]} ${headerMatch[2]}`;
    const players: LinePlayer[] = [];
    const nameMatches = section.matchAll(/<a[^>]*href="[^"]*\/players\/[^"]*"[^>]*>([^<]+)<\/a>/gi);

    for (const match of nameMatches) {
      const name = match[1].trim();
      if (name && !players.some((p) => p.name === name)) {
        players.push({ name, position: groupName.includes("Pair") ? "D" : "F" });
      }
    }

    if (players.length > 0) {
      lines.push({ groupName, category: "ev", players });
    }
  }

  if (lines.length === 0) return null;
  return { team: teamAbbrev, lines };
}
