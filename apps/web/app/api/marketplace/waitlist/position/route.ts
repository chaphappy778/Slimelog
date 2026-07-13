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
  //
  // 2026-07-13 hardening: if the SELECT errors on the newer column set,
  // retry without `brand_names_other`. This lets the endpoint keep
  // working when migration 0069 hasn't been applied to this env — the
  // client sees a hydrated entry (minus the freeform "Other" chips)
  // and lands in the success state, rather than silently falling back
  // to the form as if the user had never signed up.
  const FULL_COLUMNS =
    "id, user_id, intent, brand_ids, brand_names_other, spend_band, sell_volume, trust_need, created_at, updated_at";
  const LEGACY_COLUMNS =
    "id, user_id, intent, brand_ids, spend_band, sell_volume, trust_need, created_at, updated_at";

  let entry: unknown = null;
  const first = await supabase
    .from("marketplace_waitlist")
    .select(FULL_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();

  if (first.error) {
    console.warn(
      "[marketplace/waitlist/position] full-column lookup failed, retrying legacy:",
      first.error.message,
    );
    const fallback = await supabase
      .from("marketplace_waitlist")
      .select(LEGACY_COLUMNS)
      .eq("user_id", user.id)
      .maybeSingle();
    if (fallback.error) {
      console.error(
        "[marketplace/waitlist/position] legacy lookup also failed:",
        fallback.error.message,
      );
      return NextResponse.json(
        { error: "Could not read waitlist status." },
        { status: 500 },
      );
    }
    entry = fallback.data
      ? { ...fallback.data, brand_names_other: null }
      : null;
  } else {
    entry = first.data;
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
