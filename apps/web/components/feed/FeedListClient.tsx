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
//
// T177 (2026-07-17): cursor-based Load More lives here too. Server-
// rendered `logs` seed the first page; the button fetches subsequent
// pages from /api/feed?tab={activeTab}&before={cursor}&limit=50 and
// appends them to local `moreLogs`. Brand slug + logo maps merge across
// pages so newly-loaded logs still render their brand marks.

"use client";

import { useEffect, useMemo, useState } from "react";
import type { FeedCardLog } from "@/components/FeedCard";
import FeedCard from "@/components/FeedCard";
import FeedCardCompact from "@/components/feed/FeedCardCompact";

const FEED_DENSITY_KEY = "slimelog:feed_density";
const PAGE_SIZE = 50;

type Density = "a" | "c";
type BucketKey = "today" | "week" | "earlier";
const BUCKET_LABELS: Record<BucketKey, string> = {
  today: "Today",
  week: "This week",
  earlier: "Earlier",
};

// T177: response shape returned by /api/feed. Kept local so this
// client bundle doesn't have to import from lib/feed (which pulls in
// the Supabase server client).
interface ApiFeedPage {
  logs: FeedCardLog[];
  brandSlugMap: Record<string, string>;
  brandLogoMap: Record<string, string>;
  hasMore: boolean;
}

