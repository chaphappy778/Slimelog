// apps/web/components/BrandsClient.tsx
// [T33b 2026-07-13] Redesigned per Design's /brands mockup. Big
// Discover-style hero header + Featured shop hero card + horizontal
// Popular Shops carousel + unified "All brands" section (search
// input + horizontal sort chips + Verified-only toggle + 2-column
// grid). The previous split "Verified Brands" + "Community Brands"
// sections are consolidated per Design's mockup — feels like one app
// instead of two.

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BrandCard } from "@/components/BrandCard";
import FeaturedBrandCard from "@/components/FeaturedBrandCard";
import PopularBrandsCarousel from "@/components/PopularBrandsCarousel";
import type { Brand } from "@/lib/types";

interface BrandsClientProps {
  featuredBrand: Brand | null;
  popularBrands: Brand[];
  /**
   * ALL non-popular brands, merged into one list. The client filters +
   * sorts them via the unified "All brands" section. Pre-monetization
   * this is essentially every brand outside Featured + Popular.
   */
  allBrands: Brand[];
  /** Total shops for the header stat. */
  totalShops: number;
  /** Verified shops for the header stat. */
  verifiedCount: number;
  /**
   * Optional "N new this week" count for the hero live pill. Server
   * computes this from `brands.created_at >= now() - 7 days`.
   */
  newThisWeek: number;
}

type SortKey = "rating" | "logs" | "followers" | "alpha";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "rating", label: "Top rated" },
  { key: "logs", label: "Most logs" },
  { key: "followers", label: "Followers" },
  { key: "alpha", label: "A–Z" },
];

// [T35 2026-07-13] Cap the visible All-brands grid so the page stays
// scannable at scale. 50 is enough to feel dense but never eats the
// whole screen; users hit "Show more" to expand to the full list.
// Filter / sort changes collapse back to the default 50 so the
// visual weight stays consistent across state changes.
const DEFAULT_VISIBLE = 50;

