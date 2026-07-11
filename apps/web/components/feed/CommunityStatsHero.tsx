// apps/web/components/feed/CommunityStatsHero.tsx
//
// Batch 1 of the feed rework (2026-07-11). Sits at the top of the home
// feed. Two neon stat cards (slimers count + slimes logged count) with
// a "This week / All time" toggle that re-runs a counter animation on
// change. Live pulsing green dot next to the title. Ribbon underneath
// with a dynamic "how the community is growing" hook.
//
// Server pre-fetches the four counts (see app/page.tsx) and passes them
// in as props. This component is purely presentational + interactive —
// it never re-queries.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Users, Droplet } from "lucide-react";

export type CommunityStats = {
  slimersAllTime: number;
  slimersThisWeek: number;
  slimesAllTime: number;
  slimesThisWeek: number;
};

type Range = "all" | "week";

const EASE_OUT_CUBIC = (t: number) => 1 - Math.pow(1 - t, 3);
const ANIMATION_MS = 1100;

export default function CommunityStatsHero({
  stats,
}: {
  stats: CommunityStats;
}) {
  const [range, setRange] = useState<Range>("all");

  // Displayed values are separate from the target so we can animate
  // between the two ranges (all-time <-> this-week) smoothly.
  const [displayedSlimers, setDisplayedSlimers] = useState(0);
  const [displayedSlimes, setDisplayedSlimes] = useState(0);
  const rafRef = useRef<number | null>(null);

  const targetSlimers =
    range === "all" ? stats.slimersAllTime : stats.slimersThisWeek;
  const targetSlimes =
    range === "all" ? stats.slimesAllTime : stats.slimesThisWeek;

  const animate = useCallback(
    (fromSlimers: number, fromSlimes: number, toSlimers: number, toSlimes: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / ANIMATION_MS);
        const eased = EASE_OUT_CUBIC(p);
        setDisplayedSlimers(
          Math.round(fromSlimers + (toSlimers - fromSlimers) * eased),
        );
        setDisplayedSlimes(
          Math.round(fromSlimes + (toSlimes - fromSlimes) * eased),
        );
        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [],
  );

  // Kick off animation on mount + whenever range changes.
  useEffect(() => {
    animate(displayedSlimers, displayedSlimes, targetSlimers, targetSlimes);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // Intentionally exclude displayedSlimers/displayedSlimes from deps —
    // we only want to re-animate when the *target* changes (range flip),
    // not on every tick of the animation itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSlimers, targetSlimes, animate]);

  // ── Ribbon copy — first-500-users era stays hard-wired as long as the
  //    community is under that count (pre-launch). Once we cross 500 the
  //    banner needs to be flipped to check a per-user is_founder flag on
  //    the profile (not yet added — the badge/tracking work happens as a
  //    follow-up before we hit 500). For now, everyone signed in during
  //    this phase IS in the first 500, so the copy stays true.
  const totalUsers = stats.slimersAllTime;
  const weeklyUsers = stats.slimersThisWeek;
  let ribbonText: string;
  if (totalUsers < 500) {
    ribbonText = `You're one of the first 500 users ✦`;
  } else if (weeklyUsers > 0) {
    ribbonText = `${weeklyUsers.toLocaleString()} user${weeklyUsers === 1 ? "" : "s"} joined this week ✦`;
  } else {
    ribbonText = `${totalUsers.toLocaleString()} user${totalUsers === 1 ? "" : "s"} strong ✦`;
  }

  const rangeButtonClass = (r: Range) =>
    `text-[11px] font-bold px-3 py-1.5 rounded-full transition-all ${
      range === r
        ? "text-slime-bg"
        : "text-slime-muted hover:text-slime-text"
    }`;

  return (
    <div className="mt-3">
      {/* Title row + range toggle */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-2 text-sm font-black tracking-tight"
          style={{ color: "#ffffff", fontFamily: "Montserrat, sans-serif" }}
        >
          <span
            aria-hidden="true"
            className="inline-block w-2 h-2 rounded-full"
            style={{
              background: "#39FF14",
              boxShadow: "0 0 8px rgba(57,255,20,0.7)",
              animation: "livedot 1.8s ease-in-out infinite",
            }}
          />
          The community is growing
        </div>
        <div
          className="flex items-center gap-1 p-0.5 rounded-full"
          style={{
            background: "rgba(10,0,20,0.5)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <button
            type="button"
            onClick={() => setRange("week")}
            className={rangeButtonClass("week")}
            style={{
              background:
                range === "week"
                  ? "#00F0FF"
                  : "transparent",
              boxShadow:
                range === "week"
                  ? "0 0 12px rgba(0,240,255,0.5)"
                  : "none",
            }}
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setRange("all")}
            className={rangeButtonClass("all")}
            style={{
              background:
                range === "all"
                  ? "#00F0FF"
                  : "transparent",
              boxShadow:
                range === "all"
                  ? "0 0 12px rgba(0,240,255,0.5)"
                  : "none",
            }}
          >
            All time
          </button>
        </div>
      </div>

      {/* Two stat cards. Delta line under each label shows the weekly
          growth signal in green:
          - "all time" view: "+N this week" (grounded on the weekly count)
          - "this week" view: "new this week" (the whole card IS the delta)
          Data reuses the server-side weekly counts already in `stats`;
          no additional queries or tracking columns needed. Same pattern
          will slot into the admin analytics view later. */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          value={displayedSlimers}
          label="users"
          delta={
            range === "all"
              ? `+${stats.slimersThisWeek.toLocaleString()} this week`
              : "new this week"
          }
          icon={<Users className="w-7 h-7" strokeWidth={2} />}
          iconColor="#39FF14"
          gradient="linear-gradient(135deg, #39FF14, #00F0FF)"
          glowColor="rgba(57,255,20,0.55)"
        />
        <StatCard
          value={displayedSlimes}
          label="slimes logged"
          delta={
            range === "all"
              ? `+${stats.slimesThisWeek.toLocaleString()} this week`
              : "new this week"
          }
          icon={<Droplet className="w-7 h-7" strokeWidth={2} />}
          iconColor="#00F0FF"
          gradient="linear-gradient(135deg, #00F0FF, #FF00E5)"
          glowColor="rgba(0,240,255,0.55)"
        />
      </div>

      {/* Ribbon */}
      <div
        className="mt-3 flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-semibold"
        style={{
          background: "rgba(204,68,255,0.10)",
          border: "1px solid rgba(204,68,255,0.35)",
          color: "#ffffff",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="#FF00E5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="m12 3 2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5Z" />
        </svg>
        <span>{ribbonText}</span>
      </div>

      {/* Live-dot pulse keyframes — injected once. Doesn't collide with
          other components since @keyframes are hoisted globally. */}
      <style>{`
        @keyframes livedot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  value,
  label,
  delta,
  icon,
  iconColor,
  gradient,
  glowColor,
}: {
  value: number;
  label: string;
  delta: string;
  icon: React.ReactNode;
  iconColor: string;
  gradient: string;
  glowColor: string;
}) {
  // 2026-07-11: bumped the stat card visuals — the previous
  // purple-on-purple was barely distinguishable from the feed
  // background. Now we have:
  //   - accent-colored border (green/cyan or cyan/magenta) at higher
  //     opacity, so the card outline reads as a lit chip
  //   - a diagonal gradient wash inside the card using the accent
  //     colors at low opacity (behind the glow orb) so the whole
  //     card carries the same accent
  //   - an outer glow drop shadow so the card lifts off the background
  return (
    <div
      className="relative overflow-hidden rounded-3xl p-4"
      style={{
        background: `${gradient}, rgba(45,10,78,0.4)`,
        backgroundBlendMode: "overlay, normal",
        border: `1px solid ${iconColor}66`,
        boxShadow: `0 0 24px ${iconColor}25, inset 0 0 32px rgba(45,10,78,0.25)`,
      }}
    >
      {/* Additional gradient wash overlay so the accent shows through
          even on displays that don't honor backgroundBlendMode well. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: gradient,
          opacity: 0.12,
        }}
      />
      {/* Ambient glow orb behind the number */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full blur-2xl"
        style={{
          width: 120,
          height: 120,
          top: -40,
          right: -30,
          background: glowColor,
          opacity: 0.7,
        }}
      />
      {/* Icon — solid stroke color with a matching glow drop-shadow so
          it reads as a lit neon glyph rather than as a flat outline. */}
      <div
        className="relative"
        style={{
          color: iconColor,
          filter: `drop-shadow(0 0 8px ${iconColor}80)`,
        }}
      >
        {icon}
      </div>
      <div
        className="relative mt-3 text-4xl font-black leading-none"
        style={{
          background: gradient,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "-0.02em",
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        className="relative mt-1.5 text-[10px] font-bold uppercase tracking-widest"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {label}
      </div>
      <div
        className="relative mt-1 text-[11px] font-bold"
        style={{ color: "#39FF14" }}
      >
        {delta}
      </div>
    </div>
  );
}
