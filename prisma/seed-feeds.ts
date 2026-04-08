import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FEEDS = [
  {
    slug: "moneypuck-xg",
    name: "MoneyPuck Expected Goals",
    description:
      "Expected goals (xG) model measuring shot quality and scoring chance probability. More predictive than raw shot counts because it weights shots by location, type, and game situation.",
    provider: "moneypuck",
    endpoint: "https://moneypuck.com/moneypuck/playerData/seasonSummary/2024/regular/teams/{team}.csv",
    authEnvVar: null,
    costPerCall: 0.002,
    cacheDurationS: 86400,
    factorKey: "xGoals",
    factorLabel: "Expected Goals (xG)",
    leagueAvg: 2.8,
    leagueSd: 0.4,
    invert: false,
    isActive: false,
    methodologyIcon: "goal-diff",
    methodologyBold: "shot quality and scoring chance probability",
  },
  {
    slug: "action-network-lines",
    name: "Action Network Line Movement",
    description:
      "Tracks sharp money and line movement from professional bettors. When the line moves against public betting percentages, it signals informed money on one side.",
    provider: "action-network",
    endpoint: "https://api.actionnetwork.com/web/v2/games/nhl/{date}",
    authEnvVar: "ACTION_NETWORK_API_KEY",
    costPerCall: 0.005,
    cacheDurationS: 43200,
    factorKey: "lineMovement",
    factorLabel: "Line Movement",
    leagueAvg: 0,
    leagueSd: 5.0,
    invert: false,
    isActive: false,
    methodologyIcon: "futures",
    methodologyBold: "sharp money and line movement",
  },
  {
    slug: "historical-odds-db",
    name: "Historical Odds Database",
    description:
      "Complete historical closing lines and odds for retroactive backtesting. Enables true out-of-sample model validation by comparing predictions against what the market priced.",
    provider: "historical-odds",
    endpoint: "https://api.historicalodds.com/v1/nhl/games/{date}",
    authEnvVar: "HISTORICAL_ODDS_API_KEY",
    costPerCall: 0.001,
    cacheDurationS: 604800,
    factorKey: "historicalOddsEdge",
    factorLabel: "Historical Odds Edge",
    leagueAvg: 0,
    leagueSd: 3.0,
    invert: false,
    isActive: false,
    methodologyIcon: "data",
    methodologyBold: "true out-of-sample model validation",
  },
];

async function main() {
  for (const feed of FEEDS) {
    await prisma.dataFeed.upsert({
      where: { slug: feed.slug },
      update: feed,
      create: feed,
    });
    console.log(`Upserted feed: ${feed.name}`);
  }
}

main()
  .then(() => {
    console.log("Feed seeding complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Feed seeding failed:", err);
    process.exit(1);
  });
