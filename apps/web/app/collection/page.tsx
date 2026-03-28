// apps/web/app/collection/page.tsx
// Updated: SlimeCard is now wrapped in a Link to /slimes/[id]

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getUserCollectionLogs } from "@/lib/slime-actions";
import { SLIME_TYPE_LABELS } from "@/lib/types";
import type { CollectionLog, SlimeType } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
          className={`w-1.5 h-1.5 rounded-full ${
            i <= value ? "bg-slime-accent" : "bg-slime-border"
          }`}
        />
      ))}
    </span>
  );
}

// ─── Slime Card — now tappable ────────────────────────────────────────────────

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

  // Resolved price: prefer purchase_price (migration 000004), fall back to cost_paid
  const displayPrice =
    (log as any).purchase_price != null
      ? (log as any).purchase_price
      : log.cost_paid;

  return (
    // ↓ Wrap entire card in a Link — tapping anywhere navigates to detail page
    <Link href={`/slimes/${log.id}`} className="block group">
      <div className="bg-slime-card rounded-2xl border border-slime-border p-4 flex flex-col gap-3 shadow-slime-sm group-hover:shadow-slime group-active:scale-[0.98] transition-all duration-200">
        {/* Top row */}
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

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5">
          {typeLabel && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
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
              🌸 {log.scent}
            </span>
          )}
          {displayPrice != null && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slime-surface border border-slime-border text-slime-muted">
              ${Number(displayPrice).toFixed(2)}
            </span>
          )}
        </div>

        {/* Ratings */}
        {hasRatings && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 border-t border-slime-border">
            {log.rating_overall !== null && (
              <div className="flex items-center justify-between col-span-2">
                <span className="text-xs text-slime-muted font-medium">
                  Overall
                </span>
                <div className="flex items-center gap-1.5">
                  <RatingDots value={log.rating_overall} />
                  <span className="text-xs font-bold text-slime-text">
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

        {/* Notes */}
        {log.notes && (
          <p className="text-xs text-slime-muted line-clamp-2 italic border-t border-slime-border pt-2">
            "{log.notes}"
          </p>
        )}

        {/* Footer */}
        <p className="text-xs text-slime-muted/60 mt-auto">
          {formatDate(log.created_at)}
        </p>
      </div>
    </Link>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
      <span className="text-5xl">🫙</span>
      <div>
        <p className="font-bold text-slime-text">Your collection is empty</p>
        <p className="text-sm text-slime-muted mt-1">
          Log your first slime to get started!
        </p>
      </div>
      <Link
        href="/log"
        className="mt-2 px-6 py-2.5 rounded-xl bg-slime-accent text-white text-sm font-bold hover:bg-slime-accent-hover transition"
      >
        Log a slime ✦
      </Link>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CollectionPage() {
  const [logs, setLogs] = useState<CollectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "collection" | "wishlist">(
    "all",
  );

  useEffect(() => {
    getUserCollectionLogs()
      .then((data) => {
        setLogs((data ?? []) as unknown as CollectionLog[]);
        setLoading(false);
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
    <div className="min-h-screen bg-slime-bg px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slime-text tracking-tight">
              My Slimes <span className="text-slime-accent">✦</span>
            </h1>
            {!loading && (
              <p className="text-sm text-slime-muted mt-0.5">
                {collectionCount} in collection · {wishlistCount} on wishlist
              </p>
            )}
          </div>
          <Link
            href="/log"
            className="px-4 py-2 rounded-xl bg-slime-accent text-white text-xs font-bold hover:bg-slime-accent-hover transition"
          >
            + Log
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "collection", "wishlist"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                filter === f
                  ? "bg-slime-accent text-white"
                  : "bg-slime-surface border border-slime-border text-slime-muted hover:border-slime-accent/50"
              }`}
            >
              {f === "all"
                ? `All (${logs.length})`
                : f === "collection"
                  ? `Collection (${collectionCount})`
                  : `Wishlist (${wishlistCount})`}
            </button>
          ))}
        </div>

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

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && <EmptyState />}

        {/* Grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col gap-4">
            {filtered.map((log) => (
              <SlimeCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
