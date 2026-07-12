// apps/web/components/leaderboard/BrandTile.tsx
// T107 (2026-07-11): Community header for the selected brand on the
// leaderboard page. Big logo tile + brand name + loggers/base subline +
// giant gradient community total.

"use client";

import { brandColor } from "@/lib/brand-color";
import type { LeaderboardBrand } from "@/app/leaderboard/LeaderboardClient";

interface Props {
  brand: LeaderboardBrand;
  communityTotal: number;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function BrandTile({ brand, communityTotal }: Props) {
  const logger_word = brand.logger_count === 1 ? "logger" : "loggers";
  const base_type_fragment = brand.base_type_label
    ? ` · ${brand.base_type_label} base`
    : "";

  return (
    <div
      className="rounded-3xl p-4"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <div className="flex items-center gap-3">
        <BrandTileLogo brand={brand} />
        <div className="min-w-0 flex-1">
          <h2
            className="text-white truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: "-0.01em",
              lineHeight: 1.15,
            }}
          >
            {brand.name}
          </h2>
          <p
            className="text-xs truncate"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            {formatNumber(brand.logger_count)} {logger_word}
            {base_type_fragment}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {formatNumber(communityTotal)}
        </div>
        <p
          className="text-sm mt-1"
          style={{ color: "rgba(245,245,245,0.7)" }}
        >
          logs by the community <span aria-hidden="true">{"\u{1F4A7}"}</span>
        </p>
        <p
          className="text-[11px] mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          All time
        </p>
      </div>
    </div>
  );
}

function BrandTileLogo({ brand }: { brand: LeaderboardBrand }) {
  const size = 56;
  if (brand.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brand.logo_url}
        alt={brand.name}
        width={size}
        height={size}
        className="rounded-2xl"
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          objectFit: "cover",
          flexShrink: 0,
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />
    );
  }
  const color = brandColor(brand.name_raw);
  const letter = (brand.name || brand.name_raw).trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl"
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        background: color,
        color: "#04110A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 900,
        fontSize: 26,
        border: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      {letter || "?"}
    </div>
  );
}
