// apps/web/app/api/notifications/mark-read/route.ts
//
// T29 (2026-07-12): mark notifications read.
//
// POST /api/notifications/mark-read
//   body:
//     { all: true }                — mark every unread row for the user
//     { ids: string[] }            — mark specific rows (must all belong
//                                    to the current user; the RLS +
//                                    explicit .eq("recipient_id") pair
//                                    prevents cross-user writes even if
//                                    the client sends someone else's id)
//
// Response
//   { ok: true, marked: N }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Body {
  all?: unknown;
  ids?: unknown;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_IDS_PER_CALL = 500;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const markAll = body.all === true;
  const rawIds = Array.isArray(body.ids) ? body.ids : null;

  if (!markAll && !rawIds) {
    return NextResponse.json(
      { error: "Provide { all: true } or { ids: string[] }" },
      { status: 400 },
    );
  }

  // Base builder. Both branches update the same table with the same
  // set; only the WHERE differs. Note the belt-and-suspenders
  // recipient_id filter — RLS already enforces this, but keeping it
  // explicit makes the intent obvious and shields against future RLS
  // relaxation.
  let query = supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false); // no-op writes are wasted rows

  if (markAll) {
    // Full-inbox pass — nothing else to filter on.
  } else if (rawIds) {
    const ids: string[] = [];
    for (const raw of rawIds) {
      if (typeof raw !== "string" || !UUID_RE.test(raw)) {
        return NextResponse.json(
          { error: "Every entry in `ids` must be a UUID string" },
          { status: 400 },
        );
      }
      ids.push(raw.toLowerCase());
    }
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, marked: 0 });
    }
    if (ids.length > MAX_IDS_PER_CALL) {
      return NextResponse.json(
        { error: `At most ${MAX_IDS_PER_CALL} ids per request` },
        { status: 400 },
      );
    }
    query = query.in("id", ids);
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error("[notifications/mark-read] update failed:", error);
    return NextResponse.json(
      { error: "Could not mark notifications" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, marked: data?.length ?? 0 });
}
