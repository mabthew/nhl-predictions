import { prisma } from "./db";
import { zScoreNormalize } from "./predictor";
import { logApiCall } from "./api-usage";
import { getSecret } from "./secrets";
import { clamp } from "./utils";

// Guard rail thresholds (USD)
export const DAILY_COST_WARNING = 1.0;
export const DAILY_COST_HARD_LIMIT = 5.0;
export const TEAMS_PER_DAY = 32;

export interface FeedMetadata {
  slug: string;
  factorKey: string;
  factorLabel: string;
  leagueAvg: number;
  leagueSd: number;
  invert: boolean;
  costPerCall: number;
}

export interface FeedCostEstimate {
  daily: number;
  monthly: number;
  perFeed: Array<{ slug: string; name: string; daily: number; monthly: number }>;
  warning?: string;
  error?: string;
}

export interface FeedCostValidation {
  ok: boolean;
  dailyCost: number;
  monthlyCost: number;
  warning?: string;
  error?: string;
}

/**
 * Get all feeds (active and inactive) for the discovery tool.
 */
export async function getFeedRegistry() {
  return prisma.dataFeed.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Get only active feeds.
 */
export async function getActiveFeeds() {
  return prisma.dataFeed.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Get feed metadata for a set of feed slugs (for z-score normalization).
 */
export async function getFeedMetadata(
  feedSlugs: string[]
): Promise<Map<string, FeedMetadata>> {
  const feeds = await prisma.dataFeed.findMany({
    where: { slug: { in: feedSlugs } },
  });
  const map = new Map<string, FeedMetadata>();
  for (const f of feeds) {
    map.set(f.factorKey, {
      slug: f.slug,
      factorKey: f.factorKey,
      factorLabel: f.factorLabel,
      leagueAvg: f.leagueAvg,
      leagueSd: f.leagueSd,
      invert: f.invert,
      costPerCall: f.costPerCall,
    });
  }
  return map;
}

/**
 * Load cached feed data for a set of feeds and teams on a given date.
 * Returns feedSlug -> teamAbbrev -> value.
 */
export async function loadFeedData(
  feedSlugs: string[],
  teamAbbrevs: string[],
  date: string
): Promise<Map<string, Map<string, number>>> {
  if (feedSlugs.length === 0) return new Map();

  const rows = await prisma.feedCache.findMany({
    where: {
      feedSlug: { in: feedSlugs },
      teamAbbrev: { in: teamAbbrevs },
      date,
    },
  });

  const result = new Map<string, Map<string, number>>();
  for (const row of rows) {
    let teamMap = result.get(row.feedSlug);
    if (!teamMap) {
      teamMap = new Map();
      result.set(row.feedSlug, teamMap);
    }
    teamMap.set(row.teamAbbrev, row.value);
  }

  return result;
}

/**
 * Load cached feed data across a date range (for preview backtesting).
 * Returns date -> feedSlug -> teamAbbrev -> value.
 */
export async function loadFeedDataRange(
  feedSlugs: string[],
  dates: string[]
): Promise<Map<string, Map<string, Map<string, number>>>> {
  if (feedSlugs.length === 0 || dates.length === 0) return new Map();

  const rows = await prisma.feedCache.findMany({
    where: {
      feedSlug: { in: feedSlugs },
      date: { in: dates },
    },
  });

  const result = new Map<string, Map<string, Map<string, number>>>();
  for (const row of rows) {
    let dateMap = result.get(row.date);
    if (!dateMap) {
      dateMap = new Map();
      result.set(row.date, dateMap);
    }
    let teamMap = dateMap.get(row.feedSlug);
    if (!teamMap) {
      teamMap = new Map();
      dateMap.set(row.feedSlug, teamMap);
    }
    teamMap.set(row.teamAbbrev, row.value);
  }

  return result;
}

/**
 * Compute the additive dynamic score for one team from paid feed data.
 * Uses the same z-score normalization as the core 12 factors.
 */
export function computeDynamicScore(
  teamAbbrev: string,
  dynamicWeights: Record<string, number>,
  feedDataMap: Map<string, Map<string, number>>,
  feedMetadataMap: Map<string, FeedMetadata>
): number {
  let score = 0;

  for (const [factorKey, weight] of Object.entries(dynamicWeights)) {
    if (weight <= 0) continue;

    const meta = feedMetadataMap.get(factorKey);
    if (!meta) continue;

    const teamMap = feedDataMap.get(meta.slug);
    const value = teamMap?.get(teamAbbrev);

    if (value === undefined) {
      // No data for this feed/team -- degrade to neutral (contributes 50 * weight)
      score += 50 * weight;
      continue;
    }

    const normalized = zScoreNormalize(value, meta.leagueAvg, meta.leagueSd, meta.invert);
    score += normalized * weight;
  }

  return score;
}

/**
 * Estimate costs for a set of feeds.
 */
export async function estimateFeedCosts(
  feedSlugs: string[]
): Promise<FeedCostEstimate> {
  if (feedSlugs.length === 0) {
    return { daily: 0, monthly: 0, perFeed: [] };
  }

  const feeds = await prisma.dataFeed.findMany({
    where: { slug: { in: feedSlugs } },
  });

  const perFeed = feeds.map((f) => ({
    slug: f.slug,
    name: f.name,
    daily: f.costPerCall * TEAMS_PER_DAY,
    monthly: f.costPerCall * TEAMS_PER_DAY * 30,
  }));

  const daily = perFeed.reduce((sum, f) => sum + f.daily, 0);
  const monthly = perFeed.reduce((sum, f) => sum + f.monthly, 0);

  const result: FeedCostEstimate = {
    daily: Math.round(daily * 100) / 100,
    monthly: Math.round(monthly * 100) / 100,
    perFeed,
  };

  if (daily > DAILY_COST_HARD_LIMIT) {
    result.error = `Daily cost $${daily.toFixed(2)} exceeds the $${DAILY_COST_HARD_LIMIT.toFixed(2)} hard limit`;
  } else if (daily > DAILY_COST_WARNING) {
    result.warning = `Daily cost $${daily.toFixed(2)} exceeds the $${DAILY_COST_WARNING.toFixed(2)} warning threshold`;
  }

  return result;
}

/**
 * Validate feed costs against guard rails. Used by the save route.
 */
export async function validateFeedCosts(
  feedSlugs: string[]
): Promise<FeedCostValidation> {
  const estimate = await estimateFeedCosts(feedSlugs);

  return {
    ok: !estimate.error,
    dailyCost: estimate.daily,
    monthlyCost: estimate.monthly,
    warning: estimate.warning,
    error: estimate.error,
  };
}

/**
 * Validate that dynamic weight keys match real DataFeed factorKeys.
 */
export async function validateDynamicWeights(
  dynamicWeights: Record<string, number>
): Promise<{ valid: boolean; invalidKeys: string[] }> {
  const keys = Object.keys(dynamicWeights).filter((k) => dynamicWeights[k] > 0);
  if (keys.length === 0) return { valid: true, invalidKeys: [] };

  const feeds = await prisma.dataFeed.findMany({
    where: { factorKey: { in: keys } },
    select: { factorKey: true },
  });
  const validKeys = new Set(feeds.map((f) => f.factorKey));
  const invalidKeys = keys.filter((k) => !validKeys.has(k));

  return { valid: invalidKeys.length === 0, invalidKeys };
}

/**
 * Validate feed slugs exist and check which are active vs inactive.
 * Unknown slugs are errors; inactive slugs are warnings (saveable).
 */
export async function validateFeedSlugs(
  slugs: string[]
): Promise<{ valid: boolean; unknownSlugs: string[]; inactiveSlugs: string[] }> {
  if (slugs.length === 0) return { valid: true, unknownSlugs: [], inactiveSlugs: [] };

  const feeds = await prisma.dataFeed.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, isActive: true },
  });
  const feedMap = new Map(feeds.map((f) => [f.slug, f.isActive]));
  const unknownSlugs = slugs.filter((s) => !feedMap.has(s));
  const inactiveSlugs = slugs.filter((s) => feedMap.has(s) && !feedMap.get(s));

  return { valid: unknownSlugs.length === 0, unknownSlugs, inactiveSlugs };
}

