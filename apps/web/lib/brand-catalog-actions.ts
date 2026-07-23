// apps/web/lib/brand-catalog-actions.ts
//
// Track 3a — brand-side catalog cleanup server actions.
//
// First slice: promote a community-added (is_brand_official = false)
// slime row to an official catalog entry. Track 1b auto-creates these
// unofficial rows when a user logs a slime name not already in a
// brand's catalog; the brand owner reviews and approves them here.
//
// Why the admin (service_role) client:
//   1. The slimes UPDATE RLS policy (migration 20260401000013) only
//      permits brand owners to update rows where is_brand_official is
//      ALREADY true — an unofficial row is invisible to that policy.
//   2. The HP-11 attribution trigger (migration 20260706000053)
//      silently reverts any is_brand_official change unless the caller
//      is service_role. Promoting false -> true has to bypass it.
// So we authorize ownership in application code (owner_id = auth.uid())
// and then write with the admin client.
//
// NOTE (error-tracker 2026-07-21, "use server export trap"): this file
// may export ONLY async functions. The result type is defined locally
// and intentionally NOT exported — consumers get the union via the
// action's inferred return type.

"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ApproveSlimeResult =
  | { ok: true; slimeId: string }
  | { ok: false; error: string };

export async function approveSlimeAsOfficial(
  slimeId: string,
): Promise<ApproveSlimeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createAdminClient();

  // Fetch the slime + its brand's owner_id in one query. The admin
  // client bypasses RLS so the still-unofficial row is visible.
  const { data: slime, error: fetchErr } = await admin
    .from("slimes")
    .select("id, brand_id, is_brand_official, brands!inner(owner_id)")
    .eq("id", slimeId)
    .maybeSingle();

  if (fetchErr) {
    Sentry.captureException(fetchErr, {
      tags: { action: "approveSlimeAsOfficial", slimeId, stage: "fetch" },
    });
    return { ok: false, error: "Could not load this slime." };
  }
  if (!slime) {
    return { ok: false, error: "Slime not found." };
  }

  // brands is a to-one embed; PostgREST returns it as an object, but
  // the generated types can widen it to an array. Normalize both.
  const brandEmbed = slime.brands as
    | { owner_id: string | null }
    | { owner_id: string | null }[]
    | null;
  const ownerId = Array.isArray(brandEmbed)
    ? (brandEmbed[0]?.owner_id ?? null)
    : (brandEmbed?.owner_id ?? null);

  if (ownerId !== user.id) {
    return { ok: false, error: "You don't own this brand." };
  }
  if (slime.is_brand_official === true) {
    return { ok: false, error: "Slime is already official." };
  }

  const { error: updateErr } = await admin
    .from("slimes")
    .update({ is_brand_official: true })
    .eq("id", slimeId);

  if (updateErr) {
    Sentry.captureException(updateErr, {
      tags: { action: "approveSlimeAsOfficial", slimeId, stage: "update" },
    });
    return { ok: false, error: `Update failed: ${updateErr.message}` };
  }

  return { ok: true, slimeId };
}
