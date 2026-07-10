// apps/web/app/api/account/data-export/route.ts
//
// GDPR Article 15/20 data export (audit / tracker item #16).
//
// Emits a JSON blob containing every row of user-owned data across the
// SlimeLog schema. Downloadable via Content-Disposition attachment.
//
// Scope
// -----
// Everything the user has created OR that references them by user_id.
// Public data about other users (e.g., who ELSE liked their post) is
// deliberately excluded — that's not "their" data. Data about content
// they authored (a slime record, a brand rating) IS included.
//
// Auth
// ----
// Requires a valid session; RLS on the anon key wouldn't let this route
// see the user's own data across every table cleanly (some tables have
// per-viewer-visibility that would strip fields). Instead we auth the
// user via the SSR client, then query with the admin client scoped by
// their user_id. This is safe because:
//   1. The user can only ever request THEIR OWN data (no ?user_id= param)
//   2. Admin client is scoped by session user.id, not by an attacker-
//      supplied value
//
// Format
// ------
// application/json, one top-level key per data category. Every category
// value is an array (or object for singletons like `profile`). The
// wrapper includes a `_meta` block with export timestamp, user id, and
// SlimeLog schema version for future upgrade compatibility.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EXPORT_SCHEMA_VERSION = "1.0";

export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();

  // Auth via the SSR client — we want the session-linked user, not an
  // arbitrary id from the request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to export your data." },
      { status: 401 },
    );
  }

  const userId = user.id;
  const admin = createAdminClient();

  // Query each table in parallel — no dependencies between them, and
  // the round-trip is the dominant cost. Failures on individual tables
  // fall back to empty arrays so a single dropped table doesn't kill
  // the whole export.
  const [
    profileRes,
    collectionLogsRes,
    brandRatingsRes,
    followsFromRes,
    followsToRes,
    brandFollowsRes,
    commentsRes,
    likesRes,
    commentLikesRes,
    notificationsRes,
    activityFeedRes,
    slimesCreatedRes,
    brandsOwnedRes,
    brandClaimsRes,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    admin
      .from("collection_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("brand_ratings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("follows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("follows")
      .select("*")
      .eq("target_user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("brand_follows")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("comments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("likes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("comment_likes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("activity_feed")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin.from("slimes").select("*").eq("created_by", userId),
    admin.from("brands").select("*").eq("owner_id", userId),
    admin.from("brand_claims").select("*").eq("user_id", userId),
  ]);

  const payload = {
    _meta: {
      export_schema_version: EXPORT_SCHEMA_VERSION,
      exported_at: new Date().toISOString(),
      user_id: userId,
      email: user.email ?? null,
      username: profileRes.data?.username ?? null,
      note:
        "This is a full export of every row of user-owned data in the " +
        "SlimeLog database. GDPR Article 15 (right of access) and " +
        "Article 20 (right of data portability).",
    },
    profile: profileRes.data ?? null,
    collection_logs: collectionLogsRes.data ?? [],
    brand_ratings: brandRatingsRes.data ?? [],
    follows_i_gave: followsFromRes.data ?? [],
    followers_of_me: followsToRes.data ?? [],
    brand_follows: brandFollowsRes.data ?? [],
    comments: commentsRes.data ?? [],
    likes: likesRes.data ?? [],
    comment_likes: commentLikesRes.data ?? [],
    notifications: notificationsRes.data ?? [],
    activity_feed: activityFeedRes.data ?? [],
    slimes_i_created: slimesCreatedRes.data ?? [],
    brands_i_own: brandsOwnedRes.data ?? [],
    brand_claims: brandClaimsRes.data ?? [],
  };

  const json = JSON.stringify(payload, null, 2);

  // Filename: slimelog-data-USERNAME-YYYYMMDD.json. Falls back to user
  // id if no username. YYYYMMDD lets users keep multiple exports without
  // guessing which is newest.
  const usernamePart = profileRes.data?.username ?? userId.slice(0, 8);
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `slimelog-data-${usernamePart}-${datePart}.json`;

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
