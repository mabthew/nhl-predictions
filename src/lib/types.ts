// ── NHL Team Summary Stats (from api.nhle.com/stats/rest/en/team/summary) ──

export interface NHLTeamSummaryStats {
  teamId: number;
  teamFullName: string;
  seasonId: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPct: number;
  goalsFor: number;
  goalsAgainst: number;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  powerPlayPct: number;
  powerPlayNetPct: number;
  penaltyKillPct: number;
  penaltyKillNetPct: number;
  shotsForPerGame: number;
  shotsAgainstPerGame: number;
  faceoffWinPct: number;
  winsInRegulation: number;
  regulationAndOtWins: number;
  winsInShootout: number;
  teamShutouts: number;
}

// ── NHL API Types (matching real API response) ──

export interface NHLScheduleResponse {
  gameWeek: NHLGameWeek[];
}

export interface NHLGameWeek {
  date: string;
  dayAbbrev: string;
  numberOfGames: number;
  games: NHLGame[];
}

export interface NHLGame {
  id: number;
  season: number;
  gameType: number;
  venue: { default: string };
  startTimeUTC: string;
  gameState: string;
  gameDate?: string;
  awayTeam: NHLScheduleTeam;
  homeTeam: NHLScheduleTeam;
}

export interface NHLScheduleTeam {
  id: number;
  commonName: { default: string; fr?: string };
  placeName: { default: string };
  abbrev: string;
  logo: string;
  darkLogo: string;
  score?: number;
}

export interface NHLStandingsTeam {
  teamAbbrev: { default: string };
  teamName: { default: string };
  teamCommonName: { default: string };
  teamLogo: string;
  placeName: { default: string };
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  pointPctg: number;
  goalFor: number;
  goalAgainst: number;
  goalDifferential: number;
  regulationWins: number;
  streakCode: string;
  streakCount: number;
  l10Wins: number;
  l10Losses: number;
  l10OtLosses: number;
  l10GoalsFor: number;
  l10GoalsAgainst: number;
  winPctg: number;
}

export interface NHLSkaterStats {
  playerId: number;
  headshot?: string;
  firstName: { default: string };
  lastName: { default: string };
  positionCode: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  powerPlayGoals: number;
  faceoffWinPctg: number;
  avgTimeOnIcePerGame: number;
}

export interface NHLClubStats {
  skaters: NHLSkaterStats[];
  goalies: unknown[];
}

// ── Odds API Types ──

export interface OddsResponse {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
}

export interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

export interface Market {
  key: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
  description?: string;
}

// ── Injury Types ──

export interface InjuryReport {
  team: string;
  players: InjuredPlayer[];
}

export interface InjuredPlayer {
  name: string;
  position: string;
  status: string;
  date: string;
  detail: string;
}

// ── Prediction Types ──

export interface TopPlayer {
  playerId: number;
  firstName: string;
  lastName: string;
  positionCode: string;
  headshot: string;
  goals: number;
  assists: number;
  points: number;
  gamesPlayed: number;
}

export interface TeamMetrics {
  teamAbbrev: string;
  teamName: string;
  teamLogo: string;
  teamDarkLogo?: string;
  shotsForPerGame: number;
  shotsAgainstPerGame: number;
  faceoffWinPct: number;
  irImpact: number;
  powerPlayPct: number;
  penaltyKillPct: number;
  recentForm: number;
  goalDiffPerGame: number;
  l10Record?: string;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  compositeScore: number;
  topPlayers?: TopPlayer[];
  startingGoalieSavePct?: number;
  startingGoalieGAA?: number;
  startingGoalieName?: string;
  futuresImpliedProb?: number;  // Championship implied probability (0-100)
  starPower?: number;           // Star power score for confidence modifier
}

export interface PlayerPropPick {
  playerName: string;
  market: string;
  line: number;
  odds: number;
  recommendation: "OVER" | "UNDER";
  recentAverage: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  expectedValue: number;
  justification: string;
}

export interface OverUnderPrediction {
  line: number;
  prediction: "OVER" | "UNDER";
  projectedTotal: number;
  confidence: number;
  justification: string;
  factors: string[];
}

export type ForecastTier = "full" | "early" | "preliminary";
export type GameStatus = "upcoming" | "live" | "final";

export interface DataAvailability {
  hasOdds: boolean;
  hasPlayerProps: boolean;
}

export interface LiveGameScore {
  homeScore: number;
  awayScore: number;
  period: number;
  periodLabel: string;
  timeRemaining: string;
  homeSog: number;
  awaySog: number;
}

export interface GamePrediction {
  gameId: number;
  gameDate: string;
  startTime: string;
  venue: string;
  homeTeam: TeamMetrics;
  awayTeam: TeamMetrics;
  predictedWinner: "home" | "away";
  winnerConfidence: number;
  overUnder: OverUnderPrediction;
  playerProp: PlayerPropPick | null;
  keyFactors: string[];
  dayIndex: number;
  forecastTier: ForecastTier;
  dataAvailability: DataAvailability;
  gameStatus: GameStatus;
  liveScore?: LiveGameScore;
}

export interface PredictionsResponse {
  date: string;
  generatedAt: string;
  predictions: GamePrediction[];
}

// ── Model Configuration Types ──

export interface ModelWeights {
  goalDiffPerGame: number;
  shotsForPerGame: number;
  penaltyKillPct: number;
  powerPlayPct: number;
  recentForm: number;
  irImpact: number;
  goalie: number;
  futuresMarket: number;
  shotsAgainstPerGame: number;
  faceoffWinPct: number;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  weights: ModelWeights;
  homeIceBonus: number;
  enableStarPower: boolean;
  enableFutures: boolean;
  confidenceMultiplier: number;
}

// ── Stanley Cup Futures Types ──

export interface FuturesOdds {
  team: string;
  odds: number;
  impliedProbability: number;
  bookmaker: string;
}

export interface FuturesResponse {
  generatedAt: string;
  teams: FuturesOdds[];
}

// ── Box Score Types ──

// ── Player Profile Types (multi-season + awards) ──

export interface PlayerSeasonStats {
  season: string;
  teamAbbrev: string;
  gamesPlayed: number;
  goals: number;
  assists: number;
  points: number;
  plusMinus: number;
  pim: number;
  powerPlayGoals: number;
  shots: number;
  shootingPct: number;
  avgToi: string;
}

export interface PlayerAward {
  trophy: string;
  seasons: string[];
}

export interface PlayerProfile {
  playerId: number;
  fullName: string;
  position: string;
  currentTeam: string;
  recentSeasons: PlayerSeasonStats[];
  awards: PlayerAward[];
}

// ── Box Score Types ──

export interface BoxScorePlayer {
  name: string;
  sweaterNumber: number;
  position: string;
  goals: number;
  assists: number;
  points: number;
  shots: number;
  hits: number;
  blockedShots: number;
  toi: string;
}

export interface BoxScoreGoalie {
  name: string;
  sweaterNumber: number;
  savePct: string;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  toi: string;
}

export interface BoxScoreTeam {
  abbrev: string;
  score: number;
  sog: number;
  faceoffPct: string;
  powerPlay: string;
  pim: number;
  hits: number;
  blockedShots: number;
  players: BoxScorePlayer[];
  goalies: BoxScoreGoalie[];
}

export interface BoxScoreData {
  gameId: number;
  gameState: string;
  period: number;
  periodLabel: string;
  timeRemaining: string;
  away: BoxScoreTeam;
  home: BoxScoreTeam;
}
