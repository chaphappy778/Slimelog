// apps/web/app/api/admin/brand-suggestions/[id]/approve/route.ts
//
// T110 (2026-07-11): admin approves a community brand suggestion.
//
// Sequence
// --------
//   1. Load the suggestion; must exist and be status='pending'.
//   2a. Safety net (mig 66 follow-up): exact case-insensitive name
//       collision against brands.name. If a match exists, auto-reject
//       the suggestion, fire a rejection notification linked to the
//       existing brand, and 409 back with code='exact_duplicate' so
//       the admin queue can render a friendly toast.
//   2b. Slug uniqueness check on the admin-supplied slug (defense in
//       depth — brands.slug has a UNIQUE constraint too, but a friendly
//       409 beats a 500 with a Postgres error).
//   3. INSERT into brands with:
//        name              — from the suggestion
//        slug              — from the admin body
//        website_url       — from the suggestion (nullable)
//        instagram_handle  — from the suggestion (nullable)
//        tiktok_handle     — from the suggestion (nullable)
//        verification_tier — 'community'
//   4. UPDATE the suggestion: status='approved', resolved_brand_id, etc.
//   5. INSERT a notification for the submitter.
//
// If step 3 fails, we bail before touching the suggestion. If step 4
// fails after the brand was created, we log loudly — the admin will see
// the brand landed but the suggestion still shows pending; next admin
// action will resolve it.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import {
  optionalString,
  requireString,
  ValidationError,
} from "@/lib/api-validation";

interface Body {
  slug?: unknown;
  notes?: unknown;
}

// Same shape check as elsewhere in the app — lowercase alnum + hyphens.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

  let slug: string;
  let notes: string | null;
  try {
    slug = requireString(body.slug, "slug", {
      minLength: 2,
      maxLength: 80,
    }).toLowerCase();
    notes = optionalString(body.notes, "notes", { maxLength: 500 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (!SLUG_RE.test(slug)) {
    return NextResponse.json(
      {
        error:
          "Slug must be lowercase letters, numbers, and hyphens (e.g. cloud-nine).",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 1. Load the suggestion.
  const { data: suggestion, error: loadErr } = await admin
    .from("brand_suggestions")
    .select("id, submitter_id, name, website_url, instagram_handle, tiktok_handle, status")
    .eq("id", suggestionId)
    .maybeSingle();

  if (loadErr) {
    console.error("[brand-suggestions/approve] load failed:", loadErr);
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

  // 2a. Safety net — exact case-insensitive name collision. Catches the
  // case where the suggestion name matches an existing brand exactly
  // and the admin missed the potential-duplicates hint. We auto-reject
  // the suggestion, notify the submitter with a link to the existing
  // brand, and 409 back to the admin queue so it can show a friendly
  // toast instead of pretending the request errored.
  const suggestionName = suggestion.name as string;
  const { data: existingByName, error: existingByNameErr } = await admin
    .from("brands")
    .select("id, slug, name")
    .ilike("name", suggestionName)
    .limit(1)
    .maybeSingle();

  if (existingByNameErr) {
    console.error(
      "[brand-suggestions/approve] exact-name lookup failed:",
      existingByNameErr,
    );
    return NextResponse.json(
      { error: "Could not verify brand uniqueness" },
      { status: 500 },
    );
  }

  if (existingByName) {
    const existingName = existingByName.name as string;
    const existingSlug = existingByName.slug as string;
    const existingId = existingByName.id as string;
    const autoNotePrefix = `Auto-rejected: matches existing brand "${existingName}"`;
    const combinedNotes: string = notes
      ? `${autoNotePrefix}. Admin notes: ${notes}`
      : autoNotePrefix;

    const nowIso = new Date().toISOString();

    const { error: suggestionAutoRejectErr } = await admin
      .from("brand_suggestions")
      .update({
        status: "rejected",
        resolved_by: adminUser.id,
        resolved_at: nowIso,
        admin_notes: combinedNotes,
      })
      .eq("id", suggestion.id);

    if (suggestionAutoRejectErr) {
      console.error(
        "[brand-suggestions/approve] auto-reject update failed:",
        suggestionAutoRejectErr,
      );
      return NextResponse.json(
        { error: "Could not auto-reject the duplicate suggestion" },
        { status: 500 },
      );
    }

    if (suggestion.submitter_id) {
      const { error: notificationErr } = await admin
        .from("notifications")
        .insert({
          recipient_id: suggestion.submitter_id,
          notification_type: "brand_suggestion_rejected",
          actor_id: adminUser.id,
          brand_id: existingId,
        });
      if (notificationErr) {
        console.error(
          "[brand-suggestions/approve] auto-reject notification failed:",
          notificationErr,
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        code: "exact_duplicate",
        existing_brand: {
          id: existingId,
          slug: existingSlug,
          name: existingName,
        },
      },
      { status: 409 },
    );
  }

  // 2b. Slug uniqueness pre-check.
  const { data: slugCollision, error: slugCheckErr } = await admin
    .from("brands")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (slugCheckErr) {
    console.error(
      "[brand-suggestions/approve] slug collision check failed:",
      slugCheckErr,
    );
    return NextResponse.json(
      { error: "Could not verify slug uniqueness" },
      { status: 500 },
    );
  }
  if (slugCollision) {
    return NextResponse.json(
      {
        error: `Slug '${slug}' is already taken by another brand.`,
        collision: {
          id: slugCollision.id as string,
          name: slugCollision.name as string,
        },
      },
      { status: 409 },
    );
  }

  // 3. Create the brand.
  const { data: brand, error: brandInsertErr } = await admin
    .from("brands")
    .insert({
      slug,
      name: suggestion.name as string,
      website_url: (suggestion.website_url as string | null) ?? null,
      instagram_handle: (suggestion.instagram_handle as string | null) ?? null,
      tiktok_handle: (suggestion.tiktok_handle as string | null) ?? null,
      verification_tier: "community",
    })
    .select("id, slug, name")
    .single();

  if (brandInsertErr || !brand) {
    console.error(
      "[brand-suggestions/approve] brand insert failed:",
      brandInsertErr,
    );
    return NextResponse.json(
      { error: `Could not create brand: ${brandInsertErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  const nowIso = new Date().toISOString();

  // 4. Resolve the suggestion.
  const { error: suggestionUpdateErr } = await admin
    .from("brand_suggestions")
    .update({
      status: "approved",
      resolved_brand_id: brand.id,
      resolved_by: adminUser.id,
      resolved_at: nowIso,
      admin_notes: notes,
    })
    .eq("id", suggestion.id);

  if (suggestionUpdateErr) {
    // Loud log — brand landed but suggestion still says pending.
    console.error(
      "[brand-suggestions/approve] suggestion update failed after brand insert:",
      suggestionUpdateErr,
      { brandId: brand.id, suggestionId: suggestion.id },
    );
    return NextResponse.json(
      {
        error:
          "Brand created but suggestion status update failed. Contact engineering.",
        brand_id: brand.id,
      },
      { status: 500 },
    );
  }

  // 5. Notify the submitter (best-effort — a failed notification insert
  // shouldn't fail the whole approve op).
  if (suggestion.submitter_id) {
    const { error: notificationErr } = await admin
      .from("notifications")
      .insert({
        recipient_id: suggestion.submitter_id,
        notification_type: "brand_suggestion_approved",
        actor_id: adminUser.id,
        brand_id: brand.id,
      });
    if (notificationErr) {
      console.error(
        "[brand-suggestions/approve] notification insert failed:",
        notificationErr,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    brand_id: brand.id as string,
    brand_slug: brand.slug as string,
  });
}
