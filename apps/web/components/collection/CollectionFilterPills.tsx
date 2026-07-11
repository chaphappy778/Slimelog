// apps/web/components/collection/CollectionFilterPills.tsx
//
// Collection rework batch A (2026-07-11). Feed-style filter pills for
// /collection. Replaces the old rounded-lg buttons with the same pill
// language used by the feed's For-you/Following tabs. Includes:
//   - three primary filter pills: All / Owned / Wishlist, each with a
//     count. Wishlist glows magenta when active (per design spec) so
//     the "own vs want" distinction reads instantly.
//   - a sort pill on the right that cycles Recent -> Score -> Added
//     -> back to Recent. Feed-style pill on the same row per the
//     eval's sort-nowhere-to-go note.

"use client";

export type FilterKey = "all" | "collection" | "wishlist";
export type SortKey = "recent" | "score" | "added";

const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recent",
  score: "Score",
  added: "Add date",
};

const SORT_ORDER: SortKey[] = ["recent", "score", "added"];

function pillStyle(active: boolean, variant: "cyan" | "magenta") {
  if (!active) {
    return {
      background: "rgba(45,10,78,0.35)",
      border: "1px solid rgba(45,10,78,0.7)",
      color: "rgba(255,255,255,0.6)",
    };
  }
  if (variant === "magenta") {
    return {
      background: "rgba(204,68,255,0.14)",
      border: "1px solid rgba(204,68,255,0.5)",
      color: "#FF7BFF",
      boxShadow: "0 0 12px rgba(204,68,255,0.35)",
    };
  }
  return {
    background: "rgba(0,240,255,0.14)",
    border: "1px solid rgba(0,240,255,0.5)",
    color: "#00F0FF",
    boxShadow: "0 0 12px rgba(0,240,255,0.35)",
  };
}

export default function CollectionFilterPills({
  filter,
  setFilter,
  sort,
  setSort,
  counts,
}: {
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  counts: { all: number; collection: number; wishlist: number };
}) {
  const cycleSort = () => {
    const idx = SORT_ORDER.indexOf(sort);
    setSort(SORT_ORDER[(idx + 1) % SORT_ORDER.length]);
  };

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <button
        type="button"
        onClick={() => setFilter("all")}
        className="text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all"
        style={pillStyle(filter === "all", "cyan")}
      >
        All {counts.all}
      </button>
      <button
        type="button"
        onClick={() => setFilter("collection")}
        className="text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all"
        style={pillStyle(filter === "collection", "cyan")}
      >
        Owned {counts.collection}
      </button>
      <button
        type="button"
        onClick={() => setFilter("wishlist")}
        className="text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all"
        style={pillStyle(filter === "wishlist", "magenta")}
      >
        ♡ Wishlist {counts.wishlist}
      </button>

      <button
        type="button"
        onClick={cycleSort}
        aria-label={`Sort: ${SORT_LABELS[sort]}, tap to cycle`}
        className="ml-auto text-[12px] font-bold px-3.5 py-1.5 rounded-full transition-all"
        style={{
          background: "rgba(45,10,78,0.35)",
          border: "1px solid rgba(45,10,78,0.7)",
          color: "rgba(255,255,255,0.55)",
        }}
      >
        ↕ {SORT_LABELS[sort]}
      </button>
    </div>
  );
}
