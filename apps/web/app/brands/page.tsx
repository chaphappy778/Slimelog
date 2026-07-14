// apps/web/app/brands/page.tsx
// [T33b 2026-07-13] Server page for the redesigned /brands surface.
// Fires the four core queries (Featured / Popular / Verified /
// Community) + a small "new this week" count for the hero pill. The
// client merges Verified + Community into one "All brands" list —
// pre-monetization our tier system barely populates anything, so
// consolidating gives the section real density.
//
// Monetization gating stays intact (see docs/monetization-plan-*.md):
//   - Featured: `is_featured = true AND subscription_tier = brand_pro`
//   - Popular: `is_verified = true AND subscription_tier = brand_pro`
// Until real brands pay, we manually flip `is_featured` and
// (optionally) set `subscription_tier = brand_pro` on hand-picked
// shops to seed these slots.

import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import BrandsClient from "@/components/BrandsClient";
import type { Brand } from "@/lib/types";

export const metadata = {
  title: "Brands — SlimeLog",
  description: "Discover and explore verified slime brands.",
};

const BRAND_SELECT =
  "id, name, slug, description, bio, logo_url, website_url, shop_url, instagram_handle, tiktok_handle, owner_id, owner_name, location, restock_schedule, follower_count, total_logs, avg_shipping, avg_customer_service, avg_slime_rating, total_slime_ratings, total_brand_ratings, verification_tier, verified_at, subscription_tier, subscription_status, is_featured, is_verified, created_at, updated_at";

export default async function BrandsPage() {
  const supabase = await createClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    featuredResult,
    popularResult,
    verifiedResult,
    communityResult,
    newThisWeekResult,
  ] = await Promise.all([
    // 1. Featured: is_featured=true AND brand_pro, random 1
    supabase
      .from("brands")
      .select(BRAND_SELECT)
      .eq("is_active", true)
      .eq("is_featured", true)
      .eq("subscription_tier", "brand_pro")
      .limit(20),

    // 2. Popular: brand_pro + verified
    supabase
      .from("brands")
      .select(BRAND_SELECT)
      .eq("is_active", true)
      .eq("is_verified", true)
      .eq("subscription_tier", "brand_pro")
      .order("avg_slime_rating", { ascending: false, nullsFirst: false })
      .order("follower_count", { ascending: false }),

    // 3. Verified: verified but NOT brand_pro
    supabase
      .from("brands")
      .select(BRAND_SELECT)
      .eq("is_active", true)
      .eq("is_verified", true)
      .or("subscription_tier.is.null,subscription_tier.neq.brand_pro")
      .order("avg_slime_rating", { ascending: false, nullsFirst: false })
      .order("follower_count", { ascending: false }),

    // 4. Community: unverified
    supabase
      .from("brands")
      .select(BRAND_SELECT)
      .eq("is_active", true)
      .eq("is_verified", false)
      .order("name", { ascending: true }),

    // 5. "N new this week" — count only, no data payload.
    supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  // Loud console warnings on failure — helps track down migration-lag
  // silent-empty bugs (see error-tracker.md).
  if (featuredResult.error)
    console.error(
      "[brands] featured query failed:",
      featuredResult.error.message,
    );
  if (popularResult.error)
    console.error(
      "[brands] popular query failed:",
      popularResult.error.message,
    );
  if (verifiedResult.error)
    console.error(
      "[brands] verified query failed:",
      verifiedResult.error.message,
    );
  if (communityResult.error)
    console.error(
      "[brands] community query failed:",
      communityResult.error.message,
    );
  if (newThisWeekResult.error)
    console.error(
      "[brands] new-this-week query failed:",
      newThisWeekResult.error.message,
    );

  // Random featured brand selection (Postgres has no ORDER BY RANDOM()
  // via Supabase JS — pick client-side from the eligible pool).
  const featuredBrands = (featuredResult.data ?? []) as Brand[];
  const featuredBrand =
    featuredBrands.length > 0
      ? featuredBrands[Math.floor(Math.random() * featuredBrands.length)]
      : null;

  const popularBrands = (popularResult.data ?? []) as Brand[];
  const verifiedBrands = (verifiedResult.data ?? []) as Brand[];
  const communityBrands = (communityResult.data ?? []) as Brand[];

  // Merge Verified + Community into a single "All brands" list. The
  // client sorts + filters via its unified control row.
  const allBrands: Brand[] = [...verifiedBrands, ...communityBrands];

  const totalShops =
    popularBrands.length + verifiedBrands.length + communityBrands.length;
  const verifiedCount = popularBrands.length + verifiedBrands.length;
  const newThisWeek = newThisWeekResult.count ?? 0;

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />

      <div className="pt-14 pb-24">
        <BrandsClient
          featuredBrand={featuredBrand}
          popularBrands={popularBrands}
          allBrands={allBrands}
          totalShops={totalShops}
          verifiedCount={verifiedCount}
          newThisWeek={newThisWeek}
        />
      </div>
    </PageWrapper>
  );
}
