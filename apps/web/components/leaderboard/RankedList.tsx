// apps/web/components/leaderboard/RankedList.tsx
// T107 (2026-07-11): Section header + column of RankRow cards for the
// leaderboard.

"use client";

import type { LeaderboardBrand } from "@/app/leaderboard/LeaderboardClient";
import type { LeaderboardEntry } from "@/app/leaderboard/LeaderboardClient";
import RankRow from "./RankRow";

interface Props {
  entries: LeaderboardEntry[];
  currentUserId: string | null;
  brand: LeaderboardBrand;
}

export default function RankedList({
  entries,
  currentUserId,
  brand,
}: Props) {
  return (
    <div>
      <p
        className="section-label"
        style={{ color: "#00F0FF", marginBottom: 10 }}
      >
        Top 20 · All time
      </p>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {entries.length === 0 ? (
          <p className="text-sm text-slime-muted px-2 py-6 text-center">
            No collectors ranked yet for {brand.name}.
          </p>
        ) : (
          entries.map((entry) => (
            <RankRow
              key={entry.user_id}
              entry={entry}
              brand={brand}
              isCurrentUser={
                currentUserId !== null && entry.user_id === currentUserId
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
