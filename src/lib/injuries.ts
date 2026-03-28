import { InjuryReport, InjuredPlayer } from "./types";

const CBS_INJURIES_URL = "https://www.cbssports.com/nhl/injuries/";

export async function fetchInjuries(): Promise<InjuryReport[]> {
  try {
    const res = await fetch(CBS_INJURIES_URL, {
      next: { revalidate: 180 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!res.ok) {
      console.error(`Injury scrape failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    return parseInjuryHTML(html);
  } catch (error) {
    console.error("Failed to fetch injuries:", error);
    return [];
  }
}

function parseInjuryHTML(html: string): InjuryReport[] {
  const reports: InjuryReport[] = [];

  // Match team sections — CBS uses TableBase-title for team names
  const teamSections = html.split(/class="TableBase-title"/);

  for (let i = 1; i < teamSections.length; i++) {
    const section = teamSections[i];

    // Extract team name
    const teamMatch = section.match(/>([^<]+)</);
    if (!teamMatch) continue;

    const teamName = teamMatch[1].trim();
    const players: InjuredPlayer[] = [];

    // Extract player rows from the table
    const rows = section.split(/<tr/);
    for (let j = 1; j < rows.length; j++) {
      const row = rows[j];

      // Extract cells
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (!cells || cells.length < 4) continue;

      const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();

      const name = stripTags(cells[0]);
      const position = stripTags(cells[1]);
      const status = stripTags(cells[2]);
      const detail = stripTags(cells[3]);

      if (name && name !== "Player") {
        players.push({
          name,
          position,
          status,
          date: "",
          detail,
        });
      }
    }

    if (players.length > 0) {
      reports.push({ team: teamName, players });
    }
  }

  return reports;
}

export function getTeamInjuries(
  reports: InjuryReport[],
  teamName: string
): InjuredPlayer[] {
  const report = reports.find(
    (r) =>
      r.team.toLowerCase().includes(teamName.toLowerCase()) ||
      teamName.toLowerCase().includes(r.team.toLowerCase())
  );

  return report?.players ?? [];
}

// Map team abbreviations to full names for injury matching
export const TEAM_NAMES: Record<string, string> = {
  ANA: "Anaheim Ducks",
  ARI: "Arizona Coyotes",
  BOS: "Boston Bruins",
  BUF: "Buffalo Sabres",
  CGY: "Calgary Flames",
  CAR: "Carolina Hurricanes",
  CHI: "Chicago Blackhawks",
  COL: "Colorado Avalanche",
  CBJ: "Columbus Blue Jackets",
  DAL: "Dallas Stars",
  DET: "Detroit Red Wings",
  EDM: "Edmonton Oilers",
  FLA: "Florida Panthers",
  LAK: "Los Angeles Kings",
  MIN: "Minnesota Wild",
  MTL: "Montreal Canadiens",
  NSH: "Nashville Predators",
  NJD: "New Jersey Devils",
  NYI: "New York Islanders",
  NYR: "New York Rangers",
  OTT: "Ottawa Senators",
  PHI: "Philadelphia Flyers",
  PIT: "Pittsburgh Penguins",
  SJS: "San Jose Sharks",
  SEA: "Seattle Kraken",
  STL: "St. Louis Blues",
  TBL: "Tampa Bay Lightning",
  TOR: "Toronto Maple Leafs",
  UTA: "Utah Hockey Club",
  VAN: "Vancouver Canucks",
  VGK: "Vegas Golden Knights",
  WSH: "Washington Capitals",
  WPG: "Winnipeg Jets",
};
