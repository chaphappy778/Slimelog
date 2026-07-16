// apps/web/components/collection/CollectionCard.tsx
//
// Collection rework batch B (2026-07-11). Replaces the tall SlimeCard
// on /collection with a compact row treatment.
//
// You're scanning your OWN shelf, which is typically much larger than
// the community feed — the feed's photo-hero density (~1.3 cards per
// screen) becomes tedious. Compact rows show ~5 per screen with the
// data that matters most for reviewing your own logs:
//   - 74px thumb (gradient fallback from log colors when no photo)
//   - slime name + brand link
//   - one-line personal note snippet (owner-only info)
//   - base-type chip + meta (add date · price when present)
//   - floating ★ score chip on right (or magenta "Want" pill for wishlist)
//
// Whole row links to /slimes/[id] — the full ratings grid + notes body
// live on the detail page. Wishlist rows just show the Want pill; no
// score chip on those since they have no rating.

"use client";

import Link from "next/link";
import Image from "next/image";
import type { CollectionLog, SlimeBaseType } from "@/lib/types";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";

const COLOR_SWATCHES: Record<string, string> = {
  pink: "#FF6B9D",
  green: "#39FF14",
  blue: "#4FC3F7",
  purple: "#9B59B6",
  white: "#F0F0F0",
  yellow: "#FFE66D",
  orange: "#FFB347",
  red: "#E74C3C",
  cyan: "#00F0FF",
  magenta: "#FF00E5",
  teal: "#4ECDC4",
  black: "#444",
  lavender: "#C4A0F0",
  peach: "#FFCBA4",
  mint: "#98FFD2",
  coral: "#FF6B6B",
  lilac: "#DDA0DD",
  rose: "#FF007F",
  gold: "#FFD700",
  silver: "#C0C0C0",
};

function getSwatchColor(colorName: string): string {
  const lower = colorName.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_SWATCHES)) {
    if (lower.includes(key)) return val;
  }
  return "#666";
}

// Base-type chip palette — subtle inline chip on the meta row.
const BASE_CHIP: Partial<
  Record<SlimeBaseType, { bg: string; color: string }>
> = {
  butter: { bg: "rgba(255,174,59,0.14)", color: "#FFBE57" },
  cloud: { bg: "rgba(0,240,255,0.14)", color: "#3DF2FF" },
  floam: { bg: "rgba(204,68,255,0.14)", color: "#D976FF" },
  clear: { bg: "rgba(57,255,20,0.14)", color: "#6DFF4D" },
  jelly: { bg: "rgba(255,61,110,0.14)", color: "#FF6187" },
  icee: { bg: "rgba(0,240,255,0.14)", color: "#3DF2FF" },
  // 2026-07-16 mig 077: cloud_cream renamed to snowbutter.
  snowbutter: { bg: "rgba(255,167,199,0.14)", color: "#FFA7C7" },
  // 2026-07-16 mig 077: basic added. Neutral cool-gray.
  basic: { bg: "rgba(203,213,225,0.12)", color: "#CBD5E1" },
  fluffy: { bg: "rgba(255,166,217,0.14)", color: "#FFA6D9" },
  thick_and_glossy: { bg: "rgba(255,123,255,0.14)", color: "#FF7BFF" },
  slay: { bg: "rgba(255,77,109,0.14)", color: "#FF4D6D" },
  beaded: { bg: "rgba(255,181,107,0.14)", color: "#FFB56B" },
  snow_fizz: { bg: "rgba(143,216,255,0.14)", color: "#8FD8FF" },
  magnetic: { bg: "rgba(176,176,176,0.14)", color: "#B0B0B0" },
  avalanche: { bg: "rgba(139,119,224,0.14)", color: "#8B77E0" },
};

function formatAddDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

interface Props {
  log: CollectionLog;
}

export default function CollectionCard({ log }: Props) {
  const isWishlist = !!log.in_wishlist;
  const slimeName = log.slime_name ?? "Untitled Slime";
  const brandName = log.brand_name_raw ?? null;
  const baseLabel = log.base_type
    ? (SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType] ?? log.base_type)
    : null;
  const baseChip = log.base_type
    ? (BASE_CHIP[log.base_type as SlimeBaseType] ?? null)
    : null;

  const imageUrl = (log as CollectionLog & { image_url?: string | null })
    .image_url;
  // Gradient fallback from first two logged colors.
  const photoGradient = (() => {
    const swatches = (log.colors ?? []).slice(0, 2).map(getSwatchColor);
    if (swatches.length === 2)
      return `linear-gradient(150deg, ${swatches[0]}, ${swatches[1]})`;
    if (swatches.length === 1)
      return `linear-gradient(150deg, ${swatches[0]}, rgba(45,10,78,0.6))`;
    return "linear-gradient(150deg, rgba(45,10,78,0.6), rgba(45,10,78,0.3))";
  })();

  // Personal note snippet (owner-only). Falls back to empty; component
  // just skips the note line when it's absent.
  const noteSnippet = log.notes?.trim() ?? "";

  const priceRaw = (log as CollectionLog & { purchase_price?: unknown })
    .purchase_price;
  const price =
    typeof priceRaw === "number"
      ? priceRaw
      : typeof priceRaw === "string" && priceRaw !== ""
        ? Number(priceRaw)
        : null;
  const priceStr =
    typeof price === "number" && !Number.isNaN(price)
      ? `$${price.toFixed(0)}`
      : null;

  const dateStr = formatAddDate(log.created_at);
  const metaParts = [dateStr, priceStr].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/slimes/${log.id}`}
      className="block active:scale-[0.995] transition-all"
    >
      <div
        className="flex items-stretch gap-3 p-2.5 rounded-2xl"
        style={{
          background: "rgba(45,10,78,0.3)",
          border: "1px solid rgba(45,10,78,0.7)",
        }}
      >
        {/* Thumb */}
        <div
          className="relative shrink-0 rounded-xl overflow-hidden"
          style={{ width: 74, height: 74 }}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={slimeName}
              fill
              className="object-cover"
              sizes="74px"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: photoGradient }}
            />
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div
              className="text-[14.5px] font-black leading-tight truncate"
              style={{
                color: "#ffffff",
                fontFamily: "Montserrat, Inter, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              {slimeName}
            </div>
            {brandName && (
              <div
                className="text-[11.5px] font-semibold mt-0.5 truncate"
                style={{ color: "#00F0FF" }}
              >
                {brandName}
              </div>
            )}
            {noteSnippet && (
              <div
                className="text-[11.5px] mt-1 leading-snug truncate"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                {noteSnippet}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {baseLabel && baseChip && (
                <span
                  className="text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                  style={{
                    letterSpacing: "0.05em",
                    background: baseChip.bg,
                    color: baseChip.color,
                  }}
                >
                  {baseLabel}
                </span>
              )}
              {metaParts && (
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  {metaParts}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: score chip / want pill */}
        <div className="flex flex-col items-end justify-between shrink-0 py-0.5">
          {isWishlist ? (
            <span
              className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
              style={{
                letterSpacing: "0.05em",
                color: "#FF7BFF",
                background: "rgba(204,68,255,0.14)",
                border: "1px solid rgba(204,68,255,0.5)",
                boxShadow: "0 0 8px rgba(204,68,255,0.25)",
              }}
            >
              Want
            </span>
          ) : typeof log.rating_overall === "number" ? (
            <span
              className="text-[13px] font-black px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#04110A",
                boxShadow: "0 0 10px rgba(57,255,20,0.35)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              ★{log.rating_overall.toFixed(1)}
            </span>
          ) : (
            <span
              className="text-[10px] font-semibold"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              —
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
