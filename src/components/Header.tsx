"use client";

import { useState } from "react";
import Link from "next/link";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative bg-header-dark text-white overflow-hidden header-texture">
      {/* Diagonal red accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-16 sm:w-20"
        style={{
          background: "linear-gradient(180deg, #e52534, #c41e2a)",
          transform: "skewX(-12deg) translateX(-1.5rem)",
        }}
      />

      {/* Main content */}
      <div className="relative w-full px-4 py-3 flex items-center">
        {/* Left: Logo + Title */}
        <Link href="/" className="flex items-center gap-3 pl-[calc(2rem+15px)] sm:pl-[calc(3rem+15px)]">
          <div
            className="w-11 h-12 flex items-center justify-center logo-shield flex-none"
            style={{
              background: "linear-gradient(180deg, #e52534, #c41e2a)",
              boxShadow:
                "0 0 15px rgba(229,37,52,0.4), 0 0 30px rgba(229,37,52,0.15)",
            }}
          >
            <span className="font-teko text-2xl font-bold text-white leading-none -mb-1">
              N
            </span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-teko text-2xl sm:text-3xl font-bold uppercase tracking-tight leading-none">
              NHL <span className="text-espn-red">Predictions</span>
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-ice-blue mt-0.5">
              Daily Game Analysis
            </p>
          </div>
        </Link>

        <div className="flex-1" />

        {/* Desktop: inline nav links */}
        <nav className="hidden sm:flex items-center gap-6 mr-2">
          <Link href="/" className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors">
            Predictions
          </Link>
          <Link href="/history" className="text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white transition-colors">
            History
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
        className={`sm:hidden relative overflow-hidden transition-all duration-200 ${
          menuOpen ? "max-h-32" : "max-h-0"
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
        </nav>
      </div>

      {/* Bottom gradient accent line */}
      <div className="h-px bg-gradient-to-r from-espn-red via-espn-red/40 to-transparent" />
    </header>
  );
}
