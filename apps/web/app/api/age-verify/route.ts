// apps/web/app/api/age-verify/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Audit HP-26 (2026-07-10): parse the ISO date (YYYY-MM-DD) as
// LOCAL time so the age calculation isn't off-by-a-day for users
// west of UTC. `new Date("2013-07-06")` parses as UTC midnight, so
// a user in UTC-10 (Hawaii) would see `getDate()` return 5 — one
// day earlier than the DOB they submitted. `calculateAge` derived
// year/month/date from that Date, silently subtracting a day near
// birthdays and pushing some users below the 13-year floor
// incorrectly. Explicit component parsing avoids the shift.
function parseIsoDateLocal(iso: string): Date | null {
  // Expected shape: YYYY-MM-DD. Anything else is a client-side bug.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  // Guard against fictitious dates that the constructor happily
  // rolls over (Feb 30 → Mar 2, etc.).
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month - 1 ||
    d.getDate() !== day
  ) {
    return null;
  }
  return d;
}

function calculateAge(birth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export async function POST(request: NextRequest) {
  try {
    // Audit HP-23 pattern (2026-07-08): validate env presence up front.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "[api/age-verify] SUPABASE_SERVICE_ROLE_KEY missing",
      );
      return NextResponse.json(
        { error: "Server misconfigured." },
        { status: 500 },
      );
    }

    const body = await request.json();
    // Audit HP-26 (2026-07-10): only accept the DOB from the client.
    // `age_verified` is a server-derived truth — computed from the
    // DOB below — never a client input. The previous version's
    // "age_verified !== true → 400" was a client-supplied consent
    // flag that could be trivially spoofed, and even in the honest
    // case wasn't providing any real signal beyond "the frontend
    // set this true because the user clicked a button."
    const { date_of_birth } = body as { date_of_birth?: unknown };

    if (!date_of_birth || typeof date_of_birth !== "string") {
      return NextResponse.json(
        { error: "date_of_birth is required." },
        { status: 400 },
      );
    }

    // Audit HP-26 (2026-07-10): parse DOB using local time to avoid
    // the UTC-boundary off-by-a-day bug in the previous
    // `new Date(iso)` call.
    const birth = parseIsoDateLocal(date_of_birth);
    if (!birth) {
      return NextResponse.json(
        { error: "Invalid date_of_birth (expected YYYY-MM-DD)." },
        { status: 400 },
      );
    }

    // Sanity: reject dates in the future or laughably far in the
    // past. Also caps typos like 3013 or 0013.
    const now = new Date();
    if (birth > now) {
      return NextResponse.json(
        { error: "date_of_birth cannot be in the future." },
        { status: 400 },
      );
    }
    const oldestAllowed = new Date(now.getFullYear() - 120, 0, 1);
    if (birth < oldestAllowed) {
      return NextResponse.json(
        { error: "Invalid date_of_birth." },
        { status: 400 },
      );
    }

    // Enforce minimum age of 13.
    const age = calculateAge(birth);
    if (age < 13) {
      return NextResponse.json(
        { error: "Users must be at least 13 years old." },
        { status: 403 },
      );
    }

    // Authenticate the requesting user via cookies.
    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 },
      );
    }

    // Update profiles via service role — bypasses RLS.
    // Audit HP-26 (2026-07-10): age_verified is hardcoded true here
    // because the server just derived it from a validated DOB that
    // passed the 13-year floor. It is never sourced from the client.
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        date_of_birth,
        age_verified: true,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("[api/age-verify] update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to save age verification." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/age-verify] unexpected error:", err);
    // Observability: surface the swallowed error to Sentry.
    Sentry.captureException(err, { tags: { route: "age-verify" } });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
