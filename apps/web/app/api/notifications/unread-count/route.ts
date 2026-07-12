// apps/web/app/api/notifications/unread-count/route.ts
//
// T29 (2026-07-12): lightweight endpoint used by the bell badge on
// mount and every 60s poll. Just returns the count — no row payload,
// no joins.
//
// Response
//   { unread_count: number }
//
// 401 for signed-out.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("[notifications/unread-count] count failed:", error);
    return NextResponse.json(
      { error: "Could not count notifications" },
      { status: 500 },
    );
  }

  return NextResponse.json({ unread_count: count ?? 0 });
}