type FeedFetchArgs = {
  slug: string;
  provider: string;
  endpoint: string;
  authEnvVar: string | null;
  costPerCall: number;
  cacheDurationS: number;
};

// MoneyPuck publishes one consolidated CSV per season at /seasonSummary/{year}/regular/teams.csv
// with one row per team × situation. We want situation="all" and the xGoalsFor per game.
async function fetchMoneyPuckTeamsCsv(
  feed: FeedFetchArgs,
  teamAbbrevs: string[],
  date: string
): Promise<{ fetched: number; cached: number; errors: number }> {
  const d = new Date(date);
  // NHL regular seasons start in October. Before Oct, we're still inside the
  // season that began the prior calendar year.
  const seasonYear =
    d.getUTCMonth() >= 9 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;

  const url = feed.endpoint.replace("{year}", String(seasonYear));
  const start = Date.now();

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { fetched: 0, cached: 0, errors: teamAbbrevs.length };
  }

  const elapsed = Date.now() - start;
  logApiCall(feed.provider, feed.slug, res.status, elapsed).catch(() => {});

  if (!res.ok) {
    return { fetched: 0, cached: 0, errors: teamAbbrevs.length };
  }

  const csv = await res.text();
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return { fetched: 0, cached: 0, errors: teamAbbrevs.length };

  const headers = lines[0].split(",");
  const teamIdx = headers.indexOf("team");
  const situationIdx = headers.indexOf("situation");
  const gpIdx = headers.indexOf("games_played");
  const xgfIdx = headers.indexOf("xGoalsFor");

  if (teamIdx < 0 || situationIdx < 0 || gpIdx < 0 || xgfIdx < 0) {
    return { fetched: 0, cached: 0, errors: teamAbbrevs.length };
  }

  const validTeams = new Set(teamAbbrevs);
  let fetched = 0;
  let cached = 0;
  let errors = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols[situationIdx] !== "all") continue;
    const abbrev = cols[teamIdx];
    if (!validTeams.has(abbrev)) continue;

    const games = parseFloat(cols[gpIdx]);
    const xgf = parseFloat(cols[xgfIdx]);
    if (!games || isNaN(xgf)) {
      errors++;
      continue;
    }
    const value = xgf / games;

    try {
      await prisma.feedCache.upsert({
        where: {
          feedSlug_teamAbbrev_date: {
            feedSlug: feed.slug,
            teamAbbrev: abbrev,
            date,
          },
        },
        update: {
          value,
          rawData: { xGoalsFor: xgf, gamesPlayed: games, season: seasonYear },
        },
        create: {
          feedSlug: feed.slug,
          teamAbbrev: abbrev,
          date,
          value,
          rawData: { xGoalsFor: xgf, gamesPlayed: games, season: seasonYear },
        },
      });
      fetched++;
      cached++;
    } catch {
      errors++;
    }
  }

  return { fetched, cached, errors };
}

