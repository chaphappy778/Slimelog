// apps/web/components/PopularBrandsCarousel.tsx
// [T33b 2026-07-13] Redesigned per Design's /brands pack. Horizontal
// scrolling row of 200px-wide cards. Each card: 74px cover gradient
// with a 44px logo overlapping bottom-left, brand name +
// verified check, rating + followers row. "Most logged" mini-tile
// deferred to a follow-up (see T33b tracker note); when we ship it
// this component just passes the per-brand slime name through as an
// optional prop.

"use client";

import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/types";
import {
  brandLogoGradient,
  brandCoverGradient,
  brandInitials,
} from "@/lib/brand-gradients";

interface PopularBrandsCarouselProps {
  brands: Brand[];
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function PopularBrandsCarousel({
  brands,
}: PopularBrandsCarouselProps) {
  if (brands.length === 0) return null;

  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-none"
      style={
        {
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          padding: "2px 0 8px",
        } as React.CSSProperties
      }
    >
      {brands.map((brand) => (
        <PopularBrandCard key={brand.id} brand={brand} />
      ))}
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────

function PopularBrandCard({ brand }: { brand: Brand }) {
  const cover = brandCoverGradient(brand.id);
  const logoGradient = brandLogoGradient(brand.id);
  const initials = brandInitials(brand.name);

  const rating =
    typeof brand.avg_slime_rating === "number"
      ? brand.avg_slime_rating.toFixed(1)
      : null;

  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="shrink-0 rounded-2xl overflow-hidden relative transition-transform active:scale-[0.985]"
      style={{
        width: 200,
        background: "rgba(45,10,78,0.28)",
        border: "1px solid rgba(120,60,180,0.42)",
        boxShadow: "0 0 18px rgba(0,240,255,0.08)",
        textDecoration: "none",
      }}
    >
      {/* Cover — 74px gradient strip. Logo overlaps its bottom. */}
      <div
        className="relative w-full"
        style={{
          height: 74,
          borderRadius: "15px 15px 0 0",
          background: cover,
        }}
      >
        <div
          className="absolute flex items-center justify-center rounded-2xl overflow-hidden"
          style={{
            width: 44,
            height: 44,
            left: 13,
            bottom: -22,
            border: "2px solid rgba(255,255,255,0.16)",
            background: brand.logo_url ? "#0F0018" : logoGradient,
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 15,
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          {brand.logo_url ? (
            <Image
              src={brand.logo_url}
              alt=""
              fill
              className="object-cover"
              sizes="44px"
            />
          ) : (
            initials
          )}
        </div>
      </div>

      {/* Body — paddingTop clears the overlapping logo */}
      <div style={{ padding: "30px 14px 14px" }}>
        <div className="flex items-center gap-1.5">
          <span
            className="truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 15,
              color: "#FFFFFF",
              lineHeight: 1.15,
              minWidth: 0,
              flex: 1,
            }}
          >
            {brand.name}
          </span>
          {brand.is_verified && (
            <span
              className="inline-flex items-center justify-center rounded-full flex-none"
              style={{
                width: 16,
                height: 16,
                background: "#39FF14",
                color: "#04140A",
              }}
              aria-label="Verified"
            >
              <svg
                width={9}
                height={9}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#04140A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L19 7" />
              </svg>
            </span>
          )}
        </div>

        <div
          className="mt-1.5 flex items-center gap-3"
          style={{
            fontSize: 12.5,
            color: "rgba(245,245,245,0.65)",
          }}
        >
          {rating && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: "#7BFF7B", fontWeight: 700 }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="#39FF14"
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5 21.4l1.4-6.8L1.3 9.9l6.9-.8z" />
              </svg>
              {rating}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="3.4" />
              <path d="M5.5 20c0-3.3 2.9-5 6.5-5s6.5 1.7 6.5 5" />
            </svg>
            {formatFollowers(brand.follower_count)}
          </span>
        </div>
      </div>
    </Link>
  );
}
