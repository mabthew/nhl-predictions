/**
 * Fetch line combinations from Daily Faceoff.
 * Scrapes the team line combination pages which contain JSON-LD structured data.
 */

export interface LinePlayer {
  name: string;
  position: string;
}

export interface LineCombination {
  groupName: string;     // "1st Line", "2nd Line", "1st Pair", etc.
  category: string;      // "ev" (even strength), "pp" (power play), "pk" (penalty kill)
  players: LinePlayer[];
}

export interface TeamLineCombos {
  team: string;
  lines: LineCombination[];
}

// Map NHL team abbreviations to Daily Faceoff URL slugs
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

export async function fetchLineCombos(teamAbbrev: string): Promise<TeamLineCombos | null> {
  const slug = TEAM_SLUGS[teamAbbrev];
  if (!slug) return null;

  try {
    const url = `https://www.dailyfaceoff.com/teams/${slug}/line-combinations/`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NHLPredictionsBot/1.0)",
        Accept: "text/html",
      },
      next: { revalidate: 21600 }, // cache for 6 hours
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Parse line combinations from HTML
    // Daily Faceoff uses structured sections for forward lines, defense pairs, PP/PK
    const lines: LineCombination[] = [];

    // Forward lines (look for line group patterns)
    const forwardLineRegex = /<div[^>]*class="[^"]*line-combo[^"]*"[^>]*>[\s\S]*?<h3[^>]*>(.*?)<\/h3>[\s\S]*?<\/div>/gi;
    const playerRegex = /<a[^>]*class="[^"]*player-name[^"]*"[^>]*>(.*?)<\/a>/gi;

    // Simpler approach: extract player names from each line section
    // Forward lines are typically in sections like "1st Line", "2nd Line", etc.
    const lineSections = html.split(/(?=<(?:h[2-4]|div)[^>]*(?:1st|2nd|3rd|4th)\s*(?:Line|Pair))/i);

    for (const section of lineSections) {
      const headerMatch = section.match(/(1st|2nd|3rd|4th)\s*(Line|Pair)/i);
      if (!headerMatch) continue;

      const groupName = `${headerMatch[1]} ${headerMatch[2]}`;
      const category = headerMatch[2].toLowerCase() === "pair" ? "ev" : "ev";

      const players: LinePlayer[] = [];
      const nameMatches = section.matchAll(/<a[^>]*href="[^"]*\/players\/[^"]*"[^>]*>([^<]+)<\/a>/gi);
      for (const match of nameMatches) {
        const name = match[1].trim();
        if (name && !players.some((p) => p.name === name)) {
          players.push({ name, position: groupName.includes("Pair") ? "D" : "F" });
        }
      }

      if (players.length > 0) {
        lines.push({ groupName, category, players });
      }
    }

    // Also try to extract from structured data (JSON-LD or data attributes)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.lines && Array.isArray(jsonLd.lines)) {
          // If JSON-LD has structured line data, prefer it
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
        // JSON-LD parse failed, fall through to HTML parsing results
      }
    }

    if (lines.length === 0) return null;

    return { team: teamAbbrev, lines };
  } catch (error) {
    console.error(`Failed to fetch line combos for ${teamAbbrev}:`, error);
    return null;
  }
}
