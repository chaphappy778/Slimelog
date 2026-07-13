"use client";

// apps/web/components/discover/DiscoverSlimesClient.tsx
// [Change 2] — Subtype join support, drill-down filter row, type="button" sweep
// [T72] — trendingTags prop + keyword pill row above Slime Type filter
// [T74-A polish] — Condensed filter bar: single row with sort + filter dropdown
// [T32f 2026-07-13] — Optional `sortAxis` prop. When set (from
//   /discover?sort=<axis>), the client sorts + reads the rating bar off
//   that axis's column instead of avg_overall, and a "Sorted by <axis>"
//   chip appears above the filter bar with a Clear link that drops the
//   URL param.

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

// ─── Axis sort types ──────────────────────────────────────────────────
// Public slugs match the /how-to-rate section ids. When any of these is
// active, sort and the rating-bar value use the mapped avg column.
export type SortAxis =
  | "texture"
  | "sound"
  | "aesthetic"
  | "creativity"
  | "quality";

const AXIS_COLUMN: Record<
  SortAxis,
  "avg_texture" | "avg_sound" | "avg_drizzle" | "avg_creativity" | "avg_sensory_fit"
> = {
  texture: "avg_texture",
  sound: "avg_sound",
  aesthetic: "avg_drizzle",
  creativity: "avg_creativity",
  quality: "avg_sensory_fit",
};

const AXIS_LABEL: Record<SortAxis, string> = {
  texture: "Texture",
  sound: "Sound",
  aesthetic: "Aesthetic",
  creativity: "Creativity",
  quality: "Quality",
};

export type TopRatedSlime = {
  id: string;
  name: string | null;
  base_type: string | null;
  subtype_id: string | null;
  image_url: string | null;
  avg_overall: number | null;
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  total_ratings: number | null;
  brand_id: string | null;
  brands: { name: string; slug: string } | null;
  subtypes: { name: string } | null;
};

// [Discover V1 gap-fill 2026-07-13] Retired the RatingBar (gradient
// progress meter) in favor of a big Montserrat score on the right of
// the card \u2014 matches Design's dense leaderboard treatment. The
// component itself is inlined below in `TopRatedCard`.

// [Discover V1 — 2026-07-13] Medal tiles for top 3. Rank 1 gets the
// signature green→cyan gradient (matches the primary CTA), rank 2 a
// silver gradient, rank 3 a bronze gradient. Rank 4+ stays as a
// muted tile. Design's proposal was to reward the top of the list
// without making the whole row a hero card (leaderboards should
// stay dense).
const MEDAL_STYLES: Record<number, React.CSSProperties> = {
  1: {
    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
    color: "#04110A",
    boxShadow: "0 0 14px rgba(57,255,20,0.55)",
    border: "1px solid transparent",
  },
  2: {
    background: "linear-gradient(135deg, #E6E6E6, #9CA3AF)",
    color: "#0F0018",
    boxShadow: "0 0 10px rgba(230,230,230,0.30)",
    border: "1px solid rgba(230,230,230,0.5)",
  },
  3: {
    background: "linear-gradient(135deg, #FFAE3B, #B4571B)",
    color: "#2A1500",
    boxShadow: "0 0 10px rgba(255,174,59,0.35)",
    border: "1px solid rgba(255,174,59,0.5)",
  },
};

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL_STYLES[rank];
  if (medal) {
    return (
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base font-black"
        style={{
          fontFamily: "Montserrat, sans-serif",
          ...medal,
        }}
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </div>
    );
  }
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
      style={{
        background: "rgba(45,10,78,0.35)",
        color: "rgba(245,245,245,0.55)",
        border: "1px solid rgba(45,10,78,0.7)",
        fontFamily: "Montserrat, sans-serif",
      }}
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}

