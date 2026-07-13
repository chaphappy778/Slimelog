// apps/web/components/guide/FeaturedShopsStrip.tsx
//
// T32b (2026-07-13): Featured Shops strip rendered above Jenn's V4.1
// vocabulary glossary in Part 5. Design's original guide mockup wanted
// Part 5 to be a brand-tile row; Jenn's copy turned it into a slime-
// industry vocabulary section. This layers the brand tiles ABOVE her
// vocab without touching a word of her copy.
//
// Data is prepped server-side in `guide/page.tsx` (same aggregate
// pattern as the leaderboard). Each tile links to /brands/[slug] when
// the brand has a catalog row; brands with no catalog slug render as
// non-clickable name tiles.

import Link from "next/link";

export interface FeaturedShop {
  key: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  totalLogs: number;
}

interface Props {
  shops: FeaturedShop[];
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Deterministic hash → accent color for brands without a logo. Same
 * palette DNA as the leaderboard/collection galaxy hubs so the
 * community's color-language for each brand stays consistent across
 * surfaces.
 */
const FALLBACK_PALETTE: readonly string[] = [
  "#00F0FF",
  "#39FF14",
  "#FF00E5",
  "#FFD24A",
  "#FF6B9D",
  "#8B77E0",
  "#3DF2FF",
  "#D976FF",
  "#FFAE3B",
  "#F0B060",
];

function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function accentFor(key: string): string {
  return FALLBACK_PALETTE[hashKey(key) % FALLBACK_PALETTE.length];
}

export default function FeaturedShopsStrip({ shops }: Props) {
  if (shops.length === 0) return null;

  return (
    <div className="mt-4 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <p
          className="text-[11px] font-bold uppercase"
          style={{
            color: "#FF00E5",
            letterSpacing: "0.18em",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Featured shops
        </p>
        <Link
          href="/leaderboard"
          className="text-[11px] font-semibold"
          style={{ color: "rgba(0,240,255,0.85)" }}
        >
          See all →
        </Link>
      </div>

      <div
        className="flex gap-3 overflow-x-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          paddingBottom: 4,
          margin: "0 -16px",
          padding: "0 16px 6px",
        }}
      >
        {shops.map((shop) => (
          <ShopTile key={shop.key} shop={shop} />
        ))}
      </div>
    </div>
  );
}

function ShopTile({ shop }: { shop: FeaturedShop }) {
  const accent = accentFor(shop.key);
  const initial = (shop.name || "?").trim().charAt(0).toUpperCase();

  const inner = (
    <div
      className="rounded-2xl flex flex-col items-center justify-center text-center transition-transform active:scale-[0.97]"
      style={{
        flex: "0 0 auto",
        width: 112,
        padding: "14px 8px 12px",
        background: "rgba(45,10,78,0.35)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: shop.logo_url ? "rgba(0,0,0,0.35)" : accent,
          border: `1px solid ${shop.logo_url ? "rgba(255,255,255,0.15)" : accent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#04110A",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 20,
          boxShadow: `0 0 12px ${accent}55`,
          overflow: "hidden",
          marginBottom: 8,
        }}
      >
        {shop.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shop.logo_url}
            alt=""
            width={44}
            height={44}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          initial || "?"
        )}
      </div>
      <div
        className="truncate"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 12.5,
          color: "#FFFFFF",
          maxWidth: "100%",
          lineHeight: 1.15,
        }}
      >
        {shop.name}
      </div>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(245,245,245,0.5)",
          marginTop: 3,
        }}
      >
        {formatNumber(shop.totalLogs)}{" "}
        {shop.totalLogs === 1 ? "log" : "logs"}
      </div>
    </div>
  );

  if (shop.slug) {
    return (
      <Link
        href={`/brands/${shop.slug}`}
        aria-label={`View ${shop.name}`}
        style={{ textDecoration: "none", flex: "0 0 auto" }}
      >
        {inner}
      </Link>
    );
  }
  return <div style={{ flex: "0 0 auto" }}>{inner}</div>;
}
