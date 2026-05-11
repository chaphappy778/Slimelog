"use client";

// components/discover/DiscoverSlimesClient.tsx
// [Change 2] — Subtype join support, drill-down filter row, type="button" sweep

import { useState, useMemo } from "react";
import Link from "next/link";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

// [Change 2a] — TopRatedSlime type updated with subtype_id and subtypes fields
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

function RatingBar({ avg }: { avg: number | null }) {
  const pct = avg ? ((avg - 1) / 4) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slime-border overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #39FF14, #00F0FF)",
          }}
        />
      </div>
      <span className="text-xs font-semibold text-slime-accent tabular-nums w-7 text-right">
        {avg ? avg.toFixed(1) : "—"}
      </span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
        }}
        aria-label="Rank 1"
      >
        1
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
        style={{ background: "rgba(192,192,192,0.2)", color: "#C0C0C0" }}
        aria-label="Rank 2"
      >
        2
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
        style={{ background: "rgba(205,127,50,0.2)", color: "#CD7F32" }}
        aria-label="Rank 3"
      >
        3
      </div>
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black bg-slime-surface text-slime-muted"
      aria-label={`Rank ${rank}`}
    >
      {rank}
    </div>
  );
}

// [Change 2b] — TopRatedCard updated with subtype badge row
function TopRatedCard({ slime, rank }: { slime: TopRatedSlime; rank: number }) {
  const brandSlug = slime.brands?.slug ?? null;
  const cardContent = (
    <article
      className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98]"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
      }}
    >
      <RankBadge rank={rank} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slime-text truncate leading-tight">
          {slime.name ?? "Unnamed slime"}
        </p>
        <p className="text-xs text-slime-magenta truncate">
          {slime.brands?.name ?? "Unknown brand"}
        </p>
        {/* Subtype badge — middle-dot suffix on base type label */}
        {slime.base_type && (
          <p
            className="text-[10px] font-semibold mt-0.5"
            style={{ color: "rgba(0,240,255,0.7)" }}
          >
            {SLIME_BASE_TYPE_LABELS[slime.base_type as SlimeBaseType] ??
              slime.base_type}
            {slime.subtypes?.name ? ` \u00b7 ${slime.subtypes.name}` : null}
          </p>
        )}
        <RatingBar avg={slime.avg_overall} />
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-slime-muted">{slime.total_ratings ?? 0}</p>
        <p className="text-[10px] text-slime-muted/60">ratings</p>
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

const MIN_RATING_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Any", value: null },
  { label: "3+", value: 3 },
  { label: "4+", value: 4 },
  { label: "4.5+", value: 4.5 },
];

type SortMode = "top_rated" | "most_reviewed";

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: "Top Rated", value: "top_rated" },
  { label: "Most Reviewed", value: "most_reviewed" },
];

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(45,10,78,0.5)" }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: active
                ? "rgba(0,240,255,0.15)"
                : "rgba(45,10,78,0.3)",
              color: active ? "#00F0FF" : "rgba(245,245,245,0.4)",
              borderRight: "1px solid rgba(45,10,78,0.5)",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// label style matching existing section-label class
const sectionLabelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(245,245,245,0.35)",
  marginBottom: "6px",
};

export default function DiscoverSlimesClient({
  initialSlimes,
}: {
  initialSlimes: TopRatedSlime[];
}) {
  const [activeType, setActiveType] = useState<string>("all");
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("top_rated");

  // [Change 2c] — Subtype drill-down state
  const [activeSubtype, setActiveSubtype] = useState<string | null>(null);

  // Unique base types present in data
  const availableTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const s of initialSlimes) {
      if (s.base_type) seen.add(s.base_type);
    }
    return Array.from(seen).sort();
  }, [initialSlimes]);

  // [Change 2c] — Subtypes available for the currently selected base type
  const availableSubtypes = useMemo(() => {
    if (activeType === "all") return [];
    const seen = new Map<string, string>(); // subtype_id → name
    for (const s of initialSlimes) {
      if (s.base_type === activeType && s.subtype_id && s.subtypes?.name) {
        seen.set(s.subtype_id, s.subtypes.name);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [initialSlimes, activeType]);

  // [Change 2d] — filtered useMemo now includes activeSubtype
  const filtered = useMemo(() => {
    let result = [...initialSlimes];

    if (activeType !== "all") {
      result = result.filter((s) => s.base_type === activeType);
    }

    if (activeSubtype !== null) {
      result = result.filter((s) => s.subtype_id === activeSubtype);
    }

    if (minRating !== null) {
      result = result.filter(
        (s) => s.avg_overall !== null && s.avg_overall >= minRating,
      );
    }

    if (sortMode === "top_rated") {
      result.sort((a, b) => (b.avg_overall ?? 0) - (a.avg_overall ?? 0));
    } else {
      result.sort((a, b) => (b.total_ratings ?? 0) - (a.total_ratings ?? 0));
    }

    return result;
  }, [initialSlimes, activeType, activeSubtype, minRating, sortMode]);

  return (
    <>
      {/* Filter A — Slime Type */}
      <div className="mb-4">
        <p style={sectionLabelStyle}>Slime Type</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* All pill — resets subtype on click */}
          <button
            type="button"
            onClick={() => {
              setActiveType("all");
              setActiveSubtype(null);
            }}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={{
              background:
                activeType === "all"
                  ? "rgba(0,240,255,0.15)"
                  : "rgba(45,10,78,0.3)",
              color: activeType === "all" ? "#00F0FF" : "rgba(245,245,245,0.4)",
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
                onClick={() => {
                  setActiveType(type);
                  setActiveSubtype(null);
                }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  background: active
                    ? "rgba(0,240,255,0.15)"
                    : "rgba(45,10,78,0.3)",
                  color: active ? "#00F0FF" : "rgba(245,245,245,0.4)",
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

      {/* [Change 2d] — Subtype drill-down row, only visible when a base type is selected and subtypes exist */}
      {availableSubtypes.length > 0 && (
        <div className="mb-4">
          <p style={sectionLabelStyle}>Subtype</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
        </div>
      )}

      {/* Filter B — Minimum Rating */}
      <div className="mb-4">
        <p style={sectionLabelStyle}>Minimum Rating</p>
        <SegmentedControl
          options={MIN_RATING_OPTIONS.map((o) => ({
            label: o.label,
            value: String(o.value ?? "null") as string,
          }))}
          value={String(minRating ?? "null")}
          onChange={(v) => setMinRating(v === "null" ? null : parseFloat(v))}
        />
      </div>

      {/* Filter C — Sort By */}
      <div className="mb-5">
        <p style={sectionLabelStyle}>Sort By</p>
        <SegmentedControl
          options={SORT_OPTIONS}
          value={sortMode}
          onChange={setSortMode}
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slime-muted text-sm">
          No slimes match these filters.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((slime, i) => (
            <TopRatedCard key={slime.id} slime={slime} rank={i + 1} />
          ))}
        </div>
      )}
    </>
  );
}
