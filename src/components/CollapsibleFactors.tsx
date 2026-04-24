"use client";

import { useState } from "react";
import { getFactorMeta } from "./FactorRow";

interface CollapsibleFactorsProps {
  factors: string[];
}

function FactorItem({ factor }: { factor: string }) {
  const [open, setOpen] = useState(false);
  const { explanation } = getFactorMeta(factor);

  return (
    <li>
      <button
        className="flex items-center gap-2 w-full text-left hover:bg-light-gray/50 rounded px-1 -mx-1 py-0.5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className={`text-brand-primary flex-none leading-none transition-transform duration-150 ${open ? "rotate-90" : ""} inline-block`}>&#9656;</span>
        <span className="text-xs text-charcoal flex-1 leading-snug">{factor}</span>
      </button>
      {open && (
        <p className="text-[11px] text-medium-gray/70 leading-relaxed ml-5 mt-1 mb-1 border-l-2 border-border-gray pl-2">
          {explanation}
        </p>
      )}
    </li>
  );
}

export default function CollapsibleFactors({ factors }: CollapsibleFactorsProps) {
  if (factors.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-medium-gray mb-2">
        Key Factors
      </h3>
      <ul className="space-y-1">
        {factors.map((factor, i) => (
          <FactorItem key={i} factor={factor} />
        ))}
      </ul>
    </div>
  );
}
