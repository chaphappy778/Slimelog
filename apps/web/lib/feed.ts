// apps/web/lib/feed.ts
//
// T177 (2026-07-17): shared cursor-based feed helpers.
//
// Both the SSR home page (`app/page.tsx`) and the /api/feed route call
// into `fetchCommunityFeed` / `fetchFollowingFeed` here so the two
// paths cannot drift on their query shape, enrichment logic, or
// FeedCardLog assembly. The stopgap `.limit(100)` on those queries is
// retired: server-render seeds 50, the client fires more via the API.
//
// Cursor
// ------
// `before` is an ISO timestamp. When provided the base query filters
// `.lt("created_at", before)`, i.e. strictly older rows. Callers get
// the earliest returned `created_at` from the current page and hand
// it back verbatim on the next request.
//
// hasMore
// -------
// `hasMore = logs.length === limit`. Approximate but fine: if the tail
// of the table happens to be exactly `limit` long we'll issue one
// wasted request that returns an empty page. Trade-off vs. a
// count(*)-style has_more probe is worth it — the count query would
// scan the whole table on every page.
//
// Brand maps
// ----------
// brandSlugMap + brandLogoMap are built PER PAGE. Only brand names
// appearing in this page's logs get looked up. The client merges maps
// across pages so newly-loaded logs still render their brand links +
// logos.
//
// Preserved shape
// ---------------
// This is a refactor + extend of the queries that previously lived
// inline in `app/page.tsx`. The FeedCardLog assembly logic (activity
// type handling, wishlist fallback, updated_at normalisation for
// following-feed rows) is identical to what the server component was
// doing before — just moved.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedCardLog } from "@/components/FeedCard";
import { aggregateReactions } from "@/lib/reactions";

