// apps/web/app/api/brand-suggestions/route.ts
//
// T110 (2026-07-11): user-facing endpoint for submitting a brand that
// isn't in the catalog yet.
//
// Flow
// ----
//   1. Auth gate.
//   2. Validate name (2-60), website_url (https:// only, optional),
//      handles (<= 40, optional), note (<= 200, optional).
//   3. Rate limit: reject if the same submitter has posted anything in
//      the last 24 hours.
//   4. Duplicate check against the catalog (brands.name / brands.slug
//      case-insensitive). If matched, respond 409 with the existing
//      brand link so the form can surface it inline.
//   5. Duplicate check against pending suggestions. If matched, insert
//      the new row as status='duplicate' so the moderation queue
//      doesn't have to sift through repeats.
//   6. Otherwise insert as status='pending'.
//
// We use the anon-key server client for the INSERT so the RLS policy
// on brand_suggestions actually runs — no service-role bypass here.
// The lookup queries run through the admin client because we need to
// check other users' pending suggestions for duplicates and the
// submitter's RLS policy would hide them.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  optionalHttpUrl,
  optionalString,
  requireString,
  ValidationError,
} from "@/lib/api-validation";
import { moderateText } from "@/lib/moderation";

interface SubmitBody {
  name?: unknown;
  website_url?: unknown;
  instagram_handle?: unknown;
  tiktok_handle?: unknown;
  note?: unknown;
}

interface DuplicateBrandResponse {
  error: string;
  duplicate: {
    kind: "brand";
    id: string;
    name: string;
    slug: string;
  };
}

const RATE_LIMIT_WINDOW_HOURS = 24;

