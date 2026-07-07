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

interface WaitlistRow {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
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
  const { email, marketing_consent } = (await request.json()) as {
    email?: string;
    marketing_consent?: boolean;
  };

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

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
    .insert({ email, marketing_consent: marketingOptIn })
    .select("id, email, source, created_at")
    .single<WaitlistRow>();

  // [Change 5] Net-new signup path.
  if (!insertError && insertedRow) {
    // Fire-and-record Brevo sync. We intentionally await so the DB fields
    // are populated before the response returns; the UX cost is tiny and
    // it keeps behavior deterministic.
    await syncRowToBrevoAndRecord(supabase, insertedRow, marketingOptIn);
    return NextResponse.json({ success: true }, { status: 200 });
  }

  // [Change 6] Duplicate-email path. Treat identically to net-new from
  // Brevo's perspective: fetch the existing row, fire Brevo with
  // updateEnabled:true, record the result.
  if (insertError && insertError.code === "23505") {
    const { data: existingRow, error: fetchError } = await supabase
      .from("waitlist")
      .select("id, email, source, created_at")
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
