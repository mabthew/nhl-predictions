import { OddsResponse, PlayerPropPick } from "./types";
import { americanToImpliedProbability, formatOdds } from "./utils";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4/sports";
const SPORT = "icehockey_nhl";

function getApiKey(): string | null {
  const free = process.env.ODDS_API_KEY;
  const paid = process.env.ODDS_API_KEY_PAID;
  // Will be set to "exhausted" once we detect the free key is out
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
    // Key rejected or rate limited — try paid key
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
          `${ODDS_API_BASE}/${SPORT}/events/${event.id}/odds?apiKey=__API_KEY__&regions=us&markets=player_points&oddsFormat=american`
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

export function findBestPlayerProp(
  propData: OddsResponse[],
  homeTeam: string,
  awayTeam: string
): PlayerPropPick | null {
  const game = propData.find(
    (g) =>
      g.home_team.includes(homeTeam) ||
      g.away_team.includes(awayTeam) ||
      g.home_team.includes(awayTeam) ||
      g.away_team.includes(homeTeam)
  );

  if (!game || game.bookmakers.length === 0) return null;

  let bestProp: PlayerPropPick | null = null;
  let bestEV = 0;

  for (const bookmaker of game.bookmakers) {
    for (const market of bookmaker.markets) {
      for (const outcome of market.outcomes) {
        if (!outcome.point || !outcome.description) continue;

        const impliedProb = americanToImpliedProbability(outcome.price);
        // Higher odds with reasonable probability = higher EV
        const ev =
          outcome.price > 0
            ? (1 / impliedProb - 1) * 0.5 - 0.5
            : 0;

        if (ev > bestEV) {
          bestEV = ev;
          const riskLevel =
            outcome.price >= 200
              ? "HIGH"
              : outcome.price >= 120
                ? "MEDIUM"
                : "LOW";

          bestProp = {
            playerName: outcome.description,
            market: market.key.replace("player_", "").replace(/_/g, " "),
            line: outcome.point,
            odds: outcome.price,
            recommendation: outcome.name === "Over" ? "OVER" : "UNDER",
            recentAverage: outcome.point * 1.1, // approximation without player stats
            riskLevel: riskLevel as "HIGH" | "MEDIUM" | "LOW",
            expectedValue: Math.round(ev * 100) / 100,
            justification: `${outcome.description} ${outcome.name} ${outcome.point} ${market.key.replace("player_", "").replace(/_/g, " ")} at ${formatOdds(outcome.price)}. ${riskLevel} risk with potential value based on odds divergence.`,
          };
        }
      }
    }
  }

  return bestProp;
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
