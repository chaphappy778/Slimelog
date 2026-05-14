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
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-none px-4"
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
                    width: 160,
                    background: "rgba(45,10,78,0.3)",
                    border: "1px solid rgba(45,10,78,0.7)",
                  }}
                >
                  {/* Cover image / placeholder */}
                  <div
                    className="relative w-full overflow-hidden"
                    style={{ height: 80 }}
                  >
                    {drop.cover_image_url ? (
                      <Image
                        src={drop.cover_image_url}
                        alt={drop.name ?? "Drop cover"}
                        fill
                        className="object-cover"
                        sizes="160px"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-2xl font-black"
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
                      width: 36,
                      height: 36,
                      bottom: 52,
                      left: 10,
                      border: "2px solid #0F0018",
                    }}
                  >
                    {drop.logo_url ? (
                      <Image
                        src={drop.logo_url}
                        alt={drop.brand_name ?? "Brand"}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-black"
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
                  <div style={{ padding: "10px", paddingTop: 24 }}>
                    {/* Status dot + name row */}
                    <div className="flex items-center gap-1.5 mb-0.5">
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
                        className="text-xs font-bold truncate"
                        style={{ color: "rgba(245,245,245,0.9)" }}
                      >
                        {drop.name ?? "Unnamed drop"}
                      </p>
                    </div>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: "#FF00E5" }}
                    >
                      {drop.brand_name ?? "Unknown brand"}
                    </p>
                    <p
                      className="text-[10px] mt-0.5"
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
