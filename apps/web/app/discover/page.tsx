// apps/web/app/discover/page.tsx
// [T74-A] Discover page redesign — type carousel, popular users, featured drops
// [T74-A polish] Keywords merged into Slime Types section, carousel sizes removed
// [T32f 2026-07-13] `?sort=<axis>` deep-links from /how-to-rate. Each axis
//   footer on how-to-rate links to /discover?sort=<axis-slug>. This page
//   maps the slug to the underlying avg column, changes the ORDER BY,
//   and passes the axis down to the client so the rating-bar readout and
//   sort math both use that axis instead of avg_overall.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import TypeCarousel from "@/components/discover/TypeCarousel";
import PopularUsersCarousel from "@/components/discover/PopularUsersCarousel";
import FeaturedDropsCarousel from "@/components/discover/FeaturedDropsCarousel";
import DiscoverSlimesClient from "@/components/discover/DiscoverSlimesClient";
import type {
  TopRatedSlime,
  SortAxis,
} from "@/components/discover/DiscoverSlimesClient";

// ─── Axis slug → DB column mapping ──────────────────────────────────────
// Public slugs match /how-to-rate ids. DB columns predate the six-axis
// vocabulary (drizzle == aesthetic, sensory_fit == quality) — keep the
// slugs canonical and translate at the query boundary.
const AXIS_TO_COLUMN = {
  texture: { column: "avg_texture", label: "Texture" },
  sound: { column: "avg_sound", label: "Sound" },
  aesthetic: { column: "avg_drizzle", label: "Aesthetic" },
  creativity: { column: "avg_creativity", label: "Creativity" },
  quality: { column: "avg_sensory_fit", label: "Quality" },
  overall: { column: "avg_overall", label: "Overall" },
} as const;

type AxisSlug = keyof typeof AXIS_TO_COLUMN;

function normalizeAxisSlug(raw: string | undefined): AxisSlug {
  if (!raw) return "overall";
  const lower = raw.toLowerCase();
  return (lower in AXIS_TO_COLUMN ? lower : "overall") as AxisSlug;
}

type PopularUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_premium: boolean;
  follower_count: number;
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const axisSlug = normalizeAxisSlug(params.sort);
  const { column: sortColumn, label: sortLabel } = AXIS_TO_COLUMN[axisSlug];
  const isCustomAxis = axisSlug !== "overall";

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
        .not(sortColumn, "is", null)
        .gte("total_ratings", 3)
        .order(sortColumn, { ascending: false })
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
        {/* [Change 1] Search pill — small cyan pill, hugs content */}
        <div className="flex justify-center px-4 pt-6 pb-4">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold"
            style={{
              background: "rgba(0,240,255,0.08)",
              border: "1px solid rgba(0,240,255,0.5)",
              color: "#00F0FF",
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
            Search
          </Link>
        </div>

        {/* T110: subtle "suggest a brand" CTA — purple-outlined card with
            a magenta accent link. Lives above the type carousel so it
            surfaces to anyone browsing Discover, not just people who
            scroll to the end. */}
        <div className="px-4 mb-6">
          <Link
            href="/submit-brand"
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-colors"
            style={{
              background: "rgba(45,10,78,0.25)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex items-center justify-center rounded-xl shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: "rgba(255,0,229,0.10)",
                  border: "1px solid rgba(255,0,229,0.4)",
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FF00E5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-bold text-white truncate"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Know a slime shop we should track?
                </p>
                <p
                  className="text-xs font-semibold mt-0.5"
                  style={{ color: "#FF00E5" }}
                >
                  Suggest a brand &rarr;
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Section: Slime Types + Keywords combined */}
        <section className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="section-label">Slime Types</p>
          </div>

          {/* Type cards carousel */}
          <TypeCarousel />

          {/* Keywords row — lives below type carousel, inside same section */}
          {trendingTags.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto scrollbar-none px-4 mt-4"
              style={
                {
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                } as React.CSSProperties
              }
            >
              {/* Search icon pill — routes to keyword search page */}
              <Link
                href="/discover/keyword"
                className="shrink-0 flex items-center justify-center rounded-full transition-colors"
                style={{
                  width: 36,
                  height: 32,
                  background: "rgba(45,10,78,0.4)",
                  border: "1px solid rgba(0,240,255,0.3)",
                  color: "#00F0FF",
                }}
                aria-label="Search keywords"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </Link>

              {/* Keyword pills */}
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
          )}
        </section>

        {/* Section: Popular Collectors */}
        {popularUsers.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="section-label">Popular Collectors</p>
            </div>
            <PopularUsersCarousel users={popularUsers} />
          </section>
        )}

        {/* Section: Top Rated Slimes.
            [T32f 2026-07-13] When ?sort=<axis> is set, the label becomes
            "Top Rated by <Axis>" and the axis is passed to the client so
            it can display the axis-specific rating value + sort. */}
        <section className="mb-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">
              {isCustomAxis ? `Top Rated by ${sortLabel}` : "Top Rated Slimes"}
            </p>
            <span
              className="text-xs"
              style={{ color: "rgba(245,245,245,0.35)" }}
            >
              Community ratings
            </span>
          </div>
          <DiscoverSlimesClient
            initialSlimes={topSlimes}
            trendingTags={[]}
            sortAxis={isCustomAxis ? (axisSlug as SortAxis) : null}
          />
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
