// apps/web/components/PopularBrandsCarousel.tsx
"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { Brand } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PopularBrandsCarouselProps {
  brands: Brand[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) {
    result.push(arr.slice(i, i + n));
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PopularBrandsCarousel({
  brands,
}: PopularBrandsCarouselProps) {
  const [page, setPage] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (brands.length === 0) return null;

  const pages = chunk(brands, 3);
  const currentBrands = pages[page] ?? [];

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(delta) < 50) return;
    if (delta < 0 && page < pages.length - 1) setPage(page + 1);
    if (delta > 0 && page > 0) setPage(page - 1);
    touchStartX.current = null;
  }

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Brand rows */}
      <div>
        {currentBrands.map((brand, idx) => {
          const initials = brand.name.slice(0, 2).toUpperCase();
          const isLast = idx === currentBrands.length - 1;

          return (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="flex items-center gap-3 py-3 active:opacity-75 transition-opacity"
              style={
                !isLast
                  ? { borderBottom: "1px solid rgba(45,10,78,0.5)" }
                  : undefined
              }
            >
              {/* Logo */}
              <div
                className="shrink-0 w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
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

              {/* Name + rating */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slime-text truncate">
                  {brand.name}
                </p>
                <div className="mt-0.5">
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
                      No ratings yet
                    </span>
                  )}
                </div>
              </div>

              {/* Followers */}
              <div className="shrink-0 text-right">
                <p
                  className="text-xs font-semibold"
                  style={{ color: "#00F0FF" }}
                >
                  {(brand.follower_count ?? 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-slime-muted flex items-center justify-end gap-0.5 mt-0.5">
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                    <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-4 5c0-2.2 1.8-4 4-4s4 1.8 4 4H2z" />
                  </svg>
                  followers
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Nav row: arrows + dots */}
      {pages.length > 1 && (
        <div className="flex items-center justify-between mt-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="p-1.5 rounded-lg transition-opacity disabled:opacity-20"
            style={{ color: "rgba(255,255,255,0.5)" }}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4 fill-none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 4L6 8l4 4" />
            </svg>
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Go to page ${i + 1}`}
                className="rounded-full transition-all"
                style={{
                  width: i === page ? "6px" : "4px",
                  height: i === page ? "6px" : "4px",
                  background: i === page ? "#39FF14" : "rgba(45,10,78,0.8)",
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages.length - 1, p + 1))}
            className="p-1.5 rounded-lg transition-opacity disabled:opacity-20"
            style={{ color: "rgba(255,255,255,0.5)" }}
            disabled={page === pages.length - 1}
            aria-label="Next page"
          >
            <svg
              viewBox="0 0 16 16"
              className="w-4 h-4 fill-none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
