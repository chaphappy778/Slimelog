// apps/web/app/discover/page.tsx
// [T74-A] Discover page redesign — type carousel, popular users, featured drops

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import TypeCarousel from "@/components/discover/TypeCarousel";
import PopularUsersCarousel from "@/components/discover/PopularUsersCarousel";
import FeaturedDropsCarousel from "@/components/discover/FeaturedDropsCarousel";
import DiscoverSlimesClient from "@/components/discover/DiscoverSlimesClient";
import type { TopRatedSlime } from "@/components/discover/DiscoverSlimesClient";

type PopularUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  follower_count: number;
};

export default async function DiscoverPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const [topRatedResult, dropsResult, tagsResult, followCountResult] =
    await Promise.all([
      supabase
        .from("slimes")
        .select(
          "id, name, base_type, subtype_id, image_url, avg_overall, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, total_ratings, brand_id, brands(name, slug), subtypes(name)",
        )
        .not("avg_overall", "is", null)
        .gte("total_ratings", 3)
        .order("avg_overall", { ascending: false })
        .order("total_ratings", { ascending: false })
        .limit(20),

      supabase
        .from("upcoming_drops")
        .select(
          "id, name, drop_at, status, brand_name, brand_slug, logo_url, cover_image_url",
        )
        .in("status", ["announced", "live"])
        .order("drop_at", { ascending: true })
        .limit(20),

      supabase
        .from("tags")
        .select("id, name, use_count")
        .order("use_count", { ascending: false })
        .limit(20),

      supabase
        .from("profile_follow_counts")
        .select("id, username, follower_count")
        .order("follower_count", { ascending: false })
        .limit(12),
    ]);

  // Normalize slimes join
  const rawSlimes = topRatedResult.error ? [] : (topRatedResult.data ?? []);
  const topSlimes: TopRatedSlime[] = rawSlimes.map((s) => ({
    ...s,
    brands: Array.isArray(s.brands) ? (s.brands[0] ?? null) : s.brands,
    subtypes: Array.isArray(s.subtypes) ? (s.subtypes[0] ?? null) : s.subtypes,
  }));

  const drops = dropsResult.error ? [] : (dropsResult.data ?? []);

  const trendingTags = tagsResult.error
    ? []
    : (tagsResult.data ?? []).map(({ id, name }) => ({ id, name }));

  // Fetch profiles for popular users
  const followData = followCountResult.error
    ? []
    : (followCountResult.data ?? []);

  let popularUsers: PopularUser[] = [];
  if (followData.length > 0) {
    const userIds = followData.map((u) => u.id);
    const { data: profileData } = await supabase
      .from("profiles_public")
      .select("id, username, display_name, avatar_url, is_premium")
      .in("id", userIds);

    popularUsers = followData
      .map((f) => {
        const profile = (profileData ?? []).find((p) => p.id === f.id);
        return {
          id: f.id,
          username: f.username ?? "",
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_premium: profile?.is_premium ?? false,
          follower_count: Number(f.follower_count ?? 0),
        };
      })
      .filter((u) => u.username);
  }

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14 pb-24">
        {/* Search pill */}
        <div className="flex justify-center px-4 pt-6 pb-4">
          <Link
            href="/search"
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            style={{
              background: "rgba(45,10,78,0.4)",
              border: "1px solid rgba(45,10,78,0.7)",
              color: "rgba(255,255,255,0.5)",
              width: "100%",
              maxWidth: 400,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            Find slimes...
          </Link>
        </div>

        {/* Section: Slime Types */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="section-label">Slime Types</p>
          </div>
          <TypeCarousel />
        </section>

        {/* Section: Trending Keywords */}
        {trendingTags.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="section-label">Trending Keywords</p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none px-4">
              {trendingTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/discover/keyword/${encodeURIComponent(tag.name)}`}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: "rgba(45,10,78,0.3)",
                    color: "rgba(245,245,245,0.6)",
                    border: "1px solid rgba(45,10,78,0.5)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section: Popular Collectors */}
        {popularUsers.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="section-label">Popular Collectors</p>
            </div>
            <PopularUsersCarousel users={popularUsers} />
          </section>
        )}

        {/* Section: Top Rated Slimes */}
        <section className="mb-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Top Rated Slimes</p>
            <span
              className="text-xs"
              style={{ color: "rgba(245,245,245,0.35)" }}
            >
              Community ratings
            </span>
          </div>
          <DiscoverSlimesClient initialSlimes={topSlimes} trendingTags={[]} />
        </section>

        {/* Section: Featured Drops */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="section-label" style={{ color: "#FF00E5" }}>
              Upcoming Drops
            </p>
          </div>
          <FeaturedDropsCarousel drops={drops} />
        </section>
      </div>
    </PageWrapper>
  );
}
