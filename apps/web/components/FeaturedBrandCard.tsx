// apps/web/components/FeaturedBrandCard.tsx
"use client";

import Link from "next/link";
import type { Brand } from "@/lib/types";

// ─── Props ────────────────────────────────────────────────────────────────────

interface FeaturedBrandCardProps {
  brand: Brand;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeaturedBrandCard({ brand }: FeaturedBrandCardProps) {
  const initials = brand.name.slice(0, 2).toUpperCase();
  const displayText = brand.description ?? brand.bio ?? null;

  const externalUrl = brand.website_url ?? brand.shop_url ?? null;
  const internalHref = `/brands/${brand.slug}`;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, rgba(45,10,78,0.95) 0%, rgba(15,0,24,0.98) 100%)",
        border: "1px solid rgba(57,255,20,0.3)",
      }}
    >
      {/* Top gradient bar */}
      <div
        className="w-full"
        style={{
          height: "2px",
          background: "linear-gradient(90deg, #39FF14, #00F0FF, #FF00E5)",
        }}
      />

      <div className="p-5">
        {/* Featured label */}
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(57,255,20,0.15)",
            border: "1px solid rgba(57,255,20,0.3)",
            color: "#39FF14",
          }}
        >
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
            <polygon points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5" />
          </svg>
          Featured Shop
        </span>

        {/* Brand identity row */}
        <div className="mt-4 flex items-center gap-4">
          {/* Logo */}
          <div
            className="shrink-0 w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              background: "rgba(45,10,78,0.6)",
              border: "2px solid rgba(57,255,20,0.4)",
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
              <span className="text-xl font-black text-slime-accent select-none">
                {initials}
              </span>
            )}
          </div>

          {/* Name + badge + description */}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-black text-white leading-tight truncate">
              {brand.name}
            </p>
            {brand.is_verified && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase mt-1"
                style={{
                  background: "rgba(57,255,20,0.2)",
                  border: "1px solid rgba(57,255,20,0.3)",
                  color: "#39FF14",
                }}
              >
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                  <path d="M6 1L7.3 4H11L8.3 6.2l.9 3.3L6 7.8 2.8 9.5l.9-3.3L1 4h3.7z" />
                </svg>
                Verified
              </span>
            )}
            {displayText && (
              <p
                className="text-xs mt-1 line-clamp-2"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {displayText}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-4">
          {/* Rating */}
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "#39FF14" }}
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current">
              <polygon points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5" />
            </svg>
            {brand.avg_slime_rating != null
              ? brand.avg_slime_rating.toFixed(1)
              : "No ratings"}
          </span>

          {/* Followers */}
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "#00F0FF" }}
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current">
              <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-4 5c0-2.2 1.8-4 4-4s4 1.8 4 4H2z" />
            </svg>
            {(brand.follower_count ?? 0).toLocaleString()}
          </span>

          {/* Logs */}
          <span
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-current">
              <path d="M2 2h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 2v1h6V4H3zm0 2v1h4V6H3z" />
            </svg>
            {(brand.total_logs ?? 0).toLocaleString()} logs
          </span>
        </div>

        {/* CTA button */}
        <div className="mt-4">
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl text-sm font-bold text-center active:scale-[0.98] transition-all"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
              }}
            >
              Visit Shop
            </a>
          ) : (
            <Link
              href={internalHref}
              className="block w-full py-3 rounded-xl text-sm font-bold text-center active:scale-[0.98] transition-all"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
              }}
            >
              Visit Shop
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