export default function BrandsClient({
  featuredBrand,
  popularBrands,
  allBrands,
  totalShops,
  verifiedCount,
  newThisWeek,
}: BrandsClientProps) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rating");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? allBrands.filter((b) => b.name.toLowerCase().includes(q))
      : [...allBrands];

    if (verifiedOnly) list = list.filter((b) => b.is_verified);

    switch (sortKey) {
      case "rating":
        list.sort(
          (a, b) => (b.avg_slime_rating ?? 0) - (a.avg_slime_rating ?? 0),
        );
        break;
      case "logs":
        list.sort((a, b) => (b.total_logs ?? 0) - (a.total_logs ?? 0));
        break;
      case "followers":
        list.sort(
          (a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0),
        );
        break;
      case "alpha":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return list;
  }, [allBrands, query, sortKey, verifiedOnly]);

  return (
    <div className="w-full max-w-[440px] mx-auto px-4">
      {/* ── Hero header ────────────────────────────────────────────── */}
      <div className="pt-2 pb-4">
        <p
          className="section-label"
          style={{ margin: 0, textShadow: "0 0 12px rgba(0,240,255,0.35)" }}
        >
          Discover
        </p>
        <h1
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 42,
            letterSpacing: "-0.025em",
            lineHeight: 0.95,
            color: "#FFFFFF",
            margin: "8px 0 0",
          }}
        >
          Brands
        </h1>
        <div
          className="flex items-center gap-2 flex-wrap"
          style={{
            fontSize: 14,
            color: "rgba(245,245,245,0.68)",
            marginTop: 13,
          }}
        >
          <span>
            <b
              style={{
                color: "#FFFFFF",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 800,
              }}
            >
              {totalShops}
            </b>{" "}
            shops
          </span>
          <span style={{ color: "rgba(245,245,245,0.35)" }}>·</span>
          <span>
            <b
              style={{
                color: "#7BFF7B",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 800,
              }}
            >
              {verifiedCount}
            </b>{" "}
            verified
          </span>
        </div>
        {newThisWeek > 0 && (
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full"
            style={{
              padding: "6px 12px",
              background: "rgba(57,255,20,0.10)",
              border: "1px solid rgba(57,255,20,0.35)",
              color: "#7BFF7B",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7BFF7B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 2v20M2 12h20" />
            </svg>
            {newThisWeek} new this week
          </div>
        )}
      </div>

      {/* ── Featured shop ──────────────────────────────────────────── */}
      {featuredBrand && (
        <section className="mb-6">
          <p className="section-label" style={{ margin: "0 0 12px" }}>
            Featured shop
          </p>
          <FeaturedBrandCard brand={featuredBrand} />
        </section>
      )}

      {/* ── Popular shops ──────────────────────────────────────────── */}
      {popularBrands.length > 0 && (
        <section className="mb-6" style={{ marginLeft: -16, marginRight: -16 }}>
          <p
            className="section-label"
            style={{ margin: "0 16px 12px" }}
          >
            Popular shops
          </p>
          <div style={{ padding: "0 16px" }}>
            <PopularBrandsCarousel brands={popularBrands} />
          </div>
        </section>
      )}

      {/* ── All brands ─────────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="section-label" style={{ margin: "0 0 12px" }}>
          All brands
        </p>

        {/* Search input */}
        <label
          className="flex items-center gap-3 rounded-2xl"
          style={{
            padding: "12px 16px",
            background: "rgba(10,4,18,0.55)",
            border: "1px solid rgba(120,60,180,0.4)",
          }}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(245,245,245,0.45)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            inputMode="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowAll(false);
            }}
            placeholder="Search brands..."
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{
              fontFamily: "system-ui, sans-serif",
              color: "#FFFFFF",
            }}
            aria-label="Search brands"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{
                color: "rgba(245,245,245,0.55)",
                lineHeight: 0,
              }}
            >
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </label>

        {/* Sort chips + Verified toggle */}
        <div
          className="flex gap-2 mt-3 overflow-x-auto scrollbar-none"
          style={
            {
              msOverflowStyle: "none",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
              paddingBottom: 2,
            } as React.CSSProperties
          }
        >
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setSortKey(opt.key);
                  setShowAll(false);
                }}
                className="shrink-0 rounded-full transition-all active:scale-[0.96]"
                style={{
                  padding: "8px 15px",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: 700,
                  fontSize: 13.5,
                  whiteSpace: "nowrap",
                  background: active
                    ? "rgba(57,255,20,0.18)"
                    : "rgba(45,10,78,0.4)",
                  border: active
                    ? "1px solid rgba(57,255,20,0.55)"
                    : "1px solid rgba(120,60,180,0.5)",
                  color: active ? "#7BFF7B" : "rgba(245,245,245,0.55)",
                  boxShadow: active
                    ? "0 0 14px rgba(57,255,20,0.35)"
                    : "none",
                }}
              >
                {opt.label}
              </button>
            );
          })}

          {/* Divider */}
          <div
            className="shrink-0 self-center"
            aria-hidden="true"
            style={{
              width: 1,
              height: 22,
              background: "rgba(120,60,180,0.5)",
              margin: "0 4px",
            }}
          />

          <button
            type="button"
            onClick={() => {
              setVerifiedOnly((v) => !v);
              setShowAll(false);
            }}
            className="shrink-0 rounded-full transition-all active:scale-[0.96]"
            style={{
              padding: "8px 15px",
              fontFamily: "system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 13.5,
              whiteSpace: "nowrap",
              background: verifiedOnly
                ? "rgba(0,240,255,0.16)"
                : "rgba(45,10,78,0.4)",
              border: verifiedOnly
                ? "1px solid rgba(0,240,255,0.55)"
                : "1px solid rgba(120,60,180,0.5)",
              color: verifiedOnly ? "#00F0FF" : "rgba(245,245,245,0.55)",
              boxShadow: verifiedOnly ? "0 0 14px rgba(0,240,255,0.3)" : "none",
            }}
            aria-pressed={verifiedOnly}
          >
            Verified only
          </button>
        </div>

        {/* Grid — 2 columns.
            [T35 2026-07-13] `minWidth: 0` on the grid + a hard
            fallback `overflow: hidden` on this section keep long
            brand names from pushing the right column off-screen on
            narrow viewports. */}
        {filteredSorted.length === 0 ? (
          <div
            className="rounded-2xl mt-4 text-center"
            style={{
              padding: "30px 18px",
              background: "rgba(45,10,78,0.2)",
              border: "1px dashed rgba(120,60,180,0.5)",
              color: "rgba(245,245,245,0.6)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            No shops match that yet. Try clearing filters, or suggest one
            below.
          </div>
        ) : (
          <>
            <div
              className="grid mt-4"
              style={{
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 12,
              }}
            >
              {(showAll
                ? filteredSorted
                : filteredSorted.slice(0, DEFAULT_VISIBLE)
              ).map((brand) => (
                <BrandCard key={brand.id} brand={brand} />
              ))}
            </div>

            {filteredSorted.length > DEFAULT_VISIBLE && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-full transition-colors active:scale-[0.98]"
                style={{
                  padding: "12px 18px",
                  background: "rgba(0,240,255,0.08)",
                  border: "1px solid rgba(0,240,255,0.32)",
                  color: "#00F0FF",
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 12.5,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
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
                    Show all {filteredSorted.length}
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
      </section>

      {/* ── Missing a shop? ────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="section-label" style={{ margin: "0 0 12px" }}>
          Missing a shop?
        </p>
        <div
          className="rounded-2xl"
          style={{
            padding: 16,
            background: "rgba(45,10,78,0.28)",
            border: "1px solid rgba(120,60,180,0.55)",
          }}
        >
          {/* 2026-07-13: retired the left-side + icon tile. The plus
              glyph now lives on the CTA button (right side), which
              balances the card text without a redundant graphic. */}
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 15,
              color: "#FFFFFF",
              lineHeight: 1.2,
            }}
          >
            Know a slime shop we should track?
          </div>
          <div
            className="mt-1"
            style={{
              fontSize: 12.5,
              color: "rgba(245,245,245,0.55)",
              lineHeight: 1.45,
            }}
          >
            Send us the name and we will chase down their drizzle.
          </div>
          <Link
            href="/submit-brand"
            className="mt-3.5 flex items-center justify-center gap-2 rounded-2xl transition-transform active:scale-[0.98]"
            style={{
              padding: "12px 18px",
              background: "rgba(0,240,255,0.06)",
              border: "1px solid rgba(0,240,255,0.4)",
              color: "#00F0FF",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 14.5,
              textDecoration: "none",
            }}
          >
            Suggest a brand
            <svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
