// apps/web/app/leaderboard/page.tsx
// T107 (2026-07-11): "Biggest galaxies" leaderboard V1. Ranks users by
// how many slimes they've logged from a given brand. Ties into the
// existing /collection Galaxy view where brand hubs grow with
// collection depth.
//
// Server component — does the initial data fetch (top brands + rankings
// for a "signature brand") and hands the payload to <LeaderboardClient>.
// The client handles brand switching (refetching top-20 + community
// total + your rank) and all interaction.

import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";
import LeaderboardClient, {
  type LeaderboardBrand,
  type LeaderboardEntry,
  type CurrentUserRank,
} from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Leaderboard | SlimeLog",
  description:
    "Who runs the biggest galaxies? Rank slime collectors by brand depth.",
};

// ─── Types (internal to the server component) ─────────────────────────

interface RawLogRow {
  brand_name_raw: string | null;
  base_type: SlimeBaseType | null;
  user_id: string | null;
}

interface BrandCatalogRow {
  name: string | null;
  slug: string | null;
  logo_url: string | null;
}

// Server-side aggregation cap. This is a personal project pre-launch,
// so pulling every public log at page load is fine — we'll swap in a
// materialized view or RPC (see docs/cost-tracker.md) if row volume
// starts hurting.
const RAW_LOG_FETCH_CAP = 20_000;
const TOP_BRANDS_LIMIT = 30;
const RANK_LIMIT = 20;

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Group log rows by a case-insensitive brand key. Records the first-seen
 * casing as the display name so we don't lowercase "Cloud Nine" to
 * "cloud nine" in the UI.
 */
function aggregateByBrand(rows: RawLogRow[]): Map<
  string,
  {
    key: string;
    displayName: string;
    total: number;
    baseTypeCounts: Partial<Record<SlimeBaseType, number>>;
    loggerIds: Set<string>;
  }
> {
  const map = new Map<
    string,
    {
      key: string;
      displayName: string;
      total: number;
      baseTypeCounts: Partial<Record<SlimeBaseType, number>>;
      loggerIds: Set<string>;
    }
  >();
  for (const row of rows) {
    const raw = row.brand_name_raw?.trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    let entry = map.get(key);
    if (!entry) {
      entry = {
        key,
        displayName: raw,
        total: 0,
        baseTypeCounts: {},
        loggerIds: new Set<string>(),
      };
      map.set(key, entry);
    }
    entry.total += 1;
    if (row.base_type) {
      const bt = row.base_type;
      entry.baseTypeCounts[bt] = (entry.baseTypeCounts[bt] ?? 0) + 1;
    }
    if (row.user_id) entry.loggerIds.add(row.user_id);
  }
  return map;
}

function modeBaseType(
  counts: Partial<Record<SlimeBaseType, number>>,
): SlimeBaseType | null {
  let winner: SlimeBaseType | null = null;
  let winnerCount = 0;
  for (const [k, c] of Object.entries(counts)) {
    if ((c ?? 0) > winnerCount) {
      winner = k as SlimeBaseType;
      winnerCount = c ?? 0;
    }
  }
  return winner;
}

/**
 * Build the ranked list (user_id -> count) for one brand from the raw
 * log rows already in memory. Sorted descending by count. Ties broken
 * arbitrarily by user_id string order for stability.
 */
function rankingsForBrand(
  rows: RawLogRow[],
  brandKey: string,
): { user_id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const raw = row.brand_name_raw?.trim().toLowerCase();
    if (raw !== brandKey) continue;
    counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([user_id, count]) => ({ user_id, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.user_id.localeCompare(b.user_id);
    });
}

