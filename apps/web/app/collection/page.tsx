// apps/web/app/collection/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
import { getUserCollectionLogs } from "@/lib/slime-actions";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { CollectionLog, SlimeBaseType } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import ViewToggle from "@/components/collection/ViewToggle";
import SpiralView from "@/components/collection/SpiralView";
import GalaxyView from "@/components/collection/GalaxyView";
// Collection rework batch A (2026-07-11):
import ShelfHero, {
  type ShelfStats,
} from "@/components/collection/ShelfHero";
import CollectionFilterPills, {
  type FilterKey,
  type SortKey,
} from "@/components/collection/CollectionFilterPills";
// Collection rework batch B (2026-07-11):
import TasteInsights from "@/components/collection/TasteInsights";
import CollectionCard from "@/components/collection/CollectionCard";

type View = "cards" | "spiral" | "galaxy";

export type LikeDataMap = Record<
  string,
  { likeCount: number; commentCount: number; isLiked: boolean }
>;

// 2026-07-11: formatDate + RatingDots + inline SlimeCard were all
// consumed only by the tall SlimeCard treatment that batch B replaced
// with <CollectionCard>. Left in place to keep this diff surgical —
// they'll get pruned in a follow-up cleanup pass.
function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// [Change 1 — T98b] Replaced integer dot fill with fill bar
function RatingDots({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slime-muted text-xs">—</span>;
  const pct = (value / 5) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, width: 48 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          borderRadius: 2,
          background: "rgba(45,10,78,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background:
              pct > 80
                ? "#39FF14"
                : pct > 50
                  ? "#00F0FF"
                  : "rgba(100,50,200,0.9)",
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function SlimeCard({ log }: { log: CollectionLog }) {
  // [Change C2] Compose typeLabel from base_type + optional subtype name.
  const baseLabel =
    log.base_type && SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType]
      ? SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType]
      : null;
  const subtypeName =
    (log as CollectionLog & { subtype?: { name: string } | null }).subtype
      ?.name ?? null;
  const typeLabel =
    baseLabel && subtypeName ? `${baseLabel} \u00b7 ${subtypeName}` : baseLabel;

  const hasRatings = log.rating_overall !== null || log.rating_texture !== null;
  const primaryColor = log.colors?.[0] ?? null;
  const displayPrice =
    (log as any).purchase_price != null
      ? (log as any).purchase_price
      : log.cost_paid;
  const imageUrl = (log as any).image_url ?? null;

  return (
    <Link href={`/slimes/${log.id}`} className="block group">
      <div
        className="rounded-2xl overflow-hidden group-active:scale-[0.98] transition-all duration-200"
        style={{
          background: "rgba(45,10,78,0.25)",
          border: "1px solid rgba(45,10,78,0.7)",
          boxShadow: "inset 0 0 20px rgba(45,10,78,0.1)",
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={log.slime_name ?? "Slime photo"}
            className="w-full h-40 object-cover"
          />
        ) : (
          <div
            className="w-full h-32 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2D0A4E, #1A1A1A)" }}
            aria-hidden="true"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="#39FF14"
                strokeWidth="1.5"
              />
              <circle cx="9" cy="9" r="2" stroke="#39FF14" strokeWidth="1" />
              <circle cx="14" cy="8" r="1" stroke="#39FF14" strokeWidth="1" />
            </svg>
          </div>
        )}

        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h3 className="font-bold text-slime-text text-sm leading-snug truncate">
                {log.slime_name ?? "Unnamed slime"}
              </h3>
              {log.brand_name_raw && (
                <span className="text-xs text-slime-muted truncate">
                  {log.brand_name_raw}
                </span>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              {log.in_wishlist ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                  Wishlist
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slime-accent/15 text-slime-accent border border-slime-accent/25">
                  In Collection
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {typeLabel && (
              <span className="bg-slime-purple text-slime-cyan text-xs font-bold px-2 py-0.5 rounded-full">
                {typeLabel}
              </span>
            )}
            {primaryColor && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
                {primaryColor}
              </span>
            )}

            {displayPrice != null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
                ${Number(displayPrice).toFixed(2)}
              </span>
            )}
          </div>

          {hasRatings && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 border-t border-slime-border/50">
              {log.rating_overall !== null && (
                <div className="flex items-center justify-between col-span-2">
                  <span className="text-xs text-slime-muted font-medium">
                    Overall
                  </span>
                  <div className="flex items-center gap-1.5">
                    <RatingDots value={log.rating_overall} />
                    {/* [Change 2 — T98b] Show one decimal place */}
                    <span className="text-xs font-bold text-slime-cyan">
                      {(log.rating_overall as number).toFixed(1)}/5
                    </span>
                  </div>
                </div>
              )}
              {/* [Change 1] Updated labels: Sound → Sound / ASMR, Drizzle → Aesthetic, Sensory Fit → Quality */}
              {[
                { key: "rating_texture", label: "Texture" },
                { key: "rating_sound", label: "Sound / ASMR" },
                { key: "rating_drizzle", label: "Aesthetic" },
                { key: "rating_creativity", label: "Creativity" },
                { key: "rating_sensory_fit", label: "Quality" },
              ]
                .filter(({ key }) => log[key as keyof CollectionLog] !== null)
                .map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-slime-muted">{label}</span>
                    <RatingDots
                      value={log[key as keyof CollectionLog] as number | null}
                    />
                  </div>
                ))}
            </div>
          )}

          {log.notes && (
            <p className="text-xs text-slime-muted line-clamp-2 italic border-t border-slime-border/50 pt-2">
              &quot;{log.notes}&quot;
            </p>
          )}

          <p className="text-xs text-slime-muted/60 mt-auto">
            {formatDate(log.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  // Collection rework batch C (2026-07-11): geometric-only empty state
  // matching the feed's Following-empty treatment. Blob + two concentric
  // dashed cyan rings + line sparks (cyan, green, magenta). "My shelf"
  // language throughout — matches the ShelfHero eyebrow and the renamed
  // My Shelf bottom-nav tab. No emoji, on-brand voice.
  return (
    <div className="flex flex-col items-center justify-center text-center pt-10 pb-14 gap-3">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Dashed cyan ring — outer */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: "1px dashed rgba(0,240,255,0.25)",
          }}
        />
        {/* Dashed cyan ring — inner */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            width: 112,
            height: 112,
            border: "1px dashed rgba(0,240,255,0.4)",
          }}
        />
        {/* Blob — gradient purple → cyan with soft glow */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 150 150"
          fill="none"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 0 20px rgba(0,240,255,0.4))" }}
        >
          <defs>
            <linearGradient id="shelfEmptyBlob" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2D0A4E" />
              <stop offset="1" stopColor="#00F0FF" />
            </linearGradient>
          </defs>
          <path
            fill="url(#shelfEmptyBlob)"
            d="M62 20 C94 10 134 26 138 62 C142 96 118 130 82 133 C46 136 16 116 15 80 C14 50 32 28 62 20 Z"
          />
        </svg>
        {/* Line-spark accents — cyan, green, magenta */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ left: 16, top: 24 }}
        >
          <path d="M12 3v18M3 12h18" />
        </svg>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ right: 22, bottom: 26 }}
        >
          <path d="M12 4v16M4 12h16" />
        </svg>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FF00E5"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ right: 18, top: 22 }}
        >
          <path d="M12 4v16M4 12h16" />
        </svg>
      </div>
      <h3
        className="text-[22px] font-black tracking-tight text-white mt-3"
        style={{
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        Your shelf is empty
      </h3>
      <p className="text-sm text-slime-muted max-w-[280px] leading-snug">
        Log your first slime and we&apos;ll start building your taste profile.
      </p>
      <Link
        href="/log"
        className="mt-4 inline-flex items-center gap-1 px-6 py-3 rounded-2xl text-sm font-black transition active:scale-95"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Log your first slime
      </Link>
    </div>
  );
}

