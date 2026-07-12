// apps/web/app/api/admin/brand-suggestions/[id]/mark-duplicate/route.ts
//
// T110 (2026-07-11): admin marks a suggestion as duplicate.
//
// Two shapes of duplicate:
//   1. Suggested brand already exists in the catalog — admin passes
//      `resolved_brand_id` so we can link the two + fire a
//      brand_suggestion_approved notification pointing at the real
//      brand. Submitter sees "your brand is already in the catalog,
//      check it out here".
//   2. Suggestion is a duplicate of another pending suggestion — admin
//      omits `resolved_brand_id`. We mark status='duplicate' silently
//      (no notification), because the earlier suggestion will resolve
//      first and notify the other submitter when it does.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import {
  optionalString,
  optionalUuid,
  ValidationError,
} from "@/lib/api-validation";

interface Body {
  resolved_brand_id?: unknown;
  notes?: unknown;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user: adminUser },
  } = await supabase.auth.getUser();

  if (!adminUser || !(await isAdminUser(supabase, adminUser))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: suggestionId } = await context.params;
  if (!suggestionId) {
    return NextResponse.json(
      { error: "Missing suggestion id" },
      { status: 400 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let resolvedBrandId: string | null;
  let notes: string | null;
  try {
    resolvedBrandId = optionalUuid(body.resolved_brand_id, "resolved_brand_id");
    notes = optionalString(body.notes, "notes", { maxLength: 500 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Load suggestion.
  const { data: suggestion, error: loadErr } = await admin
    .from("brand_suggestions")
    .select("id, submitter_id, status")
    .eq("id", suggestionId)
    .maybeSingle();

  if (loadErr) {
    console.error("[brand-suggestions/mark-duplicate] load failed:", loadErr);
    return NextResponse.json(
      { error: "Could not load suggestion" },
      { status: 500 },
    );
  }
  if (!suggestion) {
    return NextResponse.json(
      { error: "Suggestion not found" },
      { status: 404 },
    );
  }
  if (suggestion.status !== "pending") {
    return NextResponse.json(
      {
        error: `Suggestion is already resolved (status: ${String(suggestion.status)}).`,
      },
      { status: 409 },
    );
  }

  // 2. If a resolved_brand_id was passed, sanity-check it exists.
  let brandRow: { id: string; slug: string; name: string } | null = null;
  if (resolvedBrandId) {
    const { data: brand, error: brandErr } = await admin
      .from("brands")
      .select("id, slug, name")
      .eq("id", resolvedBrandId)
      .maybeSingle();

    if (brandErr) {
      console.error(
        "[brand-suggestions/mark-duplicate] brand lookup failed:",
        brandErr,
      );
      return NextResponse.json(
        { error: "Could not verify linked brand" },
        { status: 500 },
      );
    }
    if (!brand) {
      return NextResponse.json(
        { error: "resolved_brand_id does not match any brand" },
        { status: 404 },
      );
    }
    brandRow = {
      id: brand.id as string,
      slug: brand.slug as string,
      name: brand.name as string,
    };
  }

  const nowIso = new Date().toISOString();

  // 3. Resolve.
  const { error: updateErr } = await admin
    .from("brand_suggestions")
    .update({
      status: "duplicate",
      resolved_brand_id: brandRow?.id ?? null,
      resolved_by: adminUser.id,
      resolved_at: nowIso,
      admin_notes: notes,
    })
    .eq("id", suggestion.id);

  if (updateErr) {
    console.error("[brand-suggestions/mark-duplicate] update failed:", updateErr);
    return NextResponse.json(
      { error: `Could not update suggestion: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // 4. Fire the "already in catalog" notification only when we linked
  // to a real brands row AND we have a submitter to notify.
  if (brandRow && suggestion.submitter_id) {
    const { error: notificationErr } = await admin
      .from("notifications")
      .insert({
        recipient_id: suggestion.submitter_id,
        notification_type: "brand_suggestion_approved",
        actor_id: adminUser.id,
        brand_id: brandRow.id,
      });
    if (notificationErr) {
      console.error(
        "[brand-suggestions/mark-duplicate] notification insert failed:",
        notificationErr,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    resolved_brand_id: brandRow?.id ?? null,
  });
}
