// apps/web/app/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeedTabs from "@/components/FeedTabs";
import FeedCard, { type FeedCardLog } from "@/components/FeedCard";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import OnboardingGate from "@/components/onboarding/OnboardingGate";
// Feed rework batch 1 (2026-07-11): community stats hero.
import CommunityStatsHero, {
  type CommunityStats,
} from "@/components/feed/CommunityStatsHero";

// ─── Internal query row types ──────────────────────────────────────────────────
// [Change 1 — #35] These types now describe the profiles_public projection
// rather than the base profiles table. The shape is identical for the
// fields we read (username, avatar_url) — the swap is in the FK hint below.

type CommunityQueryRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null; // [Change 2a] was slime_type
  colors: string[] | null;
  rating_overall: number | null;
  image_url: string | null;
  in_wishlist: boolean | null;
  // PostgREST returns a to-one join as a plain object, not an array.
  // We normalise this below so the rest of the code never has to branch.
  profiles_public:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

type ActivityFeedQueryRow = {
  id: string;
  created_at: string;
  actor_id: string;
  activity_type: string;
  log_id: string | null;
  metadata: {
    slime_name?: string | null;
    base_type?: string | null; // [Change 2b] was slime_type
    brand_name_raw?: string | null;
    rating_overall?: number | null;
    colors?: string[] | null;
    image_url?: string | null;
    in_wishlist?: boolean | null;
  } | null;
  profiles_public:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
};

// ─── Profile normaliser ────────────────────────────────────────────────────────
// PostgREST can return a to-one relation as either an object or a single-item
// array depending on the join hint used. Always normalise to the object form.

function normaliseProfile(
  raw:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null,
): { username: string | null; avatar_url: string | null } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

// ─── Day-bucket dividers (feed rework batch 2, 2026-07-11) ────────────────────
//
// Group logs into three buckets and interleave the divider labels:
//   Today       — created_at within the current UTC day
//   This week   — within the last 7 UTC days, but not today
//   Earlier     — everything else
//
// UTC-based on purpose: server render + client hydration match without a
// reshuffle flash. Users far from UTC will see "Today" read off by a few
// hours; that's acceptable at current scale per the T105 discussion. If
// it becomes an issue we can revisit with a client-side reshuffle.

type BucketKey = "today" | "week" | "earlier";
const BUCKET_LABELS: Record<BucketKey, string> = {
  today: "Today",
  week: "This week",
  earlier: "Earlier",
};

function bucketLogsByDay(logs: FeedCardLog[]): Array<{
  key: BucketKey;
  logs: FeedCardLog[];
}> {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const sevenDaysAgo = new Date(
    todayStart.getTime() - 7 * 24 * 60 * 60 * 1000,
  );

  const buckets: Record<BucketKey, FeedCardLog[]> = {
    today: [],
    week: [],
    earlier: [],
  };
  for (const log of logs) {
    const t = new Date(log.created_at).getTime();
    if (t >= todayStart.getTime()) buckets.today.push(log);
    else if (t >= sevenDaysAgo.getTime()) buckets.week.push(log);
    else buckets.earlier.push(log);
  }

  // Preserve the incoming order within each bucket, and only emit buckets
  // that actually have content.
  const result: Array<{ key: BucketKey; logs: FeedCardLog[] }> = [];
  (["today", "week", "earlier"] as BucketKey[]).forEach((key) => {
    if (buckets[key].length > 0) result.push({ key, logs: buckets[key] });
  });
  return result;
}

