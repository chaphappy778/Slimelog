// apps/web/components/feed/FeedListClient.tsx
//
// Feed rework batch 3 (2026-07-11): client wrapper that owns feed
// density state, renders the density toggle, and swaps between the
// photo-hero (default) and compact list card treatments.
//
// State persistence: localStorage under FEED_DENSITY_KEY. Default is
// "a" (photo-hero) for both first-timers and users who've never toggled
// — matches the "default A, opt-in to C" spec.
//
// Day-bucket dividers wrap either card style; grouping logic lives here
// so both densities render Today / This week / Earlier consistently.

"use client";

import { useEffect, useState } from "react";
import type { FeedCardLog } from "@/components/FeedCard";
import FeedCard from "@/components/FeedCard";
import FeedCardCompact from "@/components/feed/FeedCardCompact";

const FEED_DENSITY_KEY = "slimelog:feed_density";

type Density = "a" | "c";
type BucketKey = "today" | "week" | "earlier";
const BUCKET_LABELS: Record<BucketKey, string> = {
  today: "Today",
  week: "This week",
  earlier: "Earlier",
};

function bucketLogsByDay(logs: FeedCardLog[]): Array<{
  key: BucketKey;
  logs: FeedCardLog[];
}> {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const sevenDaysAgo = new Date(
    todayStart.getTime() - 7 * 24 * 60 * 60 * 1000,
  );
  const buckets: Record<BucketKey, FeedCardLog[]> = {
    today: [],
    week: [],
    earlier: [],
  };
  for (const log of logs) {
    const t = new Date(log.created_at).getTime();
    if (t >= todayStart.getTime()) buckets.today.push(log);
    else if (t >= sevenDaysAgo.getTime()) buckets.week.push(log);
    else buckets.earlier.push(log);
  }
  const result: Array<{ key: BucketKey; logs: FeedCardLog[] }> = [];
  (["today", "week", "earlier"] as BucketKey[]).forEach((key) => {
    if (buckets[key].length > 0) result.push({ key, logs: buckets[key] });
  });
  return result;
}

function DayDivider({
  label,
  count,
  emphasized,
}: {
  label: string;
  count: number;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <span
        className="text-[13px] font-black uppercase tracking-wider"
        style={{
          fontFamily: "Montserrat, sans-serif",
          color: emphasized ? "#39FF14" : "#ffffff",
        }}
      >
        {label}
      </span>
      <span
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(120,60,180,0.55), transparent)",
        }}
      />
      <span
        className="text-[11px] font-semibold"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {count} log{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function DensityToggle({
  density,
  setDensity,
}: {
  density: Density;
  setDensity: (d: Density) => void;
}) {
  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-full"
      style={{
        background: "rgba(10,0,20,0.5)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
      role="group"
      aria-label="Feed density"
    >
      <button
        type="button"
        onClick={() => setDensity("a")}
        aria-pressed={density === "a"}
        aria-label="Photo-hero density"
        className="rounded-full p-1.5 transition-all"
        style={{
          background:
            density === "a"
              ? "linear-gradient(135deg, #39FF14, #00F0FF)"
              : "transparent",
          color: density === "a" ? "#0A0A0A" : "rgba(255,255,255,0.55)",
        }}
      >
        {/* Photo grid glyph */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="9" r="1.6" />
          <path d="m3 17 5-4 5 3 3-2 5 4" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setDensity("c")}
        aria-pressed={density === "c"}
        aria-label="Compact list density"
        className="rounded-full p-1.5 transition-all"
        style={{
          background:
            density === "c"
              ? "linear-gradient(135deg, #39FF14, #00F0FF)"
              : "transparent",
          color: density === "c" ? "#0A0A0A" : "rgba(255,255,255,0.55)",
        }}
      >
        {/* List rows glyph */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function FeedListClient({
  logs,
  brandSlugMap,
  currentUserId,
  toggleSlot,
}: {
  logs: FeedCardLog[];
  brandSlugMap: Record<string, string>;
  currentUserId: string | null;
  // Optional slot for consumers that want to place the density toggle
  // somewhere other than the top of the list (e.g., inline with tabs).
  // If not provided, the toggle renders above the first divider.
  toggleSlot?: (toggle: React.ReactNode) => React.ReactNode;
}) {
  // Default to A (photo-hero). Read localStorage after mount to avoid
  // an SSR/hydration mismatch — the initial server render always uses
  // the default, and if the user's saved choice is C we swap on mount.
  const [density, setDensityState] = useState<Density>("a");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(FEED_DENSITY_KEY);
      if (saved === "c") setDensityState("c");
    } catch {
      // localStorage unavailable — stay on default.
    }
  }, []);

  const setDensity = (d: Density) => {
    setDensityState(d);
    try {
      window.localStorage.setItem(FEED_DENSITY_KEY, d);
    } catch {
      // ignore
    }
  };

  const buckets = bucketLogsByDay(logs);
  const toggle = <DensityToggle density={density} setDensity={setDensity} />;

  return (
    <div className="flex flex-col">
      {toggleSlot ? (
        toggleSlot(toggle)
      ) : (
        <div className="flex justify-end -mt-2 mb-1">{toggle}</div>
      )}
      <div className="flex flex-col gap-3">
        {buckets.map(({ key, logs: bucketLogs }, i) => (
          <div key={key} className="flex flex-col gap-3">
            <DayDivider
              label={BUCKET_LABELS[key]}
              count={bucketLogs.length}
              emphasized={key === "today" && i === 0}
            />
            <div
              className={
                density === "c" ? "flex flex-col gap-2" : "flex flex-col gap-3"
              }
            >
              {bucketLogs.map((log) => {
                // Wishlist entries always render in the compact form
                // regardless of the user's density preference. They're
                // "user wants slime" events with typically no photo
                // attached, so the full photo-hero treatment reads as
                // a giant blank card. Compact carries the same info
                // without eating half a screen.
                const isWishlist =
                  log.activity_type === "wishlist_added" ||
                  log.in_wishlist === true;
                const useCompact = density === "c" || isWishlist;
                return useCompact ? (
                  <FeedCardCompact
                    key={log.id}
                    log={log}
                    brandSlugMap={brandSlugMap}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <FeedCard
                    key={log.id}
                    log={log}
                    brandSlugMap={brandSlugMap}
                    currentUserId={currentUserId}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
