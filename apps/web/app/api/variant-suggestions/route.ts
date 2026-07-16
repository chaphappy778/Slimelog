// apps/web/app/api/variant-suggestions/route.ts
//
// 2026-07-16 Commit B — user-facing endpoint for suggesting a variant
// name for a specific brand+base type combo. Fires when the log wizard's
// brand-aware variant picker has no known variants for the selected
// brand+base — user taps "Suggest a variant" → mini form → this POST.
//
// Flow (mirrors T110 brand-suggestions):
//   1. Auth gate.
//   2. Validate brand_id (uuid, exists in catalog), base_type (enum),
//      proposed_name (2-60), note (optional, <=300).
//   3. Rate limit: dynamic cap based on the submitter's contribution
//      history. Users with ≥1 approved variant suggestion (see
//      profiles.approved_variant_contributions from mig 078) get 5/24h.
//      First-time or never-approved contributors get 1/24h.
//   4. Duplicate check A — does the proposed name (case-insensitive)
//      already exist as a subtype under this base_type? If so, respond
//      409 with the existing subtype so the wizard can offer to select
//      it directly instead.
//   5. Duplicate check B — is there already a pending suggestion for
//      this brand+base+name combo? If so, insert THIS row as
//      status='duplicate' so the admin queue doesn't get flooded.
//   6. Otherwise insert as status='pending'.
//
// Notification: on insert we do NOT fire a notification row yet — brand
// owners + admins see pending suggestions via their respective queues
// (T137 dashboard notifications tab + /admin/variant-suggestions).
// Notification firing on APPROVAL is handled by the credit trigger from
// mig 078 (increments contribution count); the notification-to-submitter
// insert lives in the admin approval route (Commit B-admin).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  optionalString,
  requireString,
  ValidationError,
} from "@/lib/api-validation";
import { moderateText } from "@/lib/moderation";
import type { SlimeBaseType } from "@/lib/types";

interface SubmitBody {
  brand_id?: unknown;
  base_type?: unknown;
  proposed_name?: unknown;
  note?: unknown;
}

interface DuplicateSubtypeResponse {
  error: string;
  duplicate: {
    kind: "subtype";
    id: string;
    name: string;
    slug: string;
  };
}

// Keep this list in sync with lib/types.ts SlimeBaseType (mig 077).
const BASE_TYPES = new Set<SlimeBaseType>([
  "avalanche",
  "basic",
  "beaded",
  "butter",
  "clear",
  "cloud",
  "floam",
  "fluffy",
  "hybrid",
  "icee",
  "jelly",
  "magnetic",
  "sand",
  "slay",
  "snow_fizz",
  "snowbutter",
  "sugar_scrub",
  "thick_and_glossy",
  "water",
  "wax_and_wax_cracking",
]);

