// apps/web/components/leaderboard/EmptyState.tsx
// T107 (2026-07-11): Shown when the selected brand has 0 logs from any
// user yet. Small geometric galaxy viz (SVG-only, no character art) +
// heading + CTA to log a slime of this brand.

"use client";

import Link from "next/link";
import type { LeaderboardBrand } from "@/app/leaderboard/LeaderboardClient";

interface Props {
  brand: LeaderboardBrand;
}

const CYAN = "#7DF6FF";

export default function EmptyState({ brand }: Props) {
  // Spec framing was `/log?brand={slug}`, but `/log` currently reads the
  // `brand` query param straight into `brand_name_raw` (a free-text
  // field, not a slug lookup). Passing the readable name gives the
  // right prefill without touching /log's parsing logic.
  const logHref = `/log?brand=${encodeURIComponent(brand.name)}`;
  return (
    <div
      className="rounded-3xl p-8 flex flex-col items-center text-center"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
        gap: 14,
      }}
    >
      <MiniGalaxy />
      <h3
        className="text-white"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: "-0.01em",
          marginTop: 4,
        }}
      >
        This galaxy is empty… for now
      </h3>
      <p
        className="text-sm max-w-[280px]"
        style={{ color: "rgba(245,245,245,0.7)", lineHeight: 1.4 }}
      >
        Nobody&apos;s logged a {brand.name} slime yet. Be the first star in
        this hub <span aria-hidden="true">{"\u{1F4A7}"}</span>
      </p>
      <Link
        href={logHref}
        className="mt-2 inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl text-sm font-black active:scale-95 transition-transform"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#04110A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Log a {brand.name} slime
      </Link>
    </div>
  );
}

function MiniGalaxy() {
  // Pure geometry: hub circle + two orbit rings + a few satellite dots.
  // No characters, no illustrations. All strokes/fills cyan so the whole
  // viz reads as one glowing unit against the dark card.
  return (
    <svg
      width="140"
      height="140"
      viewBox="0 0 140 140"
      fill="none"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 12px rgba(125,246,255,0.35))` }}
    >
      {/* Outer orbit ring */}
      <circle
        cx="70"
        cy="70"
        r="62"
        stroke={CYAN}
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
      {/* Inner orbit ring */}
      <circle
        cx="70"
        cy="70"
        r="40"
        stroke={CYAN}
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      {/* Hub */}
      <circle cx="70" cy="70" r="14" fill={CYAN} fillOpacity="0.35" />
      <circle
        cx="70"
        cy="70"
        r="14"
        stroke={CYAN}
        strokeOpacity="0.85"
        strokeWidth="1.5"
      />
      <circle cx="66" cy="66" r="4" fill={CYAN} fillOpacity="0.9" />

      {/* Satellite dots along the inner orbit */}
      <circle cx="110" cy="70" r="3" fill={CYAN} fillOpacity="0.85" />
      <circle cx="42" cy="49" r="2.5" fill={CYAN} fillOpacity="0.75" />
      <circle cx="52" cy="107" r="2.5" fill={CYAN} fillOpacity="0.75" />

      {/* Satellite along the outer orbit */}
      <circle cx="120" cy="105" r="2" fill={CYAN} fillOpacity="0.6" />
      <circle cx="24" cy="90" r="2" fill={CYAN} fillOpacity="0.6" />
    </svg>
  );
}
