"use client";
// apps/web/components/FeedCard.tsx

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import type { CollectionLog } from "@/lib/types";
import SlimeDetailCard from "@/components/collection/SlimeDetailCard";
import LikeButton from "@/components/collection/LikeButton";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FeedCardLog = {
  id: string;
  created_at: string;
  updated_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
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

// ─── Type badge palette ───────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> =
  {
    butter: {
      bg: "bg-yellow-900/40",
      text: "text-yellow-300",
      label: "Butter",
    },
    clear: { bg: "bg-sky-900/40", text: "text-sky-300", label: "Clear" },
    cloud: { bg: "bg-slate-800", text: "text-slate-300", label: "Cloud" },
    icee: { bg: "bg-cyan-900/40", text: "text-cyan-300", label: "Icee" },
    fluffy: { bg: "bg-pink-900/40", text: "text-pink-300", label: "Fluffy" },
    floam: { bg: "bg-lime-900/40", text: "text-lime-300", label: "Floam" },
    snow_fizz: {
      bg: "bg-blue-900/40",
      text: "text-blue-300",
      label: "Snow Fizz",
    },
    thick_and_glossy: {
      bg: "bg-fuchsia-900/40",
      text: "text-fuchsia-300",
      label: "Thick & Glossy",
    },
    jelly: { bg: "bg-violet-900/40", text: "text-violet-300", label: "Jelly" },
    beaded: {
      bg: "bg-orange-900/40",
      text: "text-orange-300",
      label: "Beaded",
    },
    clay: { bg: "bg-amber-900/40", text: "text-amber-300", label: "Clay" },
    cloud_cream: {
      bg: "bg-rose-900/40",
      text: "text-rose-300",
      label: "Cloud Cream",
    },
    magnetic: { bg: "bg-zinc-800", text: "text-zinc-300", label: "Magnetic" },
    thermochromic: {
      bg: "bg-purple-900/40",
      text: "text-purple-300",
      label: "Thermochromic",
    },
    avalanche: {
      bg: "bg-indigo-900/40",
      text: "text-indigo-300",
      label: "Avalanche",
    },
    slay: { bg: "bg-red-900/40", text: "text-red-300", label: "Slay" },
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

function Stars({ rating }: { rating: number | null }) {
  if (!rating)
    return <span className="text-xs text-slime-muted">No rating</span>;
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={n <= rating ? "#39FF14" : "rgba(57,255,20,0.15)"}
          aria-hidden="true"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span className="ml-1.5 text-xs text-slime-muted font-medium">
        {rating}/5
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
  return {
    id: log.id,
    user_id: log.actor_id,
    slime_id: null,
    brand_id: null,
    slime_name: log.slime_name,
    brand_name_raw: log.brand_name_raw,
    collection_name: null,
    slime_type: log.slime_type as CollectionLog["slime_type"],
    colors: log.colors,
    scent: null,
    cost_paid: null,
    purchased_from: null,
    purchased_at: null,
    likes: null,
    dislikes: null,
    notes: null,
    // [Change 1] in_wishlist sourced from log instead of hardcoded false
    in_collection: !log.in_wishlist,
    in_wishlist: log.in_wishlist,
    rating_texture: null,
    rating_scent: null,
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

  const typeStyle =
    (log.slime_type && TYPE_STYLE[log.slime_type]) || fallbackType;
  const slimeName = log.slime_name ?? "Untitled Slime";
  const brandName = log.brand_name_raw ?? null;
  const brandSlug = brandName ? (brandSlugMap[brandName] ?? null) : null;
  const timeAgo = formatDistanceToNow(new Date(log.created_at), {
    addSuffix: true,
  });

  return (
    <>
      {/* ── Card ──
          [Change 2] onClick only wired when not a wishlist card.
          Wishlist cards are display-only — no detail overlay. */}
      <article
        className="relative w-full max-w-lg mx-auto rounded-2xl overflow-hidden flex flex-col"
        style={{
          minHeight: "auto",
          background: "rgba(45,10,78,0.25)",
          border: "1px solid rgba(45,10,78,0.7)",
          // [Change 2] cursor: default for wishlist cards, pointer for logged cards
          cursor: isWishlist ? "default" : "pointer",
        }}
        onClick={isWishlist ? undefined : openDetail}
      >
        {/* ── Avatar + username + timestamp row ── */}
        <div
          className="flex items-center justify-between gap-2 shrink-0"
          style={{ padding: "10px 14px 0" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <Avatar username={log.username} avatar_url={log.avatar_url} />
            {log.username ? (
              <Link
                href={`/users/${log.username}`}
                className="text-sm font-semibold hover:text-slime-accent transition-colors"
                // [Change 2] Wishlist cards use magenta-purple for username accent
                style={{ color: isWishlist ? "#CC44FF" : "#FF00E5" }}
              >
                @{log.username}
              </Link>
            ) : (
              <span
                className="text-sm font-semibold"
                style={{ color: isWishlist ? "#CC44FF" : "#FF00E5" }}
              >
                @anonymous
              </span>
            )}
          </div>
          <time
            className="text-[11px] text-white/60 font-medium"
            dateTime={log.created_at}
          >
            {timeAgo}
          </time>
        </div>

        {/* ── Image area ── */}
        {log.image_url && (
          <div className="relative shrink-0 mt-2" style={{ height: "220px" }}>
            <Image
              src={log.image_url}
              alt={slimeName}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 40%, rgba(10,0,20,0.55) 100%)",
              }}
            />
          </div>
        )}

        {/* ── Card body ── */}
        <div className="px-4 pt-3 pb-2 flex flex-col gap-2.5 shrink-0">
          <h2
            className="text-lg font-extrabold text-white leading-tight"
            style={{ fontFamily: "Montserrat, Inter, sans-serif" }}
          >
            {slimeName}
          </h2>

          {brandName && (
            <div className="flex items-center justify-between gap-2">
              {brandSlug ? (
                <>
                  <Link
                    href={`/brands/${brandSlug}`}
                    className="text-sm font-medium hover:text-slime-accent transition-colors"
                    // [Change 2] Brand name uses #CC44FF for wishlist cards, #00F0FF for logged
                    style={{ color: isWishlist ? "#CC44FF" : "#00F0FF" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {brandName}
                  </Link>
                  <Link
                    href={`/brands/${brandSlug}`}
                    aria-label={`Visit ${brandName}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-slime-muted hover:text-slime-cyan transition-colors"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </Link>
                </>
              ) : (
                <span
                  className="text-sm font-medium"
                  style={{
                    color: isWishlist ? "#CC44FF" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {brandName}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${typeStyle.bg} ${typeStyle.text}`}
            >
              {typeStyle.label}
            </span>
            {log.colors &&
              log.colors.length > 0 &&
              log.colors
                .slice(0, 5)
                .map((c, i) => (
                  <div
                    key={i}
                    className="w-4 h-4 rounded-full border border-white/15 shrink-0"
                    style={{ background: getSwatchColor(c) }}
                    title={c}
                    aria-label={c}
                  />
                ))}
          </div>

          {/* [Change 2] Wishlist cards show "Added to Wishlist" label instead of star rating */}
          {isWishlist ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#CC44FF" }}>
              Added to Wishlist
            </span>
          ) : (
            <Stars rating={log.rating_overall} />
          )}

          <div className="flex items-center gap-4">
            <div onClick={(e) => e.stopPropagation()}>
              <LikeButton
                logId={log.id}
                initialCount={log.like_count}
                initialLiked={log.is_liked_by_current_user}
                currentUserId={currentUserId}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="text-xs text-slime-muted">
                {log.comment_count}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card footer ──
            [Change 2] Wishlist cards: no "View Full Review" button.
            Show muted "No review yet" text instead. */}
        <div className="px-4 pb-4 pt-1 shrink-0">
          {isWishlist ? (
            <p className="text-center text-xs text-slime-muted py-2">
              No review yet
            </p>
          ) : (
            <Link
              href={`/slimes/${log.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block w-full text-center py-2.5 rounded-xl text-sm font-bold text-slime-bg transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              }}
            >
              View Full Review
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
        />
      )}

      {/* ── Lightbox — z-[200] renders above detail overlay z-[100] ── */}
      {showLightbox && log.image_url && (
        <Lightbox src={log.image_url} onClose={closeLightbox} />
      )}
    </>
  );
}
