// apps/web/app/auth/callback/route.ts
// Handles the redirect back from:
//   • Google OAuth (after Supabase exchanges the Google code)
//   • Email confirmation link clicks
//
// [T96] Email signup flow:
//   DOB is collected on the signup page and passed as user_metadata.
//   The callback reads it here, saves it to the profile via the admin
//   client (bypasses RLS), and marks age_verified = true — skipping
//   the /age-verify page entirely.
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
import { createAdminClient } from "@/lib/supabase/admin";

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

        // 2026-07-06 audit blocker #6: the previous [T96-debug] block
        // logged date_of_birth + username + dobFromMeta to Vercel runtime
        // logs on every login. Storing DOB in structured logs is a
        // compliance issue (COPPA-adjacent for the under-13 branch,
        // GDPR/CCPA more generally) and the block was already marked
        // "remove after Vercel log verification" — that time has come.
        // If future debugging needs a signal from here, log only
        // booleans (e.g., `hasDob`, `needsUsernameSetup`) and gate on
        // `process.env.NODE_ENV !== "production"`.

        // ── Age verification ──────────────────────────────────────────────
        if (!profile?.age_verified || profile?.date_of_birth === null) {
          const dobFromMeta = user.user_metadata?.date_of_birth as
            | string
            | undefined;
          // Marketing consent metadata (2026-07-10): the signup form ships
          // marketing_consent as boolean. Falsy/missing → we do nothing;
          // the profile default is already false. Truthy → we flip it and
          // stamp marketing_consented_at with NOW() so the audit trail
          // captures the grant timestamp. Brevo sync happens in the same
          // call so the list membership stays in lockstep. Any failure to
          // sync Brevo is logged but does not block signup.
          const marketingConsentFromMeta = Boolean(
            user.user_metadata?.marketing_consent,
          );

          if (dobFromMeta) {
            // Email signup: DOB was collected on the signup page and stored
            // in user metadata. Save it via admin client to bypass RLS.
            const adminClient = createAdminClient();
            const profileUpdate: Record<string, unknown> = {
              date_of_birth: dobFromMeta,
              age_verified: true,
            };
            if (marketingConsentFromMeta) {
              profileUpdate.marketing_consent = true;
              profileUpdate.marketing_consented_at = new Date().toISOString();
            }
            await adminClient
              .from("profiles")
              .update(profileUpdate)
              .eq("id", user.id);

            // Sync Brevo list membership if the user opted in. We don't
            // await failure — sync errors get logged but don't block the
            // redirect. Only run for consent = true; leaving consent
            // false is a no-op and doesn't need to touch Brevo.
            if (marketingConsentFromMeta && user.email) {
              try {
                const { syncContactMarketingConsent } = await import(
                  "@/lib/brevo"
                );
                const result = await syncContactMarketingConsent({
                  email: user.email,
                  marketingConsent: true,
                  source: "signup",
                });
                if (!result.success) {
                  console.error(
                    "[auth/callback] Brevo sync failed on signup:",
                    result.error,
                  );
                }
              } catch (brevoErr) {
                console.error(
                  "[auth/callback] Brevo sync threw on signup:",
                  brevoErr,
                );
              }
            }

            // Re-fetch profile after update so username check uses fresh data
            const { data: refreshedProfile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", user.id)
              .single();

            if (refreshedProfile?.username?.startsWith("user_")) {
              return NextResponse.redirect(
                `${origin}/welcome?next=${encodeURIComponent(next)}`,
              );
            }

            return NextResponse.redirect(`${origin}${next}`);
          } else {
            // Google OAuth: no DOB in metadata — send to age verify page.
            // Marketing consent for OAuth users is captured on /welcome.
            return NextResponse.redirect(
              `${origin}/age-verify?next=${encodeURIComponent(next)}`,
            );
          }
        }

        // ── Username interstitial ─────────────────────────────────────────
        // Already age-verified path — username check on existing profile.
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
