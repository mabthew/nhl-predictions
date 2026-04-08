import { OddsResponse, PlayerPropPick, NHLClubStats, FuturesOdds } from "./types";
import { americanToImpliedProbability, formatOdds } from "./utils";
import { logApiCall } from "./api-usage";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4/sports";
const SPORT = "icehockey_nhl";

function getApiKey(): string | null {
  const free = process.env.ODDS_API_KEY;
  const paid = process.env.ODDS_API_KEY_PAID;
  if (free && free !== "exhausted") return free;
  if (paid) return paid;
  return null;
}

let freeKeyExhausted = false;

function getActiveKey(): string | null {
  const free = process.env.ODDS_API_KEY;
  const paid = process.env.ODDS_API_KEY_PAID;
  if (free && !freeKeyExhausted) return free;
  if (paid) return paid;
  return null;
}

async function oddsApiFetch(url: string, cacheDuration = 900): Promise<Response | null> {
  let key = getActiveKey();
  if (!key) return null;

  const endpoint = extractEndpoint(url);
  const start = Date.now();

  const res = await fetch(url.replace("__API_KEY__", key), {
    next: { revalidate: cacheDuration },
  });

  const elapsed = Date.now() - start;
  logApiCall("odds-api", endpoint, res.status, elapsed).catch(() => {});

  // Check if free key is exhausted
  const remaining = res.headers.get("x-requests-remaining");
  if (remaining !== null && parseInt(remaining) <= 0 && !freeKeyExhausted) {
    freeKeyExhausted = true;
    console.log("Free Odds API key exhausted, switching to paid key");
  }

  if (res.status === 401 || res.status === 429) {
    const paid = process.env.ODDS_API_KEY_PAID;
    if (paid && !freeKeyExhausted) {
      freeKeyExhausted = true;
      console.log("Free Odds API key failed, switching to paid key");
      const retryRes = await fetch(url.replace("__API_KEY__", paid), {
        next: { revalidate: cacheDuration },
      });
      if (retryRes.ok) return retryRes;
    }
    return null;
  }

  if (!res.ok) return null;
  return res;
}

function extractEndpoint(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/\/v4\/sports\//, "");
  } catch {
    return url.slice(0, 80);
  }
}

export async function fetchGameOdds(): Promise<OddsResponse[]> {
  const apiKey = getActiveKey();
  if (!apiKey) {
    console.warn("No ODDS_API_KEY set — skipping odds fetch");
    return [];
  }

  try {
    const res = await oddsApiFetch(
      `${ODDS_API_BASE}/${SPORT}/odds?apiKey=__API_KEY__&regions=us&markets=h2h,spreads,totals&oddsFormat=american`
    );
    if (!res) return [];
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch odds:", error);
    return [];
  }
}

export async function fetchPlayerProps(): Promise<OddsResponse[]> {
  const apiKey = getActiveKey();
  if (!apiKey) return [];

  try {
    const eventsRes = await oddsApiFetch(
      `${ODDS_API_BASE}/${SPORT}/events?apiKey=__API_KEY__`,
      3600
    );
    if (!eventsRes) return [];

    const events: { id: string; home_team: string; away_team: string; commence_time: string }[] =
      await eventsRes.json();

    // Only fetch props for games starting within the next 36 hours
    const now = Date.now();
    const cutoff = now + 36 * 60 * 60 * 1000;
    const upcoming = events.filter((e) => {
      const start = new Date(e.commence_time).getTime();
      return start >= now - 4 * 60 * 60 * 1000 && start <= cutoff;
    });

    const results: OddsResponse[] = [];
    for (const event of upcoming.slice(0, 4)) {
      try {
        const res = await oddsApiFetch(
          `${ODDS_API_BASE}/${SPORT}/events/${event.id}/odds?apiKey=__API_KEY__&regions=us&markets=player_goals,player_assists,player_shots_on_goal&oddsFormat=american`,
          3600
        );
        if (res) {
          const data = await res.json();
          if (data.bookmakers?.length > 0) {
            results.push(data);
          }
        }
      } catch {
        // Skip failed individual event fetches
      }
    }

    return results;
  } catch {
    return [];
  }
}

export function getConsensusTotal(
  odds: OddsResponse[],
  homeTeam: string,
  awayTeam: string
): number | null {
  const game = findGameOdds(odds, homeTeam, awayTeam);
  if (!game) return null;

  const totals: number[] = [];
  for (const bookmaker of game.bookmakers) {
    const totalMarket = bookmaker.markets.find((m) => m.key === "totals");
    if (totalMarket) {
      const overOutcome = totalMarket.outcomes.find(
        (o) => o.name === "Over"
      );
      if (overOutcome?.point) {
        totals.push(overOutcome.point);
      }
    }
  }

  if (totals.length === 0) return null;
  return totals.reduce((a, b) => a + b, 0) / totals.length;
}

