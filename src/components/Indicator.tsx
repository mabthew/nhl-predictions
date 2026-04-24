"use client";

import { useState } from "react";

export default function Indicator({ above }: { above: boolean }) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative cursor-default"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span className={`text-base font-bold ${above ? "text-green-400" : "text-brand-primary"}`}>
        {above ? "✓" : "✕"}
      </span>
      {show && (
        <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-4 py-2 rounded-lg bg-white text-charcoal text-[10px] font-poppins font-normal normal-case tracking-normal whitespace-nowrap shadow-lg z-50">
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-white" />
          {above
            ? "Beating coin flip: model is performing above 50%"
            : "Below coin flip: model is performing at or under 50%"}
        </span>
      )}
    </span>
  );
}