// ─── Reaction enrichment ────────────────────────────────────────────────────
//
// T127 (2026-07-21): batch-fetch reactions for a page of logs in one
// indexed IN query (mirrors the like/comment enrichment). Returns a
// per-log grouping of the raw { reaction_type, user_id } rows so the
// caller can hand each group to aggregateReactions with the viewer id.
async function fetchReactionRowsByLog(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Record<string, { reaction_type: string; user_id: string }[]>> {
  const byLog: Record<string, { reaction_type: string; user_id: string }[]> =
    {};
  if (ids.length === 0) return byLog;

  const { data, error } = await supabase
    .from("log_reactions")
    .select("log_id, reaction_type, user_id")
    .in("log_id", ids);

  if (error) {
    // Non-fatal — a feed without reaction pills is fine, but log it so a
    // silent-failing query doesn't hide (CLAUDE.md query rule).
    console.warn("[feed] reaction enrichment failed:", error.message);
    return byLog;
  }

  for (const row of (data ?? []) as {
    log_id: string;
    reaction_type: string;
    user_id: string;
  }[]) {
    (byLog[row.log_id] ??= []).push({
      reaction_type: row.reaction_type,
      user_id: row.user_id,
    });
  }
  return byLog;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedPage {
  logs: FeedCardLog[];
  brandSlugMap: Record<string, string>;
  brandLogoMap: Record<string, string>;
  hasMore: boolean;
}

interface FetchCommunityArgs {
  userId: string | null;
  before?: string;
  limit: number;
}

interface FetchFollowingArgs {
  userId: string;
  followingIds: string[];
  before?: string;
  limit: number;
}

// PostgREST returns a to-one join as either an object or a single-item
// array depending on the FK hint. Always normalise to the object form.
type JoinedProfile =
  | { username: string | null; avatar_url: string | null }
  | { username: string | null; avatar_url: string | null }[]
  | null;

function normaliseProfile(
  raw: JoinedProfile,
): { username: string | null; avatar_url: string | null } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

type CommunityQueryRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  colors: string[] | null;
  rating_overall: number | null;
  image_url: string | null;
  in_wishlist: boolean | null;
  profiles_public: JoinedProfile;
};

type ActivityFeedQueryRow = {
  id: string;
  created_at: string;
  actor_id: string;
  activity_type: string;
  log_id: string | null;
  metadata: {
    slime_name?: string | null;
    base_type?: string | null;
    brand_name_raw?: string | null;
    rating_overall?: number | null;
    colors?: string[] | null;
    image_url?: string | null;
    in_wishlist?: boolean | null;
  } | null;
  profiles_public: JoinedProfile;
};

// ─── Brand map lookup ─────────────────────────────────────────────────────────
//
// Per-page brand catalog lookup. Fires one ilike query per unique brand
// name and Promise.alls them. Matches the pattern in the previous
// inline implementation (see 2026-07-11 v2 note in page.tsx history) —
// PostgREST OR syntax mangles values with spaces or commas so we
// intentionally avoid the `.or()` shortcut.

async function buildBrandMaps(
  supabase: SupabaseClient,
  logs: FeedCardLog[],
): Promise<{
  brandSlugMap: Record<string, string>;
  brandLogoMap: Record<string, string>;
}> {
  const uniqueBrandNames = [
    ...new Set(
      logs
        .map((l) => l.brand_name_raw)
        .filter((n): n is string => n != null && n.trim() !== ""),
    ),
  ];

  const brandSlugMap: Record<string, string> = {};
  const brandLogoMap: Record<string, string> = {};

  if (uniqueBrandNames.length === 0) {
    return { brandSlugMap, brandLogoMap };
  }

  const brandResults = await Promise.all(
    uniqueBrandNames.map((name) =>
      supabase
        .from("brands")
        .select("slug, logo_url")
        .ilike("name", name)
        .maybeSingle()
        .then(({ data }) => ({
          key: name.toLowerCase(),
          slug: (data?.slug as string | undefined) ?? null,
          logo_url: (data?.logo_url as string | null | undefined) ?? null,
        })),
    ),
  );
  for (const r of brandResults) {
    if (r.slug) brandSlugMap[r.key] = r.slug;
    if (r.logo_url) brandLogoMap[r.key] = r.logo_url;
  }

  return { brandSlugMap, brandLogoMap };
}

// ─── Community feed ───────────────────────────────────────────────────────────

export async function fetchCommunityFeed(
  supabase: SupabaseClient,
  args: FetchCommunityArgs,
): Promise<FeedPage> {
  const { userId, before, limit } = args;

  // Base query — public collection_logs with the actor profile join,
  // ordered newest-first, capped at `limit`. Optional `.lt` cursor
  // filters strictly older rows on subsequent pages.
  let baseQuery = supabase
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
       shelf_state,
       profiles_public!collection_logs_user_id_fkey ( username, avatar_url )`,
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    baseQuery = baseQuery.lt("created_at", before);
  }

  const { data: baseData, error: baseError } = await baseQuery;
  if (baseError) {
    console.error("[feed] community base query failed:", baseError);
    throw baseError;
  }

  const rows = (baseData ?? []) as unknown as CommunityQueryRow[];
  const ids = rows.map((r) => r.id);

  // Enrichment: like counts, comment counts, the caller's liked-set,
  // and reaction rows (T127).
  const [{ data: likesData }, { data: commentsData }, userLikesRes, reactionRowsByLog] =
    await Promise.all([
      ids.length > 0
        ? supabase.from("likes").select("log_id").in("log_id", ids)
        : Promise.resolve({ data: [] as { log_id: string }[] }),
      ids.length > 0
        ? supabase.from("comments").select("log_id").in("log_id", ids)
        : Promise.resolve({ data: [] as { log_id: string }[] }),
      userId && ids.length > 0
        ? supabase
            .from("likes")
            .select("log_id")
            .eq("user_id", userId)
            .in("log_id", ids)
        : Promise.resolve({ data: [] as { log_id: string }[] }),
      fetchReactionRowsByLog(supabase, ids),
    ]);

  const likeCountMap: Record<string, number> = {};
  const commentCountMap: Record<string, number> = {};
  const userLikedSet = new Set<string>();

  for (const row of likesData ?? []) {
    likeCountMap[row.log_id] = (likeCountMap[row.log_id] ?? 0) + 1;
  }
  for (const row of commentsData ?? []) {
    commentCountMap[row.log_id] = (commentCountMap[row.log_id] ?? 0) + 1;
  }
  for (const row of userLikesRes.data ?? []) {
    userLikedSet.add(row.log_id);
  }

  const logs: FeedCardLog[] = rows.map((r): FeedCardLog => {
    const profile = normaliseProfile(r.profiles_public);
    return {
      id: r.id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      slime_name: r.slime_name,
      brand_name_raw: r.brand_name_raw,
      base_type: r.base_type,
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
      // T125 (2026-07-20): thread shelf_state so the feed card
      // can render the For Sale / Archived pill.
      shelf_state:
        (r as { shelf_state?: "on_shelf" | "for_sale" | "archived" })
          .shelf_state ?? "on_shelf",
      // T127 (2026-07-21): reaction summary so the pills paint on first
      // render. userId scopes viewerReacted to the current viewer.
      reactions: aggregateReactions(reactionRowsByLog[r.id] ?? [], userId),
    };
  });

  const { brandSlugMap, brandLogoMap } = await buildBrandMaps(supabase, logs);

  return {
    logs,
    brandSlugMap,
    brandLogoMap,
    hasMore: logs.length === limit,
  };
}

// ─── Following feed ───────────────────────────────────────────────────────────

export async function fetchFollowingFeed(
  supabase: SupabaseClient,
  args: FetchFollowingArgs,
): Promise<FeedPage> {
  const { userId, followingIds, before, limit } = args;

  // Empty follow list — nothing to page through. Return an empty page
  // with hasMore=false so the client stops asking.
  if (followingIds.length === 0) {
    return {
      logs: [],
      brandSlugMap: {},
      brandLogoMap: {},
      hasMore: false,
    };
  }

  let activityQuery = supabase
    .from("activity_feed")
    .select(
      `id, created_at, actor_id, activity_type, log_id, metadata,
       profiles_public!activity_feed_actor_id_fkey ( username, avatar_url )`,
    )
    .in("activity_type", ["log_created", "wishlist_added"])
    .in("actor_id", followingIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    activityQuery = activityQuery.lt("created_at", before);
  }

  const { data: activityRows, error: activityErr } = await activityQuery;
  if (activityErr) {
    console.error("[feed] following activity query failed:", activityErr);
    throw activityErr;
  }

  const typedRows = (activityRows ?? []) as unknown as ActivityFeedQueryRow[];
  const followingLogIds = typedRows
    .map((r) => r.log_id)
    .filter((id): id is string => id != null);

  // Enrichment: same shape as community, plus we need the linked
  // collection_logs' updated_at + in_wishlist (activity_feed only
  // stores the metadata snapshot at write time).
  const [
    { data: fLikesData },
    { data: fCommentsData },
    { data: fUserLikesData },
    { data: updatedAtData },
    fReactionRowsByLog,
  ] = await Promise.all([
    followingLogIds.length > 0
      ? supabase.from("likes").select("log_id").in("log_id", followingLogIds)
      : Promise.resolve({ data: [] as { log_id: string }[] }),
    followingLogIds.length > 0
      ? supabase.from("comments").select("log_id").in("log_id", followingLogIds)
      : Promise.resolve({ data: [] as { log_id: string }[] }),
    followingLogIds.length > 0
      ? supabase
          .from("likes")
          .select("log_id")
          .eq("user_id", userId)
          .in("log_id", followingLogIds)
      : Promise.resolve({ data: [] as { log_id: string }[] }),
    followingLogIds.length > 0
      ? supabase
          .from("collection_logs")
          .select("id, updated_at, in_wishlist")
          .in("id", followingLogIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            updated_at: string;
            in_wishlist: boolean | null;
          }[],
        }),
    fetchReactionRowsByLog(supabase, followingLogIds),
  ]);

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
    fCommentCountMap[row.log_id] = (fCommentCountMap[row.log_id] ?? 0) + 1;
  }
  for (const row of fUserLikesData ?? []) {
    fUserLikedSet.add(row.log_id);
  }

  const logs: FeedCardLog[] = typedRows.map((row): FeedCardLog => {
    const meta = row.metadata ?? {};
    const profile = normaliseProfile(row.profiles_public);
    const logId = row.log_id ?? row.id;

    return {
      id: logId,
      created_at: row.created_at,
      updated_at: updatedAtMap[logId] ?? row.created_at,
      slime_name: meta.slime_name ?? null,
      brand_name_raw: meta.brand_name_raw ?? null,
      base_type: meta.base_type ?? null,
      colors: meta.colors ?? null,
      rating_overall:
        meta.rating_overall != null ? Number(meta.rating_overall) : null,
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
      // T127 (2026-07-21): reaction summary, viewer-scoped to userId.
      reactions: aggregateReactions(fReactionRowsByLog[logId] ?? [], userId),
    };
  });

  const { brandSlugMap, brandLogoMap } = await buildBrandMaps(supabase, logs);

  return {
    logs,
    brandSlugMap,
    brandLogoMap,
    hasMore: logs.length === limit,
  };
}