export function getPuckLineOdds(
  odds: OddsResponse[],
  homeTeam: string,
  awayTeam: string
): { home: { spread: number; price: number }; away: { spread: number; price: number } } | null {
  const game = findGameOdds(odds, homeTeam, awayTeam);
  if (!game) return null;

  for (const bookmaker of game.bookmakers) {
    const spreads = bookmaker.markets.find((m) => m.key === "spreads");
    if (spreads) {
      const home = spreads.outcomes.find((o) => o.name === game.home_team);
      const away = spreads.outcomes.find((o) => o.name === game.away_team);
      if (home && away && home.point !== undefined && away.point !== undefined) {
        return {
          home: { spread: home.point, price: home.price },
          away: { spread: away.point, price: away.price },
        };
      }
    }
  }

  return null;
}

export function getMoneylineOdds(
  odds: OddsResponse[],
  homeTeam: string,
  awayTeam: string
): { homeOdds: number; awayOdds: number } | null {
  const game = findGameOdds(odds, homeTeam, awayTeam);
  if (!game) return null;

  for (const bookmaker of game.bookmakers) {
    const h2h = bookmaker.markets.find((m) => m.key === "h2h");
    if (h2h) {
      const home = h2h.outcomes.find((o) => o.name === game.home_team);
      const away = h2h.outcomes.find((o) => o.name === game.away_team);
      if (home && away) {
        return { homeOdds: home.price, awayOdds: away.price };
      }
    }
  }

  return null;
}

// Maximum line thresholds per market — props above these are absurd
const MAX_LINE_BY_MARKET: Record<string, number> = {
  player_goals: 0.5,         // Only 0.5 goal lines (realistic, not hat tricks)
  player_assists: 1.5,       // Max Over 1.5 assists
  player_shots_on_goal: 5.5, // Over 5.5 SOG is the upper bound for shooters
};

// Maximum odds to consider — skip longshots that are unreasonable
const MAX_ODDS = 350;

// Minimum games played to consider a player (avoid call-ups with tiny samples)
const MIN_GAMES_PLAYED = 20;

export function findBestPlayerProp(
  propData: OddsResponse[],
  homeTeam: string,
  awayTeam: string,
  clubStatsMap?: Map<string, NHLClubStats | null>
): PlayerPropPick | null {
  const game = propData.find(
    (g) =>
      g.home_team.toLowerCase().includes(homeTeam.toLowerCase()) ||
      g.away_team.toLowerCase().includes(awayTeam.toLowerCase())
  );

  if (!game || game.bookmakers.length === 0) return null;

  let bestProp: PlayerPropPick | null = null;
  let bestScore = -Infinity;

  for (const bookmaker of game.bookmakers) {
    for (const market of bookmaker.markets) {
      const maxLine = MAX_LINE_BY_MARKET[market.key] ?? 5;

      for (const outcome of market.outcomes) {
        if (!outcome.point || !outcome.description) continue;

        // Filter 1: Skip absurd lines
        if (outcome.point > maxLine) continue;

        // Filter 2: Skip extreme longshots
        if (outcome.price > MAX_ODDS) continue;

        // Filter 3: Only consider "Over" props (more intuitive for users)
        if (outcome.name !== "Over") continue;

        // Look up actual player stats for context
        const playerStats = lookupPlayerStats(outcome.description, clubStatsMap);

        // Filter 4: Require minimum games played — skip call-ups/unknowns
        if (playerStats && playerStats.gamesPlayed < MIN_GAMES_PLAYED) continue;

        // Filter 5: Player quality gate — prefer top-line players
        // Skip players with very low production (bottom-6 forwards doing hat trick props)
        if (playerStats) {
          const ppg = (playerStats.goalsPerGame + playerStats.assistsPerGame);
          // For goal props, require at least a moderate scorer (0.3+ PPG)
          if (market.key === "player_goals" && ppg < 0.3) continue;
          // For assist props, require playmaker ability (0.3+ PPG)
          if (market.key === "player_assists" && ppg < 0.3) continue;
          // Shots props are fine for any regular player
        }

        const impliedProb = americanToImpliedProbability(outcome.price);

        // Calculate a scoring metric that balances value with plausibility
        let score = 0;
        if (outcome.price > 0) {
          // Positive odds: potential value, but penalize long shots more
          const ev = (1 / impliedProb - 1) * 0.5 - 0.5;
          score = ev;
          // Penalize high odds progressively — prefer realistic picks
          if (outcome.price > 200) score -= (outcome.price - 200) * 0.001;
        } else {
          // Negative odds (favorite): slight bonus for high-probability plays
          score = impliedProb - 0.50; // score if >50% implied (lowered from 55%)
        }

        // Prefer shots on goal (more predictable) over goals (high variance)
        if (market.key === "player_shots_on_goal") score += 0.08;
        if (market.key === "player_assists") score += 0.03;

        // Boost score for known, productive players
        if (playerStats) {
          const marketType = market.key.replace("player_", "");
          let perGameAvg = 0;
          if (marketType === "goals") perGameAvg = playerStats.goalsPerGame;
          else if (marketType === "assists") perGameAvg = playerStats.assistsPerGame;
          else if (marketType === "shots_on_goal") perGameAvg = playerStats.shotsPerGame;

          if (perGameAvg > outcome.point) {
            score += 0.15; // player averages above the line — strong signal
          } else if (perGameAvg > outcome.point * 0.8) {
            score += 0.05; // player is close to the line — decent
          } else if (perGameAvg < outcome.point * 0.5) {
            score -= 0.5; // player averages well below the line — hard skip
          }

          // Bonus for high-volume players (more reliable props)
          const ppg = playerStats.goalsPerGame + playerStats.assistsPerGame;
          if (ppg >= 0.8) score += 0.1;  // star player
          else if (ppg >= 0.5) score += 0.05; // solid top-6
        } else {
          // No stats found — penalize unknown players
          score -= 0.2;
        }

        if (score > bestScore) {
          bestScore = score;
          const riskLevel =
            outcome.price >= 200
              ? "HIGH"
              : outcome.price >= 120
                ? "MEDIUM"
                : "LOW";

          const marketLabel = market.key.replace("player_", "").replace(/_/g, " ");
          const recentAverage = playerStats
            ? getPlayerMarketAvg(playerStats, market.key)
            : outcome.point * 1.1;

          const avgText = playerStats
            ? `Averaging ${recentAverage.toFixed(1)} ${marketLabel}/game this season.`
            : "";

          bestProp = {
            playerName: outcome.description,
            market: marketLabel,
            line: outcome.point,
            odds: outcome.price,
            recommendation: "OVER",
            recentAverage,
            riskLevel: riskLevel as "HIGH" | "MEDIUM" | "LOW",
            expectedValue: Math.round(bestScore * 100) / 100,
            justification: `${outcome.description} Over ${outcome.point} ${marketLabel} at ${formatOdds(outcome.price)}. ${avgText} ${riskLevel} risk with potential value based on odds analysis.`.trim(),
          };
        }
      }
    }
  }

  return bestProp;
}