const RATE_LIMIT_WINDOW_HOURS = 24;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidUuid(body.brand_id)) {
    return NextResponse.json({ error: "brand_id must be a valid UUID" }, { status: 400 });
  }
  const brandId = body.brand_id;

  if (typeof body.base_type !== "string" || !BASE_TYPES.has(body.base_type as SlimeBaseType)) {
    return NextResponse.json(
      { error: "base_type must be a valid slime_base_type" },
      { status: 400 },
    );
  }
  const baseType = body.base_type as SlimeBaseType;

  let proposedName: string;
  let note: string | null;
  try {
    proposedName = requireString(body.proposed_name, "proposed_name", {
      minLength: 2,
      maxLength: 60,
    });
    note = optionalString(body.note, "note", { maxLength: 300 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Moderation gate for user-authored text (per CLAUDE.md rule). Reuse
  // existing ModerationField values since the length/banned-word rules
  // are functionally identical — `slime_name` matches variant_name's
  // 2-60 range; `brand_note` matches variant_note's <=300 range. If we
  // ever want variant-specific rules, add `variant_name` / `variant_note`
  // to lib/moderation.ts.
  const nameCheck = moderateText(proposedName, "slime_name");
  if (!nameCheck.ok) {
    return NextResponse.json(
      { error: nameCheck.message, field: "proposed_name" },
      { status: 400 },
    );
  }
  proposedName = nameCheck.cleaned.trim();

  const noteCheck = moderateText(note, "brand_note");
  if (!noteCheck.ok) {
    return NextResponse.json(
      { error: noteCheck.message, field: "note" },
      { status: 400 },
    );
  }
  note = noteCheck.cleaned === "" ? null : noteCheck.cleaned;

  const admin = createAdminClient();

  // 3. Verify the brand exists (avoid orphan-FK inserts)
  const { data: brandRow, error: brandErr } = await admin
    .from("brands")
    .select("id, name")
    .eq("id", brandId)
    .maybeSingle();

  if (brandErr) {
    console.error("[variant-suggestions] brand lookup failed:", brandErr);
    return NextResponse.json(
      { error: "Could not verify brand. Try again shortly." },
      { status: 500 },
    );
  }
  if (!brandRow) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  // 4. Rate limit — dynamic cap based on approved contributions history.
  // Users with ≥1 approved variant suggestion get 5/24h. First-time or
  // never-approved contributors stay at 1/24h to bound spam.
  // Defensive fallback (matches brand-suggestions pattern): if profile
  // lookup errors OR the column doesn't exist yet, default to strict cap.
  const { data: profileRow, error: profileErr } = await admin
    .from("profiles")
    .select("approved_variant_contributions")
    .eq("id", user.id)
    .maybeSingle();

  let approvedCount = 0;
  if (profileErr) {
    console.warn(
      "[variant-suggestions] profile lookup failed; defaulting approvedCount=0:",
      profileErr.message,
    );
  } else {
    approvedCount =
      (profileRow?.approved_variant_contributions as number | null) ?? 0;
  }
  const maxPerDay: number = approvedCount >= 1 ? 5 : 1;

  const rateWindowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 3600 * 1000,
  ).toISOString();
  const { count: recentCount, error: recentErr } = await admin
    .from("variant_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", user.id)
    .gte("created_at", rateWindowStart);

  if (recentErr) {
    console.error("[variant-suggestions] rate-limit lookup failed:", recentErr);
    return NextResponse.json(
      { error: "Could not verify rate limit. Try again shortly." },
      { status: 500 },
    );
  }

  if ((recentCount ?? 0) >= maxPerDay) {
    const message =
      approvedCount >= 1
        ? `You've submitted ${maxPerDay} variant suggestions today. The cap resets in a few hours. Thanks for spotting variants!`
        : "You've already submitted one variant today. Check back tomorrow.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  // 5. Duplicate check A — does the proposed name already exist as a
  // subtype under this base_type? Case-insensitive match against name +
  // aliases[]. If yes, respond 409 so the wizard can offer the existing
  // one instead of creating a duplicate.
  const trimmedName = proposedName.trim();
  const { data: existingSubtypes, error: subtypeLookupErr } = await admin
    .from("subtypes")
    .select("id, name, slug, aliases")
    .eq("base_type", baseType)
    .or(`name.ilike.${trimmedName},aliases.cs.{${trimmedName.toLowerCase()}}`)
    .limit(1);

  if (subtypeLookupErr) {
    console.error(
      "[variant-suggestions] subtype dup lookup failed:",
      subtypeLookupErr,
    );
    // Non-fatal — proceed without the check. Worst case is an admin gets
    // a suggestion that's already a canonical subtype and just marks it
    // duplicate during review.
  }

  const existingSubtype = existingSubtypes?.[0];
  if (existingSubtype) {
    const payload: DuplicateSubtypeResponse = {
      error:
        "That variant already exists in our catalog. You can select it directly from the picker.",
      duplicate: {
        kind: "subtype",
        id: existingSubtype.id as string,
        name: existingSubtype.name as string,
        slug: existingSubtype.slug as string,
      },
    };
    return NextResponse.json(payload, { status: 409 });
  }

  // 6. Duplicate check B — pending suggestion for the same brand+base+name
  // already exists? Insert as status='duplicate' so admin queue doesn't
  // get flooded. Submitter still gets an ok response.
  const { data: pendingDupes, error: pendingLookupErr } = await admin
    .from("variant_suggestions")
    .select("id")
    .eq("brand_id", brandId)
    .eq("base_type", baseType)
    .eq("status", "pending")
    .ilike("proposed_name", trimmedName)
    .limit(1);

  if (pendingLookupErr) {
    console.error(
      "[variant-suggestions] pending dup lookup failed:",
      pendingLookupErr,
    );
    return NextResponse.json(
      { error: "Could not check pending queue. Try again shortly." },
      { status: 500 },
    );
  }

  const initialStatus: "pending" | "duplicate" =
    pendingDupes && pendingDupes.length > 0 ? "duplicate" : "pending";

  // 7. Insert through the anon-key client so RLS runs.
  const { data: inserted, error: insertErr } = await supabase
    .from("variant_suggestions")
    .insert({
      submitter_id: user.id,
      brand_id: brandId,
      base_type: baseType,
      proposed_name: trimmedName,
      note,
      status: initialStatus,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[variant-suggestions] insert failed:", insertErr);
    return NextResponse.json(
      { error: "Could not save your suggestion. Try again shortly." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      id: inserted.id as string,
      status: initialStatus,
      already_pending: initialStatus === "duplicate",
      brand_name: brandRow.name as string,
    },
    { status: 200 },
  );
}