export default function CollectionPage() {
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<View>("cards");
  const [universe, setUniverse] = useState<{
    topBaseLabel: string | null;
    userCount: number;
    communityCount: number;
  }>({
    topBaseLabel: null,
    userCount: 0,
    communityCount: 0,
  });

  const [likeData, setLikeData] = useState<LikeDataMap>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserCollectionLogs()
      .then((data) => {
        const fetched = (data ?? []) as unknown as CollectionLog[];
        setLogs(fetched);
        setLoading(false);

        if (fetched.length === 0) return;

        const supabase = createClient();

        const logIds = fetched.map((l) => l.id);

        Promise.all([
          supabase.auth.getUser(),
          supabase.from("likes").select("log_id").in("log_id", logIds),
          supabase.from("comments").select("log_id").in("log_id", logIds),
        ]).then(([userResult, likesResult, commentsResult]) => {
          const uid = userResult.data.user?.id ?? null;
          setCurrentUserId(uid);

          const likeRows = likesResult.data ?? [];
          const commentRows = commentsResult.data ?? [];

          const likeCountMap: Record<string, number> = {};
          const commentCountMap: Record<string, number> = {};

          for (const row of likeRows) {
            likeCountMap[row.log_id] = (likeCountMap[row.log_id] ?? 0) + 1;
          }
          for (const row of commentRows) {
            commentCountMap[row.log_id] =
              (commentCountMap[row.log_id] ?? 0) + 1;
          }

          if (uid) {
            supabase
              .from("likes")
              .select("log_id")
              .eq("user_id", uid)
              .in("log_id", logIds)
              .then(({ data: userLikeRows }) => {
                const userLikedSet = new Set(
                  (userLikeRows ?? []).map((r) => r.log_id as string),
                );
                const map: LikeDataMap = {};
                for (const id of logIds) {
                  map[id] = {
                    likeCount: likeCountMap[id] ?? 0,
                    commentCount: commentCountMap[id] ?? 0,
                    isLiked: userLikedSet.has(id),
                  };
                }
                setLikeData(map);
              });
          } else {
            const map: LikeDataMap = {};
            for (const id of logIds) {
              map[id] = {
                likeCount: likeCountMap[id] ?? 0,
                commentCount: commentCountMap[id] ?? 0,
                isLiked: false,
              };
            }
            setLikeData(map);
          }
        });
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load collection.",
        );
        setLoading(false);
      });
  }, []);

  const filtered = logs.filter((l) => {
    if (filter === "collection") return !l.in_wishlist;
    if (filter === "wishlist") return l.in_wishlist;
    return true;
  });

  // Apply sort (batch A).
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "score")
      return (b.rating_overall ?? -1) - (a.rating_overall ?? -1);
    if (sort === "added")
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    // recent = updated_at desc
    return (
      new Date(b.updated_at ?? b.created_at).getTime() -
      new Date(a.updated_at ?? a.created_at).getTime()
    );
  });

  const collectionCount = logs.filter((l) => !l.in_wishlist).length;
  const wishlistCount = logs.filter((l) => l.in_wishlist).length;

  // ── Shelf hero stats (batch A) ──────────────────────────────────────────
  //
  // All derived client-side from the fetched logs. Owned = not-wishlist.
  // Avg score across owned logs that have a rating. Top base = mode of
  // base_type across owned logs. Weeks active = weeks since first log
  // (min of created_at across all logs). This month = logs created in
  // the current calendar month.
  const ownedLogs = logs.filter((l) => !l.in_wishlist);
  const scoredOwned = ownedLogs.filter(
    (l): l is CollectionLog & { rating_overall: number } =>
      typeof l.rating_overall === "number",
  );
  const avgScore = scoredOwned.length
    ? scoredOwned.reduce((sum, l) => sum + l.rating_overall, 0) /
      scoredOwned.length
    : null;

  const baseCounts: Partial<Record<SlimeBaseType, number>> = {};
  for (const l of ownedLogs) {
    if (l.base_type) {
      const k = l.base_type as SlimeBaseType;
      baseCounts[k] = (baseCounts[k] ?? 0) + 1;
    }
  }
  let topBase: SlimeBaseType | null = null;
  let topBaseCount = 0;
  for (const [k, c] of Object.entries(baseCounts)) {
    if ((c ?? 0) > topBaseCount) {
      topBase = k as SlimeBaseType;
      topBaseCount = c ?? 0;
    }
  }
  const topBaseLabel = topBase
    ? (SLIME_BASE_TYPE_LABELS[topBase] ?? null)
    : null;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthCount = logs.filter(
    (l) => new Date(l.created_at) >= monthStart,
  ).length;

  const firstLogTime = logs.length
    ? Math.min(...logs.map((l) => new Date(l.created_at).getTime()))
    : Date.now();
  const weeksActive = Math.max(
    1,
    Math.floor((Date.now() - firstLogTime) / (7 * 24 * 60 * 60 * 1000)),
  );

  const stats: ShelfStats = {
    ownedCount: collectionCount,
    avgScore,
    topBaseLabel,
    weeksActive,
    thisMonthCount,
    universeTopBaseLabel: universe.topBaseLabel,
    universeUserCount: universe.userCount,
    universeCommunityCount: universe.communityCount,
  };

  // ── Universe hook: community-tracked denominator ────────────────────────
  //
  // Runs whenever the user's top base type changes. Queries the count of
  // DISTINCT slime_ids across all is_public collection_logs with that
  // base_type — this is the "community universe of butter slimes" figure.
  // If distinct slime_id data isn't clean enough, we fall back to a
  // simple row count, which is still a directional signal.
  useEffect(() => {
    if (!topBase || !topBaseLabel) {
      setUniverse({
        topBaseLabel: null,
        userCount: 0,
        communityCount: 0,
      });
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("base_type", topBase)
      .then(({ count }) => {
        if (cancelled) return;
        const userCount = ownedLogs.filter((l) => l.base_type === topBase)
          .length;
        setUniverse({
          topBaseLabel,
          userCount,
          communityCount: count ?? 0,
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topBase, topBaseLabel, ownedLogs.length]);

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      {/* 2026-07-11: pt bumped from pt-14 (bare header height) to pt-20
          so the shelf hero has real breathing room under the fixed
          header. The old `py-6` was overriding pt-14 in Tailwind
          precedence, leaving effectively 24px of top padding — the
          "MY SHELF" eyebrow was sitting right on top of the header. */}
      <div className="pt-20 px-4 pb-6">
        <div className="max-w-md mx-auto">
          {/* Shelf hero (batch A). The old header block — "My Slimes"
              gradient title + counts + wishlist route-away button —
              was replaced. Wishlist now lives as an inline filter pill
              below; /wishlist stays a working deep link. */}
          {!loading && !error && logs.length > 0 && (
            <ShelfHero stats={stats} />
          )}

          {/* T107 (2026-07-11): entry pill to the community leaderboard.
              Only shows once the shelf has at least one log — no point
              in inviting a fresh user to ranking pages before they've
              even seen theirs populate. Magenta accent to separate it
              visually from the surrounding shelf-hero (green/cyan) and
              filter pills (cyan). */}
          {!loading && !error && logs.length > 0 && (
            <div className="flex justify-center mt-3 mb-1">
              <Link
                href="/leaderboard"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: "rgba(255,0,229,0.08)",
                  border: "1px solid rgba(255,0,229,0.45)",
                  color: "#FF00E5",
                }}
              >
                <span aria-hidden="true">{"\u{1F3C6}"}</span>
                <span>Biggest galaxies leaderboard</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {/* View toggle — segmented pill (batch A). */}
          {!loading && !error && logs.length > 0 && (
            <ViewToggle active={view} onChange={setView} />
          )}

          {/* Taste insights card (batch B): 6-axis radar + base-type
              bars, Cards view only, only shown once the user has at
              least one rated owned log so we're not rendering an empty
              radar. */}
          {!loading &&
            !error &&
            view === "cards" &&
            logs.some(
              (l) =>
                !l.in_wishlist && typeof l.rating_overall === "number",
            ) && <TasteInsights logs={logs} />}

          {/* Feed-style filter pills + inline sort — Cards view only. */}
          {!loading && !error && logs.length > 0 && view === "cards" && (
            <CollectionFilterPills
              filter={filter}
              setFilter={setFilter}
              sort={sort}
              setSort={setSort}
              counts={{
                all: logs.length,
                collection: collectionCount,
                wishlist: wishlistCount,
              }}
            />
          )}

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-slime-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && filtered.length === 0 && view === "cards" && (
            <EmptyState />
          )}

          {/* Views */}
          {!loading && !error && logs.length > 0 && (
            <>
              {view === "cards" && sorted.length > 0 && (
                // Batch B: compact CollectionCard replaces the tall
                // inline SlimeCard treatment. Tighter list (~5 per
                // screen) suited for scanning a large personal shelf;
                // the full ratings grid + notes body live on
                // /slimes/[id] behind the row tap.
                <div className="flex flex-col gap-2 mt-2">
                  {sorted.map((log) => (
                    <CollectionCard key={log.id} log={log} />
                  ))}
                </div>
              )}
              {view === "spiral" && (
                <SpiralView
                  logs={logs}
                  likeData={likeData}
                  currentUserId={currentUserId}
                />
              )}
              {view === "galaxy" && (
                <GalaxyView
                  logs={logs}
                  likeData={likeData}
                  currentUserId={currentUserId}
                />
              )}
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
