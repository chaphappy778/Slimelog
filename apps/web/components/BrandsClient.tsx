"use client";
// apps/web/components/BrandsClient.tsx

import { useState, useMemo } from "react";
import { BrandCard } from "@/components/BrandCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Brand {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  verification_tier: string | null;
  restock_schedule: string | null;
  total_logs: number;
  avg_shipping: number | null;
  logo_url: string | null;
  owner_name: string | null;
}

interface BrandsClientProps {
  brands: Brand[];
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

function FilterToggle({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-3.5 border-b last:border-0 active:opacity-80 transition-opacity"
      style={{ borderColor: "rgba(45,10,78,0.5)" }}
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-slime-text">{label}</p>
        {sublabel && (
          <p className="text-xs text-slime-muted mt-0.5">{sublabel}</p>
        )}
      </div>
      {/* Custom checkbox */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all duration-150"
        style={
          checked
            ? {
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                boxShadow: "0 0 8px rgba(57,255,20,0.4)",
              }
            : {
                background: "transparent",
                border: "2px solid rgba(45,10,78,0.8)",
              }
        }
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none">
            <path
              d="M2 6l3 3 5-5"
              stroke="#0A0A0A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </button>
  );
}

// ─── Active Filter Pill ───────────────────────────────────────────────────────

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
      style={{
        background: "rgba(57,255,20,0.12)",
        border: "1px solid rgba(57,255,20,0.35)",
        color: "#39FF14",
      }}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:opacity-70 transition-opacity ml-0.5"
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrandsClient({ brands }: BrandsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterHasRestock, setFilterHasRestock] = useState(false);
  const [filterMostLogs, setFilterMostLogs] = useState(false);
  const [filterTopRated, setFilterTopRated] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Pending state inside the sheet (applied on "Apply")
  const [pendingVerified, setPendingVerified] = useState(false);
  const [pendingHasRestock, setPendingHasRestock] = useState(false);
  const [pendingMostLogs, setPendingMostLogs] = useState(false);
  const [pendingTopRated, setPendingTopRated] = useState(false);

  const activeFilterCount = [
    filterVerified,
    filterHasRestock,
    filterMostLogs,
    filterTopRated,
  ].filter(Boolean).length;

  function openSheet() {
    // Sync pending state with current applied state
    setPendingVerified(filterVerified);
    setPendingHasRestock(filterHasRestock);
    setPendingMostLogs(filterMostLogs);
    setPendingTopRated(filterTopRated);
    setShowFilterSheet(true);
  }

  function applyFilters() {
    setFilterVerified(pendingVerified);
    setFilterHasRestock(pendingHasRestock);
    setFilterMostLogs(pendingMostLogs);
    setFilterTopRated(pendingTopRated);
    setShowFilterSheet(false);
  }

  function resetFilters() {
    setPendingVerified(false);
    setPendingHasRestock(false);
    setPendingMostLogs(false);
    setPendingTopRated(false);
    setFilterVerified(false);
    setFilterHasRestock(false);
    setFilterMostLogs(false);
    setFilterTopRated(false);
    setShowFilterSheet(false);
  }

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...brands];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    // Filters
    if (filterVerified)
      list = list.filter((b) => b.verification_tier === "verified");
    if (filterHasRestock) list = list.filter((b) => b.restock_schedule != null);

    // Sort
    if (filterMostLogs)
      list.sort((a, b) => (b.total_logs ?? 0) - (a.total_logs ?? 0));
    if (filterTopRated && !filterMostLogs)
      list.sort((a, b) => (b.avg_shipping ?? 0) - (a.avg_shipping ?? 0));

