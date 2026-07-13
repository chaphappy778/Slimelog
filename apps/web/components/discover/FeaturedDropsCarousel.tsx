// apps/web/components/discover/FeaturedDropsCarousel.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface FeaturedDrop {
  id: string;
  name: string | null;
  drop_at: string | null;
  status: string | null;
  brand_name: string | null;
  brand_slug: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
}

interface FeaturedDropsCarouselProps {
  drops: FeaturedDrop[];
}

type StatusFilter = "all" | "live" | "announced";

function formatDropDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function getStatusDotColor(status: string | null): string {
  if (status === "live") return "#39FF14";
  if (status === "announced") return "#00F0FF";
  return "rgba(255,255,255,0.3)";
}

// [Discover V1 — 2026-07-13] T-minus pill computation. Returns null
// when the drop has no date and no status. LIVE takes priority over
// countdown so a currently-live drop always reads as LIVE, not
// "T-6h ago".
interface TminusPill {
  label: string;
  variant: "live" | "soon" | "far";
}

function computeTminus(
  status: string | null,
  dateStr: string | null,
): TminusPill | null {
  if (status === "live") return { label: "LIVE", variant: "live" };
  if (!dateStr) return null;

  const dropMs = new Date(dateStr).getTime();
  if (Number.isNaN(dropMs)) return null;

  const nowMs = Date.now();
  const deltaMs = dropMs - nowMs;

  // If the drop was in the past and status isn't "live", we still show
  // nothing — the caller filters those out at the query layer usually.
  if (deltaMs <= 0) return null;

  const hours = deltaMs / (1000 * 60 * 60);
  const days = hours / 24;
  const weeks = days / 7;

  // Under 24h: countdown in hours. Under a week: in days. Beyond: in
  // weeks, capped at a rounded number.
  if (hours < 24) {
    const h = Math.max(1, Math.round(hours));
    return { label: `T-${h}h`, variant: "soon" };
  }
  if (days < 7) {
    const d = Math.round(days);
    return { label: `T-${d}d`, variant: "soon" };
  }
  const w = Math.max(1, Math.round(weeks));
  return { label: `T-${w}w`, variant: "far" };
}

// Style helper for the pill. Keeps the color language consistent with
// the section it lives in: cyan for far-out drops, green + gradient
// for LIVE, gold for imminent (under a week).
function tminusStyle(variant: "live" | "soon" | "far"): React.CSSProperties {
  if (variant === "live") {
    return {
      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
      color: "#04110A",
      border: "1px solid transparent",
      boxShadow: "0 0 14px rgba(57,255,20,0.6)",
    };
  }
  if (variant === "soon") {
    return {
      background: "rgba(255,174,59,0.14)",
      color: "#FFD24A",
      border: "1px solid rgba(255,174,59,0.5)",
    };
  }
  return {
    background: "rgba(0,240,255,0.10)",
    color: "#7DF6FF",
    border: "1px solid rgba(0,240,255,0.4)",
  };
}

export default function FeaturedDropsCarousel({
  drops,
}: FeaturedDropsCarouselProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered =
    statusFilter === "all"
      ? drops
      : drops.filter((d) => d.status === statusFilter);

  const filterOptions: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Live", value: "live" },
    { label: "Announced", value: "announced" },
  ];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 px-4 mb-3">
        {filterOptions.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
              style={{
                background: active
                  ? "rgba(57,255,20,0.12)"
                  : "rgba(45,10,78,0.3)",
                color: active ? "#39FF14" : "rgba(245,245,245,0.4)",
                border: active
                  ? "1px solid rgba(57,255,20,0.35)"
                  : "1px solid rgba(45,10,78,0.5)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <p className="px-4 text-sm" style={{ color: "rgba(245,245,245,0.3)" }}>
          No drops yet.
        </p>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto scrollbar-none px-4"
          style={
            {
              WebkitOverflowScrolling: "touch",
              msOverflowStyle: "none",
              scrollbarWidth: "none",
            } as React.CSSProperties
          }
        >
          {filtered.map((drop) => {
            const brandInitial = (drop.brand_name?.[0] ?? "?").toUpperCase();
            const dropInitial = (drop.name?.[0] ?? "?").toUpperCase();
            const dotColor = getStatusDotColor(drop.status);
            const tminus = computeTminus(drop.status, drop.drop_at);

            return (
              <Link
                key={drop.id}
                href={`/drops/${drop.id}`}
                className="shrink-0 block"
                aria-label={`View drop: ${drop.name ?? "Unnamed drop"}`}
              >
                <article
                  className="rounded-2xl overflow-hidden relative transition-all duration-150 active:scale-95 hover:scale-[1.02]"
                  style={{
                    width: "calc(62vw - 16px)",
                    maxWidth: 260,
                    background: "rgba(45,10,78,0.3)",
                    border: "1px solid rgba(45,10,78,0.7)",
                  }}
                >
                  {/* Cover image */}
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ height: 120 }}
                  >
                    {/* [Discover V1 2026-07-13] T-minus pill, top-right of
                        the cover. LIVE renders as a green→cyan gradient
                        chip; imminent drops (under a week) render gold;
                        further out drops render cyan-outlined. */}
                    {tminus && (
                      <span
                        className="absolute rounded-full font-mono font-bold"
                        style={{
                          top: 8,
                          right: 8,
                          padding: "3px 9px",
                          fontSize: 10.5,
                          letterSpacing: "0.02em",
                          zIndex: 2,
                          ...tminusStyle(tminus.variant),
                        }}
                        aria-label={
                          tminus.variant === "live"
                            ? "Live now"
                            : `Drops in ${tminus.label.replace("T-", "")}`
                        }
                      >
                        {tminus.label}
                      </span>
                    )}
                    {drop.cover_image_url ? (
                      <Image
                        src={drop.cover_image_url}
                        alt={drop.name ?? "Drop cover"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 62vw, 260px"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl font-black"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(255,0,229,0.3), rgba(0,240,255,0.2))",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        {dropInitial}
                      </div>
                    )}
                  </div>

                  {/* Brand logo — sits high in cover image, clear of body text */}
                  <div
                    className="absolute rounded-full overflow-hidden"
                    style={{
                      width: 44,
                      height: 44,
                      top: 98,
                      left: 12,
                      border: "2px solid #0F0018",
                      zIndex: 2,
                    }}
                  >
                    {drop.logo_url ? (
                      <Image
                        src={drop.logo_url}
                        alt={drop.brand_name ?? "Brand"}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-sm font-black"
                        style={{
                          background:
                            "linear-gradient(135deg, #39FF14, #00F0FF)",
                          color: "#0A0A0A",
                        }}
                      >
                        {brandInitial}
                      </div>
                    )}
                  </div>

                  {/* Body — paddingTop gives clearance below logo */}
                  <div style={{ padding: "12px", paddingTop: 28 }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="rounded-full shrink-0"
                        style={{
                          width: 6,
                          height: 6,
                          background: dotColor,
                          display: "inline-block",
                        }}
                      />
                      <p
                        className="text-sm font-bold truncate"
                        style={{ color: "rgba(245,245,245,0.9)" }}
                      >
                        {drop.name ?? "Unnamed drop"}
                      </p>
                    </div>
                    <p
                      className="text-xs truncate"
                      style={{ color: "#FF00E5" }}
                    >
                      {drop.brand_name ?? "Unknown brand"}
                    </p>
                    <p
                      className="text-[11px] mt-0.5"
                      style={{ color: "rgba(245,245,245,0.35)" }}
                    >
                      {formatDropDate(drop.drop_at)}
                    </p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
