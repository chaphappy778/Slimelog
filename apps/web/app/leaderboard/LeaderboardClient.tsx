// apps/web/app/leaderboard/LeaderboardClient.tsx
// T107 (2026-07-11): Client shell for the leaderboard. Owns brand
// selection state and orchestrates re-fetches when the user picks a new
// brand. Server component (page.tsx) does the initial data pass so the
// first paint has real numbers.

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";
import BrandSelector from "@/components/leaderboard/BrandSelector";
import BrandTile from "@/components/leaderboard/BrandTile";
import type { LeaderboardWindow } from "@/components/leaderboard/BrandTile";
import RankedList from "@/components/leaderboard/RankedList";
import LoadingSkeleton from "@/components/leaderboard/LoadingSkeleton";
import EmptyState from "@/components/leaderboard/EmptyState";
import YourRankCard from "@/components/leaderboard/YourRankCard";

// Beginning of the current calendar month in the viewer's local tz.
// Used to scope "This month" queries. Recomputed once per mount — good
// enough; nobody's page will be open across month boundaries where a
// stale value matters.
function startOfThisMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// ─── Shared types (re-exported from page.tsx) ─────────────────────────

export interface LeaderboardBrand {
  key: string; // lowercase brand_name_raw — used as a matching key
  name_raw: string; // display name (first-seen casing from logs)
  name: string; // catalog display name (may equal name_raw)
  slug: string | null;
  logo_url: string | null;
  total_logs: number;
  logger_count: number;
  base_type: SlimeBaseType | null;
  base_type_label: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  count: number;
}

export interface CurrentUserRank {
  rank: number | null;
  count: number;
  username: string;
  avatar_url: string | null;
}

interface Props {
  initialTopBrands: LeaderboardBrand[];
  initialSignatureBrand: LeaderboardBrand;
  initialTop20: LeaderboardEntry[];
  initialCommunityTotal: number;
  initialYourRank: CurrentUserRank | null;
  currentUserId: string | null;
}

const RANK_LIMIT = 20;

// Fetch shape used by the client-side refetch. Same select() call as the
// server side but scoped to a single brand.
interface ClientLogRow {
  user_id: string | null;
  base_type: SlimeBaseType | null;
}

