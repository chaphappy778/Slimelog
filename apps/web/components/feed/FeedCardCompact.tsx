// apps/web/components/feed/FeedCardCompact.tsx
//
// Feed rework batch 3 (2026-07-11): "Card C" compact list treatment.
// Optional density mode for power users scanning the feed fast. ~5 cards
// per screen vs ~1.3 with the photo-hero default (FeedCard).
//
// Behavior parity with FeedCard (the default photo-hero card):
//   - whole row tap opens SlimeDetailCard modal (via onOpen prop —
//     kept as a callback here so the client parent owns the modal state
//     just like the photo-hero card owns it internally)
//   - inline like button + comment count
//   - brand name is a link (with tap arrow) when the brand exists in
//     the catalog, plain text otherwise
//   - wishlist rows show a small magenta chip in place of the rating
//   - no image? diagonal gradient fallback from the first two log colors
//
// Not preserved (deliberately — it's the compact mode):
//   - author avatar (username still shown inline)
//   - photo aspect (square thumb rather than 4:5)
//   - overlay badges (type only, no color name)

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { SlimeBaseType } from "@/lib/types";
import type { FeedCardLog } from "@/components/FeedCard";
import SlimeDetailCard from "@/components/collection/SlimeDetailCard";
import LikeButton from "@/components/collection/LikeButton";

interface Props {
  log: FeedCardLog;
  brandSlugMap: Record<string, string>;
  currentUserId: string | null;
}

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

const TYPE_LABELS: Record<SlimeBaseType, string> = {
  avalanche: "Avalanche",
  beaded: "Beaded",
  butter: "Butter",
  clear: "Clear",
  cloud: "Cloud",
  cloud_cream: "Cloud Cream",
  floam: "Floam",
  fluffy: "Fluffy",
  hybrid: "Hybrid",
  icee: "Icee",
  jelly: "Jelly",
  magnetic: "Magnetic",
  sand: "Sand",
  slay: "Slay",
  snow_fizz: "Snow Fizz",
  sugar_scrub: "Sugar Scrub",
  thick_and_glossy: "Thick & Glossy",
  water: "Water",
  wax_and_wax_cracking: "Wax & Wax Cracking",
};

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;
  return `${Math.floor(diffMonths / 12)}y`;
}

