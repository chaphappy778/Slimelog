// apps/web/app/api/notifications/route.ts
//
// T29 (2026-07-12): read the signed-in user's notification inbox.
//
// GET /api/notifications
//   ?before=<iso>   — cursor pagination; return the next 50 rows older
//                     than this timestamp (exclusive).
//   ?unread=true    — filter to unread only.
//
// Response
//   {
//     notifications: Notification[],
//     unread_count: number  // scoped to the recipient, ignores ?before
//   }
//
// Auth
//   Cookie session via createClient(). 401 if no session. The RLS
//   policy on public.notifications already gates SELECT by
//   recipient_id = auth.uid(), but we still filter explicitly so the
//   ORDER BY / LIMIT can use the recipient_created index without
//   surprise.
//
// Joins
//   The notifications row has four nullable polymorphic FKs:
//     actor_id, brand_id, drop_id, log_id.
//   Supabase PostgREST resolves each with an FK-hinted select. All
//   four are declared `references` in migration 20260324000001 so
//   PostgREST can auto-discover them; we still pin the FK name where
//   the row supports multiple joins to avoid ambiguity. `actor` joins
//   through profiles_public rather than the raw profiles table so
//   private-profile actors return null (matches how the rest of the
//   app handles cross-profile joins post-mig 32).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Notification, NotificationType } from "@/lib/types";

const DEFAULT_LIMIT = 50;

// Row shape as it comes back from Supabase before we normalize into
// the API's flat Notification type. Every joined relation returns
// either a single object (when the FK is 1-to-1 like ours) or null.
type JoinedProfile = {
  username: string | null;
  avatar_url: string | null;
} | null;

type JoinedBrand = {
  slug: string | null;
  name: string | null;
  logo_url: string | null;
} | null;

type JoinedDrop = {
  id: string;
  name: string | null;
  cover_image_url: string | null;
} | null;

type JoinedLog = {
  id: string;
  slime_name: string | null;
  image_url: string | null;
} | null;

interface RawNotificationRow {
  id: string;
  notification_type: NotificationType;
  created_at: string;
  is_read: boolean;
  // T192: nullable jsonb payload — { reaction_type, comment_id } for
  // comment_reaction_received rows; null for every other type.
  metadata: { reaction_type?: string; comment_id?: string } | null;
  actor: JoinedProfile;
  brand: JoinedBrand;
  drop: JoinedDrop;
  log: JoinedLog;
}

function normalize(raw: RawNotificationRow): Notification {
  return {
    id: raw.id,
    type: raw.notification_type,
    created_at: raw.created_at,
    is_read: raw.is_read,
    metadata: raw.metadata ?? null,
    actor: raw.actor && raw.actor.username
      ? { username: raw.actor.username, avatar_url: raw.actor.avatar_url }
      : null,
    brand: raw.brand && raw.brand.slug && raw.brand.name
      ? {
          slug: raw.brand.slug,
          name: raw.brand.name,
          logo_url: raw.brand.logo_url,
        }
      : null,
    drop: raw.drop && raw.drop.id && raw.drop.name
      ? {
          id: raw.drop.id,
          name: raw.drop.name,
          cover_image_url: raw.drop.cover_image_url,
        }
      : null,
    log: raw.log
      ? {
          id: raw.log.id,
          slime_name: raw.log.slime_name,
          image_url: raw.log.image_url,
        }
      : null,
  };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const before = searchParams.get("before");
  const unreadOnly = searchParams.get("unread") === "true";

  // Validate `before` — if present it must parse as a real ISO
  // timestamp. Otherwise fall back to now (equivalent to omitting).
  let beforeIso: string | null = null;
  if (before) {
    const t = Date.parse(before);
    if (Number.isNaN(t)) {
      return NextResponse.json(
        { error: "Invalid `before` timestamp" },
        { status: 400 },
      );
    }
    beforeIso = new Date(t).toISOString();
  }

  // Build the joined SELECT. The recipient filter is applied by
  // both the RLS policy and this .eq — keeps the query intent
  // explicit and lets the index be used.
  let query = supabase
    .from("notifications")
    .select(
      `
      id,
      notification_type,
      created_at,
      is_read,
      metadata,
      actor:profiles_public!notifications_actor_id_fkey (
        username,
        avatar_url
      ),
      brand:brands!notifications_brand_id_fkey (
        slug,
        name,
        logo_url
      ),
      drop:drops!notifications_drop_id_fkey (
        id,
        name,
        cover_image_url
      ),
      log:collection_logs!notifications_log_id_fkey (
        id,
        slime_name,
        image_url
      )
      `,
    )
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(DEFAULT_LIMIT);

  if (beforeIso) {
    query = query.lt("created_at", beforeIso);
  }
  if (unreadOnly) {
    query = query.eq("is_read", false);
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error("[notifications] list failed:", error);
    return NextResponse.json(
      { error: "Could not load notifications" },
      { status: 500 },
    );
  }

  const notifications = ((rows ?? []) as unknown as RawNotificationRow[]).map(
    normalize,
  );

  // Lightweight unread total — a separate count query rather than
  // scanning the returned page. Ignores the ?before / ?unread
  // filters so the badge stays accurate as the user pages.
  const { count, error: countErr } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (countErr) {
    console.error("[notifications] unread count failed:", countErr);
    // Non-fatal — return the list with zero rather than 500ing.
  }

  return NextResponse.json({
    notifications,
    unread_count: count ?? 0,
  });
}
