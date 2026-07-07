// apps/web/app/api/account/change-password/route.ts
//
// Audit hp-22 (2026-07-07): password change accepted no current-
// password prompt. A session-hijacker could rotate the password with
// no re-auth and permanently lock out the real user — the highest-
// blast-radius account-recovery attack.
//
// Fix: move the password rotation from a client-side
// supabase.auth.updateUser() call into this server route. Three gates
// must pass before the password change lands:
//
//   1. CSRF via Origin + Sec-Fetch-Site headers. Blocks a malicious
//      cross-site page from posting on behalf of the user.
//
//   2. The client must POST the user's current password. We verify it
//      by calling signInWithPassword against a fresh anonymous
//      Supabase client so the current session cookies aren't
//      disturbed. If the password is wrong, we bail with 401.
//
//   3. Only then do we call updateUser({ password: new }) on the
//      user's server-side session.
//
// This route mirrors /api/account/delete's structure so future audits
// have a single pattern to review.

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  // ── Gate 1: CSRF via Origin / Sec-Fetch-Site ────────────────────────────
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (expectedOrigin) {
    if (!origin || origin.replace(/\/$/, "") !== expectedOrigin) {
      return NextResponse.json(
        { error: "Cross-origin requests are not permitted." },
        { status: 403 },
      );
    }
  } else {
    const host = request.headers.get("host");
    if (!origin || !host || !origin.endsWith(host)) {
      return NextResponse.json(
        { error: "Cross-origin requests are not permitted." },
        { status: 403 },
      );
    }
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin") {
    return NextResponse.json(
      { error: "Cross-site requests are not permitted." },
      { status: 403 },
    );
  }

  // ── Session check ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ── Body + validation ──────────────────────────────────────────────────
  let currentPassword: unknown;
  let newPassword: unknown;
  try {
    const body = (await request.json()) as {
      current_password?: unknown;
      new_password?: unknown;
    };
    currentPassword = body?.current_password;
    newPassword = body?.new_password;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return NextResponse.json(
      { error: "Enter your current password to confirm." },
      { status: 400 },
    );
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters." },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "New password must be different from your current password." },
      { status: 400 },
    );
  }

  // ── Gate 2: verify current password ────────────────────────────────────
  //
  // Verify against a fresh anonymous client so the session cookies
  // aren't rotated by the sign-in attempt.
  //
  // For OAuth-only users (Google signup, never set a password), this
  // sign-in returns "Invalid login credentials" too. The client-facing
  // error is neutral so we don't disclose which case it was — but if a
  // Google-signed-up user hits this, they should use the "forgot
  // password" flow to set a password first.
  const anonClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: pwError } = await anonClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (pwError) {
    return NextResponse.json(
      {
        error:
          "Current password is incorrect. If you signed up with Google and haven't set a password, use the Forgot password flow to set one.",
      },
      { status: 401 },
    );
  }

  // ── Gate 3: rotate the password on the real session ────────────────────
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    console.error("[change-password] updateUser error:", updateError.message);
    return NextResponse.json(
      { error: "Could not update password. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
