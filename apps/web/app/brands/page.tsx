// apps/web/app/brands/page.tsx
// [Change 2 — Brands Redesign D1] 4-query parallel fetch replacing single flat query
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import FloatingPills from "@/components/FloatingPills";
import BrandsClient from "@/components/BrandsClient";

export const metadata = {
  title: "Brands — SlimeLog",
  description: "Discover and explore verified slime brands.",
};

export default async function BrandsPage() {
  const supabase = await createClient();

  const [featuredResult, popularResult, verifiedResult, communityResult] =
    await Promise.all([
      // 1. Featured: is_featured=true AND brand_pro, random 1
      supabase
        .from("brands")
        .select(
          "id, name, slug, description, bio, logo_url, website_url, shop_url, instagram_handle, tiktok_handle, owner_id, owner_name, location, restock_schedule, follower_count, total_logs, avg_shipping, avg_customer_service, avg_slime_rating, total_slime_ratings, total_brand_ratings, verification_tier, verified_at, subscription_tier, subscription_status, is_featured, is_verified, created_at, updated_at",
        )
        .eq("is_active", true)
        .eq("is_featured", true)
        .eq("subscription_tier", "brand_pro")
        .limit(20),

      // 2. Popular: brand_pro + verified
      supabase
        .from("brands")
        .select(
          "id, name, slug, description, bio, logo_url, website_url, shop_url, instagram_handle, tiktok_handle, owner_id, owner_name, location, restock_schedule, follower_count, total_logs, avg_shipping, avg_customer_service, avg_slime_rating, total_slime_ratings, total_brand_ratings, verification_tier, verified_at, subscription_tier, subscription_status, is_featured, is_verified, created_at, updated_at",
        )
        .eq("is_active", true)
        .eq("is_verified", true)
        .eq("subscription_tier", "brand_pro")
        .order("avg_slime_rating", { ascending: false, nullsFirst: false })
        .order("follower_count", { ascending: false }),

      // 3. Verified grid: verified but NOT brand_pro
      supabase
        .from("brands")
        .select(
          "id, name, slug, description, bio, logo_url, website_url, shop_url, instagram_handle, tiktok_handle, owner_id, owner_name, location, restock_schedule, follower_count, total_logs, avg_shipping, avg_customer_service, avg_slime_rating, total_slime_ratings, total_brand_ratings, verification_tier, verified_at, subscription_tier, subscription_status, is_featured, is_verified, created_at, updated_at",
        )
        .eq("is_active", true)
        .eq("is_verified", true)
        .or("subscription_tier.is.null,subscription_tier.neq.brand_pro")
        .order("avg_slime_rating", { ascending: false, nullsFirst: false })
        .order("follower_count", { ascending: false }),

      // 4. Community: not verified
      supabase
        .from("brands")
        .select(
          "id, name, slug, description, bio, logo_url, website_url, shop_url, instagram_handle, tiktok_handle, owner_id, owner_name, location, restock_schedule, follower_count, total_logs, avg_shipping, avg_customer_service, avg_slime_rating, total_slime_ratings, total_brand_ratings, verification_tier, verified_at, subscription_tier, subscription_status, is_featured, is_verified, created_at, updated_at",
        )
        .eq("is_active", true)
        .eq("is_verified", false)
        .order("name", { ascending: true }),
    ]);

  if (featuredResult.error)
    console.error(
      "Failed to load featured brands:",
      featuredResult.error.message,
    );
  if (popularResult.error)
    console.error(
      "Failed to load popular brands:",
      popularResult.error.message,
    );
  if (verifiedResult.error)
    console.error(
      "Failed to load verified brands:",
      verifiedResult.error.message,
    );
  if (communityResult.error)
    console.error(
      "Failed to load community brands:",
      communityResult.error.message,
    );

  // Random featured brand selection (Supabase doesn't support ORDER BY RANDOM())
  const featuredBrands = featuredResult.data ?? [];
  const featuredBrand =
    featuredBrands.length > 0
      ? featuredBrands[Math.floor(Math.random() * featuredBrands.length)]
      : null;

  const totalCount =
    (popularResult.data?.length ?? 0) +
    (verifiedResult.data?.length ?? 0) +
    (communityResult.data?.length ?? 0);
  const verifiedCount =
    (popularResult.data?.length ?? 0) + (verifiedResult.data?.length ?? 0);

  return (
    <PageWrapper dots>
      <PageHeader />

      <div className="pt-14">
        {/* Hero */}
        <div className="relative max-w-[390px] mx-auto px-4 pt-6 pb-4 overflow-hidden">
          <FloatingPills area="section" density="low" zIndex={0} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1
                className="text-xl font-black tracking-tight"
                style={{
                  background:
                    "linear-gradient(90deg, #39FF14 0%, #00F0FF 40%, #FF00E5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Brands
              </h1>
              <p className="text-xs text-slime-muted mt-0.5">
                {totalCount} shop{totalCount !== 1 ? "s" : ""} &middot;{" "}
                <span className="text-slime-accent font-medium">
                  {verifiedCount} verified
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* All interactive UI lives in BrandsClient */}
        <BrandsClient
          featuredBrand={featuredBrand}
          popularBrands={popularResult.data ?? []}
          verifiedBrands={verifiedResult.data ?? []}
          communityBrands={communityResult.data ?? []}
        />
      </div>
    </PageWrapper>
  );
}