interface PlayerStatSummary {
  goalsPerGame: number;
  assistsPerGame: number;
  shotsPerGame: number;
  gamesPlayed: number;
}

function lookupPlayerStats(
  playerName: string,
  clubStatsMap?: Map<string, NHLClubStats | null>
): PlayerStatSummary | null {
  if (!clubStatsMap) return null;

  const nameLower = playerName.toLowerCase().trim();

  for (const [, clubStats] of clubStatsMap) {
    if (!clubStats) continue;
    for (const skater of clubStats.skaters ?? []) {
      const fullName = `${skater.firstName.default} ${skater.lastName.default}`.toLowerCase();
      if (fullName === nameLower || nameLower.includes(skater.lastName.default.toLowerCase())) {
        const gp = skater.gamesPlayed || 1;
        return {
          goalsPerGame: skater.goals / gp,
          assistsPerGame: skater.assists / gp,
          shotsPerGame: skater.shots / gp,
          gamesPlayed: skater.gamesPlayed,
        };
      }
    }
  }

  return null;
}

function getPlayerMarketAvg(stats: PlayerStatSummary, marketKey: string): number {
  if (marketKey === "player_goals") return stats.goalsPerGame;
  if (marketKey === "player_assists") return stats.assistsPerGame;
  if (marketKey === "player_shots_on_goal") return stats.shotsPerGame;
  return 0;
}

function findGameOdds(
  odds: OddsResponse[],
  homeTeam: string,
  awayTeam: string
): OddsResponse | undefined {
  return odds.find(
    (g) =>
      g.home_team.toLowerCase().includes(homeTeam.toLowerCase()) ||
      g.away_team.toLowerCase().includes(awayTeam.toLowerCase())
  );
}

const FUTURES_SPORT = "icehockey_nhl_championship_winner";

export async function fetchStanleyCupFutures(): Promise<FuturesOdds[]> {
  const apiKey = getActiveKey();
  if (!apiKey) return [];

  try {
    const res = await oddsApiFetch(
      `${ODDS_API_BASE}/${FUTURES_SPORT}/odds?apiKey=__API_KEY__&regions=us&markets=outrights&oddsFormat=american`,
      86400 // 24 hours — futures barely change day-to-day
    );
    if (!res) return [];

    const data = await res.json();
    const results: FuturesOdds[] = [];

    // Prefer DraftKings, fall back to any bookmaker
    const bookmakers = data.bookmakers ?? [];
    const dk = bookmakers.find((b: { key: string }) => b.key === "draftkings");
    const bookmaker = dk ?? bookmakers[0];
    if (!bookmaker) return [];

    const outrightsMarket = bookmaker.markets?.find((m: { key: string }) => m.key === "outrights");
    if (!outrightsMarket) return [];

    for (const outcome of outrightsMarket.outcomes ?? []) {
      const odds = outcome.price;
      const impliedProb = americanToImpliedProbability(odds);
      results.push({
        team: outcome.name,
        odds,
        impliedProbability: Math.round(impliedProb * 1000) / 10,
        bookmaker: bookmaker.title ?? bookmaker.key,
      });
    }

    // Sort by implied probability (favorites first)
    results.sort((a, b) => b.impliedProbability - a.impliedProbability);

    return results;
  } catch (error) {
    console.error("Failed to fetch Stanley Cup futures:", error);
    return [];
  }
}
