import { OddsResponse, PlayerPropPick, NHLClubStats } from "./types";
import { americanToImpliedProbability, formatOdds } from "./utils";

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

async function oddsApiFetch(url: string): Promise<Response | null> {
  let key = getActiveKey();
  if (!key) return null;

  const res = await fetch(url.replace("__API_KEY__", key), {
    next: { revalidate: 180 },
  });

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
        next: { revalidate: 180 },
      });
      if (retryRes.ok) return retryRes;
    }
    return null;
  }

  if (!res.ok) return null;
  return res;
}

export async function fetchGameOdds(): Promise<OddsResponse[]> {
  const apiKey = getActiveKey();
  if (!apiKey) {
    console.warn("No ODDS_API_KEY set — skipping odds fetch");
    return [];
  }

  try {
    const res = await oddsApiFetch(
      `${ODDS_API_BASE}/${SPORT}/odds?apiKey=__API_KEY__&regions=us&markets=h2h,totals&oddsFormat=american`
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
      `${ODDS_API_BASE}/${SPORT}/events?apiKey=__API_KEY__`
    );
    if (!eventsRes) return [];

    const events: { id: string; home_team: string; away_team: string }[] =
      await eventsRes.json();

    const results: OddsResponse[] = [];
    for (const event of events.slice(0, 10)) {
      try {
        const res = await oddsApiFetch(
          `${ODDS_API_BASE}/${SPORT}/events/${event.id}/odds?apiKey=__API_KEY__&regions=us&markets=player_goals,player_assists,player_shots_on_goal&oddsFormat=american`
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

export function getMoneylineOdds(
  odds: OddsResponse[],
  homeTeam: string,
  awayTeam: string
): { home: number; away: number } | null {
  const game = findGameOdds(odds, homeTeam, awayTeam);
  if (!game) return null;

  for (const bookmaker of game.bookmakers) {
    const h2h = bookmaker.markets.find((m) => m.key === "h2h");
    if (h2h) {
      const home = h2h.outcomes.find((o) => o.name === game.home_team);
      const away = h2h.outcomes.find((o) => o.name === game.away_team);
      if (home && away) {
        return { home: home.price, away: away.price };
      }
    }
  }

  return null;
}

// Maximum line thresholds per market — props above these are absurd
const MAX_LINE_BY_MARKET: Record<string, number> = {
  player_goals: 1.5,        // Over 2.5 goals is nearly impossible for any single player
  player_assists: 2.5,      // Over 2.5 assists is very rare
  player_shots_on_goal: 6.5, // Over 6.5 SOG is reasonable for heavy shooters
};

// Maximum odds to consider — skip extreme longshots
const MAX_ODDS = 800;

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

        const impliedProb = americanToImpliedProbability(outcome.price);

        // Look up actual player stats for context
        const playerStats = lookupPlayerStats(outcome.description, clubStatsMap);

        // Calculate a scoring metric that balances value with plausibility
        let score = 0;
        if (outcome.price > 0) {
          // Positive odds: potential value
          const ev = (1 / impliedProb - 1) * 0.5 - 0.5;
          score = ev;
        } else {
          // Negative odds (favorite): slight bonus for high-probability plays
          score = impliedProb - 0.55; // only score if >55% implied
        }

        // Prefer shots on goal (more predictable) over goals (high variance)
        if (market.key === "player_shots_on_goal") score += 0.05;
        if (market.key === "player_assists") score += 0.02;

        // Boost score if player's real average supports the line
        if (playerStats) {
          const marketType = market.key.replace("player_", "");
          let perGameAvg = 0;
          if (marketType === "goals") perGameAvg = playerStats.goalsPerGame;
          else if (marketType === "assists") perGameAvg = playerStats.assistsPerGame;
          else if (marketType === "shots_on_goal") perGameAvg = playerStats.shotsPerGame;

          if (perGameAvg > outcome.point) {
            score += 0.1; // player averages above the line — good sign
          } else if (perGameAvg < outcome.point * 0.5) {
            score -= 0.3; // player averages well below the line — skip
          }
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
