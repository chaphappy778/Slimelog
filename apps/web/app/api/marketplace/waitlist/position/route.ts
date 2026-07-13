// apps/web/app/api/marketplace/waitlist/position/route.ts
//
// T113 (2026-07-12): read the current user's waitlist position + their
// stored answers, without creating or mutating anything. Called by
// <MarketplaceComingSoonClient> on mount so a returning user lands
// straight in the success state with their prior answers hydrated.
//
// Response shape:
//   { position: null, total }                  — user is not on the list
//   { position, total, entry }                 — user is on the list; entry
//                                                carries their answers so
//                                                the form can hydrate

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketplaceWaitlistEntry } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr) {
    console.error(
      "[marketplace/waitlist/position] auth check failed:",
      authErr.message,
    );
  }
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Look up the user's row. Anon client is fine — RLS lets them
  // read their own.
  const { data: entry, error: entryErr } = await supabase
    .from("marketplace_waitlist")
    .select(
      "id, user_id, intent, brand_ids, brand_names_other, spend_band, sell_volume, trust_need, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (entryErr) {
    console.error(
      "[marketplace/waitlist/position] entry lookup failed:",
      entryErr.message,
    );
    return NextResponse.json(
      { error: "Could not read waitlist status." },
      { status: 500 },
    );
  }

  // 3. Total is always sourced from the admin client — RLS would
  // return 0 or 1 depending on caller.
  const admin = createAdminClient();
  const { count: totalCount, error: totalErr } = await admin
    .from("marketplace_waitlist")
    .select("id", { count: "exact", head: true });

  if (totalErr) {
    console.error(
      "[marketplace/waitlist/position] total count failed:",
      totalErr.message,
    );
  }
  const total = totalCount ?? 0;

  if (!entry) {
    return NextResponse.json(
      { position: null, total, entry: null },
      { status: 200 },
    );
  }

  const typedEntry = entry as MarketplaceWaitlistEntry;

  const { count: aheadCount, error: aheadErr } = await admin
    .from("marketplace_waitlist")
    .select("id", { count: "exact", head: true })
    .lte("created_at", typedEntry.created_at);

  if (aheadErr) {
    console.error(
      "[marketplace/waitlist/position] position count failed:",
      aheadErr.message,
    );
  }

  return NextResponse.json(
    {
      position: aheadCount ?? 1,
      total,
      entry: typedEntry,
    },
    { status: 200 },
  );
}