function DayDivider({
  label,
  count,
  emphasized,
}: {
  label: string;
  count: number;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 mt-6 mb-3">
      <span
        className="text-[13px] font-black uppercase tracking-wider"
        style={{
          fontFamily: "Montserrat, sans-serif",
          color: emphasized ? "#39FF14" : "#ffffff",
        }}
      >
        {label}
      </span>
      <span
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(90deg, rgba(120,60,180,0.55), transparent)",
        }}
      />
      <span
        className="text-[11px] font-semibold"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {count} log{count === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function FeedListWithDividers({
  logs,
  brandSlugMap,
  currentUserId,
}: {
  logs: FeedCardLog[];
  brandSlugMap: Record<string, string>;
  currentUserId: string | null;
}) {
  const buckets = bucketLogsByDay(logs);
  return (
    <div className="flex flex-col gap-3">
      {buckets.map(({ key, logs: bucketLogs }, i) => (
        <div key={key} className="flex flex-col gap-3">
          <DayDivider
            label={BUCKET_LABELS[key]}
            count={bucketLogs.length}
            emphasized={key === "today" && i === 0}
          />
          {bucketLogs.map((log) => (
            <FeedCard
              key={log.id}
              log={log}
              brandSlugMap={brandSlugMap}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Empty states ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center bg-slime-surface border border-slime-border"
        aria-hidden="true"
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="18"
            cy="18"
            r="14"
            stroke="#39FF14"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            opacity="0.4"
          />
          <circle
            cx="18"
            cy="18"
            r="7"
            fill="rgba(57,255,20,0.12)"
            stroke="#39FF14"
            strokeWidth="1"
          />
        </svg>
      </div>
      <p className="text-slime-text font-semibold">No logs yet</p>
      <p className="text-sm text-slime-muted max-w-xs">
        Be the first to log a slime and get this feed poppin&apos;.
      </p>
    </div>
  );
}

function EmptyFollowingFeed() {
  // Feed rework batch 2 (2026-07-11): geometric-only empty state.
  // Blob + concentric dashed rings + line sparkles, all built inline
  // with SVG (no AI art). Copy locked with user 2026-07-11.
  return (
    <div className="flex flex-col items-center justify-center pt-14 pb-10 gap-3 text-center">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Dashed ring — outer */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            border: "1px dashed rgba(0,240,255,0.25)",
          }}
        />
        {/* Dashed ring — inner */}
        <div
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            width: 112,
            height: 112,
            border: "1px dashed rgba(0,240,255,0.35)",
          }}
        />
        {/* Blob */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 150 150"
          fill="none"
          aria-hidden="true"
          style={{ filter: "drop-shadow(0 0 20px rgba(204,68,255,0.4))" }}
        >
          <defs>
            <linearGradient id="emptyBlob" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#CC44FF" />
              <stop offset="1" stopColor="#00F0FF" />
            </linearGradient>
          </defs>
          <path
            fill="url(#emptyBlob)"
            d="M62 20 C94 10 134 26 138 62 C142 96 118 130 82 133 C46 136 16 116 15 80 C14 50 32 28 62 20 Z"
          />
        </svg>
        {/* Line sparkles */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ left: 18, top: 22 }}
        >
          <path d="M12 3v18M3 12h18" />
        </svg>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#39FF14"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
          className="absolute"
          style={{ right: 20, bottom: 26 }}
        >
          <path d="M12 4v16M4 12h16" />
        </svg>
      </div>
      <h3
        className="text-[22px] font-black tracking-tight text-white mt-3"
        style={{
          fontFamily: "Montserrat, sans-serif",
          letterSpacing: "-0.01em",
        }}
      >
        Nobody&apos;s logging yet
      </h3>
      <p className="text-sm text-slime-muted max-w-[280px] leading-snug">
        When people you follow log a slime, it shows up here.
      </p>
      <Link
        href="/discover"
        className="mt-4 inline-flex items-center gap-1 px-6 py-3 rounded-2xl text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Find slimers to follow
      </Link>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center bg-slime-surface border border-slime-border"
        aria-hidden="true"
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <p className="text-slime-text font-semibold">
        Sign in to see your Following feed
      </p>
      <p className="text-sm text-slime-muted max-w-xs">
        Log in to follow slimers and see their latest ratings here.
      </p>
      <Link
        href="/login"
        className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-slime-bg shadow-glow-green"
        style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      >
        Sign in
      </Link>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "community";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // [Preserved — DO NOT MODIFY] Logged-out users redirect to /landing.
  if (!isLoggedIn) {
    redirect("/landing");
  }

  // ─── Community feed ────────────────────────────────────────────────────────

  let communityLogs: FeedCardLog[] = [];
  let communityError = false;

  if (activeTab === "community") {
    // [Change 2 — #35] FK hint swapped from
    //   profiles!collection_logs_user_id_fkey
    // to
    //   profiles_public!collection_logs_user_id_fkey
    // The FK lives on the base profiles table; the view exposes `id` so
    // PostgREST resolves the relationship via the underlying FK.
    const { data: baseData, error: baseError } = await supabase
      .from("collection_logs")
      .select(
        `id,
         user_id,
         created_at,
         updated_at,
         slime_name,
         brand_name_raw,
         base_type,
         colors,
         rating_overall,
         image_url,
         in_wishlist,
         profiles_public!collection_logs_user_id_fkey ( username, avatar_url )`,
      ) // [Change 2c] was slime_type,
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (baseError) {
      communityError = true;
    } else {
      const rows = (baseData ?? []) as unknown as CommunityQueryRow[];
      const ids = rows.map((r) => r.id);

      const { data: likesData } = await supabase
        .from("likes")
        .select("log_id")
        .in("log_id", ids);

      const { data: commentsData } = await supabase
        .from("comments")
        .select("log_id")
        .in("log_id", ids);

      const { data: userLikesData } = user
        ? await supabase
            .from("likes")
            .select("log_id")
            .eq("user_id", user.id)
            .in("log_id", ids)
        : { data: [] };

      const likeCountMap: Record<string, number> = {};
      const commentCountMap: Record<string, number> = {};
      const userLikedSet = new Set<string>();

      for (const row of likesData ?? []) {
        likeCountMap[row.log_id] = (likeCountMap[row.log_id] ?? 0) + 1;
      }
      for (const row of commentsData ?? []) {
        commentCountMap[row.log_id] = (commentCountMap[row.log_id] ?? 0) + 1;
      }
      for (const row of userLikesData ?? []) {
        userLikedSet.add(row.log_id);
      }

      communityLogs = rows.map((r): FeedCardLog => {
        const profile = normaliseProfile(r.profiles_public);
        return {
          id: r.id,
          created_at: r.created_at,
          updated_at: r.updated_at,
          slime_name: r.slime_name,
          brand_name_raw: r.brand_name_raw,
          base_type: r.base_type, // [Change 2d] was slime_type: r.slime_type
          colors: r.colors,
          rating_overall: r.rating_overall,
          image_url: r.image_url,
          in_wishlist: r.in_wishlist ?? false,
          activity_type: "log_created",
          actor_id: r.user_id,
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
          like_count: likeCountMap[r.id] ?? 0,
          comment_count: commentCountMap[r.id] ?? 0,
          is_liked_by_current_user: userLikedSet.has(r.id),
        };
      });
    }
  }

  // ─── Following feed ────────────────────────────────────────────────────────

  let followingLogs: FeedCardLog[] = [];
  let followingError = false;

  if (activeTab === "following" && user) {
    const { data: followRows, error: followsErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followsErr) {
      followingError = true;
    } else {
      const followingIds = (followRows ?? []).map(
        (r) => r.following_id as string,
      );

      if (followingIds.length > 0) {
        // [Change 3 — #35] FK hint swapped to profiles_public.
        const { data: activityRows, error: activityErr } = await supabase
          .from("activity_feed")
          .select(
            `id, created_at, actor_id, activity_type, log_id, metadata,
             profiles_public!activity_feed_actor_id_fkey ( username, avatar_url )`,
          )
          .in("activity_type", ["log_created", "wishlist_added"])
          .in("actor_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(20);

        if (activityErr) {
          followingError = true;
        } else {
          const typedRows = (activityRows ??
            []) as unknown as ActivityFeedQueryRow[];
          const followingLogIds = typedRows
            .map((r) => r.log_id)
            .filter((id): id is string => id != null);

          const { data: fLikesData } = await supabase
            .from("likes")
            .select("log_id")
            .in("log_id", followingLogIds);

          const { data: fCommentsData } = await supabase
            .from("comments")
            .select("log_id")
            .in("log_id", followingLogIds);

          const { data: fUserLikesData } = await supabase
            .from("likes")
            .select("log_id")
            .eq("user_id", user.id)
            .in("log_id", followingLogIds);

          const { data: updatedAtData } = await supabase
            .from("collection_logs")
            .select("id, updated_at, in_wishlist")
            .in("id", followingLogIds);

          const updatedAtMap: Record<string, string> = {};
          const wishlistMap: Record<string, boolean> = {};
          for (const row of updatedAtData ?? []) {
            updatedAtMap[row.id] = row.updated_at;
            wishlistMap[row.id] = row.in_wishlist ?? false;
          }

          const fLikeCountMap: Record<string, number> = {};
          const fCommentCountMap: Record<string, number> = {};
          const fUserLikedSet = new Set<string>();

          for (const row of fLikesData ?? []) {
            fLikeCountMap[row.log_id] = (fLikeCountMap[row.log_id] ?? 0) + 1;
          }
          for (const row of fCommentsData ?? []) {
            fCommentCountMap[row.log_id] =
              (fCommentCountMap[row.log_id] ?? 0) + 1;
          }
          for (const row of fUserLikesData ?? []) {
            fUserLikedSet.add(row.log_id);
          }

          followingLogs = typedRows.map((row): FeedCardLog => {
            const meta = row.metadata ?? {};
            const profile = normaliseProfile(row.profiles_public);
            const logId = row.log_id ?? row.id;

            return {
              id: logId,
              created_at: row.created_at,
              updated_at: updatedAtMap[logId] ?? row.created_at,
              slime_name: meta.slime_name ?? null,
              brand_name_raw: meta.brand_name_raw ?? null,
              base_type: meta.base_type ?? null, // [Change 2e] was slime_type: meta.slime_type ?? null
              colors: meta.colors ?? null,
              rating_overall:
                meta.rating_overall != null
                  ? Number(meta.rating_overall)
                  : null,
              image_url: meta.image_url ?? null,
              in_wishlist:
                wishlistMap[logId] ??
                meta.in_wishlist ??
                row.activity_type === "wishlist_added",
              activity_type: row.activity_type,
              actor_id: row.actor_id,
              username: profile?.username ?? null,
              avatar_url: profile?.avatar_url ?? null,
              like_count: fLikeCountMap[logId] ?? 0,
              comment_count: fCommentCountMap[logId] ?? 0,
              is_liked_by_current_user: fUserLikedSet.has(logId),
            };
          });
        }
      }
    }
  }

  // ─── Brand slug lookup ─────────────────────────────────────────────────────

  const displayLogs = activeTab === "following" ? followingLogs : communityLogs;
  const displayError =
    activeTab === "following" ? followingError : communityError;

  const uniqueBrandNames = [
    ...new Set(
      displayLogs
        .map((l) => l.brand_name_raw)
        .filter((n): n is string => n != null && n.trim() !== ""),
    ),
  ];

  // 2026-07-11: brandSlugMap now keyed by lowercased brand name so
  // "Goo Lagoon" in the catalog matches "goo lagoon" (or any other
  // case) in a log's brand_name_raw. Previously the .eq / .in
  // comparison was case-sensitive, so brand links silently broke on
  // any case mismatch. FeedCard now looks up via the lowercased key.
  let brandSlugMap: Record<string, string> = {};

  if (uniqueBrandNames.length > 0) {
    // Build an OR filter of ilike clauses so the catalog fetch itself
    // is case-insensitive (a plain .in() is case-sensitive, so we'd
    // miss brands here before we even got to the map lookup).
    const orClause = uniqueBrandNames
      .map((n) => `name.ilike.${n.replace(/[,()]/g, " ")}`)
      .join(",");
    const { data: brandRows } = await supabase
      .from("brands")
      .select("name, slug")
      .or(orClause);

    for (const row of brandRows ?? []) {
      if (row.name && row.slug) {
        brandSlugMap[row.name.toLowerCase()] = row.slug;
      }
    }
  }

  // ─── Community stats (feed rework batch 1) ────────────────────────────────
  //
  // Four counts feed the top-of-feed hero. All four fire in parallel with
  // { count: "exact", head: true } so we get row counts without pulling
  // any actual rows. is_public filter on collection_logs matches what the
  // feed shows publicly. sevenDaysAgo is UTC ISO — matches how
  // created_at is stored.
  const sevenDaysAgoIso = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    slimersAllTimeRes,
    slimersThisWeekRes,
    slimesAllTimeRes,
    slimesThisWeekRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoIso),
    supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true),
    supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .gte("created_at", sevenDaysAgoIso),
  ]);

  const stats: CommunityStats = {
    slimersAllTime: slimersAllTimeRes.count ?? 0,
    slimersThisWeek: slimersThisWeekRes.count ?? 0,
    slimesAllTime: slimesAllTimeRes.count ?? 0,
    slimesThisWeek: slimesThisWeekRes.count ?? 0,
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      {/* First-login walkthrough — client-side gated by
          profiles.onboarding_completed_at. Renders nothing for repeat
          visitors. */}
      <OnboardingGate />

      <div className="pt-14">
        {/* Feed rework batch 1 (2026-07-11): community stats hero sits
            above the feed tabs. The previous "Community Feed / What the
            community is logging" section-label block was removed since
            the hero + the renamed "For you"/"Following" tabs carry the
            page framing on their own. */}
        <div className="px-4 pt-6 pb-4">
          <CommunityStatsHero stats={stats} />
        </div>

        <div className="px-4 pb-4">
          <FeedTabs activeTab={activeTab} isLoggedIn={isLoggedIn} />
        </div>

        <section className="px-4 pb-24">
          {activeTab === "following" && !isLoggedIn ? (
            <LoginPrompt />
          ) : (
            <>
              {displayError && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  Couldn&apos;t load the feed right now — try refreshing.
                </div>
              )}
              {displayLogs.length === 0 && !displayError ? (
                activeTab === "following" ? (
                  <EmptyFollowingFeed />
                ) : (
                  <EmptyFeed />
                )
              ) : (
                // Feed rework batch 2 (2026-07-11): group logs by day
                // bucket (Today / This week / Earlier) and interleave
                // divider labels. Bucketing uses UTC ISO strings so
                // there's no server/client mismatch — see note at
                // bucketLogsByDay() call site.
                <FeedListWithDividers
                  logs={displayLogs}
                  brandSlugMap={brandSlugMap}
                  currentUserId={user?.id ?? null}
                />
              )}
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
