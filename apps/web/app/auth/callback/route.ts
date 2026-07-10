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
import type { SupabaseClient } from "@supabase/supabase-js";

// Referral code shape must match DB CHECK on profiles.referral_code
// (mig 62): 6 chars, uppercase alphanumeric only.
const REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/;

/**
 * Applies a referral relationship to a new user's profile if a valid code
 * is available in either user_metadata (email signup path) or the
 * slimelog_ref cookie (OAuth signup path). Idempotent and silent — a
 * missing, invalid, or already-set referral is a no-op.
 *
 * Referrer's referral_activations counter is NOT bumped here. Activation
 * is defined as "email verified + logged first slime," which happens
 * later. That trigger will read profiles.referred_by_user_id and update
 * the referrer's counter at the right moment.
 */
async function applyReferralIfPresent(
  userId: string,
  metadataCode: unknown,
  cookieCode: string | undefined,
  adminClient: SupabaseClient,
): Promise<void> {
  // Verbose logging enabled 2026-07-10 while diagnosing why referrals
  // don't stick. Remove or gate on NODE_ENV once we've traced it.
  const raw =
    (typeof metadataCode === "string" ? metadataCode : null) ??
    cookieCode ??
    null;
  console.log("[referral] input", {
    userId,
    metadataCodeType: typeof metadataCode,
    metadataCode,
    hasCookie: !!cookieCode,
    resolvedRaw: raw,
  });
  if (!raw) {
    console.log("[referral] no code — skipping");
    return;
  }
  const code = raw.trim().toUpperCase();
  if (!REFERRAL_CODE_RE.test(code)) {
    console.log("[referral] bad shape — skipping:", code);
    return;
  }

  // Immutability: never overwrite an existing referrer.
  const { data: existing, error: existingErr } = await adminClient
    .from("profiles")
    .select("referred_by_user_id")
    .eq("id", userId)
    .single();
  if (existingErr) {
    console.error("[referral] existing lookup errored:", existingErr.message);
    return;
  }
  if (existing?.referred_by_user_id) {
    console.log("[referral] already set — skipping");
    return;
  }

  // Look up the referrer by code.
  const { data: referrer, error: referrerErr } = await adminClient
    .from("profiles")
    .select("id, username")
    .eq("referral_code", code)
    .maybeSingle();
  if (referrerErr) {
    console.error("[referral] referrer lookup errored:", referrerErr.message);
    return;
  }
  if (!referrer) {
    console.log("[referral] no referrer for code:", code);
    return;
  }
  if (referrer.id === userId) {
    console.log("[referral] self-referral blocked");
    return;
  }

  console.log("[referral] applying:", {
    referrerId: referrer.id,
    referrerUsername: referrer.username,
  });

  const { error: updateError, data: updated } = await adminClient
    .from("profiles")
    .update({ referred_by_user_id: referrer.id })
    .eq("id", userId)
    .select("id, referred_by_user_id");

  if (updateError) {
    console.error(
      "[referral] update failed:",
      updateError.message,
      updateError.details,
    );
    return;
  }
  console.log("[referral] update result:", updated);
}

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

            // Apply referral if the signup page passed one via metadata
            // (primary channel for email signups) or the slimelog_ref
            // cookie (fallback). Immutable once set.
            await applyReferralIfPresent(
              user.id,
              user.user_metadata?.referred_by_code,
              cookieStore.get("slimelog_ref")?.value,
              adminClient,
            );

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
            // Apply referral relationship here so it lands regardless of
            // whether the user completes /age-verify + /welcome in this
            // session. Cookie is the OAuth channel since user_metadata
            // won't carry referred_by_code from a Google signin.
            const adminClient = createAdminClient();
            await applyReferralIfPresent(
              user.id,
              user.user_metadata?.referred_by_code,
              cookieStore.get("slimelog_ref")?.value,
              adminClient,
            );
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
