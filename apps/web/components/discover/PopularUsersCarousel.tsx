// apps/web/components/discover/PopularUsersCarousel.tsx
// [Discover V1 — 2026-07-13] Redesigned popular-collectors surface.
// Went from a small avatar-only strip to full cards with a substance
// line: fav base type · shelf size · avg rating given. Discovery is
// about finding people like you, not just the biggest accounts. The
// aggregate fields are computed server-side in
// `apps/web/app/discover/page.tsx` from `collection_logs` and are
// fully optional — if any are null we hide that segment gracefully
// rather than fake data.

import Image from "next/image";
import Link from "next/link";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

export interface PopularUser {
  id: string;
  username: string;
  avatar_url: string | null;
  display_name: string | null;
  is_premium: boolean;
  follower_count: number;
  /** Base type this collector logs most often. */
  favorite_base_type: string | null;
  /** Total slimes logged. */
  slime_count: number | null;
  /** Average rating_overall given, 1-5 scale. */
  avg_rating_given: number | null;
}

interface PopularUsersCarouselProps {
  users: PopularUser[];
}

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatBaseType(base_type: string): string {
  return (
    SLIME_BASE_TYPE_LABELS[base_type as SlimeBaseType] ??
    base_type.replace(/_/g, " ")
  );
}

export default function PopularUsersCarousel({
  users,
}: PopularUsersCarouselProps) {
  return (
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
      {users.map((user) => {
        const initial = (user.username[0] ?? "?").toUpperCase();
        const displayName = user.display_name?.trim() || user.username;
        const specialtyLine = buildSpecialtyLine(user);

        return (
          <Link
            key={user.id}
            href={`/users/${user.username}`}
            className="shrink-0 block"
            aria-label={`View profile: ${user.username}`}
          >
            <article
              className="rounded-2xl p-3.5 flex flex-col items-center text-center transition-transform active:scale-[0.98]"
              style={{
                width: 156,
                background: "rgba(45,10,78,0.28)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <div
                className="rounded-full overflow-hidden relative shrink-0 mb-2.5"
                style={{
                  width: 60,
                  height: 60,
                  boxShadow: user.is_premium
                    ? "0 0 0 2px #39FF14, 0 0 14px rgba(57,255,20,0.35)"
                    : "0 0 0 1px rgba(0,240,255,0.28)",
                }}
              >
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    fill
                    className="object-cover"
                    sizes="60px"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xl font-black"
                    style={{
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      color: "#04110A",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {initial}
                  </div>
                )}
              </div>

              <div
                className="truncate w-full text-[13.5px]"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                }}
              >
                {displayName}
              </div>

              <div
                className="text-[10.5px] font-semibold mt-0.5"
                style={{ color: "#00F0FF" }}
              >
                {formatFollowers(user.follower_count)} followers
              </div>

              {specialtyLine && (
                <div
                  className="mt-2 text-[10.5px] leading-snug"
                  style={{ color: "rgba(245,245,245,0.55)" }}
                >
                  {specialtyLine}
                </div>
              )}
            </article>
          </Link>
        );
      })}
    </div>
  );
}

// Compose the specialty line from whichever fields have real data.
// Bullets separate segments; hide the whole line if we don't have at
// least one segment.
function buildSpecialtyLine(user: PopularUser): string | null {
  const parts: string[] = [];

  if (user.favorite_base_type) {
    parts.push(`${formatBaseType(user.favorite_base_type)} specialist`);
  }
  if (user.slime_count && user.slime_count > 0) {
    parts.push(`${user.slime_count} slimes`);
  }
  if (
    typeof user.avg_rating_given === "number" &&
    !Number.isNaN(user.avg_rating_given)
  ) {
    parts.push(`avg ★${user.avg_rating_given.toFixed(1)} given`);
  }

  if (parts.length === 0) return null;
  return parts.join(" · ");
}
