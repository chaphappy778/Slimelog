// apps/web/components/leaderboard/BrandSelector.tsx
// T107 (2026-07-11): Horizontal-scroll pill row of brands for the
// leaderboard. Search icon on the right toggles an inline filter input
// that narrows the pills client-side.

"use client";

import { useMemo, useState } from "react";
import { brandColor } from "@/lib/brand-color";
import type { LeaderboardBrand } from "@/app/leaderboard/LeaderboardClient";

interface Props {
  brands: LeaderboardBrand[];
  selectedKey: string;
  onSelect: (brand: LeaderboardBrand) => void;
}

const CYAN = "#00F0FF";

export default function BrandSelector({
  brands,
  selectedKey,
  onSelect,
}: Props) {
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo(() => {
    if (!query.trim()) return brands;
    const q = query.trim().toLowerCase();
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.name_raw.toLowerCase().includes(q),
    );
  }, [brands, query]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-center gap-2 overflow-x-auto"
        style={
          {
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        {filtered.map((brand) => {
          const isSelected = brand.key === selectedKey;
          return (
            <button
              type="button"
              key={brand.key}
              onClick={() => onSelect(brand)}
              className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: isSelected
                  ? "rgba(0,240,255,0.14)"
                  : "rgba(45,10,78,0.35)",
                border: isSelected
                  ? `1px solid ${CYAN}`
                  : "1px solid rgba(45,10,78,0.7)",
                boxShadow: isSelected
                  ? "0 0 12px rgba(0,240,255,0.4)"
                  : "none",
                color: isSelected ? "#FFFFFF" : "rgba(245,245,245,0.75)",
                fontSize: 13,
                fontWeight: isSelected ? 700 : 500,
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
              aria-pressed={isSelected}
            >
              <BrandChipLogo brand={brand} />
              <span>{brand.name}</span>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <span className="text-xs text-slime-muted px-2 py-1">
            No brands match.
          </span>
        )}

        {/* Search icon — pinned right (visually) via margin-left auto */}
        <button
          type="button"
          onClick={() => {
            setSearchOpen((v) => {
              if (v) setQuery("");
              return !v;
            });
          }}
          className="shrink-0 flex items-center justify-center rounded-full transition-colors"
          style={{
            marginLeft: "auto",
            width: 32,
            height: 32,
            background: searchOpen
              ? "rgba(0,240,255,0.14)"
              : "rgba(45,10,78,0.4)",
            border: searchOpen
              ? `1px solid ${CYAN}`
              : "1px solid rgba(0,240,255,0.3)",
            color: CYAN,
            cursor: "pointer",
          }}
          aria-label={searchOpen ? "Close search" : "Search brands"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>

      {searchOpen && (
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter brands"
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: `1px solid rgba(0,240,255,0.3)`,
            color: "#FFFFFF",
          }}
          aria-label="Filter brands"
        />
      )}
    </div>
  );
}

const CHIP_LOGO_SIZE = 24;

function BrandChipLogo({ brand }: { brand: LeaderboardBrand }) {
  if (brand.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logo_url}
        alt=""
        width={CHIP_LOGO_SIZE}
        height={CHIP_LOGO_SIZE}
        style={{
          width: CHIP_LOGO_SIZE,
          height: CHIP_LOGO_SIZE,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          background: "rgba(0,0,0,0.3)",
        }}
      />
    );
  }
  const color = brandColor(brand.name_raw);
  const letter = (brand.name || brand.name_raw).trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      style={{
        width: CHIP_LOGO_SIZE,
        height: CHIP_LOGO_SIZE,
        borderRadius: "50%",
        background: color,
        color: "#04110A",
        fontSize: 11,
        fontWeight: 900,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {letter || "?"}
    </span>
  );
}
