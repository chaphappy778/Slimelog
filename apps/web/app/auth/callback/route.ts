// apps/web/app/auth/callback/route.ts
// Handles the redirect back from:
//   • Google OAuth (after Supabase exchanges the Google code)
//   • Email confirmation link clicks
//
// [T96] Email signup flow:
//   DOB is collected on the signup page and passed as user_metadata.
//   The callback reads it here, saves it to the profile, and marks
//   age_verified = true — skipping the /age-verify page entirely.
//
// [T96] Google OAuth flow:
//   No DOB in metadata — still redirects to /age-verify as before.
//
// After age is handled, checks for auto-generated username (user_*)
// and redirects to /welcome if needed.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirect } from "@/lib/safe-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const rawNext = searchParams.get("next");
  const next = safeRedirect(rawNext, "/");

  if (code) {
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("age_verified, date_of_birth, username")
          .eq("id", user.id)
          .single();

        // ── Age verification ──────────────────────────────────────────────
        if (!profile?.age_verified || profile?.date_of_birth === null) {
          const dobFromMeta = user.user_metadata?.date_of_birth as
            | string
            | undefined;

          if (dobFromMeta) {
            // Email signup: DOB was collected on the signup page and stored
            // in user metadata. Save it to the profile and mark verified.
            await supabase
              .from("profiles")
              .update({ date_of_birth: dobFromMeta, age_verified: true })
              .eq("id", user.id);
          } else {
            // Google OAuth: no DOB in metadata — send to age verify page.
            return NextResponse.redirect(
              `${origin}/age-verify?next=${encodeURIComponent(next)}`,
            );
          }
        }

        // ── Username interstitial ─────────────────────────────────────────
        // Auto-generated usernames start with "user_" (e.g. "user_bf07af8").
        const needsUsernameSetup =
          profile?.username?.startsWith("user_") ?? false;
        if (needsUsernameSetup) {
          return NextResponse.redirect(
            `${origin}/welcome?next=${encodeURIComponent(next)}`,
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error(
      "[auth/callback] exchangeCodeForSession error:",
      error.message,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=auth_callback_failed&next=${encodeURIComponent(next)}`,
  );
}