/**
 * Fetch data from a feed's endpoint for all teams and cache it.
 * This is called by the cron job, not by preview or prediction routes.
 */
export async function fetchAndCacheFeedData(
  feed: FeedFetchArgs,
  teamAbbrevs: string[],
  date: string
): Promise<{ fetched: number; cached: number; errors: number }> {
  let fetched = 0;
  let cached = 0;
  let errors = 0;

  // Check if cached data is still fresh
  const existing = await prisma.feedCache.findFirst({
    where: { feedSlug: feed.slug, date },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const ageS = (Date.now() - existing.createdAt.getTime()) / 1000;
    if (ageS < feed.cacheDurationS) {
      return { fetched: 0, cached: 0, errors: 0 }; // still fresh
    }
  }

  if (feed.provider === "moneypuck") {
    return fetchMoneyPuckTeamsCsv(feed, teamAbbrevs, date);
  }

  const apiKey = feed.authEnvVar
    ? (process.env[feed.authEnvVar] || await getSecret(feed.authEnvVar))
    : null;

  for (const abbrev of teamAbbrevs) {
    const start = Date.now();
    try {
      const url = feed.endpoint
        .replace("{team}", abbrev)
        .replace("{date}", date)
        .replace("{apiKey}", apiKey ?? "");

      const res = await fetch(url, { cache: "no-store" });
      const elapsed = Date.now() - start;

      logApiCall(feed.provider, feed.slug, res.status, elapsed).catch(() => {});

      if (!res.ok) {
        errors++;
        continue;
      }

      const data = await res.json();
      // The feed endpoint should return { value: number } or we extract the first numeric field
      const value = typeof data.value === "number" ? data.value : parseFloat(data.value);

      if (isNaN(value)) {
        errors++;
        continue;
      }

      await prisma.feedCache.upsert({
        where: {
          feedSlug_teamAbbrev_date: {
            feedSlug: feed.slug,
            teamAbbrev: abbrev,
            date,
          },
        },
        update: { value, rawData: data },
        create: {
          feedSlug: feed.slug,
          teamAbbrev: abbrev,
          date,
          value,
          rawData: data,
        },
      });

      fetched++;
      cached++;
    } catch {
      errors++;
    }
  }

  return { fetched, cached, errors };
}
