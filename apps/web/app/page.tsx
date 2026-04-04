// apps/web/app/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import FeedTabs from "@/components/FeedTabs";
import FeedCard, { type FeedCardLog } from "@/components/FeedCard";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";

// ─── Internal query row types ──────────────────────────────────────────────────
// These are only used to type raw Supabase responses before normalisation.
// They are NOT exported — all consumer-facing data uses FeedCardLog from FeedCard.

type CommunityQueryRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
  colors: string[] | null;
  rating_overall: number | null;
  image_url: string | null;
  // PostgREST returns a to-one join as a plain object, not an array.
  // We normalise this below so the rest of the code never has to branch.
  profiles:
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
    slime_type?: string | null;
    brand_name_raw?: string | null;
    rating_overall?: number | null;
    colors?: string[] | null;
    image_url?: string | null;
  } | null;
  profiles:
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

// ─── Empty states ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center bg-slime-surface border border-slime-border"
        aria-hidden="true"
      >
        {/* Bubble SVG */}
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
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
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
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </div>
      <p className="text-slime-text font-semibold">Nothing here yet</p>
      <p className="text-sm text-slime-muted max-w-xs">
        Follow some slimers to see their logs here.
      </p>
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

  if (!isLoggedIn) {
    redirect("/landing");
  }

  // ─── Community feed ────────────────────────────────────────────────────────

  let communityLogs: FeedCardLog[] = [];
  let communityError = false;

  if (activeTab === "community") {
    // [Change 1] Extended profile select to include avatar_url.
    // [Change 2] Added user_id and image_url to base select.
    // [Change 3] FK hint profiles!collection_logs_user_id_fkey ensures the join
    //            resolves to the correct FK and returns a real profile row
    //            instead of null — this fixes the @anonymous bug.
    const { data: baseData, error: baseError } = await supabase
      .from("collection_logs")
      .select(
        `id,
         user_id,
         created_at,
         updated_at,
         slime_name,
         brand_name_raw,
         slime_type,
         colors,
         rating_overall,
         image_url,
         profiles!collection_logs_user_id_fkey ( username, avatar_url )`,
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    if (baseError) {
      communityError = true;
    } else {
      const rows = (baseData ?? []) as unknown as CommunityQueryRow[];
      const ids = rows.map((r) => r.id);

      // [Change 4] Bulk like counts.
      const { data: likesData } = await supabase
        .from("likes")
        .select("log_id")
        .in("log_id", ids);

      // [Change 5] Bulk comment counts.
      const { data: commentsData } = await supabase
        .from("comments")
        .select("log_id")
        .in("log_id", ids);

      // [Change 6] is_liked_by_current_user check for the authed user.
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

      // [Change 7] Normalise profile shape — fixes @anonymous bug.
      // PostgREST may return a plain object or array; normaliseProfile handles both.
      communityLogs = rows.map((r): FeedCardLog => {
        const profile = normaliseProfile(r.profiles);
        return {
          id: r.id,
          created_at: r.created_at,
          updated_at: r.updated_at,
          slime_name: r.slime_name,
          brand_name_raw: r.brand_name_raw,
          slime_type: r.slime_type,
          colors: r.colors,
          rating_overall: r.rating_overall,
          image_url: r.image_url,
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
        // [Change 8] Extended profile select on activity_feed to include avatar_url.
        const { data: activityRows, error: activityErr } = await supabase
          .from("activity_feed")
          .select(
            `id, created_at, actor_id, log_id, metadata,
             profiles!activity_feed_actor_id_fkey ( username, avatar_url )`,
          )
          .eq("activity_type", "log_created")
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

          // [Change 9] Bulk like + comment counts for following feed.
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

          // [Change 12] Bulk-fetch updated_at from collection_logs for following
          // feed rows. activity_feed.metadata does not carry updated_at, so we
          // need a secondary lookup keyed by log_id.
          const { data: updatedAtData } = await supabase
            .from("collection_logs")
            .select("id, updated_at")
            .in("id", followingLogIds);

          const updatedAtMap: Record<string, string> = {};
          for (const row of updatedAtData ?? []) {
            updatedAtMap[row.id] = row.updated_at;
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

          // [Change 10] Normalise following-feed profiles — same fix applied.
          followingLogs = typedRows.map((row): FeedCardLog => {
            const meta = row.metadata ?? {};
            const profile = normaliseProfile(row.profiles);
            const logId = row.log_id ?? row.id;

            return {
              id: logId,
              created_at: row.created_at,
              updated_at: updatedAtMap[logId] ?? row.created_at,
              slime_name: meta.slime_name ?? null,
              brand_name_raw: meta.brand_name_raw ?? null,
              slime_type: meta.slime_type ?? null,
              colors: meta.colors ?? null,
              rating_overall:
                meta.rating_overall != null
                  ? Number(meta.rating_overall)
                  : null,
              image_url: meta.image_url ?? null,
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

  // [Change 11] Collect all unique brand_name_raw values across the active feed,
  // do a single bulk query, and build a name→slug map to pass to FeedCard.
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

  let brandSlugMap: Record<string, string> = {};

  if (uniqueBrandNames.length > 0) {
    const { data: brandRows } = await supabase
      .from("brands")
      .select("name, slug")
      .in("name", uniqueBrandNames);

    for (const row of brandRows ?? []) {
      if (row.name && row.slug) {
        brandSlugMap[row.name] = row.slug;
      }
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14">
        {/* Feed header */}
        <div className="px-4 pt-6 pb-2">
          <p className="section-label">Community Feed</p>
          <p className="text-sm text-slime-muted mt-1">
            What the community is logging
          </p>
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
                <>
                  <p className="text-xs text-slime-muted mb-4 font-medium uppercase tracking-wider">
                    {activeTab === "following"
                      ? "From people you follow"
                      : "Recent logs"}{" "}
                    · {displayLogs.length} shown
                  </p>
                  <div className="flex flex-col gap-4">
                    {displayLogs.map((log) => (
                      <FeedCard
                        key={log.id}
                        log={log}
                        brandSlugMap={brandSlugMap}
                        currentUserId={user?.id ?? null}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
