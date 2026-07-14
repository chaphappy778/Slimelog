// apps/web/components/FeaturedBrandCard.tsx
// [T33b 2026-07-13] Redesigned per Design's /brands pack. 120px cover
// gradient at the top, 66px rounded-square gradient logo overlapping
// the bottom of the cover, brand name in Montserrat 900 22px with
// verified check, stats row (rating / followers / logs) with line-SVG
// icons, tagline, optional restock/drop callout pill, full-width
// green→cyan "Visit shop" CTA. When the brand has a real `logo_url`
// we render the photo instead of the gradient placeholder.

"use client";

import Image from "next/image";
import Link from "next/link";
import type { Brand } from "@/lib/types";
import {
  brandLogoGradient,
  brandCoverGradient,
  brandInitials,
} from "@/lib/brand-gradients";

interface FeaturedBrandCardProps {
  brand: Brand;
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function FeaturedBrandCard({ brand }: FeaturedBrandCardProps) {
  const cover = brandCoverGradient(brand.id);
  const logoGradient = brandLogoGradient(brand.id);
  const initials = brandInitials(brand.name);

  const rating =
    typeof brand.avg_slime_rating === "number"
      ? brand.avg_slime_rating.toFixed(1)
      : null;

  return (
    <div
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: "rgba(45,10,78,0.28)",
        border: "1px solid rgba(120,60,180,0.55)",
        boxShadow:
          "0 0 32px rgba(0,240,255,0.12), 0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {/* Cover gradient — 120px */}
      <div
        className="relative w-full"
        style={{ height: 120, background: cover }}
      >
        {/* Bottom scrim so the logo edge reads on any cover */}
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "linear-gradient(180deg, rgba(16,0,32,0) 35%, rgba(20,4,38,0.9))",
          }}
        />
        {/* "FEATURED SHOP" pill top-left */}
        <div
          className="absolute inline-flex items-center gap-1.5 rounded-full"
          style={{
            top: 12,
            left: 12,
            padding: "5px 11px",
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#04140A",
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 10.5,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            boxShadow: "0 0 12px rgba(57,255,20,0.5)",
            zIndex: 2,
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="#04140A"
            aria-hidden="true"
          >
            <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5 21.4l1.4-6.8L1.3 9.9l6.9-.8z" />
          </svg>
          Featured shop
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {/* Logo — 66px rounded-square, overlaps cover */}
        <div
          className="flex items-center justify-center rounded-2xl relative overflow-hidden"
          style={{
            width: 66,
            height: 66,
            marginTop: -40,
            border: "2px solid rgba(255,255,255,0.16)",
            background: brand.logo_url ? "#0F0018" : logoGradient,
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 24,
            color: "#FFFFFF",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          {brand.logo_url ? (
            <Image
              src={brand.logo_url}
              alt=""
              fill
              className="object-cover"
              sizes="66px"
            />
          ) : (
            initials
          )}
        </div>

        {/* Name + verified check */}
        <div className="flex items-center gap-2 mt-3">
          <h2
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 22,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
              color: "#FFFFFF",
              margin: 0,
            }}
          >
            {brand.name}
          </h2>
          {brand.is_verified && <VerifiedCheck />}
        </div>

        {/* Stats row */}
        <div
          className="mt-2 flex items-center gap-4 flex-wrap"
          style={{
            fontSize: 13,
            color: "rgba(245,245,245,0.6)",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <StatCell
            icon={
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="#39FF14"
                aria-hidden="true"
              >
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5 21.4l1.4-6.8L1.3 9.9l6.9-.8z" />
              </svg>
            }
            value={rating ?? "—"}
            sub={rating ? `(${brand.total_slime_ratings})` : "No ratings"}
          />
          <StatCell
            icon={<PersonIcon />}
            value={formatFollowers(brand.follower_count)}
            sub="followers"
          />
          <StatCell
            icon={<LogsIcon />}
            value={formatFollowers(brand.total_logs)}
            sub="logs"
          />
        </div>

        {/* Tagline */}
        {(brand.bio ?? brand.description) && (
          <p
            className="mt-3"
            style={{
              color: "rgba(245,245,245,0.78)",
              fontSize: 13.5,
              lineHeight: 1.5,
              margin: "13px 0 0",
            }}
          >
            {(brand.bio ?? brand.description)?.trim()}
          </p>
        )}

        {/* Restock schedule callout — shows only when the brand has
            a schedule string set. Cyan pill with clock icon. */}
        {brand.restock_schedule && (
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-xl"
            style={{
              padding: "8px 12px",
              background: "rgba(0,240,255,0.08)",
              border: "1px solid rgba(0,240,255,0.3)",
              color: "#7DF6FF",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#7DF6FF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            {brand.restock_schedule}
          </div>
        )}

        {/* Visit shop CTA */}
        <Link
          href={`/brands/${brand.slug}`}
          className="mt-4 flex items-center justify-center rounded-2xl transition-transform active:scale-[0.98]"
          style={{
            padding: "14px 18px",
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#04140A",
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: "0.01em",
            boxShadow:
              "0 0 22px rgba(57,255,20,0.4), 0 8px 24px -8px rgba(0,240,255,0.5)",
            textDecoration: "none",
          }}
        >
          Visit shop
        </Link>
      </div>
    </div>
  );
}

// ─── Small pieces ──────────────────────────────────────────────────────

function VerifiedCheck() {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-none"
      style={{
        width: 19,
        height: 19,
        background: "#39FF14",
        color: "#04140A",
      }}
      aria-label="Verified"
    >
      <svg
        width={11}
        height={11}
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
  );
}

function StatCell({
  icon,
  value,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  sub: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      <span
        style={{
          color: "#FFFFFF",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
        }}
      >
        {value}
      </span>{" "}
      <span>{sub}</span>
    </span>
  );
}

function PersonIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(245,245,245,0.6)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20c0-3.3 2.9-5 6.5-5s6.5 1.7 6.5 5" />
    </svg>
  );
}

function LogsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(245,245,245,0.6)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.3-4.2A7.5 7.5 0 1 1 21 11.5z" />
    </svg>
  );
}