function normalizeHandle(raw: string | null): string | null {
  if (!raw) return null;
  const stripped = raw.trim().replace(/^@+/, "");
  return stripped.length > 0 ? stripped : null;
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

  let name: string;
  let websiteUrl: string | null;
  let instagramHandleRaw: string | null;
  let tiktokHandleRaw: string | null;
  let note: string | null;
  try {
    // Baseline shape/length via api-validation; content moderation follows.
    name = requireString(body.name, "name", { minLength: 2, maxLength: 60 });
    websiteUrl = optionalHttpUrl(body.website_url, "website_url", {
      maxLength: 500,
    });
    instagramHandleRaw = optionalString(body.instagram_handle, "instagram_handle", {
      maxLength: 40,
    });
    tiktokHandleRaw = optionalString(body.tiktok_handle, "tiktok_handle", {
      maxLength: 40,
    });
    note = optionalString(body.note, "note", { maxLength: 200 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // T111 (2026-07-12): moderation gate for user-authored brand text.
  const nameCheck = moderateText(name, "brand_name");
  if (!nameCheck.ok) {
    return NextResponse.json(
      { error: nameCheck.message, field: "name" },
      { status: 400 },
    );
  }
  name = nameCheck.cleaned;

  const noteCheck = moderateText(note, "brand_note");
  if (!noteCheck.ok) {
    return NextResponse.json(
      { error: noteCheck.message, field: "note" },
      { status: 400 },
    );
  }
  note = noteCheck.cleaned === "" ? null : noteCheck.cleaned;

  const instagramHandle = normalizeHandle(instagramHandleRaw);
  const tiktokHandle = normalizeHandle(tiktokHandleRaw);

  const admin = createAdminClient();

  // 3. Rate limit — dynamic cap based on the submitter's scout history.
  // Users with at least one approved suggestion (see mig 66,
  // profiles.approved_brand_suggestions_count) are trusted to submit up
  // to 5 per 24h. First-time and never-approved scouts stay at 1 per
  // 24h to keep spammers boxed in.
  //
  // 2026-07-12 hardening: fall back to approvedCount=0 (the safe/strict
  // cap) if the profile lookup errors OR if the column doesn't exist
  // yet on this environment. Previously we 500'd the whole submission
  // when this query hiccupped, which broke first-time submitters who'd
  // never triggered it before. See docs/error-tracker.md for context.
  const { data: profileRow, error: profileErr } = await admin
    .from("profiles")
    .select("approved_brand_suggestions_count")
    .eq("id", user.id)
    .maybeSingle();

  let approvedCount = 0;
  if (profileErr) {
    // Don't 500 — log and default to the strict cap. Common cause:
    // migration 66 hasn't been applied to this env, so the column is
    // missing. Keeps submissions working while ops catches up.
    console.warn(
      "[brand-suggestions] profile lookup failed; defaulting approvedCount=0:",
      profileErr.message,
    );
  } else {
    approvedCount =
      (profileRow?.approved_brand_suggestions_count as number | null) ?? 0;
  }
  const maxPerDay: number = approvedCount >= 1 ? 5 : 1;

  const rateWindowStart = new Date(
    Date.now() - RATE_LIMIT_WINDOW_HOURS * 3600 * 1000,
  ).toISOString();
  const { count: recentCount, error: recentErr } = await admin
    .from("brand_suggestions")
    .select("id", { count: "exact", head: true })
    .eq("submitter_id", user.id)
    .gte("created_at", rateWindowStart);

  if (recentErr) {
    console.error("[brand-suggestions] rate-limit lookup failed:", recentErr);
    return NextResponse.json(
      { error: "Could not verify rate limit. Try again shortly." },
      { status: 500 },
    );
  }

  if ((recentCount ?? 0) >= maxPerDay) {
    const message =
      approvedCount >= 1
        ? `You've submitted ${maxPerDay} today. The cap resets in a few hours. Thanks for scouting!`
        : "You've already submitted one today. Check back tomorrow.";
    return NextResponse.json({ error: message }, { status: 429 });
  }

  // 4. Duplicate check against the catalog. Case-insensitive on both
  // name and slug. Presenting the existing brand link back to the user
  // so the form can offer a "go check it out" affordance.
  const trimmedName = name.trim();
  const { data: existingBrands, error: brandLookupErr } = await admin
    .from("brands")
    .select("id, name, slug")
    .or(`name.ilike.${trimmedName},slug.ilike.${trimmedName}`)
    .limit(1);

  if (brandLookupErr) {
    console.error(
      "[brand-suggestions] brand duplicate lookup failed:",
      brandLookupErr,
    );
    return NextResponse.json(
      { error: "Could not check catalog. Try again shortly." },
      { status: 500 },
    );
  }

  const existingBrand = existingBrands?.[0];
  if (existingBrand) {
    const payload: DuplicateBrandResponse = {
      error: "That brand is already in the catalog.",
      duplicate: {
        kind: "brand",
        id: existingBrand.id as string,
        name: existingBrand.name as string,
        slug: existingBrand.slug as string,
      },
    };
    return NextResponse.json(payload, { status: 409 });
  }

  // 5. Duplicate check against pending suggestions. If any pending row
  // (from anyone) already carries this name, we insert THIS submission
  // as status='duplicate' — the admin queue then shows it linked to
  // the earlier row so no double-review. Submitter still gets an ok
  // response.
  const { data: pendingDupes, error: pendingLookupErr } = await admin
    .from("brand_suggestions")
    .select("id, submitter_id")
    .eq("status", "pending")
    .ilike("name", trimmedName)
    .limit(1);

  if (pendingLookupErr) {
    console.error(
      "[brand-suggestions] pending duplicate lookup failed:",
      pendingLookupErr,
    );
    return NextResponse.json(
      { error: "Could not check pending queue. Try again shortly." },
      { status: 500 },
    );
  }

  const initialStatus: "pending" | "duplicate" =
    pendingDupes && pendingDupes.length > 0 ? "duplicate" : "pending";

  // 6. Insert through the anon-key client so RLS actually enforces the
  // submitter_id = auth.uid() check.
  const { data: inserted, error: insertErr } = await supabase
    .from("brand_suggestions")
    .insert({
      submitter_id: user.id,
      name: trimmedName,
      website_url: websiteUrl,
      instagram_handle: instagramHandle,
      tiktok_handle: tiktokHandle,
      note,
      status: initialStatus,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[brand-suggestions] insert failed:", insertErr);
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
    },
    { status: 200 },
  );
}
