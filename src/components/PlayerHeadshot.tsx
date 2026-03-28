"use client";

import { useState } from "react";

interface PlayerHeadshotProps {
  src: string;
  name: string;
  size?: number;
}

export default function PlayerHeadshot({
  src,
  name,
  size = 48,
}: PlayerHeadshotProps) {
  const [error, setError] = useState(false);

  if (error) {
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2);
    return (
      <div
        className="rounded-full bg-medium-gray/30 flex items-center justify-center text-xs font-bold text-white/60"
        style={{ width: size, height: size }}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      className="rounded-full object-cover bg-white/10"
      style={{ width: size, height: size }}
      onError={() => setError(true)}
    />
  );
}
