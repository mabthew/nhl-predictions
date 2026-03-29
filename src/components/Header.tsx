"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative bg-header-dark text-white overflow-hidden">
      {/* ESPN-style diagonal red accent — left edge */}
      <div
        className="absolute left-0 top-0 bottom-0 z-0"
        style={{
          width: "max(35px, 2%)",
          background: "linear-gradient(180deg, #e52534, #c41e2a)",
          clipPath: "polygon(0 0, 85% 0, 50% 100%, 0 100%)",
        }}
      />
      {/* Darker sliver for depth */}
      <div
        className="absolute top-0 bottom-0 z-0"
        style={{
          width: "max(50px, 3%)",
          background: "linear-gradient(180deg, #c41e2a, #8b1520)",
          clipPath: "polygon(0 0, 100% 0, 40% 100%, 0 100%)",
          opacity: 0.8,
        }}
      />
      {/* Darkest sliver for depth */}
      <div
        className="absolute left-0 top-0 bottom-0 z-0"
        style={{
          width: "max(65px, 4%)",
          background: "linear-gradient(180deg, #8b1520, #7c101a)",
          clipPath: "polygon(0 0, 100% 0, 30% 100%, 0 100%)",
          opacity: 0.6,
        }}
      />
      {/* Darkest sliver for depth */}
      <div
        className="absolute left-0 top-0 bottom-0 z-0"
        style={{
          width: "max(80px, 5%)",
          background: "linear-gradient(180deg, #7c101a, #6a0d15)",
          clipPath: "polygon(0 0, 100% 0, 20% 100%, 0 100%)",
          opacity: 0.4,
        }}
      />

      {/* Texture overlay */}
      <div className="absolute inset-0 header-texture z-0" />

      {/* Main content */}
      <div className="relative z-10 w-full px-4 py-3.5 flex items-center">
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-center gap-4"
          style={{ paddingLeft: "max(56px, 4%)" }}
        >
          <Image
            src="/dnhl-red.png"
            alt="DNHL"
            width={120}
            height={31}
            className="h-8 sm:h-9 w-auto"
            priority
          />
          <div className="hidden sm:block border-l border-white/20 pl-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 leading-none">
              Smart picks. Dumb money.
            </span>
          </div>
        </Link>

        <div className="flex-1" />

        {/* Desktop: inline nav links */}
        <nav className="hidden sm:flex items-center gap-6 mr-2">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            Predictions
          </Link>
          <Link
            href="/history"
            className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            History
          </Link>
          <Link
            href="/methodology"
            className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            Methodology
          </Link>
        </nav>

        {/* Mobile: hamburger button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden relative w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-white/10 transition-colors flex-none"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-5 h-0.5 bg-white transition-all duration-200 ${
              menuOpen ? "rotate-45 translate-y-1" : ""
            }`}
          />
          <span
            className={`block w-5 h-0.5 bg-white transition-all duration-200 ${
              menuOpen ? "-rotate-45 -translate-y-1" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`sm:hidden relative z-10 overflow-hidden transition-all duration-200 ${
          menuOpen ? "max-h-40" : "max-h-0"
        }`}
      >
        <nav className="w-full px-4 pb-3 flex flex-col items-end gap-1">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-semibold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
          >
            Predictions
          </Link>
          <Link
            href="/history"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-semibold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
          >
            History
          </Link>
          <Link
            href="/methodology"
            onClick={() => setMenuOpen(false)}
            className="text-sm font-semibold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 px-4 py-2 rounded-lg transition-colors"
          >
            Methodology
          </Link>
        </nav>
      </div>

      {/* Bottom accent — thick red bar like ESPN */}
      <div className="h-1 bg-gradient-to-r from-espn-red via-espn-red to-espn-red-dark" />
    </header>
  );
}
