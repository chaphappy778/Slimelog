// apps/web/app/api/feed/route.ts
//
// T177 (2026-07-17): cursor-based Load More for the home feed tabs.
//
// GET /api/feed
//   ?tab=community|following  (default community; 400 on any other value)
//   ?before=<iso>             (cursor — strictly older-than filter)
//   ?limit=<int 1..50>        (default 50; capped so a client can't hammer
//                              the DB with limit=10000)
//
// Response
//   {
//     logs: FeedCardLog[],
//     brandSlugMap: Record<string, string>,
//     brandLogoMap: Record<string, string>,
//     hasMore: boolean,
//   }
//
// Auth
//   Cookie session via createClient(). Following requires auth (401 if
//   not signed in). Community is public — anon callers get the same
//   view a signed-out visitor would.

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCommunityFeed, fetchFollowingFeed } from "@/lib/feed";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 50;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { searchParams } = req.nextUrl;

  // ─── tab ────────────────────────────────────────────────────────────────
  const rawTab = searchParams.get("tab");
  const tab = rawTab === null ? "community" : rawTab;
  if (tab !== "community" && tab !== "following") {
    return NextResponse.json(
      { error: "Invalid `tab`, expected community or following" },
      { status: 400 },
    );
  }

  // ─── before ─────────────────────────────────────────────────────────────
  const beforeRaw = searchParams.get("before");
  let before: string | undefined;
  if (beforeRaw) {
    const t = Date.parse(beforeRaw);
    if (Number.isNaN(t)) {
      return NextResponse.json(
        { error: "Invalid `before` timestamp" },
        { status: 400 },
      );
    }
    before = new Date(t).toISOString();
  }

  // ─── limit ──────────────────────────────────────────────────────────────
  const limitRaw = searchParams.get("limit");
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== null) {
    const parsed = Number.parseInt(limitRaw, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
      return NextResponse.json(
        { error: `Invalid \`limit\`, expected integer 1..${MAX_LIMIT}` },
        { status: 400 },
      );
    }
    limit = parsed;
  }

  try {
    if (tab === "following") {
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: followRows, error: followsErr } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followsErr) {
        console.error("[api/feed] follows lookup failed:", followsErr);
        return NextResponse.json(
          { error: "Could not load your following list" },
          { status: 500 },
        );
      }

      const followingIds = (followRows ?? []).map(
        (r) => r.following_id as string,
      );

      const page = await fetchFollowingFeed(supabase, {
        userId: user.id,
        followingIds,
        before,
        limit,
      });

      return NextResponse.json(page);
    }

    // community
    const page = await fetchCommunityFeed(supabase, {
      userId: user?.id ?? null,
      before,
      limit,
    });
    return NextResponse.json(page);
  } catch (err) {
    console.error("[api/feed] fetch failed:", err);
    // Observability: surface the swallowed error to Sentry.
    Sentry.captureException(err, { tags: { route: "feed" } });
    return NextResponse.json(
      { error: "Could not load the feed" },
      { status: 500 },
    );
  }
}
