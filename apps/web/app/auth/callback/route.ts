// apps/web/app/auth/callback/route.ts
// Handles the redirect back from:
//   • Google OAuth (after Supabase exchanges the Google code)
//   • Email confirmation link clicks
//
// Next.js 16 note: This is a Route Handler — no async params needed here
// since we read from searchParams, not dynamic segments.
//
// [Change 1] After session exchange, checks if the user has completed age
// verification. New users (age_verified = false OR date_of_birth IS NULL)
// are redirected to /age-verify. Existing verified users proceed to `next`.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

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
      // [Change 2] Check age verification status for this user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("age_verified, date_of_birth")
          .eq("id", user.id)
          .single();

        // [Change 3] New or unverified users go to age gate
        const needsAgeVerify =
          !profile || !profile.age_verified || profile.date_of_birth === null;

        if (needsAgeVerify) {
          // Preserve `next` so after age verify they land in the right place
          const ageVerifyUrl = `${origin}/age-verify?next=${encodeURIComponent(next)}`;
          return NextResponse.redirect(ageVerifyUrl);
        }
      }

      // Verified user — redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error(
      "[auth/callback] exchangeCodeForSession error:",
      error.message,
    );
  }

  // Fallback: something went wrong — send to login with an error hint.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
