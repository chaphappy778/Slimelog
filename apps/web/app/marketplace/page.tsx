// apps/web/app/marketplace/page.tsx
//
// T113 (2026-07-12): Marketplace Coming Soon page. Auth-gated waitlist
// surface. Users see the "join the waitlist" state on first visit and
// the "you're on the list #{n}" state after joining or on return.
//
// Server component — does the auth guard + top-brands aggregation.
// The interactive form + success state are handled by
// <MarketplaceComingSoonClient>.
//
// Auth: signed-out users are bounced to /login with next=/marketplace
// so they land back here after signing in. No email capture is needed
// — we already have their user_id via the session.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import MarketplaceComingSoonClient from "@/components/marketplace/MarketplaceComingSoonClient";
import type { MarketplaceTopBrand } from "@/components/marketplace/MarketplaceComingSoonClient";

export const metadata: Metadata = {
  title: "Marketplace coming soon — SlimeLog",
  description:
    "Join the waitlist for the SlimeLog marketplace. Verified brands, real condition standards, safe payments.",
  robots: { index: false, follow: false },
};

// ─── Types (server-internal) ─────────────────────────────────────────

interface RawLogRow {
  brand_name_raw: string | null;
  user_id: string | null;
}

interface BrandCatalogRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

// Match leaderboard's aggregation cap so both surfaces read from the
// same window of public logs. Documented in docs/cost-tracker.md.
const RAW_LOG_FETCH_CAP = 20_000;
const TOP_BRANDS_LIMIT = 12;

// ─── Helpers ─────────────────────────────────────────────────────────

/**
 * Group log rows by a case-insensitive brand key. Records the first-seen
 * casing as the display name so we don't lowercase "Cloud Nine" to
 * "cloud nine" in the UI. Mirrors the shape used by leaderboard.
 */
function aggregateByBrand(rows: RawLogRow[]): Map<
  string,
  {
    key: string;
    displayName: string;
    total: number;
    loggerIds: Set<string>;
  }
> {
  const map = new Map<
    string,
    {
      key: string;
      displayName: string;
      total: number;
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
        loggerIds: new Set<string>(),
      };
      map.set(key, entry);
    }
    entry.total += 1;
    if (row.user_id) entry.loggerIds.add(row.user_id);
  }
  return map;
}

// ─── Page ────────────────────────────────────────────────────────────

export default async function MarketplacePage(): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  // Auth guard — this page is user-only. Signed-out visitors go
  // through /login and come back here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/marketplace");
  }

  // Fetch public logs so we can aggregate the top brand names, then
  // resolve those names to catalog rows for the ids + slugs + logos
  // the client uses in the multi-select. Mirrors the leaderboard
  // pattern (see apps/web/app/leaderboard/page.tsx) so both pages
  // stay in sync on which brands surface as "top".
  const { data: logsData, error: logsErr } = await supabase
    .from("collection_logs")
    .select("brand_name_raw, user_id")
    .eq("is_public", true)
    .not("brand_name_raw", "is", null)
    .limit(RAW_LOG_FETCH_CAP);

  if (logsErr) {
    console.warn("[marketplace] collection_logs fetch failed", logsErr);
  }

  const rows: RawLogRow[] = (logsData ?? []) as RawLogRow[];

  const brandMap = aggregateByBrand(rows);
  const brandsSorted = Array.from(brandMap.values()).sort(
    (a, b) => b.total - a.total,
  );
  const topBuckets = brandsSorted.slice(0, TOP_BRANDS_LIMIT);

  // Resolve display names to catalog rows for ids + slugs + logos.
  // Case-insensitive per-name ILIKE — mirrors the GalaxyView pattern.
  const catalogByKey = new Map<string, BrandCatalogRow>();
  if (topBuckets.length > 0) {
    const results = await Promise.all(
      topBuckets.map((bucket) =>
        supabase
          .from("brands")
          .select("id, name, slug, logo_url")
          .ilike("name", bucket.displayName)
          .maybeSingle(),
      ),
    );
    results.forEach((res, idx) => {
      if (res.error) {
        // A brand not being in the catalog is not an error worth
        // logging — brand_name_raw is free-form, so many logged
        // brands never make it into the brands table. We just drop
        // them from the multi-select rather than showing an unlinkable
        // chip.
        return;
      }
      const bucket = topBuckets[idx];
      if (bucket && res.data) {
        catalogByKey.set(bucket.key, res.data as BrandCatalogRow);
      }
    });
  }

  const initialTopBrands: MarketplaceTopBrand[] = topBuckets
    .map((bucket) => {
      const catalog = catalogByKey.get(bucket.key);
      if (!catalog) return null;
      return {
        id: catalog.id,
        name: catalog.name,
        slug: catalog.slug,
        logo_url: catalog.logo_url,
        total_logs: bucket.total,
      };
    })
    .filter((b): b is MarketplaceTopBrand => b !== null);

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      <MarketplaceComingSoonClient
        initialTopBrands={initialTopBrands}
        userEmail={user.email ?? null}
      />
    </PageWrapper>
  );
}
