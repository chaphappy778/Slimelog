// apps/web/app/api/waitlist/route.ts
//
// Waitlist signup endpoint.
//
// Flow:
//   1. Validate email.
//   2. Insert into Supabase `waitlist` using the service role client. Use
//      .insert(...).select().single() so we get the inserted row back,
//      including the `source` field and its default.
//   3. Fire Brevo addContactToWaitlist. Brevo errors are logged and stored
//      in waitlist.brevo_sync_error but DO NOT cause a 500 - the signup has
//      already succeeded in Supabase.
//   4. On Supabase unique-violation (23505) we still fire Brevo with
//      updateEnabled:true so re-signups refresh attributes and list
//      membership, and we update the existing row's sync fields. Client
//      response stays { already: true } so the frontend behavior is
//      unchanged.
//
// Client-facing response shapes (DO NOT change - frontend depends on these):
//   200 { success: true }
//   200 { already: true }
//   400 { error: "Invalid email" }
//   500 { error: "Something went wrong", detail: string }

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { addContactToWaitlist, AddContactResult } from "@/lib/brevo";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { captureServerEvent } from "@/lib/posthog-server";

interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  heard_from: string | null;
  created_at: string;
}

// Frontend allowlist for the "How did you hear about us?" picker.
// Migration 20260715000074 intentionally leaves the DB unconstrained so we can
// evolve this list (giveaway partner names, TikTok Live, podcast interviews,
// etc.) without a schema change. Any value NOT in this list is coerced to
// "other" server-side to keep dashboards clean, EXCEPT free-text entries
// which arrive under the sentinel "other:<free text>" prefix (max 80 chars).
const HEARD_FROM_ALLOWLIST = new Set<string>([
  "instagram",
  "tiktok",
  "youtube",
  "friend_or_family",
  "giveaway",
  "search",
  "other",
]);

// UTM params are pass-through (no allowlist). We just cap length to keep
// pathologically long ad-tracker fingerprints from bloating the row.
const UTM_MAX_LEN = 200;

function coerceHeardFrom(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  // "other:<free text>" from the picker's Other input
  if (trimmed.startsWith("other:")) {
    return trimmed.slice(0, 80); // "other:" prefix + up to 74 chars of free text
  }
  const normalized = trimmed.toLowerCase();
  return HEARD_FROM_ALLOWLIST.has(normalized) ? normalized : "other";
}

function coerceUtm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, UTM_MAX_LEN);
}

