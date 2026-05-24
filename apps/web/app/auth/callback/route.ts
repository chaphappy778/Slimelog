// apps/web/app/auth/callback/route.ts
// Handles the redirect back from:
//   • Google OAuth (after Supabase exchanges the Google code)
//   • Email confirmation link clicks
//
// Next.js 16 note: This is a Route Handler — no async params needed here
// since we read from searchParams, not dynamic segments.
//
// After session exchange, checks if the user has completed age
// verification. New users (age_verified = false OR date_of_birth IS NULL)
// are redirected to /age-verify. Existing verified users proceed to `next`.
//
// [Change 1 — #35] The `next` param is now validated through safeRedirect
// before being used in any redirect. Without this, a phishing link like
//   /auth/callback?code=...&next=https://evil.com
// would send the user off-site after auth.
//
// [Change 2 — T96] After age verify gate passes, check if user has a
// real username. Auto-generated usernames (starting with "user_") redirect
// to /welcome for the onboarding interstitial before the final destination.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirect } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // [Change 2 — #35] Validate the next param. Falls back to "/" because
  // by the time we reach the callback, the user is becoming logged-in.
  const rawNext = searchParams.get("next");
  const next = safeRedirect(rawNext, "/");

  if (code) {
    // cookies() must be awaited in Next.js 16
    const cookieStore = await cookies();

    const supabase = createServerClient(
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check age verification status and username for this user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("age_verified, date_of_birth, username")
          .eq("id", user.id)
          .single();

        // New or unverified users go to age gate
        const needsAgeVerify =
          !profile || !profile.age_verified || profile.date_of_birth === null;

        if (needsAgeVerify) {
          // Preserve `next` (already validated) so after age verify they
          // land in the right place.
          const ageVerifyUrl = `${origin}/age-verify?next=${encodeURIComponent(next)}`;
          return NextResponse.redirect(ageVerifyUrl);
        }

        // [Change 2 — T96] Check if user has set a real username yet.
        // Auto-generated usernames start with "user_" (e.g. "user_bf07af8").
        const needsUsernameSetup =
          profile?.username?.startsWith("user_") ?? false;
        if (needsUsernameSetup) {
          const welcomeUrl = `${origin}/welcome?next=${encodeURIComponent(next)}`;
          return NextResponse.redirect(welcomeUrl);
        }
      }

      // Verified user with real username — redirect to validated destination
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error(
      "[auth/callback] exchangeCodeForSession error:",
      error.message,
    );
  }

  // Fallback: something went wrong — send to login with an error hint.
  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed&next=${encodeURIComponent(next)}`,
  );
}
