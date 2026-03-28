"use client";

import { useState } from "react";

interface FactorMeta {
  icon: string;
  explanation: string;
}

export function getFactorMeta(factor: string): FactorMeta {
  const f = factor.toLowerCase();
  if (f.includes("goal") && f.includes("averages"))
    return { icon: "🏒", explanation: "Teams that score more goals per game have a direct statistical edge. A higher average means more consistent offensive production across the season." };
  if (f.includes("allows") || f.includes("defensively") || f.includes("leaking"))
    return { icon: "🛡️", explanation: "Fewer goals allowed means stronger defensive systems and goaltending. Teams that limit scoring chances are harder to beat in any single game." };
  if (f.includes("shot"))
    return { icon: "🎯", explanation: "Shot volume correlates with scoring opportunities. Teams that consistently outshoot opponents generate more chances to score and put pressure on opposing goalies." };
  if (f.includes("faceoff") || f.includes("possession"))
    return { icon: "🔄", explanation: "Winning offensive zone faceoffs means more time with the puck in the attacking end. This drives possession, sustained pressure, and higher-quality scoring chances." };
  if (f.includes("save") || f.includes("goaltending") || f.includes("gaa"))
    return { icon: "🧤", explanation: "Goaltending is the great equalizer in hockey. A goalie with a higher save percentage can steal games even when their team is outplayed." };
  if (f.includes("injur") || f.includes("weakened"))
    return { icon: "🩹", explanation: "Missing key players forces teams to rely on less experienced replacements, weakening depth and disrupting established line chemistry." };
  if (f.includes("streak") || f.includes("form") || f.includes("l10"))
    return { icon: "🔥", explanation: "Recent form captures momentum and confidence. Teams on a hot streak tend to play with more cohesion and mental sharpness." };
  if (f.includes("home"))
    return { icon: "🏟️", explanation: "Home ice advantage includes last change (matching lines against opponents), familiar rink dimensions, and crowd energy." };
  if (f.includes("power play"))
    return { icon: "⚡", explanation: "An efficient power play can flip a game. Converting man-advantage opportunities at a high rate means capitalizing on opponents' mistakes." };
  if (f.includes("differential"))
    return { icon: "📊", explanation: "Goal differential per game is the most reliable single indicator of overall team quality, combining both offensive output and defensive discipline." };
  return { icon: "→", explanation: "This metric contributes to the overall composite score that determines our prediction confidence." };
}

export default function FactorRow({ factor }: { factor: string }) {
  const [open, setOpen] = useState(false);
  const meta = getFactorMeta(factor);

  return (
    <div>
      <button
        className="flex items-start gap-2 w-full text-left group hover:bg-light-gray/50 rounded px-1 -mx-1 py-0.5 transition-colors"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <span className="text-sm leading-none mt-px flex-none">{meta.icon}</span>
        <p className="leading-snug flex-1 text-xs font-medium text-medium-gray">
          {factor}
        </p>
        <svg
          className={`w-3 h-3 text-medium-gray/40 flex-none mt-0.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <p className="text-[11px] text-medium-gray/70 leading-relaxed ml-7 mt-1 mb-1 border-l-2 border-border-gray pl-2">
          {meta.explanation}
        </p>
      )}
    </div>
  );
}
