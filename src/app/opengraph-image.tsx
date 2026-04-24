import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "DNHL - NHL Game Predictions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  const logoData = await readFile(join(process.cwd(), "src/app/dnhl-red.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

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

        {/* Subtle diagonal lines background texture */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.04,
            display: "flex",
          }}
        >
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: -200,
                left: i * 120 - 200,
                width: 2,
                height: 1200,
                background: "white",
                transform: "rotate(-20deg)",
              }}
            />
          ))}
        </div>

        {/* DNHL Logo — actual recolored image */}
        <img
          src={logoSrc}
          width={560}
          height={144}
          style={{ objectFit: "contain" }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#9ca3af",
            letterSpacing: "6px",
            textTransform: "uppercase",
            marginTop: 32,
          }}
        >
          NHL Game Predictions & Analysis
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 48,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 20, color: "#e11d48", fontWeight: 700 }}>DAILY PICKS</div>
          </div>
          <div style={{ width: 1, height: 24, background: "#444" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 20, color: "#e11d48", fontWeight: 700 }}>PLAYER PROPS</div>
          </div>
          <div style={{ width: 1, height: 24, background: "#444" }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 20, color: "#e11d48", fontWeight: 700 }}>OVER / UNDER</div>
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
