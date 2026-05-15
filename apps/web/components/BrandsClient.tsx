"use client";
// apps/web/components/BrandsClient.tsx
// [Change 4 — Brands Redesign D2] Full 4-section UI

import { useState, useMemo } from "react";
import { BrandCard } from "@/components/BrandCard";
import FeaturedBrandCard from "@/components/FeaturedBrandCard";
import PopularBrandsCarousel from "@/components/PopularBrandsCarousel";
import Link from "next/link";
import type { Brand } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BrandsClientProps {
  featuredBrand: Brand | null;
  popularBrands: Brand[];
  verifiedBrands: Brand[];
  communityBrands: Brand[];
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
        &times;
      </button>
    </span>
  );
}

// ─── Sort Pill ────────────────────────────────────────────────────────────────

function SortPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
      style={
        active
          ? {
              background: "rgba(57,255,20,0.15)",
              border: "1px solid rgba(57,255,20,0.4)",
              color: "#39FF14",
            }
          : {
              background: "rgba(45,10,78,0.2)",
              border: "1px solid rgba(45,10,78,0.6)",
              color: "rgba(255,255,255,0.5)",
            }
      }
    >
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BrandsClient({
  featuredBrand,
  popularBrands,
  verifiedBrands,
  communityBrands,
}: BrandsClientProps) {
  // Community filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterHasRestock, setFilterHasRestock] = useState(false);
  const [filterMostLogs, setFilterMostLogs] = useState(false);
  const [filterTopRated, setFilterTopRated] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const [pendingVerified, setPendingVerified] = useState(false);
  const [pendingHasRestock, setPendingHasRestock] = useState(false);
  const [pendingMostLogs, setPendingMostLogs] = useState(false);
  const [pendingTopRated, setPendingTopRated] = useState(false);

  // Verified brands sort state
  const [verifiedSort, setVerifiedSort] = useState<
    "rating" | "logs" | "followers"
  >("rating");

  const activeFilterCount = [
    filterVerified,
    filterHasRestock,
    filterMostLogs,
    filterTopRated,
  ].filter(Boolean).length;

  function openSheet() {
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

  // Sorted verified brands
  const sortedVerified = useMemo(() => {
    const list = [...verifiedBrands];
    if (verifiedSort === "rating") {
      list.sort(
        (a, b) => (b.avg_slime_rating ?? 0) - (a.avg_slime_rating ?? 0),
      );
    } else if (verifiedSort === "logs") {
      list.sort((a, b) => (b.total_logs ?? 0) - (a.total_logs ?? 0));
    } else {
      list.sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0));
    }
    return list;
  }, [verifiedBrands, verifiedSort]);

  // Filtered community brands
  const filtered = useMemo(() => {
    let list = [...communityBrands];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }

    if (filterVerified)
      list = list.filter((b) => b.verification_tier === "verified");
    if (filterHasRestock) list = list.filter((b) => b.restock_schedule != null);

    if (filterMostLogs)
      list.sort((a, b) => (b.total_logs ?? 0) - (a.total_logs ?? 0));
    if (filterTopRated && !filterMostLogs)
      list.sort(
        (a, b) => (b.avg_slime_rating ?? 0) - (a.avg_slime_rating ?? 0),
      );

    return list;
  }, [
    communityBrands,
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
      {/* ── Section 1: Featured Brand ── */}
      {featuredBrand && (
        <div className="max-w-[390px] mx-auto px-4 pb-5">
          <FeaturedBrandCard brand={featuredBrand} />
        </div>
      )}

      {/* ── Section 2: Popular Shops ── */}
      {popularBrands.length > 0 && (
        <div className="max-w-[390px] mx-auto px-4 pb-6">
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-3"
            style={{ color: "#00F0FF" }}
          >
            Popular Shops
          </p>
          <PopularBrandsCarousel brands={popularBrands} />
        </div>
      )}

      {/* ── Section 3: Verified Brands ── */}
      {verifiedBrands.length > 0 && (
        <div className="max-w-[390px] mx-auto px-4 pb-6">
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-3"
            style={{ color: "#00F0FF" }}
          >
            Verified Brands
          </p>

          {/* Sort control */}
          <div className="flex items-center gap-2 mb-3">
            <SortPill
              label="Top Rated"
              active={verifiedSort === "rating"}
              onClick={() => setVerifiedSort("rating")}
            />
            <SortPill
              label="Most Logs"
              active={verifiedSort === "logs"}
              onClick={() => setVerifiedSort("logs")}
            />
            <SortPill
              label="Followers"
              active={verifiedSort === "followers"}
              onClick={() => setVerifiedSort("followers")}
            />
          </div>

          {/* 2-col grid */}
          <div className="grid grid-cols-2 gap-3">
            {sortedVerified.map((brand) => {
              const initials = brand.name.slice(0, 2).toUpperCase();
              return (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.slug}`}
                  className="block rounded-2xl p-3 active:scale-[0.98] transition-all"
                  style={{
                    background: "rgba(45,10,78,0.25)",
                    border: "1px solid rgba(45,10,78,0.7)",
                  }}
                >
                  {/* Logo */}
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-2"
                    style={{
                      background: "rgba(45,10,78,0.5)",
                      border: "1px solid rgba(45,10,78,0.7)",
                    }}
                  >
                    {brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={brand.logo_url}
                        alt={brand.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-black text-slime-accent select-none">
                        {initials}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <p className="text-xs font-bold text-center text-slime-text truncate">
                    {brand.name}
                  </p>

                  {/* Rating */}
                  <div className="flex justify-center mt-1">
                    {brand.avg_slime_rating != null ? (
                      <span
                        className="flex items-center gap-1 text-xs font-semibold"
                        style={{ color: "#39FF14" }}
                      >
                        <svg
                          viewBox="0 0 12 12"
                          className="w-2.5 h-2.5 fill-current"
                        >
                          <polygon points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5" />
                        </svg>
                        {brand.avg_slime_rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xs text-slime-muted">
                        No ratings
                      </span>
                    )}
                  </div>

                  {/* Followers */}
                  <div className="flex justify-center items-center gap-0.5 mt-1">
                    <svg
                      viewBox="0 0 12 12"
                      className="w-2.5 h-2.5 fill-current"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-4 5c0-2.2 1.8-4 4-4s4 1.8 4 4H2z" />
                    </svg>
                    <span className="text-[11px] text-slime-muted">
                      {(brand.follower_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 4: Community Brands ── */}
      <div className="max-w-[390px] mx-auto px-4 pb-2">
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-3"
          style={{ color: "#00F0FF" }}
        >
          Community Brands
        </p>
      </div>

      {/* Search + Filter bar */}
      <div className="max-w-[390px] mx-auto px-4 pb-3">
        <div className="flex gap-2">
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
            className="flex items-center gap-1.5 text-xs font-semibold text-slime-accent bg-slime-surface border border-slime-border px-3 py-1.5 rounded-full hover:border-slime-accent/50 transition-colors shrink-0"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-slime-accent">
              <path d="M1 3h14v1.5L9.5 9v5l-3-1.5V9L1 4.5V3z" />
            </svg>
            {activeFilterCount > 0 ? (
              <span className="flex items-center gap-1">
                Filter
                <span
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-black text-slime-bg"
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

      {/* Active filter pills */}
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

      {/* Community brand list */}
      <div className="max-w-[390px] mx-auto px-4 pt-1 pb-28 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="rgba(45,10,78,0.8)"
                strokeWidth="1.5"
              />
              <circle cx="9" cy="9" r="1.5" fill="rgba(45,10,78,0.8)" />
            </svg>
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

      {/* Filter bottom sheet */}
      {showFilterSheet && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setShowFilterSheet(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-24 inset-x-4 z-50 rounded-2xl px-5 pt-5 pb-6"
            style={{
              background: "#0A0A0A",
              border: "1px solid rgba(45,10,78,0.8)",
              boxShadow: "0 -8px 32px rgba(45,10,78,0.4)",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
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
              sublabel="Sort by highest rating"
              checked={pendingTopRated}
              onChange={setPendingTopRated}
            />
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
