// apps/web/app/discover/page.tsx
// [T74-A] Discover page redesign — type carousel, popular users, featured drops.
// [T32f 2026-07-13] `?sort=<axis>` deep-links from /how-to-rate.
// [Discover V1 — 2026-07-13] Design rework based on the Discover
//   Evaluation package. Section order: Search hero → Trending pulse
//   (or early-days empty state) → Types → Suggest a brand → Keywords
//   → Top rated (with medal tiles for top 3) → Popular collectors
//   (with substance line) → Upcoming drops (with T-minus pills).
//   Trending pulse gates on `EARLY_DAYS_THRESHOLD` from
//   `TrendingPulse.tsx` — below that we render the "seed the
//   community" empty state instead so the widget doesn't look sad
//   pre-launch. Collector cards now carry a specialty line
//   ("Butter specialist · 340 slimes · avg ★4.2 given") computed
//   from a single per-batch collection_logs query joined to slimes.
//   Bell / For-you / notifications-inbox are intentionally NOT here —
//   deferred to a later phase per the Discover eval review.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import TypeCarousel from "@/components/discover/TypeCarousel";
import PopularUsersCarousel from "@/components/discover/PopularUsersCarousel";
import type { PopularUser } from "@/components/discover/PopularUsersCarousel";
import FeaturedDropsCarousel from "@/components/discover/FeaturedDropsCarousel";
import DiscoverSlimesClient from "@/components/discover/DiscoverSlimesClient";
import type {
  TopRatedSlime,
  SortAxis,
} from "@/components/discover/DiscoverSlimesClient";
import SearchHero from "@/components/discover/SearchHero";
import TrendingPulse, {
  TrendingPulseEmpty,
  EARLY_DAYS_THRESHOLD,
  type MomentumRow,
} from "@/components/discover/TrendingPulse";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

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

  // ─── Query time boundaries ────────────────────────────────────────────
  // We fetch collection_logs from the last 8 days so the pulse can
  // compute both "today" and a 7-day sparkline in a single scan.
  const now = new Date();
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);

  const [
    topRatedResult,
    dropsResult,
    tagsResult,
    followCountResult,
    pulseLogsResult,
    typeCountsResult,
  ] = await Promise.all([
    supabase
      .from("slimes")
      .select(
        "id, name, base_type, subtype_id, image_url, avg_overall, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, total_ratings, brand_id, brands(name, slug), subtypes(name)",
      )
      .not(sortColumn, "is", null)
      // 2026-07-13: dropped from >= 3 to >= 1 while we're pre-launch.
      // The 3-rating gate is a good idea for a mature leaderboard (kills
      // one-fan-rated flukes) but pre-launch it wipes the section
      // clean — a butter with 5 logs but only 2 rated ends up
      // hidden. Nudge this back to 3 once we have real rating volume,
      // and consider making it a tunable env / route param so we can
      // adjust without a redeploy.
      .gte("total_ratings", 1)
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

    // [Discover V1] Pulse feed. Fetches recent logs (last 8 days)
    // joined to slime name / base_type / brand so we can derive:
    //   - logs today
    //   - 7-day sparkline
    //   - top climbing base type (arrow marker)
    //   - top climbing specific slime (arrow marker + link)
    // Tag momentum uses the separate `tagsResult` since we don't need
    // to join collection_logs to tag activity for a "hot" signal.
    supabase
      .from("collection_logs")
      .select(
        "created_at, slime_id, slimes(id, name, base_type, brands(name, slug))",
      )
      .gte("created_at", eightDaysAgo.toISOString()),

    // [Discover V1 gap-fill] Per-base-type slime counts for the
    // TypeCarousel cards. Single scan of the base_type column, JS
    // aggregation. Small pre-launch; add a cost-tracker entry if we
    // start seeing this render slowly.
    supabase.from("slimes").select("base_type").not("base_type", "is", null),
  ]);

  // ─── Top-rated slimes normalization ───────────────────────────────────
  const rawSlimes = topRatedResult.error ? [] : (topRatedResult.data ?? []);
  const topSlimes: TopRatedSlime[] = rawSlimes.map((s) => ({
    ...s,
    brands: Array.isArray(s.brands) ? (s.brands[0] ?? null) : s.brands,
    subtypes: Array.isArray(s.subtypes) ? (s.subtypes[0] ?? null) : s.subtypes,
  }));

  const drops = dropsResult.error ? [] : (dropsResult.data ?? []);

  const trendingTags = tagsResult.error
    ? []
    : (tagsResult.data ?? []).map(({ id, name, use_count }) => ({
        id,
        name,
        use_count: Number(use_count ?? 0),
      }));

  // ─── Per-type slime counts ────────────────────────────────────────────
  // Aggregate the base_type-only scan into a `Record<baseType, number>`
  // for the TypeCarousel. Missing types just render "be the first."
  const typeCountsRows = typeCountsResult.error
    ? []
    : (typeCountsResult.data ?? []);
  const typeCounts: Partial<Record<SlimeBaseType, number>> = {};
  for (const row of typeCountsRows) {
    const bt = row.base_type;
    if (!bt) continue;
    typeCounts[bt as SlimeBaseType] =
      (typeCounts[bt as SlimeBaseType] ?? 0) + 1;
  }

  // ─── Trending pulse aggregation ───────────────────────────────────────
  // Compute logsToday, sparkline (7 days ending today), and up to 3
  // momentum rows from base_type volume over the last 7 days. This
  // runs entirely in JS on data we already fetched, so no extra round-
  // trips. Pre-launch these numbers will usually be under the threshold
  // and we'll render the early-days empty state instead.
  const pulseLogs = pulseLogsResult.error ? [] : (pulseLogsResult.data ?? []);

  // Start-of-day boundaries for the last 7 days (index 6 = today,
  // index 0 = 7 days ago). Server tz assumed acceptable for now — a
  // more careful pass would use the user's tz.
  const dayBuckets: number[] = Array(7).fill(0);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfToday_ms = startOfToday.getTime();

  const baseTypeCountsLast7: Record<string, number> = {};
  const slimeCountsLast7: Record<
    string,
    { name: string; brand: string | null; brandSlug: string | null; count: number }
  > = {};
  let logsToday = 0;

  for (const row of pulseLogs) {
    if (!row.created_at) continue;
    const t = new Date(row.created_at).getTime();
    const daysAgo = Math.floor((startOfToday_ms - t) / (24 * 60 * 60 * 1000));

    if (daysAgo < 0) {
      // Log is stamped today (or in the future by clock skew).
      logsToday += 1;
      dayBuckets[6] += 1;
    } else if (daysAgo < 7) {
      dayBuckets[6 - daysAgo] += 1;
    }

    // Both climbing feeds only care about last-7-day rows.
    if (daysAgo < 7) {
      const rawSlime = row.slimes;
      const s = Array.isArray(rawSlime) ? rawSlime[0] : rawSlime;

      const base_type = s?.base_type ?? null;
      if (base_type) {
        baseTypeCountsLast7[base_type] =
          (baseTypeCountsLast7[base_type] ?? 0) + 1;
      }

      const slimeId = row.slime_id ?? s?.id ?? null;
      const slimeName = s?.name ?? null;
      if (slimeId && slimeName) {
        const rawBrand = s?.brands;
        const brandObj = Array.isArray(rawBrand) ? rawBrand[0] : rawBrand;
        const brandName = brandObj?.name ?? null;
        const brandSlug = brandObj?.slug ?? null;
        if (!slimeCountsLast7[slimeId]) {
          slimeCountsLast7[slimeId] = {
            name: slimeName,
            brand: brandName,
            brandSlug,
            count: 0,
          };
        }
        slimeCountsLast7[slimeId].count += 1;
      }
    }
  }

  const logsLast7Days = dayBuckets.reduce((a, b) => a + b, 0);

  // ─── Build a mixed momentum feed ──────────────────────────────────────
  // Design's mockup shows three different KINDS of rows so the pulse
  // reads varied at scan. We slot in:
  //   Row 1: top climbing base type (arrow marker)
  //   Row 2: top climbing specific slime (arrow marker + link)
  //   Row 3: top trending tag (flame marker)
  // Any row we can't fill (empty data) drops out silently.
  const momentum: MomentumRow[] = [];

  const topBaseType = Object.entries(baseTypeCountsLast7).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topBaseType) {
    const [bt, count] = topBaseType;
    momentum.push({
      marker: "up",
      label:
        SLIME_BASE_TYPE_LABELS[bt as SlimeBaseType] ??
        bt.replace(/_/g, " "),
      sub: "is heating up",
      delta: `+${count} logs`,
      href: `/discover/type/${bt}`,
    });
  }

  const topSlime = Object.entries(slimeCountsLast7).sort(
    (a, b) => b[1].count - a[1].count,
  )[0];
  if (topSlime) {
    const [slimeId, s] = topSlime;
    momentum.push({
      marker: "up",
      label: s.name,
      sub: s.brand ? `· ${s.brand}` : null,
      delta: s.count >= 3 ? `+${s.count} logs` : "climbing",
      href: `/slimes/${slimeId}`,
    });
  }

  // Top trending tag as the flame row. Uses use_count as the raw
  // signal (we don't track week-over-week deltas yet). Design's spec
  // showed "+61 posts" which is delta but a raw count still reads.
  if (trendingTags.length > 0) {
    const t = trendingTags[0];
    momentum.push({
      marker: "hot",
      label: `#${t.name}`,
      sub: "tag spiking",
      delta: t.use_count >= 3 ? `${t.use_count} posts` : "trending",
      href: `/discover/keyword/${encodeURIComponent(t.name)}`,
    });
  }

  // ─── Popular users + collector enrichment ─────────────────────────────
  const followData = followCountResult.error
    ? []
    : (followCountResult.data ?? []);

  let popularUsers: PopularUser[] = [];
  if (followData.length > 0) {
    const userIds = followData.map((u) => u.id);

    // Enrichment: fetch every collection_log for the popular users so
    // we can compute favorite base type, slime count, and average
    // rating given in one batch. This is O(sum of shelf sizes) — safe
    // pre-launch at 12 users × <100 shelves. Cost-tracker entry below.
    const [profileResult, enrichmentResult] = await Promise.all([
      supabase
        .from("profiles_public")
        .select("id, username, display_name, avatar_url, is_premium")
        .in("id", userIds),
      supabase
        .from("collection_logs")
        .select("user_id, rating_overall, slimes(base_type)")
        .in("user_id", userIds),
    ]);

    const profileData = profileResult.data ?? [];
    const enrichRows = enrichmentResult.error
      ? []
      : (enrichmentResult.data ?? []);

    // Reduce enrichment rows into a per-user aggregate.
    const perUser: Record<
      string,
      { baseTypes: Record<string, number>; ratings: number[]; count: number }
    > = {};
    for (const uid of userIds) {
      perUser[uid] = { baseTypes: {}, ratings: [], count: 0 };
    }
    for (const row of enrichRows) {
      const u = perUser[row.user_id];
      if (!u) continue;
      u.count += 1;
      const rawSlime = row.slimes;
      const s = Array.isArray(rawSlime) ? rawSlime[0] : rawSlime;
      const bt = s?.base_type ?? null;
      if (bt) {
        u.baseTypes[bt] = (u.baseTypes[bt] ?? 0) + 1;
      }
      if (typeof row.rating_overall === "number") {
        u.ratings.push(row.rating_overall);
      }
    }

    popularUsers = followData
      .map((f): PopularUser => {
        const profile = profileData.find((p) => p.id === f.id);
        const agg = perUser[f.id] ?? {
          baseTypes: {},
          ratings: [],
          count: 0,
        };

        // Favorite base type = mode of the user's log base_types.
        // Requires >= 3 logs before we call anyone a specialist —
        // otherwise a single Butter log turns everyone into a
        // "Butter specialist" and the line loses meaning.
        let favorite_base_type: string | null = null;
        if (agg.count >= 3) {
          const sorted = Object.entries(agg.baseTypes).sort(
            (a, b) => b[1] - a[1],
          );
          if (sorted.length > 0) favorite_base_type = sorted[0][0];
        }

        const avg_rating_given =
          agg.ratings.length > 0
            ? agg.ratings.reduce((a, b) => a + b, 0) / agg.ratings.length
            : null;

        return {
          id: f.id,
          username: f.username ?? "",
          display_name: profile?.display_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          is_premium: profile?.is_premium ?? false,
          follower_count: Number(f.follower_count ?? 0),
          favorite_base_type,
          slime_count: agg.count > 0 ? agg.count : null,
          avg_rating_given,
        };
      })
      .filter((u) => u.username);
  }

  // Whether to show the pulse widget or the early-days empty state.
  const showPulse = logsLast7Days >= EARLY_DAYS_THRESHOLD;

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14 pb-24">
        {/* ── Search hero ────────────────────────────────────────────
            Replaces the small "Search" pill. Full-width input,
            routes to /search?q=<text> on Enter. Typeahead is V2. */}
        <SearchHero />

        {/* ── Trending pulse / early-days state ───────────────────── */}
        <div className="mb-10">
          {showPulse ? (
            <TrendingPulse
              logsToday={logsToday}
              logsLast7Days={logsLast7Days}
              sparkline={dayBuckets}
              momentum={momentum}
            />
          ) : (
            <TrendingPulseEmpty />
          )}
        </div>

        {/* ── Section: Upcoming Drops (moved above Types) ──────────
            [2026-07-13] Drops carry real urgency (LIVE / T-3d / T-1w),
            so they pair naturally with the pulse ("what's happening
            now") rather than sitting at the bottom of a long scroll.
            Types are for slower exploration and can wait. */}
        <section className="mb-10">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="section-label" style={{ color: "#FF00E5" }}>
              Upcoming Drops
            </p>
          </div>
          <FeaturedDropsCarousel drops={drops} />
        </section>

        {/* ── Section: Slime Types ───────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="section-label">Slime Types</p>
            <Link
              href="/guide#part-1"
              className="text-[11.5px] font-semibold"
              style={{ color: "rgba(245,245,245,0.5)" }}
            >
              What are these? ›
            </Link>
          </div>
          <TypeCarousel counts={typeCounts} />
        </section>

        {/* ── Suggest a brand card ───────────────────────────────────
            T110 CTA lives here in V1 — between Types and Keywords —
            still surfaces mid-scroll before the leaderboard, without
            competing with the hero pulse widget. */}
        <div className="px-4 mb-10">
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

        {/* ── Section: Trending Keywords ─────────────────────────────
            Split out from the type section per Design's V1 proposal.
            The relationship reads cleaner as two distinct rows. */}
        {trendingTags.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="section-label">Trending Keywords</p>
              <Link
                href="/discover/keyword"
                className="text-[11.5px] font-semibold"
                style={{ color: "rgba(245,245,245,0.5)" }}
              >
                Search tags ›
              </Link>
            </div>
            <div
              className="flex gap-2 overflow-x-auto scrollbar-none px-4"
              style={
                {
                  msOverflowStyle: "none",
                  scrollbarWidth: "none",
                } as React.CSSProperties
              }
            >
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
              {trendingTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/discover/keyword/${encodeURIComponent(tag.name)}`}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full transition-colors"
                  style={{
                    padding: "7px 12px",
                    background: "rgba(45,10,78,0.3)",
                    border: "1px solid rgba(45,10,78,0.5)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    className="text-xs"
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    {tag.name}
                  </span>
                  {tag.use_count > 0 && (
                    <span
                      className="text-[10.5px] tabular-nums font-bold"
                      style={{ color: "#7BFF7B" }}
                    >
                      {tag.use_count}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── Section: Top Rated Slimes (with medal tiles) ───────────
            [T32f 2026-07-13] When ?sort=<axis> is set, the label
            becomes "Top Rated by <Axis>" and the axis is passed to
            the client so the rating-bar readout + sort use that axis.
            [Discover V1] Rank 1-3 render as medal tiles inside the
            client. */}
        <section className="mb-10 px-4">
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

        {/* ── Section: Popular Collectors ────────────────────────────
            Cards now carry a substance line: fav base type ·
            shelf size · avg rating given. Discovery signal, not
            just follower count. */}
        {popularUsers.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between px-4 mb-3">
              <p className="section-label">Popular Collectors</p>
              <span
                className="text-[11.5px]"
                style={{ color: "rgba(245,245,245,0.5)" }}
              >
                Top shelves
              </span>
            </div>
            <PopularUsersCarousel users={popularUsers} />
          </section>
        )}
      </div>
    </PageWrapper>
  );
}
