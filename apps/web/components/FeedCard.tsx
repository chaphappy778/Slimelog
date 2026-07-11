// apps/web/components/FeedCard.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CollectionLog, SlimeBaseType } from "@/lib/types";
import SlimeDetailCard from "@/components/collection/SlimeDetailCard";
import LikeButton from "@/components/collection/LikeButton";

// ─── Types ────────────────────────────────────────────────────────────────────

// [Change F1] slime_type → base_type; added optional subtype_name for
// downstream rendering.
export type FeedCardLog = {
  id: string;
  created_at: string;
  updated_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  subtype_name?: string | null;
  colors: string[] | null;
  rating_overall: number | null;
  image_url: string | null;
  actor_id: string;
  username: string | null;
  avatar_url: string | null;
  like_count: number;
  comment_count: number;
  is_liked_by_current_user: boolean;
  // [Change 1] in_wishlist and activity_type added to type
  in_wishlist: boolean;
  activity_type: string;
};

interface FeedCardProps {
  log: FeedCardLog;
  brandSlugMap: Record<string, string>;
  currentUserId: string | null;
}

// ─── Relative time helper ─────────────────────────────────────────────────────
// [Change F5] Inline replacement for date-fns formatDistanceToNow.

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

// ─── Type badge palette ───────────────────────────────────────────────────────

// [Change F2] Tailwind class-pair map keyed on SlimeBaseType.
const TYPE_STYLE: Record<
  SlimeBaseType,
  { bg: string; text: string; label: string }
> = {
  avalanche: {
    bg: "bg-indigo-900/40",
    text: "text-indigo-300",
    label: "Avalanche",
  },
  beaded: {
    bg: "bg-orange-900/40",
    text: "text-orange-300",
    label: "Beaded",
  },
  butter: {
    bg: "bg-yellow-900/40",
    text: "text-yellow-300",
    label: "Butter",
  },
  clay: { bg: "bg-amber-900/40", text: "text-amber-300", label: "Clay" },
  clear: { bg: "bg-sky-900/40", text: "text-sky-300", label: "Clear" },
  cloud: { bg: "bg-slate-800", text: "text-slate-300", label: "Cloud" },
  cloud_cream: {
    bg: "bg-rose-900/40",
    text: "text-rose-300",
    label: "Cloud Cream",
  },
  floam: { bg: "bg-lime-900/40", text: "text-lime-300", label: "Floam" },
  fluffy: { bg: "bg-pink-900/40", text: "text-pink-300", label: "Fluffy" },
  hybrid: {
    bg: "bg-purple-900/40",
    text: "text-purple-300",
    label: "Hybrid",
  },
  icee: { bg: "bg-cyan-900/40", text: "text-cyan-300", label: "Icee" },
  jelly: { bg: "bg-violet-900/40", text: "text-violet-300", label: "Jelly" },
  magnetic: { bg: "bg-zinc-800", text: "text-zinc-300", label: "Magnetic" },
  sand: { bg: "bg-amber-900/30", text: "text-amber-200", label: "Sand" },
  slay: { bg: "bg-red-900/40", text: "text-red-300", label: "Slay" },
  snow_fizz: {
    bg: "bg-blue-900/40",
    text: "text-blue-300",
    label: "Snow Fizz",
  },
  sugar_scrub: {
    bg: "bg-pink-900/30",
    text: "text-pink-200",
    label: "Sugar Scrub",
  },
  thick_and_glossy: {
    bg: "bg-fuchsia-900/40",
    text: "text-fuchsia-300",
    label: "Thick & Glossy",
  },
  water: { bg: "bg-blue-900/30", text: "text-blue-200", label: "Water" },
  wax_and_wax_cracking: {
    bg: "bg-purple-900/30",
    text: "text-purple-200",
    label: "Wax & Wax Cracking",
  },
};

const fallbackType = {
  bg: "bg-slime-surface",
  text: "text-slime-muted",
  label: "Unknown",
};

