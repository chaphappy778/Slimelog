// apps/web/app/collection/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { getUserCollectionLogs } from "@/lib/slime-actions";
import { SLIME_TYPE_LABELS } from "@/lib/types";
import type { CollectionLog, SlimeType } from "@/lib/types";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import CollectionSummaryChart from "@/components/collection/CollectionSummaryChart";
import ViewToggle from "@/components/collection/ViewToggle";
import SpiralView from "@/components/collection/SpiralView";
import GalaxyView from "@/components/collection/GalaxyView";

type View = "cards" | "spiral" | "galaxy";

// [Change 1] Type for like/comment data map keyed by log id.
export type LikeDataMap = Record<
  string,
  { likeCount: number; commentCount: number; isLiked: boolean }
>;

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function RatingDots({ value }: { value: number | null }) {
  if (!value) return <span className="text-slime-muted text-xs">—</span>;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= value ? "bg-slime-accent" : "bg-slime-border"}`}
        />
      ))}
    </span>
  );
}

function SlimeCard({ log }: { log: CollectionLog }) {
  const typeLabel =
    log.slime_type && SLIME_TYPE_LABELS[log.slime_type as SlimeType]
      ? SLIME_TYPE_LABELS[log.slime_type as SlimeType]
      : null;
  const hasRatings =
    log.rating_overall !== null ||
    log.rating_texture !== null ||
    log.rating_scent !== null;
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
            {log.scent && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
                {log.scent}
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
                    <span className="text-xs font-bold text-slime-cyan">
                      {log.rating_overall}/5
                    </span>
                  </div>
                </div>
              )}
              {[
                { key: "rating_texture", label: "Texture" },
                { key: "rating_scent", label: "Scent" },
                { key: "rating_sound", label: "Sound" },
                { key: "rating_drizzle", label: "Drizzle" },
                { key: "rating_creativity", label: "Creativity" },
                { key: "rating_sensory_fit", label: "Sensory Fit" },
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
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF, #FF00E5)",
        }}
        aria-hidden="true"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#0A0A0A" strokeWidth="1.5" />
          <circle cx="9" cy="9" r="2" stroke="#0A0A0A" strokeWidth="1" />
          <circle cx="14" cy="8" r="1" stroke="#0A0A0A" strokeWidth="1" />
        </svg>
      </div>
      <div>
        <p className="font-bold text-slime-text">Your collection is empty</p>
        <p className="text-sm text-slime-muted mt-1">
          Log your first slime to get started
        </p>
      </div>
      <Link
        href="/log"
        className="mt-2 px-6 py-2.5 rounded-xl text-slime-bg text-sm font-bold transition active:scale-95"
        style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      >
        Log a slime
      </Link>
    </div>
  );
}

export default function CollectionPage() {
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "collection" | "wishlist">(
    "all",
  );
  const [view, setView] = useState<View>("cards");

  // [Change 2] Like/comment data map and current user id for canvas views.
  const [likeData, setLikeData] = useState<LikeDataMap>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getUserCollectionLogs()
      .then((data) => {
        const fetched = (data ?? []) as unknown as CollectionLog[];
        setLogs(fetched);
        setLoading(false);

        // [Change 3] After logs are fetched, bulk-fetch like/comment counts
        // and current user's liked set using the browser Supabase client.
        if (fetched.length === 0) return;

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        );

        const logIds = fetched.map((l) => l.id);

        Promise.all([
          supabase.auth.getUser(),
          supabase.from("likes").select("log_id").in("log_id", logIds),
          supabase.from("comments").select("log_id").in("log_id", logIds),
        ]).then(([userResult, likesResult, commentsResult]) => {
          const uid = userResult.data.user?.id ?? null;
          setCurrentUserId(uid);

          // [Change 4] Fetch user's own likes separately now that we have uid.
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

  const collectionCount = logs.filter((l) => !l.in_wishlist).length;
  const wishlistCount = logs.filter((l) => l.in_wishlist).length;

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14 px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #00F0FF, #39FF14)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                My Slimes
              </h1>
              {!loading && (
                <p className="text-sm text-slime-muted mt-0.5">
                  {collectionCount} in collection · {wishlistCount} on wishlist
                </p>
              )}
            </div>
            {/* [Change B2] Replaced Log button with Wishlist link */}
            <Link
              href="/wishlist"
              className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{
                color: "#CC44FF",
                background: "rgba(204,68,255,0.08)",
                border: "1px solid rgba(204,68,255,0.25)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Wishlist
            </Link>
          </div>

          {/* View toggle — always visible, never moves */}
          {!loading && !error && logs.length > 0 && (
            <div className="mb-4">
              <ViewToggle active={view} onChange={setView} />
            </div>
          )}

          {/* Donut summary chart — only on Cards view */}
          {!loading && !error && logs.length > 0 && view === "cards" && (
            <CollectionSummaryChart logs={filtered} />
          )}

          {/* Filter tabs — only on Cards view, sits below donut */}
          {!loading && !error && logs.length > 0 && view === "cards" && (
            <div className="flex gap-2 mb-6">
              {(["all", "collection", "wishlist"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                    filter === f
                      ? "text-slime-bg"
                      : "bg-slime-surface border border-slime-border text-slime-muted hover:border-slime-accent/50"
                  }`}
                  style={
                    filter === f
                      ? {
                          background:
                            "linear-gradient(135deg, #39FF14, #00F0FF)",
                        }
                      : undefined
                  }
                >
                  {f === "all"
                    ? `All (${logs.length})`
                    : f === "collection"
                      ? `Collection (${collectionCount})`
                      : `Wishlist (${wishlistCount})`}
                </button>
              ))}
            </div>
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
              {view === "cards" && filtered.length > 0 && (
                <div className="flex flex-col gap-4">
                  {filtered.map((log) => (
                    <SlimeCard key={log.id} log={log} />
                  ))}
                </div>
              )}
              {/* [Change 5] Pass likeData and currentUserId to canvas views. */}
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
