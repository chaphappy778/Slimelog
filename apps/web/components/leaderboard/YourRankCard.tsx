// apps/web/components/leaderboard/YourRankCard.tsx
// T107 (2026-07-11): Sticky card above the bottom nav showing the
// signed-in user's rank + count for the selected brand. Two variants:
// ranked (rank number + count + status subline) and unranked (avatar +
// username + "Log one" CTA).

"use client";

import Link from "next/link";
import { brandColor } from "@/lib/brand-color";
import type {
  CurrentUserRank,
  LeaderboardBrand,
} from "@/app/leaderboard/LeaderboardClient";

interface Props {
  brand: LeaderboardBrand;
  yourRank: CurrentUserRank;
  totalRanked: number;
}

const CYAN = "#00F0FF";

function statusSubline(rank: number): string {
  if (rank <= 20) return "In the top 20 — nice work";
  if (rank <= 60) return "You're climbing — keep oozing \u{1F525}";
  return "Log more to break the top 20";
}

export default function YourRankCard({ brand, yourRank, totalRanked }: Props) {
  // `totalRanked` is the number of rows we currently render in the top
  // list. Not used directly for copy but retained for future variants
  // (e.g. "top X of Y").
  void totalRanked;
  const isRanked = yourRank.rank !== null;
  return (
    <div
      className="fixed left-0 right-0 z-40"
      style={{ bottom: 76 }}
    >
      <div className="max-w-md mx-auto px-4 pb-2">
        <div
          className="rounded-2xl"
          style={{
            background: "rgba(20,4,38,0.94)",
            border: `1px solid ${CYAN}`,
            boxShadow: "0 0 16px rgba(0,240,255,0.35)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {isRanked ? (
            <RankedVariant brand={brand} yourRank={yourRank} />
          ) : (
            <UnrankedVariant brand={brand} yourRank={yourRank} />
          )}
        </div>
      </div>
    </div>
  );
}

function RankedVariant({
  brand,
  yourRank,
}: {
  brand: LeaderboardBrand;
  yourRank: CurrentUserRank;
}) {
  const rank = yourRank.rank as number;
  return (
    <>
      <div
        style={{
          minWidth: 32,
          height: 32,
          padding: "0 8px",
          borderRadius: 10,
          background: `rgba(0,240,255,0.14)`,
          border: `1px solid ${CYAN}`,
          color: CYAN,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        #{rank}
      </div>
      <Avatar username={yourRank.username} avatarUrl={yourRank.avatar_url} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">
            @{yourRank.username}
          </span>
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
        </div>
        <p
          className="text-[11px] truncate"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          {statusSubline(rank)}
        </p>
      </div>
      <div
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 900,
          fontSize: 19,
          color: "#FFFFFF",
          flexShrink: 0,
        }}
      >
        {yourRank.count}
      </div>
      {/* Brand name kept implicit; the tile above shows which brand
          this rank refers to. */}
      <span className="sr-only">for {brand.name}</span>
    </>
  );
}

function UnrankedVariant({
  brand,
  yourRank,
}: {
  brand: LeaderboardBrand;
  yourRank: CurrentUserRank;
}) {
  // Spec framing was `/log?brand={slug}`, but `/log` currently reads the
  // `brand` query param straight into `brand_name_raw` (a free-text
  // field, not a slug lookup). Passing the readable name gives the
  // right prefill without touching /log's parsing logic.
  const logHref = `/log?brand=${encodeURIComponent(brand.name)}`;
  return (
    <>
      <Avatar username={yourRank.username} avatarUrl={yourRank.avatar_url} />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-white truncate block">
          @{yourRank.username}
        </span>
        <p
          className="text-[11px] truncate"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          You haven&apos;t logged {brand.name} yet
        </p>
      </div>
      <Link
        href={logHref}
        className="shrink-0 inline-flex items-center gap-1 rounded-full text-xs font-black active:scale-95 transition-transform"
        style={{
          padding: "8px 14px",
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#04110A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Log one <span aria-hidden="true">{"\u{1F4A7}"}</span>
      </Link>
    </>
  );
}

function Avatar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const size = 36;
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
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
  const color = brandColor(username);
  const letter = username.trim().charAt(0).toUpperCase();
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
        fontSize: 15,
      }}
    >
      {letter || "?"}
    </div>
  );
}
