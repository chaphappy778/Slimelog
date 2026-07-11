// apps/web/components/collection/ShelfHero.tsx
//
// Collection rework batch A (2026-07-11). Personal-shelf hero for the
// /collection page. Turns the anemic "My Slimes + counts" header into a
// tight readout of the user's shelf:
//   - giant gradient log count as the primary readout
//   - 4-cell stat strip: avg score, top base type, weeks active, this
//     month
//   - "% of the {top-type} universe" progress card (community-tracked
//     denominator — grows with the community, so it always feels alive)
//
// All server data is passed in via props from the parent client page;
// this component is purely presentational + a subtle mount-time counter
// animation on the big number.

"use client";

import { useEffect, useState } from "react";

export type ShelfStats = {
  ownedCount: number;
  avgScore: number | null;
  topBaseLabel: string | null;
  weeksActive: number;
  thisMonthCount: number;
  // Universe hook — how much of the tracked-community pool this user
  // has logged for their top base type. Null when we don't have enough
  // data to make the ratio meaningful (either the user has no top type
  // yet or the community pool is 0).
  universeTopBaseLabel: string | null;
  universeUserCount: number;
  universeCommunityCount: number;
};

const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3);
const ANIMATION_MS = 900;

export default function ShelfHero({ stats }: { stats: ShelfStats }) {
  const [displayedCount, setDisplayedCount] = useState(0);

  // Counter animation on mount — same feel as the feed hero counters.
  useEffect(() => {
    let raf: number | null = null;
    const start = performance.now();
    const from = 0;
    const to = stats.ownedCount;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ANIMATION_MS);
      setDisplayedCount(Math.round(from + (to - from) * EASE_OUT_CUBIC(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [stats.ownedCount]);

  const universePct =
    stats.universeCommunityCount > 0
      ? Math.min(
          100,
          Math.round(
            (stats.universeUserCount / stats.universeCommunityCount) * 100,
          ),
        )
      : 0;

  return (
    <div className="mb-4">
      {/* Eyebrow + giant count */}
      <p
        className="text-[11px] font-bold uppercase tracking-widest mb-1"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        My shelf
      </p>
      <div className="flex items-end gap-3">
        <span
          className="text-6xl font-black leading-none"
          style={{
            background: "linear-gradient(90deg, #00F0FF, #39FF14)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "-0.03em",
          }}
        >
          {displayedCount.toLocaleString()}
        </span>
        <div
          className="text-base font-black leading-tight pb-1.5"
          style={{
            color: "#ffffff",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          slime{stats.ownedCount === 1 ? "" : "s"}
          <br />
          <span className="text-[13px] font-normal text-slime-muted">
            logged &amp; rated
          </span>
        </div>
      </div>

      {/* 4-cell stat strip */}
      <div
        className="flex mt-4 rounded-2xl overflow-hidden"
        style={{
          background: "rgba(45,10,78,0.3)",
          border: "1px solid rgba(45,10,78,0.7)",
        }}
      >
        <StatCell
          top={stats.avgScore != null ? `★${stats.avgScore.toFixed(1)}` : "—"}
          label="Avg score"
        />
        <StatCell
          top={stats.topBaseLabel ?? "—"}
          label={stats.topBaseLabel ? "Top base" : "No logs yet"}
        />
        <StatCell top={String(stats.weeksActive)} label="Weeks active" />
        <StatCell
          top={
            stats.thisMonthCount > 0
              ? `+${stats.thisMonthCount}`
              : String(stats.thisMonthCount)
          }
          label="This month"
        />
      </div>

      {/* Universe hook */}
      {stats.universeTopBaseLabel && stats.universeCommunityCount > 0 && (
        <div
          className="mt-3 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <div className="flex justify-between items-baseline">
            <span
              className="text-[12px] leading-tight"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              You&apos;ve charted{" "}
              <span
                className="font-bold"
                style={{ color: "#00F0FF" }}
              >
                {universePct}%
              </span>{" "}
              of the {stats.universeTopBaseLabel.toLowerCase()} universe
            </span>
            <span
              className="text-[13px] font-black"
              style={{
                color: "#ffffff",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {stats.universeUserCount}
              <span
                className="text-[11px] font-medium"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                /{stats.universeCommunityCount}
              </span>
            </span>
          </div>
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(45,10,78,0.55)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${universePct}%`,
                background: "linear-gradient(90deg, #39FF14, #00F0FF)",
                boxShadow: "0 0 8px rgba(57,255,20,0.5)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({ top, label }: { top: string; label: string }) {
  return (
    <div
      className="flex-1 py-3 text-center"
      style={{ borderRight: "1px solid rgba(45,10,78,0.7)" }}
    >
      <div
        className="text-[16px] font-black leading-none"
        style={{
          color: "#ffffff",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {top}
      </div>
      <div
        className="text-[9.5px] font-bold uppercase mt-1.5"
        style={{
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.4)",
        }}
      >
        {label}
      </div>
    </div>
  );
}
