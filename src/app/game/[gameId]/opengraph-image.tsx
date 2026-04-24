import { ImageResponse } from "next/og";
import { getPredictions } from "@/lib/get-predictions";
import { TEAM_COLORS } from "@/lib/team-colors";

export const runtime = "nodejs";
export const alt = "Game Prediction - DegenHL";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const data = await getPredictions();
  const game = data?.predictions.find((p) => String(p.gameId) === gameId);

  if (!game) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#0a0a0a",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 48,
            fontFamily: "sans-serif",
          }}
        >
          DegenHL - Game Prediction
        </div>
      ),
      { ...size }
    );
  }

  const { homeTeam, awayTeam, predictedWinner, winnerConfidence } = game;
  const winner = predictedWinner === "home" ? homeTeam : awayTeam;
  const awayColor = TEAM_COLORS[awayTeam.teamAbbrev] ?? "#9ca3af";
  const homeColor = TEAM_COLORS[homeTeam.teamAbbrev] ?? "#9ca3af";

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Red accent line at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "#e11d48",
          }}
        />

        {/* DNHL branding */}
        <div
          style={{
            fontSize: 24,
            color: "#e11d48",
            fontWeight: 700,
            letterSpacing: "4px",
            textTransform: "uppercase",
            marginBottom: 40,
          }}
        >
          DEGENHL PREDICTION
        </div>

        {/* Matchup: Away vs Home */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
          }}
        >
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: awayColor,
              textAlign: "right",
              maxWidth: 400,
            }}
          >
            {awayTeam.teamName}
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#6b7280",
              fontWeight: 600,
            }}
          >
            vs
          </div>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: homeColor,
              textAlign: "left",
              maxWidth: 400,
            }}
          >
            {homeTeam.teamName}
          </div>
        </div>

        {/* Pick line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 48,
          }}
        >
          <div style={{ fontSize: 22, color: "#9ca3af" }}>Pick:</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: TEAM_COLORS[winner.teamAbbrev] ?? "#fff",
            }}
          >
            {winner.teamName}
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#22c55e",
              fontWeight: 600,
            }}
          >
            {winnerConfidence}% confidence
          </div>
        </div>

        {/* Bottom red accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, transparent, #e11d48, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
