// apps/web/components/BrandCard.tsx
// [T33b 2026-07-13] Compact 2-column grid card for the "All brands"
// section. 54px rounded-square gradient logo (or real logo photo),
// name + verified check, rating with star, followers with icon. All
// content center-aligned.

"use client";

import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/types";
import { brandLogoGradient, brandInitials } from "@/lib/brand-gradients";

interface BrandCardProps {
  brand: Brand;
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function BrandCard({ brand }: BrandCardProps) {
  const logoGradient = brandLogoGradient(brand.id);
  const initials = brandInitials(brand.name);
  const rating =
    typeof brand.avg_slime_rating === "number"
      ? brand.avg_slime_rating.toFixed(1)
      : null;

  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="rounded-2xl transition-transform active:scale-[0.98]"
      style={{
        background: "rgba(45,10,78,0.28)",
        border: "1px solid rgba(120,60,180,0.42)",
        boxShadow: "0 0 14px rgba(0,240,255,0.06)",
        textDecoration: "none",
        padding: "16px 12px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        // 2026-07-13 fix: without min-w-0 the grid item takes its
        // intrinsic content minimum width (long brand name pushes the
        // card wider than 1fr), which spills the right column
        // off-screen on narrow viewports. min-width: 0 lets the card
        // shrink to its grid track and the truncated name handles the
        // rest.
        minWidth: 0,
      }}
    >
      {/* Logo — 54px rounded-square */}
      <div
        className="flex items-center justify-center rounded-2xl relative overflow-hidden"
        style={{
          width: 54,
          height: 54,
          border: "2px solid rgba(255,255,255,0.14)",
          background: brand.logo_url ? "#0F0018" : logoGradient,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 18,
          color: "#FFFFFF",
        }}
      >
        {brand.logo_url ? (
          <Image
            src={brand.logo_url}
            alt=""
            fill
            className="object-cover"
            sizes="54px"
          />
        ) : (
          initials
        )}
      </div>

      {/* Name + check — width:100% so the truncate on the name works
          inside the column-flex parent (which by default sizes
          children to content width). */}
      <div
        className="flex items-center justify-center gap-1 mt-2.5 min-w-0"
        style={{ width: "100%" }}
      >
        <span
          className="truncate"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#FFFFFF",
            lineHeight: 1.15,
            minWidth: 0,
          }}
        >
          {brand.name}
        </span>
        {brand.is_verified && (
          <span
            className="inline-flex items-center justify-center rounded-full flex-none"
            style={{
              width: 15,
              height: 15,
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
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12l5 5L19 7" />
            </svg>
          </span>
        )}
      </div>

      {/* Rating */}
      {rating ? (
        <div
          className="mt-1.5 flex items-center gap-1"
          style={{
            color: "#7BFF7B",
            fontSize: 13,
            fontWeight: 800,
          }}
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
        </div>
      ) : (
        <div
          className="mt-1.5"
          style={{ color: "rgba(245,245,245,0.4)", fontSize: 12 }}
        >
          No ratings yet
        </div>
      )}

      {/* Followers */}
      <div
        className="mt-1.5 flex items-center gap-1"
        style={{ color: "rgba(245,245,245,0.5)", fontSize: 11.5 }}
      >
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
        {formatFollowers(brand.follower_count)} followers
      </div>
    </Link>
  );
}
