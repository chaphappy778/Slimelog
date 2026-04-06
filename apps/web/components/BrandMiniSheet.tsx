"use client";
// apps/web/components/BrandMiniSheet.tsx

import { useState, useEffect } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";

// ─── Module-level Supabase client ─────────────────────────────────────────────

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandData {
  name: string;
  slug: string;
  logo_url: string | null;
  shop_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  is_verified: boolean;
  description: string | null;
}

interface Props {
  brandSlug: string;
  brandName: string;
  onClose: () => void;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div
      style={{
        padding: "20px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header row skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(45,10,78,0.5)",
            flexShrink: 0,
          }}
        />
        <div
          style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}
        >
          <div
            style={{
              height: 18,
              width: "55%",
              borderRadius: 6,
              background: "rgba(45,10,78,0.5)",
            }}
          />
          <div
            style={{
              height: 13,
              width: "30%",
              borderRadius: 6,
              background: "rgba(45,10,78,0.4)",
            }}
          />
        </div>
      </div>
      {/* Description skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <div
          style={{
            height: 12,
            borderRadius: 6,
            background: "rgba(45,10,78,0.4)",
          }}
        />
        <div
          style={{
            height: 12,
            width: "80%",
            borderRadius: 6,
            background: "rgba(45,10,78,0.4)",
          }}
        />
        <div
          style={{
            height: 12,
            width: "60%",
            borderRadius: 6,
            background: "rgba(45,10,78,0.4)",
          }}
        />
      </div>
      {/* Links skeleton */}
      <div style={{ display: "flex", gap: 8 }}>
        <div
          style={{
            height: 34,
            width: 90,
            borderRadius: 10,
            background: "rgba(45,10,78,0.4)",
          }}
        />
        <div
          style={{
            height: 34,
            width: 80,
            borderRadius: 10,
            background: "rgba(45,10,78,0.4)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Verified badge ───────────────────────────────────────────────────────────

function VerifiedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 20,
        background: "rgba(0,240,255,0.1)",
        border: "1px solid rgba(0,240,255,0.3)",
        color: "#00F0FF",
        fontSize: 11,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Verified
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandMiniSheet({
  brandSlug,
  brandName,
  onClose,
}: Props) {
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchBrand() {
      const { data } = await supabase
        .from("brands")
        .select(
          "name, slug, logo_url, shop_url, instagram_handle, tiktok_handle, is_verified, description",
        )
        .eq("slug", brandSlug)
        .single();

      if (!cancelled) {
        setBrand(data ?? null);
        setLoading(false);
      }
    }

    fetchBrand();
    return () => {
      cancelled = true;
    };
  }, [brandSlug]);

  const brandInitial = brandName ? brandName.charAt(0).toUpperCase() : "?";

  return (
    // Fixed overlay — above SlimeDetailCard (z-index 100)
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        style={{
          position: "absolute",
          bottom: 300,
          left: 0,
          right: 0,
          background: "#0F0018",
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(45,10,78,0.8)",
          maxHeight: "70vh",
          overflowY: "auto",
          WebkitOverflowScrolling:
            "touch" as React.CSSProperties["WebkitOverflowScrolling"],
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 12,
            paddingBottom: 4,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              background: "rgba(45,10,78,0.8)",
              borderRadius: 2,
            }}
          />
        </div>

        {loading ? (
          <Skeleton />
        ) : (
          <div
            style={{
              padding: "16px 16px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Brand header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Logo */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "2px solid rgba(45,10,78,0.8)",
                }}
              >
                {brand?.logo_url ? (
                  <Image
                    src={brand.logo_url}
                    alt={brand.name}
                    width={56}
                    height={56}
                    style={{
                      objectFit: "cover",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0A0A0A",
                      fontSize: 22,
                      fontWeight: 900,
                      fontFamily: "Montserrat, Inter, sans-serif",
                    }}
                    aria-hidden="true"
                  >
                    {brandInitial}
                  </div>
                )}
              </div>

              {/* Name + verified */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: "#fff",
                      fontFamily: "Montserrat, Inter, sans-serif",
                      lineHeight: 1.2,
                    }}
                  >
                    {brand?.name ?? brandName}
                  </span>
                  {brand?.is_verified && <VerifiedBadge />}
                </div>
              </div>
            </div>

            {/* Description */}
            {brand?.description && (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: "rgba(245,245,245,0.5)",
                  lineHeight: 1.6,
                }}
              >
                {brand.description}
              </p>
            )}

            {/* Links row */}
            {(brand?.shop_url ||
              brand?.instagram_handle ||
              brand?.tiktok_handle) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {brand.shop_url && (
                  <a
                    href={brand.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "rgba(57,255,20,0.08)",
                      border: "1px solid rgba(57,255,20,0.2)",
                      color: "#39FF14",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Shop
                  </a>
                )}

                {brand?.instagram_handle && (
                  <a
                    href={`https://instagram.com/${brand.instagram_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "rgba(255,0,229,0.08)",
                      border: "1px solid rgba(255,0,229,0.2)",
                      color: "#FF00E5",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                    {brand.instagram_handle.startsWith("@")
                      ? brand.instagram_handle
                      : `@${brand.instagram_handle}`}
                  </a>
                )}

                {brand?.tiktok_handle && (
                  <a
                    href={`https://tiktok.com/@${brand.tiktok_handle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 10,
                      background: "rgba(0,240,255,0.08)",
                      border: "1px solid rgba(0,240,255,0.2)",
                      color: "#00F0FF",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
                    </svg>
                    {brand.tiktok_handle.startsWith("@")
                      ? brand.tiktok_handle
                      : `@${brand.tiktok_handle}`}
                  </a>
                )}
              </div>
            )}

            {/* View Full Brand Page — intentional full navigation */}
            <a
              href={`/brands/${brandSlug}`}
              style={{
                display: "block",
                textAlign: "center",
                padding: "15px 0",
                borderRadius: 14,
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.02em",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              View Full Brand Page
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