// ─── Page ─────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  // T107 part (b) 2026-07-11: `?brand={slug}` deep-links from
  // /brands/[slug] "See full leaderboard" strip. When present and
  // resolvable, overrides the user's signature brand.
  searchParams?: Promise<{ brand?: string }>;
}) {
  const rawSearchParams = searchParams ? await searchParams : undefined;
  const requestedBrandSlug = rawSearchParams?.brand?.trim() ?? null;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  // Parallel initial fetches: all public logs (aggregated in memory for
  // the top-brands strip + initial rankings) and the authenticated user.
  const [logsResult, userResult] = await Promise.all([
    supabase
      .from("collection_logs")
      .select("brand_name_raw, base_type, user_id")
      .eq("is_public", true)
      .not("brand_name_raw", "is", null)
      .limit(RAW_LOG_FETCH_CAP),
    supabase.auth.getUser(),
  ]);

  if (logsResult.error) {
    console.warn("[leaderboard] collection_logs fetch failed", logsResult.error);
  }

  const rows: RawLogRow[] = (logsResult.data ?? []) as RawLogRow[];
  const currentUserId = userResult.data.user?.id ?? null;

  // If the whole app has zero public logs, short-circuit into a
  // page-level empty message before running any brand queries.
  if (rows.length === 0) {
    return (
      <PageWrapper dots glow="cyan">
        <PageHeader />
        <div className="pt-20 px-4 pb-24">
          <div className="max-w-md mx-auto">
            <h1
              className="text-[26px] font-black text-white mb-2"
              style={{
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Leaderboard
            </h1>
            <p className="text-sm text-slime-muted mb-8">
              Who runs the biggest galaxies.
            </p>
            <div
              className="rounded-3xl p-8 text-center"
              style={{
                background: "rgba(45,10,78,0.3)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <h2
                className="text-lg font-black text-white mb-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                The leaderboard wakes up when the first logs land
              </h2>
              <p className="text-sm text-slime-muted">
                Nobody has logged a public slime yet. Log one and you&apos;ll
                be the first star in every hub.
              </p>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // ── Top brands aggregate (top 30 by total logs) ─────────────────────
  const brandMap = aggregateByBrand(rows);
  const brandsSorted = Array.from(brandMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // Guard: rows may exist but hold only blank/whitespace brand_name_raw
  // values (all filtered out by aggregateByBrand). Show the same
  // page-level empty message.
  if (brandsSorted.length === 0) {
    return (
      <PageWrapper dots glow="cyan">
        <PageHeader />
        <div className="pt-20 px-4 pb-24">
          <div className="max-w-md mx-auto">
            <h1
              className="text-[26px] font-black text-white mb-2"
              style={{
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: "-0.01em",
              }}
            >
              Leaderboard
            </h1>
            <p className="text-sm text-slime-muted mb-8">
              Who runs the biggest galaxies.
            </p>
            <div
              className="rounded-3xl p-8 text-center"
              style={{
                background: "rgba(45,10,78,0.3)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <h2
                className="text-lg font-black text-white mb-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                The leaderboard wakes up when the first logs land
              </h2>
              <p className="text-sm text-slime-muted">
                Nobody has logged a public slime with a brand name yet.
                Log one and you&apos;ll be the first star in every hub.
              </p>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const topBrandBuckets = brandsSorted.slice(0, TOP_BRANDS_LIMIT);
  const topBrandDisplayNames = topBrandBuckets.map((b) => b.displayName);

  // Look up brand catalog rows (name, slug, logo_url) for the top brands.
  // Case-insensitive per-name ILIKE — mirrors the GalaxyView pattern.
  let catalogByKey = new Map<string, BrandCatalogRow>();
  if (topBrandDisplayNames.length > 0) {
    const results = await Promise.all(
      topBrandDisplayNames.map((name) =>
        supabase
          .from("brands")
          .select("name, slug, logo_url")
          // 2026-07-11 hotfix: brands table's column is `name`, not
          // `name_raw`. `name_raw` only exists on collection_logs as a
          // free-text fallback. Was 400ing on every load.
          .ilike("name", name)
          .maybeSingle(),
      ),
    );
    results.forEach((res, idx) => {
      if (res.error) {
        // A brand not being in the catalog is not an error worth logging
        // — the brand_name_raw column is free-form, so many logged
        // brands never make it into the brands table.
        return;
      }
      const bucket = topBrandBuckets[idx];
      if (bucket && res.data) {
        catalogByKey.set(bucket.key, res.data as BrandCatalogRow);
      }
    });
  }

  const topBrands: LeaderboardBrand[] = topBrandBuckets.map((bucket) => {
    const catalog = catalogByKey.get(bucket.key) ?? null;
    const baseType = modeBaseType(bucket.baseTypeCounts);
    return {
      key: bucket.key,
      name_raw: bucket.displayName,
      name: catalog?.name ?? bucket.displayName,
      slug: catalog?.slug ?? null,
      logo_url: catalog?.logo_url ?? null,
      total_logs: bucket.total,
      logger_count: bucket.loggerIds.size,
      base_type: baseType,
      base_type_label: baseType ? SLIME_BASE_TYPE_LABELS[baseType] : null,
    };
  });

  // ── Signature brand ─────────────────────────────────────────────────
  // The brand the current user has the most logs of. Fall back to the
  // first top brand when the user is signed out or hasn't logged
  // anything yet.
  let signatureBrand: LeaderboardBrand = topBrands[0];
  if (currentUserId) {
    const userCountsByKey = new Map<string, number>();
    for (const row of rows) {
      if (row.user_id !== currentUserId) continue;
      const raw = row.brand_name_raw?.trim().toLowerCase();
      if (!raw) continue;
      userCountsByKey.set(raw, (userCountsByKey.get(raw) ?? 0) + 1);
    }
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [k, c] of userCountsByKey.entries()) {
      if (c > bestCount) {
        bestKey = k;
        bestCount = c;
      }
    }
    if (bestKey) {
      // If the user's signature brand isn't already in the top 30, hydrate
      // it from the aggregated data + a catalog lookup so the tile still
      // has a slug/logo when possible.
      const inTop = topBrands.find((b) => b.key === bestKey);
      if (inTop) {
        signatureBrand = inTop;
      } else {
        const bucket = brandMap.get(bestKey);
        if (bucket) {
          const { data: catalog } = await supabase
            .from("brands")
            .select("name, slug, logo_url")
            // 2026-07-11 hotfix: see note above.
            .ilike("name", bucket.displayName)
            .maybeSingle();
          const catalogRow = (catalog as BrandCatalogRow | null) ?? null;
          const baseType = modeBaseType(bucket.baseTypeCounts);
          signatureBrand = {
            key: bucket.key,
            name_raw: bucket.displayName,
            name: catalogRow?.name ?? bucket.displayName,
            slug: catalogRow?.slug ?? null,
            logo_url: catalogRow?.logo_url ?? null,
            total_logs: bucket.total,
            logger_count: bucket.loggerIds.size,
            base_type: baseType,
            base_type_label: baseType ? SLIME_BASE_TYPE_LABELS[baseType] : null,
          };
        }
      }
    }
  }

  // ── URL-requested brand override (T107 part b) ──────────────────────
  // When the page is opened as `/leaderboard?brand=cloud-nine` (from a
  // brand page's Top Collectors strip), preselect that brand instead of
  // the user's signature. Resolves against the aggregated top-brands
  // first; if the requested brand isn't in the top 30, fall back to a
  // brands-table lookup + aggregate hydration.
  if (requestedBrandSlug) {
    const inTop = topBrands.find((b) => b.slug === requestedBrandSlug);
    if (inTop) {
      signatureBrand = inTop;
    } else {
      // Slug lookup + hydrate from bucketed rows if the brand had any
      // logs at all. If it's a brand with zero logs, we just leave the
      // signature brand alone — the leaderboard doesn't render empty
      // brands as first-class entries.
      const { data: catalog } = await supabase
        .from("brands")
        .select("name, slug, logo_url")
        .eq("slug", requestedBrandSlug)
        .maybeSingle();
      const catalogRow = (catalog as BrandCatalogRow | null) ?? null;
      if (catalogRow?.name) {
        const requestedKey = catalogRow.name.trim().toLowerCase();
        const bucket = brandMap.get(requestedKey);
        if (bucket) {
          const baseType = modeBaseType(bucket.baseTypeCounts);
          signatureBrand = {
            key: bucket.key,
            name_raw: bucket.displayName,
            name: catalogRow.name,
            slug: catalogRow.slug,
            logo_url: catalogRow.logo_url,
            total_logs: bucket.total,
            logger_count: bucket.loggerIds.size,
            base_type: baseType,
            base_type_label: baseType ? SLIME_BASE_TYPE_LABELS[baseType] : null,
          };
        }
      }
    }
  }

  // ── Initial rankings for signature brand ────────────────────────────
  const initialRankings = rankingsForBrand(rows, signatureBrand.key);

  // Fetch profiles for the top 20 (and the current user if they're
  // outside the top 20 but ranked).
  const top20Ids = initialRankings.slice(0, RANK_LIMIT).map((r) => r.user_id);
  const userRankIndex = currentUserId
    ? initialRankings.findIndex((r) => r.user_id === currentUserId)
    : -1;
  const userIdsToFetch = new Set<string>(top20Ids);
  if (currentUserId && userRankIndex >= 0) {
    userIdsToFetch.add(currentUserId);
  }

  let profilesByUserId = new Map<
    string,
    { username: string | null; avatar_url: string | null }
  >();
  if (userIdsToFetch.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles_public")
      .select("id, username, avatar_url")
      .in("id", Array.from(userIdsToFetch));
    for (const p of (profiles ?? []) as Array<{
      id: string;
      username: string | null;
      avatar_url: string | null;
    }>) {
      profilesByUserId.set(p.id, {
        username: p.username,
        avatar_url: p.avatar_url,
      });
    }
  }

  const initialTop20: LeaderboardEntry[] = initialRankings
    .slice(0, RANK_LIMIT)
    .map((r, idx) => {
      const profile = profilesByUserId.get(r.user_id);
      return {
        rank: idx + 1,
        user_id: r.user_id,
        username: profile?.username ?? "unknown",
        avatar_url: profile?.avatar_url ?? null,
        count: r.count,
      };
    })
    // Guard: drop entries whose profile couldn't be resolved into a
    // username string. Unlikely with profiles_public but the link
    // target is /users/{username} and rendering "/users/unknown" is
    // worse than silently skipping.
    .filter((r) => r.username !== "unknown");

  const bucket = brandMap.get(signatureBrand.key);
  const initialCommunityTotal = bucket?.total ?? 0;

  let initialYourRank: CurrentUserRank | null = null;
  if (currentUserId) {
    if (userRankIndex >= 0) {
      initialYourRank = {
        rank: userRankIndex + 1,
        count: initialRankings[userRankIndex].count,
        username:
          profilesByUserId.get(currentUserId)?.username ?? "you",
        avatar_url:
          profilesByUserId.get(currentUserId)?.avatar_url ?? null,
      };
    } else {
      // Signed in but no logs of the signature brand — surface the
      // "log one" CTA. Still fetch the profile for the avatar.
      const { data: profile } = await supabase
        .from("profiles_public")
        .select("username, avatar_url")
        .eq("id", currentUserId)
        .maybeSingle();
      const p = profile as {
        username: string | null;
        avatar_url: string | null;
      } | null;
      initialYourRank = {
        rank: null,
        count: 0,
        username: p?.username ?? "you",
        avatar_url: p?.avatar_url ?? null,
      };
    }
  }

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <LeaderboardClient
        initialTopBrands={topBrands}
        initialSignatureBrand={signatureBrand}
        initialTop20={initialTop20}
        initialCommunityTotal={initialCommunityTotal}
        initialYourRank={initialYourRank}
        currentUserId={currentUserId}
      />
    </PageWrapper>
  );
}
