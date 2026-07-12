// apps/web/components/leaderboard/RankRow.tsx
// T107 (2026-07-11): Single row of the leaderboard. Whole card is a
// link to /users/{username}. Rank 1 gets a gold border + champion
// pill; the current user's own row gets a cyan border + "you" pill.

"use client";

import Link from "next/link";
import { brandColor } from "@/lib/brand-color";
import type {
  LeaderboardBrand,
  LeaderboardEntry,
} from "@/app/leaderboard/LeaderboardClient";

interface Props {
  entry: LeaderboardEntry;
  brand: LeaderboardBrand;
  isCurrentUser: boolean;
}

const GOLD = "#FFD24A";
const CYAN = "#00F0FF";

function medalForRank(rank: number): string {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return "";
}

export default function RankRow({ entry, brand, isCurrentUser }: Props) {
  const isChampion = entry.rank === 1;
  const border = isCurrentUser
    ? `1px solid ${CYAN}`
    : isChampion
      ? `1px solid rgba(255,210,74,0.5)`
      : "1px solid rgba(45,10,78,0.7)";
  const boxShadow = isCurrentUser
    ? "0 0 12px rgba(0,240,255,0.4)"
    : isChampion
      ? "0 0 12px rgba(255,210,74,0.25)"
      : "none";

  return (
    <Link
      href={`/users/${entry.username}`}
      className="block active:scale-[0.99] transition-transform"
    >
      <div
        className="rounded-2xl"
        style={{
          background: "rgba(45,10,78,0.3)",
          border,
          boxShadow,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <RankBadge rank={entry.rank} />
        <Avatar entry={entry} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className="text-sm font-semibold text-white truncate"
              style={{ maxWidth: "100%" }}
            >
              @{entry.username}
            </span>
            {isCurrentUser && (
              <span
                className="shrink-0"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: 999,
                  color: "#04110A",
                  background: CYAN,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                you
              </span>
            )}
          </div>
          {isChampion && (
            <div className="mt-1 flex items-center">
              <ChampionPill brandName={brand.name} />
            </div>
          )}
        </div>
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 19,
            color: isChampion ? GOLD : "#FFFFFF",
            flexShrink: 0,
          }}
        >
          {entry.count}
        </div>
      </div>
    </Link>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const medal = medalForRank(rank);
  if (medal) {
    return (
      <span
        aria-hidden="true"
        style={{
          fontSize: 22,
          width: 32,
          height: 32,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {medal}
      </span>
    );
  }
  return (
    <span
      style={{
        width: 32,
        height: 32,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        background: "rgba(45,10,78,0.5)",
        color: "rgba(255,255,255,0.6)",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {rank}
    </span>
  );
}

function Avatar({ entry }: { entry: LeaderboardEntry }) {
  const size = 40;
  if (entry.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.avatar_url}
        alt=""
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          background: "rgba(0,0,0,0.4)",
        }}
      />
    );
  }
  // Fallback avatar — deterministic hue keyed to username so it doesn't
  // reshuffle across renders.
  const color = brandColor(entry.username);
  const letter = entry.username.trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${color}, rgba(45,10,78,0.9))`,
        color: "#04110A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 900,
        fontSize: 16,
      }}
    >
      {letter || "?"}
    </div>
  );
}

function ChampionPill({ brandName }: { brandName: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 800,
        color: GOLD,
        background: "rgba(255,210,74,0.15)",
        border: "1px solid rgba(255,210,74,0.35)",
        letterSpacing: "0.02em",
        maxWidth: "100%",
      }}
    >
      <span aria-hidden="true">{"\u{1F3C6}"}</span>
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        The {brandName} Champion
      </span>
    </span>
  );
}
