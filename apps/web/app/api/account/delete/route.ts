// apps/web/app/api/account/delete/route.ts
//
// 2026-07-06 audit blocker #3: hardened account deletion.
//
// Before this change, the endpoint had:
//   - No re-authentication (session cookie was the only gate)
//   - No CSRF check (any XSS or stolen cookie → wipe)
//   - Deprecated single-cookie `get` shape in the server client
//
// It's the highest-blast-radius endpoint in the app (irreversible
// destruction of a user's entire account). Three additional gates now
// have to pass before the destructive call fires:
//
//   1. Origin / Sec-Fetch-Site must match this site. Blocks CSRF from a
//      malicious page that has the user's cookies. Sec-Fetch-Site is a
//      modern-browser hint and we treat "same-origin" as required when
//      present; older browsers that omit the header still get the
//      Origin check.
//
//   2. The client must POST the user's current password. We verify it
//      by calling signInWithPassword against a fresh anonymous Supabase
//      client so we don't disturb the actual session cookies. If the
//      password is wrong, we bail with 401 and don't touch anything.
//
//   3. Only then does the service-role admin client call
//      auth.admin.deleteUser().
//
// The endpoint also migrated from creating its own createServerClient
// (with the deprecated `get: (name) => ...` shape) to using the shared
// helper at @/lib/supabase/server.ts.
//
// The HTTP verb stays DELETE (matches existing callers). Modern Next.js
// and Vercel pass a JSON body on DELETE cleanly.

import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
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
    // No NEXT_PUBLIC_SITE_URL configured. Fall back to host-header match
    // so we still refuse cross-site posts. Defence-in-depth: the env var
    // should always be set in prod.
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

  // ── Gate 2: password re-verification ───────────────────────────────────
  let password: unknown;
  try {
    const body = (await request.json()) as { password?: unknown };
    password = body?.password;
  } catch {
    return NextResponse.json(
      { error: "Missing password confirmation." },
      { status: 400 },
    );
  }

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json(
      { error: "Password confirmation is required to delete your account." },
      { status: 400 },
    );
  }

  // Verify against a fresh anonymous client so the current session
  // cookies aren't rotated by the sign-in attempt.
  const anonClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error: pwError } = await anonClient.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (pwError) {
    // Neutral message — don't disclose whether the password matched the
    // account's real password vs. some other auth issue.
    return NextResponse.json(
      { error: "Password is incorrect." },
      { status: 401 },
    );
  }

  // ── Gate 3: env sanity before destructive call ─────────────────────────
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // Should never happen in production. If it does, refuse the delete
    // rather than silently swallowing.
    return NextResponse.json(
      { error: "Server misconfigured." },
      { status: 500 },
    );
  }

  const adminClient = createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