// [Change 1] Centralise the Brevo sync side-effect so the net-new and
// duplicate paths are identical from Brevo's perspective.
async function syncRowToBrevoAndRecord(
  supabase: SupabaseClient,
  row: WaitlistRow,
  marketingOptIn: boolean,
): Promise<AddContactResult> {
  const signupDateISO = new Date(row.created_at).toISOString();
  const source = row.source ?? "landing_page";

  const result = await addContactToWaitlist({
    email: row.email,
    marketingOptIn,
    source,
    heardFrom: row.heard_from ?? undefined, // 2026-07-15: propagate acquisition channel to Brevo for list segmentation
    signupDateISO,
  });

  if (result.success) {
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({
        brevo_contact_id:
          result.contactId !== null ? String(result.contactId) : null,
        brevo_synced_at: new Date().toISOString(),
        brevo_sync_error: null,
      })
      .eq("id", row.id);

    if (updateError) {
      console.error(
        `Brevo sync succeeded but row update failed for ${row.email}:`,
        JSON.stringify(updateError),
      );
    }
  } else {
    console.error(`Brevo sync failed for ${row.email}:`, result.error);
    const { error: updateError } = await supabase
      .from("waitlist")
      .update({ brevo_sync_error: result.error })
      .eq("id", row.id);

    if (updateError) {
      console.error(
        `Recording Brevo error also failed for ${row.email}:`,
        JSON.stringify(updateError),
      );
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  // [Change 2] Parse + validate input. Shape matches the existing frontend.
  const {
    email,
    marketing_consent,
    heard_from,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  } = (await request.json()) as {
    email?: string;
    marketing_consent?: boolean;
    heard_from?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // 2026-07-15 side quest: coerce attribution fields. All optional — null when
  // absent. heard_from is allowlist-normalized; UTMs are pass-through with a
  // length cap.
  const heardFromNormalized = coerceHeardFrom(heard_from);
  const utmSourceNormalized = coerceUtm(utm_source);
  const utmMediumNormalized = coerceUtm(utm_medium);
  const utmCampaignNormalized = coerceUtm(utm_campaign);
  const utmContentNormalized = coerceUtm(utm_content);
  const utmTermNormalized = coerceUtm(utm_term);

  // Audit hp-14 (2026-07-06): 10 signups per hour per IP. Waitlist
  // triggers a Brevo POST per call, and Brevo's monthly-send cap is
  // the failure mode we care about — a scripted flood exhausts the
  // quota and blocks legit signups until reset. IP-based here because
  // signups are unauthenticated.
  const ip = getClientIp(request);
  const rateResult = await checkRateLimit({
    key: `waitlist:ip:${ip}`,
    limit: 10,
    windowSeconds: 3600,
  });
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many signups from this IP. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateResult.retryAfterSeconds) },
      },
    );
  }

  const marketingOptIn = marketing_consent ?? false;

  // [Change 3] Service role client. Never prefix SUPABASE_SERVICE_ROLE_KEY
  // with NEXT_PUBLIC_ - that bug took down waitlist + admin routes in April.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // [Change 4] Insert and read back the row in a single round trip.
  const { data: insertedRow, error: insertError } = await supabase
    .from("waitlist")
    .insert({
      email,
      marketing_consent: marketingOptIn,
      heard_from: heardFromNormalized,
      utm_source: utmSourceNormalized,
      utm_medium: utmMediumNormalized,
      utm_campaign: utmCampaignNormalized,
      utm_content: utmContentNormalized,
      utm_term: utmTermNormalized,
    })
    .select("id, email, source, heard_from, created_at")
    .single<WaitlistRow>();

  // [Change 5] Net-new signup path.
  if (!insertError && insertedRow) {
    // Fire-and-record Brevo sync. We intentionally await so the DB fields
    // are populated before the response returns; the UX cost is tiny and
    // it keeps behavior deterministic.
    await syncRowToBrevoAndRecord(supabase, insertedRow, marketingOptIn);

    // Observability push (2026-07-20): waitlist funnel event. Only the
    // net-new path fires it (the duplicate path below is a re-signup, not
    // a new lead). distinctId is the email so the event ties to the same
    // person if/when they later create an account and get identified.
    await captureServerEvent(insertedRow.email, "waitlist_signup", {
      source: insertedRow.source ?? "landing_page",
      heard_from: heardFromNormalized ?? undefined,
      marketing_consent: marketingOptIn,
      utm_source: utmSourceNormalized ?? undefined,
      utm_campaign: utmCampaignNormalized ?? undefined,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  // [Change 6] Duplicate-email path. Treat identically to net-new from
  // Brevo's perspective: fetch the existing row, fire Brevo with
  // updateEnabled:true, record the result.
  if (insertError && insertError.code === "23505") {
    const { data: existingRow, error: fetchError } = await supabase
      .from("waitlist")
      .select("id, email, source, heard_from, created_at")
      .eq("email", email)
      .single<WaitlistRow>();

    if (fetchError || !existingRow) {
      // Very unusual: 23505 said the email exists but we can't read it back.
      // Log and return { already: true } anyway - the user already has a
      // row, we just couldn't refresh Brevo.
      console.error(
        `Duplicate signup lookup failed for ${email}:`,
        fetchError ? JSON.stringify(fetchError) : "no row returned",
      );
      return NextResponse.json({ already: true }, { status: 200 });
    }

    await syncRowToBrevoAndRecord(supabase, existingRow, marketingOptIn);
    return NextResponse.json({ already: true }, { status: 200 });
  }

  // [Change 7] Any other Supabase error: preserve original behavior.
  console.error("Supabase error:", JSON.stringify(insertError));
  return NextResponse.json(
    {
      error: "Something went wrong",
      detail: insertError?.message ?? "unknown",
    },
    { status: 500 },
  );
}