function TopRatedCard({
  slime,
  rank,
  ratingValue,
}: {
  slime: TopRatedSlime;
  rank: number;
  /**
   * The number shown in the RatingBar and readout. Defaults to
   * avg_overall; overridden with an axis-specific column when the page
   * is deep-linked from /how-to-rate?sort=<axis>.
   */
  ratingValue: number | null;
}) {
  const brandSlug = slime.brands?.slug ?? null;
  // Big-score treatment tints from green (great) \u2192 cyan (solid) \u2192 white
  // (unrated). Matches the how-to-rate scale color language at the top
  // of the ladder without going full rainbow.
  const scoreColor =
    ratingValue == null
      ? "rgba(245,245,245,0.4)"
      : ratingValue >= 4.5
        ? "#7BFF7B"
        : ratingValue >= 3.5
          ? "#00F0FF"
          : "rgba(245,245,245,0.75)";

  const cardContent = (
    <article
      className="rounded-2xl px-3.5 py-3 flex items-center gap-3 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98]"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
      }}
    >
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <p
          className="truncate leading-tight"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 14,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
          }}
        >
          {slime.name ?? "Unnamed slime"}
        </p>
        <p
          className="text-[11.5px] truncate mt-0.5"
          style={{ color: "#FF7BEB", fontWeight: 600 }}
        >
          {slime.brands?.name ?? "Unknown brand"}
        </p>
        {slime.base_type && (
          <p
            className="text-[10px] font-semibold mt-0.5 truncate"
            style={{ color: "rgba(0,240,255,0.75)" }}
          >
            {SLIME_BASE_TYPE_LABELS[slime.base_type as SlimeBaseType] ??
              slime.base_type}
            {slime.subtypes?.name ? ` \u00b7 ${slime.subtypes.name}` : null}
          </p>
        )}
      </div>
      <div className="text-right shrink-0" style={{ minWidth: 48 }}>
        <div
          className="tabular-nums leading-none"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: "-0.02em",
            color: scoreColor,
          }}
        >
          {ratingValue != null ? ratingValue.toFixed(1) : "\u2014"}
        </div>
        <div
          className="text-[9.5px] mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            letterSpacing: "0.02em",
          }}
        >
          {slime.total_ratings ?? 0} ratings
        </div>
      </div>
    </article>
  );

  if (brandSlug) {
    return (
      <Link
        href={`/brands/${brandSlug}`}
        className="block"
        aria-label={`View brand: ${slime.brands?.name ?? "Unknown brand"}`}
      >
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}

// [Discover polish 2026-07-13] Unified sort key. Retired the old
// `sortMode` (Top Rated / Most Reviewed) + separate `axisState` combo —
// they were scattered across three UI spots (segmented toggle, chip,
// filter dropdown) and users had to guess which one to touch. Now:
// one horizontal pill row with all sort options, mutually exclusive.
export type SortKey =
  | "overall"
  | "texture"
  | "sound"
  | "aesthetic"
  | "creativity"
  | "quality"
  | "most_reviewed";

// Display palette per sort key. Axis colors match how-to-rate exactly;
// Overall stays cyan (the default), Most Reviewed is white-ish so it
// reads as its own category, not another axis.
const SORT_COLOR: Record<SortKey, string> = {
  overall: "#00F0FF",
  texture: "#39FF14",
  sound: "#00F0FF",
  aesthetic: "#FF00E5",
  creativity: "#FFD24A",
  quality: "#8B5CF6",
  most_reviewed: "#FFFFFF",
};

const SORT_LABEL: Record<SortKey, string> = {
  overall: "Overall",
  texture: "Texture",
  sound: "Sound",
  aesthetic: "Aesthetic",
  creativity: "Creativity",
  quality: "Quality",
  most_reviewed: "Most Reviewed",
};

const SORT_KEYS: SortKey[] = [
  "overall",
  "texture",
  "sound",
  "aesthetic",
  "creativity",
  "quality",
  "most_reviewed",
];

const MIN_RATING_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Any rating", value: null },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

// Show this many rows by default; user can expand to see up to 20.
const DEFAULT_VISIBLE = 5;

// ─── Compact filter bar ───────────────────────────────────────────────────────

function FilterBar({
  sortKey,
  onSortChange,
  minRating,
  onMinRatingChange,
  activeType,
  onTypeChange,
  availableTypes,
}: {
  sortKey: SortKey;
  onSortChange: (v: SortKey) => void;
  minRating: number | null;
  onMinRatingChange: (v: number | null) => void;
  activeType: string;
  onTypeChange: (v: string) => void;
  availableTypes: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const hasActiveFilters = minRating !== null || activeType !== "all";

  return (
    <div className="mb-4 relative" ref={ref}>
      {/* [Discover polish 2026-07-13] Unified sort pill row. All seven
          options (6 axes + Most Reviewed) live in one horizontal
          scroll strip so users see every choice at once instead of
          hunting through a dropdown. Active pill glows in the axis's
          signature color. */}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-none mb-3"
        style={
          {
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        {SORT_KEYS.map((key) => {
          const active = sortKey === key;
          const tint = SORT_COLOR[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSortChange(key)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: active
                  ? `${tint}22`
                  : "rgba(45,10,78,0.3)",
                border: active
                  ? `1px solid ${tint}88`
                  : "1px solid rgba(45,10,78,0.55)",
                color: active ? tint : "rgba(245,245,245,0.5)",
                boxShadow: active ? `0 0 10px ${tint}55` : "none",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {SORT_LABEL[key]}
            </button>
          );
        })}
      </div>

      {/* Filter pill — opens dropdown */}
      <div className="flex items-center gap-2 relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors"
        style={{
          background: hasActiveFilters
            ? "rgba(0,240,255,0.12)"
            : "rgba(45,10,78,0.3)",
          border: hasActiveFilters
            ? "1px solid rgba(0,240,255,0.35)"
            : "1px solid rgba(45,10,78,0.5)",
          color: hasActiveFilters ? "#00F0FF" : "rgba(245,245,245,0.4)",
        }}
        aria-expanded={open}
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
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="11" y1="18" x2="13" y2="18" />
        </svg>
        Filter
        {hasActiveFilters && (
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "#00F0FF" }}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full left-0 mt-2 z-50 rounded-2xl p-4 flex flex-col gap-4"
          style={{
            background: "#0F0018",
            border: "1px solid rgba(45,10,78,0.8)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            minWidth: 220,
          }}
        >
          {/* Axis picker moved to top-level pill row above the filter
              bar (2026-07-13). This dropdown is now filters-only. */}

          {/* Min rating */}
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "rgba(245,245,245,0.35)" }}
            >
              Min Rating
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MIN_RATING_OPTIONS.map((opt) => {
                const active = minRating === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => onMinRatingChange(opt.value)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                    style={{
                      background: active
                        ? "rgba(0,240,255,0.15)"
                        : "rgba(45,10,78,0.4)",
                      color: active ? "#00F0FF" : "rgba(245,245,245,0.45)",
                      border: active
                        ? "1px solid rgba(0,240,255,0.4)"
                        : "1px solid rgba(45,10,78,0.5)",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Type filter */}
          {availableTypes.length > 0 && (
            <div>
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: "rgba(245,245,245,0.35)" }}
              >
                Slime Type
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onTypeChange("all")}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background:
                      activeType === "all"
                        ? "rgba(0,240,255,0.15)"
                        : "rgba(45,10,78,0.4)",
                    color:
                      activeType === "all"
                        ? "#00F0FF"
                        : "rgba(245,245,245,0.45)",
                    border:
                      activeType === "all"
                        ? "1px solid rgba(0,240,255,0.4)"
                        : "1px solid rgba(45,10,78,0.5)",
                  }}
                >
                  All
                </button>
                {availableTypes.map((type) => {
                  const active = activeType === type;
                  const label =
                    SLIME_BASE_TYPE_LABELS[type as SlimeBaseType] ??
                    type.replace(/_/g, " ");
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onTypeChange(type)}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold transition-colors"
                      style={{
                        background: active
                          ? "rgba(0,240,255,0.15)"
                          : "rgba(45,10,78,0.4)",
                        color: active ? "#00F0FF" : "rgba(245,245,245,0.45)",
                        border: active
                          ? "1px solid rgba(0,240,255,0.4)"
                          : "1px solid rgba(45,10,78,0.5)",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clear */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                onMinRatingChange(null);
                onTypeChange("all");
                setOpen(false);
              }}
              className="text-xs font-semibold text-center py-1.5 rounded-lg transition-colors"
              style={{
                color: "#CC44FF",
                background: "rgba(204,68,255,0.08)",
                border: "1px solid rgba(204,68,255,0.2)",
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

export default function DiscoverSlimesClient({
  initialSlimes,
  trendingTags = [],
  sortAxis = null,
}: {
  initialSlimes: TopRatedSlime[];
  trendingTags?: { id: string; name: string }[];
  /**
   * Initial axis (from ?sort=<axis>). The client can override this
   * via the filter dropdown — see `axisState` below. When the user
   * changes the axis via the filter, we DO NOT rewrite the URL for
   * now; the URL still reflects the deep-link they arrived on.
   */
  sortAxis?: SortAxis | null;
}) {
  const [activeType, setActiveType] = useState<string>("all");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [activeSubtype, setActiveSubtype] = useState<string | null>(null);
  // [Discover polish 2026-07-13] Unified sort key. Initializes from
  // the deep-link `sortAxis` prop when it's an axis; otherwise
  // defaults to "overall". "most_reviewed" is only reachable via the
  // pill row (no URL shortcut yet).
  const [sortKey, setSortKey] = useState<SortKey>(sortAxis ?? "overall");
  // Expand/collapse for the top-rated rows — see DEFAULT_VISIBLE
  // constant. Users see the top 5 initially and can expand to see
  // the rest inline.
  const [showAll, setShowAll] = useState(false);

  // Column the min-rating filter + rating bar look at. Derived from
  // the unified sort key. Most Reviewed doesn't change the display
  // column (still avg_overall) — it only reorders.
  const ratingColumn: keyof TopRatedSlime =
    sortKey === "most_reviewed" || sortKey === "overall"
      ? "avg_overall"
      : AXIS_COLUMN[sortKey as SortAxis];
  const readRating = (s: TopRatedSlime): number | null => {
    const v = s[ratingColumn];
    return typeof v === "number" ? v : null;
  };

  const availableTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const s of initialSlimes) {
      if (s.base_type) seen.add(s.base_type);
    }
    return Array.from(seen).sort();
  }, [initialSlimes]);

  const availableSubtypes = useMemo(() => {
    if (activeType === "all") return [];
    const seen = new Map<string, string>();
    for (const s of initialSlimes) {
      if (s.base_type === activeType && s.subtype_id && s.subtypes?.name) {
        seen.set(s.subtype_id, s.subtypes.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [initialSlimes, activeType]);

  const filtered = useMemo(() => {
    let result = [...initialSlimes];

    if (activeType !== "all") {
      result = result.filter((s) => s.base_type === activeType);
    }

    if (activeSubtype !== null) {
      result = result.filter((s) => s.subtype_id === activeSubtype);
    }

    if (minRating !== null) {
      result = result.filter((s) => {
        const v = readRating(s);
        return v !== null && v >= minRating;
      });
    }

    if (sortKey === "most_reviewed") {
      result.sort((a, b) => (b.total_ratings ?? 0) - (a.total_ratings ?? 0));
    } else {
      result.sort((a, b) => (readRating(b) ?? 0) - (readRating(a) ?? 0));
    }

    return result;
    // readRating captures ratingColumn — safe to depend on ratingColumn only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialSlimes,
    activeType,
    activeSubtype,
    minRating,
    sortKey,
    ratingColumn,
  ]);

  return (
    <>
      {/* [Discover polish 2026-07-13] Sort + filter. Sort is a single
          pill row across the top; filter opens a dropdown for
          Min Rating + Slime Type. The old "Sorted by X" chip is gone
          — the active pill IS the state. */}
      <FilterBar
        sortKey={sortKey}
        onSortChange={(k) => {
          setSortKey(k);
          setShowAll(false); // collapse to top-5 when the sort changes
        }}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        activeType={activeType}
        onTypeChange={(t) => {
          setActiveType(t);
          setActiveSubtype(null);
        }}
        availableTypes={availableTypes}
      />

      {/* Subtype drill-down — only when a type is selected and subtypes exist */}
      {availableSubtypes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none mb-4">
          <button
            type="button"
            onClick={() => setActiveSubtype(null)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background:
                activeSubtype === null
                  ? "rgba(57,255,20,0.12)"
                  : "rgba(45,10,78,0.3)",
              color:
                activeSubtype === null ? "#39FF14" : "rgba(245,245,245,0.4)",
              border:
                activeSubtype === null
                  ? "1px solid rgba(57,255,20,0.35)"
                  : "1px solid rgba(45,10,78,0.5)",
            }}
          >
            All
          </button>
          {availableSubtypes.map(({ id, name }) => {
            const active = activeSubtype === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSubtype(active ? null : id)}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: active
                    ? "rgba(57,255,20,0.12)"
                    : "rgba(45,10,78,0.3)",
                  color: active ? "#39FF14" : "rgba(245,245,245,0.4)",
                  border: active
                    ? "1px solid rgba(57,255,20,0.35)"
                    : "1px solid rgba(45,10,78,0.5)",
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {/* Results — top DEFAULT_VISIBLE (5) rows visible, "Show more"
          button below expands the remaining rows inline. Prevents
          the section from taking over Discover once we have real
          rating volume. */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slime-muted text-sm">
          No slimes match these filters.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {(showAll
              ? filtered
              : filtered.slice(0, DEFAULT_VISIBLE)
            ).map((slime, i) => (
              <TopRatedCard
                key={slime.id}
                slime={slime}
                rank={i + 1}
                ratingValue={readRating(slime)}
              />
            ))}
          </div>

          {filtered.length > DEFAULT_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 w-full py-2.5 rounded-full text-xs font-bold uppercase transition-colors flex items-center justify-center gap-2"
              style={{
                background: "rgba(0,240,255,0.08)",
                border: "1px solid rgba(0,240,255,0.32)",
                color: "#00F0FF",
                letterSpacing: "0.14em",
                fontFamily: "Montserrat, sans-serif",
              }}
              aria-expanded={showAll}
            >
              {showAll ? (
                <>
                  Show top {DEFAULT_VISIBLE}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 15l6-6 6 6" />
                  </svg>
                </>
              ) : (
                <>
                  Show all {filtered.length}
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </>
              )}
            </button>
          )}
        </>
      )}
    </>
  );
}