export default function FeedCardCompact({
  log,
  brandSlugMap,
  currentUserId,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const openDetail = useCallback(() => setShowDetail(true), []);
  const closeDetail = useCallback(() => setShowDetail(false), []);

  const isWishlist =
    log.activity_type === "wishlist_added" || log.in_wishlist === true;
  const slimeName = log.slime_name ?? "Untitled Slime";
  const brandName = log.brand_name_raw ?? null;
  const brandSlug = brandName
    ? (brandSlugMap[brandName.toLowerCase()] ?? null)
    : null;
  const typeLabel = log.base_type
    ? (TYPE_LABELS[log.base_type as SlimeBaseType] ?? log.base_type)
    : null;
  const timeAgo = formatRelativeTime(log.created_at);

  const photoGradient: string = (() => {
    const swatches = (log.colors ?? []).slice(0, 2).map(getSwatchColor);
    if (swatches.length === 2) {
      return `linear-gradient(150deg, ${swatches[0]}, ${swatches[1]})`;
    }
    if (swatches.length === 1) {
      return `linear-gradient(150deg, ${swatches[0]}, rgba(45,10,78,0.6))`;
    }
    return "linear-gradient(150deg, rgba(45,10,78,0.6), rgba(45,10,78,0.3))";
  })();

  const openReviewHref = `/slimes/${log.id}`;

  return (
    <>
      <article
        className="relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden flex items-stretch gap-3 p-2.5"
        style={{
          background: "rgba(45,10,78,0.3)",
          border: "1px solid rgba(45,10,78,0.7)",
          cursor: isWishlist ? "default" : "pointer",
        }}
        onClick={isWishlist ? undefined : openDetail}
      >
        {/* Square thumbnail with mini score badge */}
        <div
          className="relative shrink-0 rounded-xl overflow-hidden"
          style={{ width: 76, height: 76 }}
        >
          {log.image_url ? (
            <Image
              src={log.image_url}
              alt={slimeName}
              fill
              className="object-cover"
              sizes="76px"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: photoGradient }}
            />
          )}
          {isWishlist ? (
            <span
              className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(10,0,20,0.7)",
                color: "#FF00E5",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            >
              Wish
            </span>
          ) : (
            typeof log.rating_overall === "number" && (
              <span
                className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded-md text-[12px] font-black"
                style={{
                  background: "rgba(10,0,20,0.7)",
                  color: "#39FF14",
                  fontFamily: "Montserrat, sans-serif",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                ★ {log.rating_overall.toFixed(1)}
              </span>
            )
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div
              className="text-[15px] font-black leading-tight truncate"
              style={{
                color: "#ffffff",
                fontFamily: "Montserrat, Inter, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              {slimeName}
            </div>
            {brandName && (
              <div className="text-[11.5px] font-semibold mt-0.5">
                {brandSlug ? (
                  <Link
                    href={`/brands/${brandSlug}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 hover:text-slime-accent transition-colors"
                    style={{ color: "#00F0FF" }}
                  >
                    {brandName}
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                ) : (
                  <span style={{ color: "#00F0FF" }}>{brandName}</span>
                )}
              </div>
            )}
            {typeLabel && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {typeLabel}
                </span>
              </div>
            )}
          </div>
          {/* Footer row */}
          <div
            className="flex items-center gap-2 mt-1.5 text-[11px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <LikeButton
              logId={log.id}
              initialCount={log.like_count}
              initialLiked={log.is_liked_by_current_user}
              currentUserId={currentUserId}
            />
            <span className="flex items-center gap-1 font-bold">
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
                <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4L4 21l1.1-3.9A8.4 8.4 0 1 1 21 11.5Z" />
              </svg>
              {log.comment_count}
            </span>
            <span className="truncate">
              @{log.username ?? "anonymous"} · {timeAgo}
            </span>
            {!isWishlist && (
              <Link
                href={openReviewHref}
                onClick={(e) => e.stopPropagation()}
                className="ml-auto text-[10.5px] font-bold shrink-0"
                style={{ color: "#00F0FF" }}
              >
                Open →
              </Link>
            )}
          </div>
        </div>
      </article>

      {showDetail && !isWishlist && (
        <SlimeDetailCard
          log={{
            id: log.id,
            user_id: log.actor_id,
            slime_id: null,
            brand_id: null,
            slime_name: log.slime_name,
            brand_name_raw: log.brand_name_raw,
            collection_name: null,
            base_type: log.base_type as SlimeBaseType | null,
            subtype_id: null,
            scent_strength: null,
            condition: null,
            colors: log.colors,
            cost_paid: null,
            purchase_price: null,
            purchased_from: null,
            purchased_at: null,
            likes: null,
            dislikes: null,
            notes: null,
            in_collection: !log.in_wishlist,
            in_wishlist: log.in_wishlist,
            rating_texture: null,
            rating_sound: null,
            rating_drizzle: null,
            rating_creativity: null,
            rating_sensory_fit: null,
            rating_overall: log.rating_overall,
            is_public: true,
            created_at: log.created_at,
            updated_at: log.updated_at,
          }}
          imageUrl={log.image_url}
          brandSlug={brandSlug}
          brandLogoUrl={null}
          onClose={closeDetail}
          onImageOpen={() => {}}
          likeCount={log.like_count}
          commentCount={log.comment_count}
          isLikedByCurrentUser={log.is_liked_by_current_user}
          currentUserId={currentUserId}
          ownerUsername={log.username}
          ownerAvatarUrl={log.avatar_url}
        />
      )}
    </>
  );
}