// ─── Color swatch map ─────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

// [Change 1 — T98b] Replaced integer star fill with fill bar + toFixed(1)
function Stars({ rating }: { rating: number | null }) {
  if (!rating)
    return <span className="text-xs text-slime-muted">No rating</span>;
  const pct = (rating / 5) * 100;
  return (
    <span
      className="flex items-center gap-2"
      aria-label={`${rating.toFixed(1)} out of 5`}
    >
      <div
        style={{
          width: 64,
          height: 5,
          borderRadius: 3,
          background: "rgba(45,10,78,0.5)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: `${pct}%`,
            background:
              pct > 80
                ? "#39FF14"
                : pct > 50
                  ? "#00F0FF"
                  : "rgba(100,50,200,0.9)",
            borderRadius: 3,
            transition: "width 0.2s ease",
          }}
        />
      </div>
      <span
        className="text-xs font-bold tabular-nums"
        style={{ color: "#39FF14" }}
      >
        {rating.toFixed(1)}/5
      </span>
    </span>
  );
}

function Avatar({
  username,
  avatar_url,
}: {
  username: string | null;
  avatar_url: string | null;
}) {
  const initial = username ? username.charAt(0).toUpperCase() : "?";
  if (avatar_url) {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
        <Image
          src={avatar_url}
          alt={username ?? "user"}
          width={32}
          height={32}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-slime-bg text-xs font-bold shrink-0"
      style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image"
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      <div
        className="max-w-[92vw] max-h-[88vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt="Slime photo"
          width={900}
          height={900}
          className="object-contain max-h-[88vh] rounded-xl"
        />
      </div>
    </div>
  );
}

// ─── CollectionLog builder ────────────────────────────────────────────────────

function buildCollectionLog(log: FeedCardLog): CollectionLog {
  // [Change F4] base_type + subtype_id replace slime_type.
  return {
    id: log.id,
    user_id: log.actor_id,
    slime_id: null,
    brand_id: null,
    slime_name: log.slime_name,
    brand_name_raw: log.brand_name_raw,
    collection_name: null,
    base_type: log.base_type as CollectionLog["base_type"],
    subtype_id: null,
    scent_strength: null,
    colors: log.colors,
    cost_paid: null,
    purchase_price: null,
    purchased_from: null,
    purchased_at: null,
    likes: null,
    dislikes: null,
    notes: null,
    // [Change 1] in_wishlist sourced from log instead of hardcoded false
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
  };
}

// ─── FeedCard ─────────────────────────────────────────────────────────────────