    return list;
  }, [
    brands,
    searchQuery,
    filterVerified,
    filterHasRestock,
    filterMostLogs,
    filterTopRated,
  ]);

  const anyActivePills =
    filterVerified || filterHasRestock || filterMostLogs || filterTopRated;

  return (
    <>
      {/* ── Search bar ── */}
      <div className="max-w-[390px] mx-auto px-4 pb-3">
        <div className="flex gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <svg
              viewBox="0 0 20 20"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fill-slime-muted pointer-events-none"
            >
              <path d="M12.9 11.5a7 7 0 1 0-1.4 1.4l4.3 4.3 1.4-1.4-4.3-4.3zM8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10z" />
            </svg>
            <input
              type="search"
              placeholder="Search brands…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border rounded-xl placeholder:text-slime-muted text-slime-text focus:outline-none focus:ring-1 focus:ring-slime-accent/40 focus:border-slime-accent/50 transition"
              style={{
                background: "rgba(45,10,78,0.2)",
                borderColor: "rgba(45,10,78,0.6)",
              }}
            />
          </div>

          {/* Filter button */}
          <button
            type="button"
            onClick={openSheet}
            className="flex items-center gap-1.5 text-xs font-semibold shrink-0 px-3 py-2.5 rounded-xl border transition-colors"
            style={{
              background:
                activeFilterCount > 0
                  ? "rgba(57,255,20,0.1)"
                  : "rgba(45,10,78,0.2)",
              borderColor:
                activeFilterCount > 0
                  ? "rgba(57,255,20,0.4)"
                  : "rgba(45,10,78,0.6)",
              color: activeFilterCount > 0 ? "#39FF14" : "#888888",
            }}
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M1 3h14v1.5L9.5 9v5l-3-1.5V9L1 4.5V3z" />
            </svg>
            {activeFilterCount > 0 ? (
              <span>
                Filter{" "}
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black text-slime-bg ml-0.5"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  }}
                >
                  {activeFilterCount}
                </span>
              </span>
            ) : (
              "Filter"
            )}
          </button>
        </div>
      </div>

      {/* ── Active filter pills ── */}
      {anyActivePills && (
        <div className="max-w-[390px] mx-auto px-4 pb-3 flex flex-wrap gap-2">
          {filterVerified && (
            <FilterPill
              label="Verified"
              onRemove={() => setFilterVerified(false)}
            />
          )}
          {filterHasRestock && (
            <FilterPill
              label="Has Restock"
              onRemove={() => setFilterHasRestock(false)}
            />
          )}
          {filterMostLogs && (
            <FilterPill
              label="Most Logs"
              onRemove={() => setFilterMostLogs(false)}
            />
          )}
          {filterTopRated && (
            <FilterPill
              label="Top Rated"
              onRemove={() => setFilterTopRated(false)}
            />
          )}
        </div>
      )}

      {/* ── Brand list ── */}
      <div className="max-w-[390px] mx-auto px-4 pt-1 pb-28 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="text-4xl">🫧</div>
            <p className="text-sm font-semibold text-slime-text">
              No brands found
            </p>
            <p className="text-xs text-slime-muted">
              Try adjusting your search or filters.
            </p>
            {anyActivePills && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-slime-accent font-semibold mt-1 hover:opacity-80 transition-opacity"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          filtered.map((brand) => (
            <BrandCard
              key={brand.id}
              name={brand.name}
              slug={brand.slug}
              location={brand.location}
              verificationTier={brand.verification_tier}
              restockSchedule={brand.restock_schedule}
              totalLogs={brand.total_logs ?? 0}
              avgShipping={brand.avg_shipping}
              logoUrl={brand.logo_url}
              ownerName={brand.owner_name}
            />
          ))
        )}
      </div>

      {/* ── Filter bottom sheet ── */}
      {showFilterSheet && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setShowFilterSheet(false)}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl px-5 pt-5 pb-10"
            style={{
              background: "#0A0A0A",
              borderTop: "1px solid rgba(45,10,78,0.8)",
              boxShadow: "0 -8px 32px rgba(45,10,78,0.4)",
            }}
          >
            {/* Sheet handle */}
            <div className="w-10 h-1 rounded-full bg-slime-border mx-auto mb-5" />

            <h2
              className="text-base font-black mb-4"
              style={{
                fontFamily: "'Montserrat', sans-serif",
                color: "#F5F5F5",
              }}
            >
              Filter Brands
            </h2>

            <FilterToggle
              label="Verified Only"
              sublabel="Show only verified brands"
              checked={pendingVerified}
              onChange={setPendingVerified}
            />
            <FilterToggle
              label="Has Restock Schedule"
              sublabel="Show only brands with restock info"
              checked={pendingHasRestock}
              onChange={setPendingHasRestock}
            />
            <FilterToggle
              label="Most Logs"
              sublabel="Sort by community activity"
              checked={pendingMostLogs}
              onChange={setPendingMostLogs}
            />
            <FilterToggle
              label="Top Rated"
              sublabel="Sort by highest shipping rating"
              checked={pendingTopRated}
              onChange={setPendingTopRated}
            />

            {/* Sheet actions */}
            <div className="flex items-center justify-between mt-6 gap-3">
              <button
                type="button"
                onClick={resetFilters}
                className="text-sm text-slime-muted font-semibold hover:text-slime-text transition-colors px-2"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slime-bg shadow-glow-green active:scale-[0.98] transition-all"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
