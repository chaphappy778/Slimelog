"use client";
// apps/web/components/collection/SlimeDetailCard.tsx

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CollectionLog } from "@/lib/types";
import LikeButton from "@/components/collection/LikeButton";
import CommentSection from "@/components/collection/CommentSection";

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  icee: "#4FC3F7",
  fluffy: "#FF6B9D",
  floam: "#8BC34A",
  snow_fizz: "#E0E0E0",
  thick_and_glossy: "#9B59B6",
  jelly: "#4ECDC4",
  beaded: "#FF00E5",
  clay: "#E74C3C",
  cloud_cream: "#FFE66D",
  magnetic: "#78909C",
  thermochromic: "#F39C12",
  avalanche: "#3498DB",
  slay: "#39FF14",
};

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

const RATING_DIMENSIONS: Array<{ key: keyof CollectionLog; label: string }> = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_scent", label: "Scent" },
  { key: "rating_sound", label: "Sound" },
  { key: "rating_drizzle", label: "Drizzle" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Sensory Fit" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSwatchColor(colorName: string): string {
  const lower = colorName.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_SWATCHES)) {
    if (lower.includes(key)) return val;
  }
  return "#666";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RatingDots({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: i <= value ? "#39FF14" : "rgba(57,255,20,0.15)",
          }}
        />
      ))}
    </div>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={n <= rating ? "#39FF14" : "rgba(57,255,20,0.15)"}
          aria-hidden="true"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
      <span
        style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", marginLeft: 6 }}
      >
        {rating}/5
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  log: CollectionLog;
  imageUrl: string | null;
  brandSlug: string | null;
  brandLogoUrl: string | null;
  onClose: () => void;
  onImageOpen: () => void;
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
  currentUserId: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlimeDetailCard({
  log,
  imageUrl,
  brandSlug,
  brandLogoUrl,
  onClose,
  onImageOpen,
  likeCount,
  commentCount,
  isLikedByCurrentUser,
  currentUserId,
}: Props) {
  const commentRef = useRef<HTMLDivElement>(null);

  // [Bug 1] Live comment count — initialized from prop, updated via onCountChange
  const [liveCommentCount, setLiveCommentCount] = useState(commentCount);

  const typeColor = log.slime_type
    ? (TYPE_COLORS[log.slime_type] ?? "#39FF14")
    : "#39FF14";

  const activeDimensions = RATING_DIMENSIONS.filter(
    ({ key }) => typeof log[key] === "number",
  );

  const brandInitial = log.brand_name_raw
    ? log.brand_name_raw.charAt(0).toUpperCase()
    : "?";

  function scrollToComments() {
    commentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // [Change 1] IMAGE_HEIGHT reduced from 50vh to 28vh
  const IMAGE_HEIGHT = "28vh";
  // [Change 1] OVERLAP is conditional — 56 when image exists, 0 when no image
  const OVERLAP = imageUrl ? 56 : 0;

  return (
    // Root overlay — position: fixed, full viewport, scrollable.
    // overflowY: "auto" here breaks position: sticky on descendants, so the
    // View Full Review footer uses position: fixed instead.
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#0A0A0A",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* [Change 1] Floating header — moved OUTSIDE the image region so it
          always renders regardless of whether an image exists. When no image,
          it sits at the top with a dark semi-transparent background. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 110,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          background: imageUrl ? "transparent" : "rgba(10,0,20,0.85)",
          backdropFilter: imageUrl ? "none" : "blur(8px)",
          WebkitBackdropFilter: imageUrl ? "none" : "blur(8px)",
          // When image exists, absolute positioning overlaps the image below
          ...(imageUrl
            ? {
                position: "absolute" as const,
                top: 0,
                left: 0,
                right: 0,
                background: "transparent",
              }
            : {}),
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Go back"
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(10,0,20,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>

        <h1
          style={{
            flex: 1,
            margin: 0,
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: "Montserrat, Inter, sans-serif",
            textShadow: imageUrl ? "0 1px 6px rgba(0,0,0,0.7)" : "none",
          }}
        >
          {log.slime_name ?? "Unnamed Slime"}
        </h1>
      </div>

      {/* [Change 1] Image region — only rendered when imageUrl exists.
          Purple gradient placeholder removed entirely. */}
      {imageUrl && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: IMAGE_HEIGHT,
            flexShrink: 0,
            cursor: "zoom-in",
            // Pull up behind the absolute header
            marginTop: "-64px",
          }}
          onClick={onImageOpen}
        >
          <Image
            src={imageUrl}
            alt={log.slime_name ?? "Slime photo"}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(10,0,20,0.55) 75%, rgba(10,0,20,0.85) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: OVERLAP + 10,
              right: 14,
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              background: "rgba(0,0,0,0.35)",
              padding: "3px 9px",
              borderRadius: 6,
              pointerEvents: "none",
            }}
          >
            tap to enlarge
          </div>
        </div>
      )}

      {/* ── Info card ── */}
      <div
        style={{
          position: "relative",
          // [Change 1] marginTop and borderRadius conditional on imageUrl
          marginTop: imageUrl ? -OVERLAP : 0,
          background: "#0F0018",
          borderRadius: imageUrl ? "24px 24px 0 0" : 0,
          minHeight: imageUrl
            ? `calc(100vh - ${IMAGE_HEIGHT} + ${OVERLAP}px)`
            : "calc(100vh - 64px)",
          paddingTop: imageUrl ? OVERLAP + 12 : 16,
        }}
      >
        {/* Brand logo thumbnail — only shown when image exists (sits in the overlap zone) */}
        {imageUrl && (
          <div
            style={{
              position: "absolute",
              top: -28,
              left: 16,
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "2px solid #0F0018",
              overflow: "hidden",
              boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
              flexShrink: 0,
            }}
          >
            {brandLogoUrl ? (
              <Image
                src={brandLogoUrl}
                alt={log.brand_name_raw ?? "Brand"}
                width={56}
                height={56}
                className="object-cover w-full h-full"
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
        )}

        {/* Info card body
            paddingBottom: 140 — clears the fixed footer */}
        <div
          style={{
            padding: "0 16px",
            paddingBottom: 100,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 900,
              color: "#fff",
              lineHeight: 1.2,
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            {log.slime_name ?? "Unnamed Slime"}
          </h2>

          {/* Brand row */}
          {log.brand_name_raw && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginTop: -6,
              }}
            >
              {brandSlug ? (
                <>
                  <Link
                    href={`/brands/${brandSlug}`}
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#00F0FF",
                      textDecoration: "none",
                    }}
                  >
                    {log.brand_name_raw}
                  </Link>
                  <Link
                    href={`/brands/${brandSlug}`}
                    aria-label={`Visit ${log.brand_name_raw}`}
                    style={{ color: "rgba(255,255,255,0.3)", lineHeight: 0 }}
                  >
                    <svg
                      width="18"
                      height="18"
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
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {log.brand_name_raw}
                </span>
              )}
            </div>
          )}

          {/* Type badge + collection status + color swatches */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              alignItems: "center",
            }}
          >
            {log.slime_type && (
              <span
                style={{
                  padding: "3px 11px",
                  borderRadius: 20,
                  fontSize: 12,
                  background: `${typeColor}18`,
                  color: typeColor,
                  border: `1px solid ${typeColor}40`,
                  fontWeight: 600,
                }}
              >
                {log.slime_type.replace(/_/g, " ")}
              </span>
            )}
            {log.in_wishlist ? (
              <span
                style={{
                  padding: "3px 11px",
                  borderRadius: 20,
                  fontSize: 12,
                  background: "rgba(148,0,211,0.15)",
                  color: "#CC44FF",
                  border: "1px solid rgba(148,0,211,0.35)",
                }}
              >
                Wishlist
              </span>
            ) : log.in_collection ? (
              <span
                style={{
                  padding: "3px 11px",
                  borderRadius: 20,
                  fontSize: 12,
                  background: "rgba(57,255,20,0.12)",
                  color: "#39FF14",
                  border: "1px solid rgba(57,255,20,0.3)",
                }}
              >
                In Collection
              </span>
            ) : null}
            {log.colors &&
              log.colors.length > 0 &&
              log.colors.map((c: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "3px 9px",
                    borderRadius: 20,
                    background: "rgba(45,10,78,0.4)",
                    border: "1px solid rgba(45,10,78,0.6)",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: getSwatchColor(c),
                      flexShrink: 0,
                      border: "1px solid rgba(255,255,255,0.15)",
                    }}
                  />
                  <span
                    style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}
                  >
                    {c}
                  </span>
                </div>
              ))}
          </div>

          {/* Overall rating */}
          {typeof log.rating_overall === "number" && (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: "#39FF14",
                  lineHeight: 1,
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                {log.rating_overall}
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <StarRow rating={log.rating_overall} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  overall rating
                </span>
              </div>
            </div>
          )}

          {/* Achievement placeholder — renders when badge system is built */}

          {/* Like + Comment action bar */}
          <div
            style={{
              display: "flex",
              borderTop: "1px solid rgba(45,10,78,0.6)",
              borderBottom: "1px solid rgba(45,10,78,0.6)",
              margin: "2px 0",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "13px 0",
              }}
            >
              <LikeButton
                logId={log.id}
                initialCount={likeCount}
                initialLiked={isLikedByCurrentUser}
                currentUserId={currentUserId}
              />
            </div>

            <div
              style={{
                width: 1,
                background: "rgba(45,10,78,0.6)",
                flexShrink: 0,
              }}
            />

            <button
              type="button"
              onClick={scrollToComments}
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                padding: "13px 0",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Comment</span>
              {/* [Bug 1] Live count from state, not static prop */}
              {liveCommentCount > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.3)",
                    fontWeight: 400,
                  }}
                >
                  {liveCommentCount}
                </span>
              )}
            </button>
          </div>

          {/* Dimension rating grid */}
          {activeDimensions.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px 16px",
                padding: "14px",
                background: "rgba(45,10,78,0.25)",
                borderRadius: 14,
                border: "1px solid rgba(45,10,78,0.5)",
              }}
            >
              {activeDimensions.map(({ key, label }) => (
                <div
                  key={key}
                  style={{ display: "flex", flexDirection: "column", gap: 5 }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <RatingDots value={log[key] as number} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "#39FF14",
                        fontWeight: 700,
                      }}
                    >
                      {log[key] as number}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
                fontStyle: "italic",
                lineHeight: 1.6,
              }}
            >
              {log.notes}
            </p>
          )}

          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {log.created_at && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  background: "rgba(45,10,78,0.35)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                Logged{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(log.created_at))}
              </span>
            )}
            {typeof log.cost_paid === "number" && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  background: "rgba(45,10,78,0.35)",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(log.cost_paid)}
              </span>
            )}
            {log.purchased_from && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  background: "rgba(45,10,78,0.35)",
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                {log.purchased_from}
              </span>
            )}
            {log.purchased_at && (
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: 20,
                  fontSize: 11,
                  background: "rgba(45,10,78,0.35)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(log.purchased_at))}
              </span>
            )}
          </div>

          {/* Comment section */}
          {/* [Bug 1] onCountChange wired to live state setter */}
          <div ref={commentRef}>
            <CommentSection
              logId={log.id}
              currentUserId={currentUserId}
              onCountChange={setLiveCommentCount}
            />
          </div>
        </div>
      </div>

      {/* View Full Review — position: fixed so it is always visible
          regardless of scroll position. The root overlay has overflowY: "auto"
          which breaks position: sticky on descendants.
          padding: "12px 16px 36px" clears the ~64px bottom nav bar. */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: 0,
          right: 0,
          zIndex: 101,
          background: "#0F0018",
          borderTop: "1px solid rgba(45,10,78,0.4)",
          padding: "12px 16px 80px",
        }}
      >
        <Link
          href={`/slimes/${log.id}`}
          style={{
            display: "block",
            textAlign: "center",
            padding: "15px 0",
            borderRadius: 14,
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#0A0A0A",
            fontSize: 15,
            fontWeight: 800,
            textDecoration: "none",
            letterSpacing: "0.02em",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          View Full Review
        </Link>
      </div>
    </div>
  );
}
