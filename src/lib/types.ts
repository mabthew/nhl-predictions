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
  timeOnAttack: number;
  shotsOnGoal: number;
  offensiveFaceoffPct: number;
  irImpact: number;
  powerPlayPct: number;
  recentForm: number;
  l10Record?: string;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  compositeScore: number;
  topPlayers?: TopPlayer[];
  startingGoalieSavePct?: number;
  startingGoalieGAA?: number;
  startingGoalieName?: string;
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
}

export interface PredictionsResponse {
  date: string;
  generatedAt: string;
  predictions: GamePrediction[];
}