export default function FeedCard({
  log,
  brandSlugMap,
  currentUserId,
}: FeedCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const openDetail = useCallback(() => setShowDetail(true), []);
  const closeDetail = useCallback(() => setShowDetail(false), []);
  const closeLightbox = useCallback(() => setShowLightbox(false), []);

  const handleImageOpen = useCallback(() => {
    setShowLightbox(true);
  }, []);

  // [Change 2] Determine if this card represents a wishlist entry
  const isWishlist =
    log.activity_type === "wishlist_added" || log.in_wishlist === true;

  // [Change F3] TYPE_STYLE lookup keyed by base_type cast to SlimeBaseType.
  const typeStyle =
    (log.base_type && TYPE_STYLE[log.base_type as SlimeBaseType]) ||
    fallbackType;
  const slimeName = log.slime_name ?? "Untitled Slime";
  const brandName = log.brand_name_raw ?? null;
  // 2026-07-11: brandSlugMap keys are lowercased (see page.tsx builder)
  // so lookups match regardless of case in brand_name_raw.
  const brandSlug = brandName
    ? (brandSlugMap[brandName.toLowerCase()] ?? null)
    : null;
  // [Change F5] Inline relative time replaces formatDistanceToNow.
  const timeAgo = formatRelativeTime(log.created_at);

  // Batch 2 (2026-07-11): photo-hero card treatment.
  //
  // Photo placeholder: when log.image_url is null, we build a diagonal
  // gradient from the first two color swatches (per spec). If there
  // are 0 or 1 colors, we lean on the app's brand purple so the slot
  // never looks broken.
  const firstColor = log.colors?.[0] ?? null;
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

  return (
    <>
      {/* Whole card tap opens SlimeDetailCard (unchanged behavior).
          Wishlist cards stay non-tappable. */}
      <article
        className="relative w-full max-w-lg mx-auto rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "rgba(45,10,78,0.3)",
          border: "1px solid rgba(45,10,78,0.7)",
          boxShadow: "inset 0 0 24px rgba(45,10,78,0.12)",
          cursor: isWishlist ? "default" : "pointer",
        }}
        onClick={isWishlist ? undefined : openDetail}
      >
        {/* Author row */}
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ padding: "12px 13px 10px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 min-w-0">
            {log.username ? (
              <Link
                href={`/users/${log.username}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Avatar username={log.username} avatar_url={log.avatar_url} />
              </Link>
            ) : (
              <Avatar username={log.username} avatar_url={log.avatar_url} />
            )}
            <div className="min-w-0">
              {log.username ? (
                <Link
                  href={`/users/${log.username}`}
                  className="block text-[13px] font-bold leading-tight truncate hover:text-slime-accent transition-colors"
                  style={{ color: "#ffffff" }}
                >
                  @{log.username}
                </Link>
              ) : (
                <span
                  className="block text-[13px] font-bold leading-tight truncate"
                  style={{ color: "#ffffff" }}
                >
                  @anonymous
                </span>
              )}
              <time
                className="block text-[11px] leading-tight mt-0.5"
                dateTime={log.created_at}
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                logged · {timeAgo}
              </time>
            </div>
          </div>
          {/* 2026-07-11: removed the three-dot menu placeholder that
              lived here in the initial batch 2 shipment. It looked
              like a "visit brand" affordance (which was where the dots
              lived on the old card) and wasn't wired to anything, so
              taps did nothing. When we build a real post menu (report /
              mute / etc) it goes back here. */}
        </div>

        {/* Photo (4:5 aspect). Gradient fallback when no image. */}
        <div
          className="relative shrink-0"
          style={{ aspectRatio: "4/5", overflow: "hidden" }}
        >
          {log.image_url ? (
            <Image
              src={log.image_url}
              alt={slimeName}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: photoGradient }}
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,0,20,0.15) 0%, transparent 22% 60%, rgba(10,0,20,0.55) 100%)",
            }}
          />

          {/* Overlay badges: base type + first color name. */}
          <div className="absolute top-3 left-3 flex gap-1.5 z-[3]">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{
                background: "rgba(255,255,255,0.85)",
                color: "#0a0014",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
              }}
            >
              {typeStyle.label}
            </span>
            {firstColor && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  color: "#0a0014",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block w-2.5 h-2.5 rounded-full border border-black/25"
                  style={{ background: getSwatchColor(firstColor) }}
                />
                {firstColor}
              </span>
            )}
          </div>

          {/* Floating rating chip (or wishlist chip if wishlist card).
              Non-wishlist cards with no rating render nothing here. */}
          {isWishlist ? (
            <div
              className="absolute right-3 bottom-3 z-[3] flex items-center gap-1 px-3 py-1.5 rounded-2xl text-[11px] font-black uppercase tracking-widest"
              style={{
                background: "rgba(10,0,20,0.6)",
                border: "1px solid rgba(255,0,229,0.55)",
                color: "#FF00E5",
                boxShadow: "0 0 12px rgba(255,0,229,0.35)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 21s-7.5-4.6-10-9.2C.3 8.4 1.8 5 5 5c2 0 3.2 1.2 4 2.3C9.8 6.2 11 5 13 5c3.2 0 4.7 3.4 3 6.8C19.5 16.4 12 21 12 21Z" />
              </svg>
              Wishlist
            </div>
          ) : (
            typeof log.rating_overall === "number" && (
              <div
                className="absolute right-3 bottom-3 z-[3] flex items-baseline gap-1 px-3 py-2 rounded-2xl"
                style={{
                  background: "rgba(10,0,20,0.6)",
                  border: "1px solid rgba(57,255,20,0.4)",
                  boxShadow: "0 0 12px rgba(57,255,20,0.4)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    color: "#39FF14",
                    fontSize: 14,
                    lineHeight: 1,
                    marginRight: 2,
                  }}
                >
                  ★
                </span>
                <span
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 900,
                    fontSize: 22,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                  }}
                >
                  {log.rating_overall.toFixed(1)}
                </span>
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  /5
                </span>
              </div>
            )
          )}
        </div>

        {/* Body: slime name + brand */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-0.5 shrink-0">
          <h2
            className="text-[19px] font-black text-white leading-tight"
            style={{
              fontFamily: "Montserrat, Inter, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            {slimeName}
          </h2>
          {brandName && (
            <div
              className="text-[12.5px] font-semibold"
              style={{ color: "#00F0FF" }}
            >
              {brandSlug ? (
                <Link
                  href={`/brands/${brandSlug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 hover:text-slime-accent transition-colors"
                >
                  {brandName}
                  {/* Small arrow so users know the brand name is
                      tappable (moved the "visit brand" affordance
                      that used to live on the 3 dots to this arrow). */}
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
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ) : (
                <span>{brandName}</span>
              )}
              {/* 2026-07-11: removed the duplicate "· Butter/Clay/etc"
                  type label that used to sit next to the brand name.
                  The type is already communicated by the pill overlay
                  on the photo, so showing it here again was redundant. */}
            </div>
          )}
        </div>

        {/* Footer: likes + comments + "Open review →" hint */}
        <div
          className="flex items-center gap-4 mx-4 mb-4 pt-3"
          style={{ borderTop: "1px solid rgba(120,60,180,0.2)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <LikeButton
            logId={log.id}
            initialCount={log.like_count}
            initialLiked={log.is_liked_by_current_user}
            currentUserId={currentUserId}
          />
          <div
            className="flex items-center gap-1.5 text-[13px] font-bold"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            <svg
              width="17"
              height="17"
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
          </div>
          {!isWishlist && (
            // "Open review →" routes to the full review page at
            // /slimes/[id] (same destination as the old "View Full
            // Review" button that lived at the bottom of the card).
            // Whole-card tap still opens the in-feed SlimeDetailCard
            // modal via openDetail — so users get a preview from a
            // quick tap and the full experience from the explicit
            // "Open review" click.
            <Link
              href={`/slimes/${log.id}`}
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-[11.5px] font-bold flex items-center gap-1 transition-opacity active:opacity-70"
              style={{ color: "#00F0FF" }}
              aria-label="Open review"
            >
              Open review →
            </Link>
          )}
        </div>
      </article>


      {/* ── Level 2: Full-screen detail overlay ──
          [Change 2] Only mounted for non-wishlist cards */}
      {showDetail && !isWishlist && (
        <SlimeDetailCard
          log={buildCollectionLog(log)}
          imageUrl={log.image_url}
          brandSlug={brandSlug}
          brandLogoUrl={null}
          onClose={closeDetail}
          onImageOpen={handleImageOpen}
          likeCount={log.like_count}
          commentCount={log.comment_count}
          isLikedByCurrentUser={log.is_liked_by_current_user}
          currentUserId={currentUserId}
          ownerUsername={log.username}
          ownerAvatarUrl={log.avatar_url}
        />
      )}

      {/* ── Lightbox — z-[200] renders above detail overlay z-[100] ── */}
      {showLightbox && log.image_url && (
        <Lightbox src={log.image_url} onClose={closeLightbox} />
      )}
    </>
  );
}