export default function LeaderboardClient({
  initialTopBrands,
  initialSignatureBrand,
  initialTop20,
  initialCommunityTotal,
  initialYourRank,
  currentUserId,
}: Props) {
  const [topBrands] = useState<LeaderboardBrand[]>(initialTopBrands);
  const [selectedBrand, setSelectedBrand] = useState<LeaderboardBrand>(
    initialSignatureBrand,
  );
  const [top20, setTop20] = useState<LeaderboardEntry[]>(initialTop20);
  const [communityTotal, setCommunityTotal] = useState<number>(
    initialCommunityTotal,
  );
  const [yourRank, setYourRank] = useState<CurrentUserRank | null>(
    initialYourRank,
  );
  const [loading, setLoading] = useState<boolean>(false);
  // Track whether we've mounted so we don't refire the fetch for the
  // initial signature brand (which already has server-rendered data).
  const [hasMounted, setHasMounted] = useState<boolean>(false);
  // 2026-07-11: time window toggle. Server-hydrated data is always
  // all-time, so switching to this_month triggers a refetch even for
  // the signature brand.
  const [activeWindow, setActiveWindow] =
    useState<LeaderboardWindow>("all_time");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchBrandData = useCallback(
    async (brand: LeaderboardBrand, window: LeaderboardWindow) => {
      const supabase = createClient();

      // Base query — all public logs for this brand. When the window
      // is "this_month" we add a created_at >= startOfMonth filter so
      // the counts scope down. See docs/cost-tracker.md for scaling
      // notes on this query shape.
      let query = supabase
        .from("collection_logs")
        .select("user_id, base_type")
        .eq("is_public", true)
        .ilike("brand_name_raw", brand.name_raw);
      if (window === "this_month") {
        query = query.gte("created_at", startOfThisMonthISO());
      }
      const { data: rawRows, error } = await query;

      if (error) {
        console.warn(
          "[leaderboard] failed to refetch brand rankings",
          brand.name_raw,
          window,
          error,
        );
        return;
      }

      const rows = (rawRows ?? []) as ClientLogRow[];

      // Aggregate by user_id + collect base_type mode for the subline.
      const countsByUser = new Map<string, number>();
      const baseCounts: Partial<Record<SlimeBaseType, number>> = {};
      const loggerIds = new Set<string>();
      for (const row of rows) {
        if (row.user_id) {
          countsByUser.set(
            row.user_id,
            (countsByUser.get(row.user_id) ?? 0) + 1,
          );
          loggerIds.add(row.user_id);
        }
        if (row.base_type) {
          baseCounts[row.base_type] =
            (baseCounts[row.base_type] ?? 0) + 1;
        }
      }

      const ranked = Array.from(countsByUser.entries())
        .map(([user_id, count]) => ({ user_id, count }))
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.user_id.localeCompare(b.user_id);
        });

      const top20UserIds = ranked.slice(0, RANK_LIMIT).map((r) => r.user_id);
      const userIndex = currentUserId
        ? ranked.findIndex((r) => r.user_id === currentUserId)
        : -1;
      const toFetch = new Set<string>(top20UserIds);
      if (currentUserId) toFetch.add(currentUserId);

      let profiles = new Map<
        string,
        { username: string | null; avatar_url: string | null }
      >();
      if (toFetch.size > 0) {
        const { data: profileRows } = await supabase
          .from("profiles_public")
          .select("id, username, avatar_url")
          .in("id", Array.from(toFetch));
        for (const p of (profileRows ?? []) as Array<{
          id: string;
          username: string | null;
          avatar_url: string | null;
        }>) {
          profiles.set(p.id, {
            username: p.username,
            avatar_url: p.avatar_url,
          });
        }
      }

      const nextTop20: LeaderboardEntry[] = ranked
        .slice(0, RANK_LIMIT)
        .map((r, idx) => {
          const p = profiles.get(r.user_id);
          return {
            rank: idx + 1,
            user_id: r.user_id,
            username: p?.username ?? "unknown",
            avatar_url: p?.avatar_url ?? null,
            count: r.count,
          };
        })
        .filter((r) => r.username !== "unknown");

      setTop20(nextTop20);
      setCommunityTotal(rows.length);

      // Refresh the brand's mode base_type + logger count so the tile
      // subline stays honest when we drift into brands the server pass
      // didn't hydrate.
      let winner: SlimeBaseType | null = null;
      let winnerCount = 0;
      for (const [k, c] of Object.entries(baseCounts)) {
        if ((c ?? 0) > winnerCount) {
          winner = k as SlimeBaseType;
          winnerCount = c ?? 0;
        }
      }
      setSelectedBrand((prev) =>
        prev.key === brand.key
          ? {
              ...prev,
              total_logs: rows.length,
              logger_count: loggerIds.size,
              base_type: winner,
              base_type_label: winner
                ? SLIME_BASE_TYPE_LABELS[winner]
                : null,
            }
          : prev,
      );

      if (currentUserId) {
        const profile = profiles.get(currentUserId);
        if (userIndex >= 0) {
          setYourRank({
            rank: userIndex + 1,
            count: ranked[userIndex].count,
            username: profile?.username ?? "you",
            avatar_url: profile?.avatar_url ?? null,
          });
        } else {
          setYourRank({
            rank: null,
            count: 0,
            username: profile?.username ?? "you",
            avatar_url: profile?.avatar_url ?? null,
          });
        }
      } else {
        setYourRank(null);
      }
    },
    [currentUserId],
  );

  // Refetch when the user picks a new brand OR switches window.
  // Skip the initial mount for the initial brand + "all_time" window
  // since the server component already hydrated that combination.
  useEffect(() => {
    if (!hasMounted) return;
    let cancelled = false;
    setLoading(true);
    fetchBrandData(selectedBrand, activeWindow)
      .catch((err) => {
        console.warn("[leaderboard] refetch threw", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrand.key, activeWindow]);

  const handleSelect = (brand: LeaderboardBrand) => {
    if (brand.key === selectedBrand.key) return;
    setSelectedBrand(brand);
  };

  const isSelectedBrandEmpty = communityTotal === 0;

  return (
    <div className="pt-20 px-4" style={{ paddingBottom: 180 }}>
      <div className="max-w-md mx-auto">
        <div className="mb-3">
          <h1
            className="text-[26px] font-black text-white"
            style={{
              fontFamily: "Montserrat, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
            Leaderboard
          </h1>
          <p className="text-sm text-slime-muted mt-0.5">
            Who runs the biggest galaxies.
          </p>
        </div>

        <BrandSelector
          brands={topBrands}
          selectedKey={selectedBrand.key}
          onSelect={handleSelect}
        />

        <div className="mt-4">
          <BrandTile
            brand={selectedBrand}
            communityTotal={communityTotal}
            leader={top20[0] ?? null}
            window={activeWindow}
            onWindowChange={setActiveWindow}
          />
        </div>

        <div className="mt-6">
          {loading ? (
            <LoadingSkeleton />
          ) : isSelectedBrandEmpty ? (
            <EmptyState brand={selectedBrand} />
          ) : (
            <RankedList
              entries={top20}
              currentUserId={currentUserId}
              brand={selectedBrand}
            />
          )}
        </div>
      </div>

      {currentUserId && yourRank && !loading && !isSelectedBrandEmpty && (
        <YourRankCard
          brand={selectedBrand}
          yourRank={yourRank}
          totalRanked={top20.length}
        />
      )}
    </div>
  );
}