function bucketLogsByDay(logs: FeedCardLog[]): Array<{
  key: BucketKey;
  logs: FeedCardLog[];
}> {
  // 2026-07-17 T177 rev: switched from UTC midnight to LOCAL midnight.
  // The old UTC-based bucketing meant a user on East Coast at 9pm ET
  // (which is already tomorrow in UTC) saw all of their own "today"
  // logs bucketed as "This week" — Jennifer flagged this on the
  // pagination smoke test. FeedListClient is a client component so
  // `new Date()` is already the browser's local time; using getFullYear
  // / getMonth / getDate keeps everything in the viewer's timezone.
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
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

// T177: Load More button. Cyan glass treatment matching the Refresh
// button on the notifications feed. Spinning arrow while a fetch is in
// flight; inline error copy below on failure so the user can retry.
function LoadMoreButton({
  loading,
  error,
  onClick,
}: {
  loading: boolean;
  error: string | null;
  onClick: () => void;
}) {
  return (
    <div className="pt-4 pb-2 flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        aria-label="Load more logs"
        className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-full transition-colors"
        style={{
          background: "rgba(0,240,255,0.08)",
          color: "#00F0FF",
          border: "1px solid rgba(0,240,255,0.35)",
          opacity: loading ? 0.6 : 1,
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            animation: loading ? "spin 0.7s linear infinite" : undefined,
          }}
        >
          {loading ? (
            <>
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </>
          ) : (
            <>
              <polyline points="6 9 12 15 18 9" />
            </>
          )}
        </svg>
        {loading ? "Loading" : "Load more"}
      </button>
      {error && (
        <p
          className="text-xs text-center"
          style={{ color: "#FF6B9D", maxWidth: 260 }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function FeedListClient({
  logs,
  brandSlugMap,
  brandLogoMap,
  currentUserId,
  toggleSlot,
  activeTab,
  hasMore,
}: {
  logs: FeedCardLog[];
  brandSlugMap: Record<string, string>;
  // 2026-07-17 T173: parallel to brandSlugMap; lets FeedCard render the
  // brand's small round logo next to the name. Optional so consumers
  // that never adopted the map (fewer than one at time of writing) can
  // default to no-logo rendering rather than error.
  brandLogoMap?: Record<string, string>;
  currentUserId: string | null;
  // Optional slot for consumers that want to place the density toggle
  // somewhere other than the top of the list (e.g., inline with tabs).
  // If not provided, the toggle renders above the first divider.
  toggleSlot?: (toggle: React.ReactNode) => React.ReactNode;
  // T177 (2026-07-17): which tab we're rendering. Threaded down so
  // Load More knows which endpoint to hit.
  activeTab: "community" | "following";
  // T177 (2026-07-17): initial hasMore flag from the SSR page. If the
  // server rendered fewer than the page size we already know there's
  // nothing left, so the button never shows.
  hasMore: boolean;
}) {
  // Default to A (photo-hero). Read localStorage after mount to avoid
  // an SSR/hydration mismatch — the initial server render always uses
  // the default, and if the user's saved choice is C we swap on mount.
  const [density, setDensityState] = useState<Density>("a");

  // Hydration guard for the day-bucketing below. bucketLogsByDay depends
  // on the viewer's "now", which resolves to the SERVER's timezone during
  // SSR (UTC on Vercel) and the BROWSER's timezone on the client. When
  // those disagree — e.g. evening in the Americas is already "tomorrow" in
  // UTC — a log lands in a different bucket on the server than on the
  // client, so the number of day-divider blocks differs and React throws a
  // hydration error (Sentry 81b58fcb, T191). We keep the first client
  // render identical to the server by using a deterministic single-bucket
  // fallback until mount, then switch to the real timezone-aware buckets.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // T177: Load More state. `moreLogs` holds every additional page
  // concatenated; the effective render source is [...logs, ...moreLogs].
  const [moreLogs, setMoreLogs] = useState<FeedCardLog[]>([]);
  const [extraSlugMap, setExtraSlugMap] = useState<Record<string, string>>({});
  const [extraLogoMap, setExtraLogoMap] = useState<Record<string, string>>({});
  const [currentHasMore, setCurrentHasMore] = useState<boolean>(hasMore);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset the client-side pagination cache when the SSR-provided list
  // changes (e.g., the user switched tabs — Next router hands us a
  // fresh `logs` prop with a different activeTab). Without this the
  // stale following-page logs would linger under the community tab.
  useEffect(() => {
    setMoreLogs([]);
    setExtraSlugMap({});
    setExtraLogoMap({});
    setCurrentHasMore(hasMore);
    setLoadError(null);
  }, [activeTab, hasMore]);

  const allLogs = useMemo(() => [...logs, ...moreLogs], [logs, moreLogs]);
  const mergedBrandSlugMap = useMemo(
    () => ({ ...extraSlugMap, ...brandSlugMap }),
    [extraSlugMap, brandSlugMap],
  );
  const mergedBrandLogoMap = useMemo(
    () => ({ ...extraLogoMap, ...(brandLogoMap ?? {}) }),
    [extraLogoMap, brandLogoMap],
  );

  const handleLoadMore = async () => {
    if (loadingMore || allLogs.length === 0) return;
    setLoadingMore(true);
    setLoadError(null);

    // Cursor is the earliest created_at across everything we already
    // have. `before` is strictly-less-than on the server so the next
    // page starts at the next-older row.
    let earliest = allLogs[0].created_at;
    for (const l of allLogs) {
      if (l.created_at < earliest) earliest = l.created_at;
    }

    const params = new URLSearchParams({
      tab: activeTab,
      before: earliest,
      limit: String(PAGE_SIZE),
    });

    try {
      const res = await fetch(`/api/feed?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setLoadError("Could not load more logs. Tap to retry.");
        setLoadingMore(false);
        return;
      }
      const page = (await res.json()) as ApiFeedPage;
      setMoreLogs((prev) => [...prev, ...page.logs]);
      setExtraSlugMap((prev) => ({ ...prev, ...page.brandSlugMap }));
      setExtraLogoMap((prev) => ({ ...prev, ...page.brandLogoMap }));
      setCurrentHasMore(page.hasMore);
    } catch (err) {
      console.error("[FeedListClient] load more failed:", err);
      setLoadError("Could not load more logs. Tap to retry.");
    } finally {
      setLoadingMore(false);
    }
  };

  // Before mount, render every log under a single deterministic bucket so
  // the server HTML and the first client render match exactly (see the
  // `mounted` note above). The real Today / This week / Earlier split
  // appears on the post-mount re-render, once we can trust the browser's
  // local time.
  const buckets = mounted
    ? bucketLogsByDay(allLogs)
    : allLogs.length > 0
      ? [{ key: "today" as BucketKey, logs: allLogs }]
      : [];
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
                    brandSlugMap={mergedBrandSlugMap}
                    brandLogoMap={mergedBrandLogoMap}
                    currentUserId={currentUserId}
                  />
                ) : (
                  <FeedCard
                    key={log.id}
                    log={log}
                    brandSlugMap={mergedBrandSlugMap}
                    brandLogoMap={mergedBrandLogoMap}
                    currentUserId={currentUserId}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {currentHasMore && (
          <LoadMoreButton
            loading={loadingMore}
            error={loadError}
            onClick={() => void handleLoadMore()}
          />
        )}
      </div>
    </div>
  );
}
