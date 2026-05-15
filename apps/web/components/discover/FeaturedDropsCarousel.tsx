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
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filtered.map((drop) => {
            const brandInitial = (drop.brand_name?.[0] ?? "?").toUpperCase();
            const dropInitial = (drop.name?.[0] ?? "?").toUpperCase();
            const dotColor = getStatusDotColor(drop.status);

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

                  {/* Brand logo overlapping cover/body */}
                  <div
                    className="absolute rounded-full overflow-hidden"
                    style={{
                      width: 44,
                      height: 44,
                      bottom: 58,
                      left: 12,
                      border: "2px solid #0F0018",
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

                  {/* Body */}
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
