// apps/web/app/auth/confirm/route.ts
// Handles email confirmation via token_hash — no PKCE cookie required.
// This works cross-browser and cross-device, unlike the /auth/callback
// PKCE flow which requires the code verifier cookie from the original session.
//
// This is the route that fires for actual email signups. /auth/callback
// is only for OAuth (Google, etc). Any post-signup profile work needs
// to be duplicated in both routes — an earlier version of this file
// wrote only DOB + age_verified, which is why marketing consent and
// referral relationships were being silently dropped for email signups.
//
// Supabase email template should link to:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/welcome

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeRedirect } from "@/lib/safe-redirect";

// Referral code shape must match DB CHECK on profiles.referral_code
// (mig 62): 6 chars, uppercase alphanumeric only.
const REFERRAL_CODE_RE = /^[A-Z0-9]{6}$/;

async function applyReferralIfPresent(
  userId: string,
  metadataCode: unknown,
  cookieCode: string | undefined,
  adminClient: SupabaseClient,
): Promise<void> {
  const raw =
    (typeof metadataCode === "string" ? metadataCode : null) ??
    cookieCode ??
    null;
  console.log("[referral/confirm] input", {
    userId,
    metadataCodeType: typeof metadataCode,
    metadataCode,
    hasCookie: !!cookieCode,
    resolvedRaw: raw,
  });
  if (!raw) return;
  const code = raw.trim().toUpperCase();
  if (!REFERRAL_CODE_RE.test(code)) {
    console.log("[referral/confirm] bad shape:", code);
    return;
  }

  const { data: existing, error: existingErr } = await adminClient
    .from("profiles")
    .select("referred_by_user_id")
    .eq("id", userId)
    .single();
  if (existingErr) {
    console.error("[referral/confirm] existing lookup:", existingErr.message);
    return;
  }
  if (existing?.referred_by_user_id) {
    console.log("[referral/confirm] already set, skipping");
    return;
  }

  const { data: referrer, error: referrerErr } = await adminClient
    .from("profiles")
    .select("id, username")
    .eq("referral_code", code)
    .maybeSingle();
  if (referrerErr) {
    console.error("[referral/confirm] referrer lookup:", referrerErr.message);
    return;
  }
  if (!referrer) {
    console.log("[referral/confirm] no referrer for code", code);
    return;
  }
  if (referrer.id === userId) return;

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ referred_by_user_id: referrer.id })
    .eq("id", userId);
  if (updateError) {
    console.error("[referral/confirm] update failed:", updateError.message);
    return;
  }
  console.log("[referral/confirm] applied", { referrerUsername: referrer.username });
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  // 2026-07-06 audit blocker #7: run `next` through safeRedirect (same
  // helper /auth/callback already uses). Without this, `next=//evil.com`
  // was a live open redirect at the highest-trust moment in the user
  // lifecycle — email confirmation lands the user just after we've
  // proved their address, so a phishing site sitting at the far end of
  // that redirect is disproportionately effective. Fallback to "/" when
  // the input is missing or fails validation.
  const next = safeRedirect(searchParams.get("next"), "/");

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=missing_token`);
  }

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

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "signup" | "recovery" | "invite" | "email",
  });

  if (error || !data.user) {
    console.error("[auth/confirm] verifyOtp error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  const user = data.user;

  // Password recovery flow: verifyOtp above already established a
  // short-lived recovery session. Route the user straight to
  // /reset-password so they can pick a new password. Skipping the DOB /
  // marketing / referral / username-interstitial logic because this is
  // NOT a signup — the user already exists, we just need to hand them
  // the reset form. Route via `next` if it looks like a reset page,
  // otherwise force /reset-password so the flow always terminates
  // somewhere useful.
  if (type === "recovery") {
    // Force /reset-password as the destination and tag the URL with
    // ?flow=recovery so the client can distinguish "session exists
    // because a recovery just completed" from "session exists because
    // the user happened to be signed in." Without the tag, a normally
    // signed-in user visiting /reset-password could bypass the
    // change-password guardrails (current-password re-verify), which
    // is the escalation risk we want to avoid.
    const base = next.startsWith("/reset-password") ? next : "/reset-password";
    const separator = base.includes("?") ? "&" : "?";
    return NextResponse.redirect(`${origin}${base}${separator}flow=recovery`);
  }

  // Metadata channels populated by /signup form
  const dobFromMeta = user.user_metadata?.date_of_birth as string | undefined;
  const marketingConsentFromMeta = Boolean(
    user.user_metadata?.marketing_consent,
  );

  console.log("[auth/confirm] metadata", {
    userId: user.id,
    hasDob: !!dobFromMeta,
    marketingConsentFromMeta,
    referredByCode: user.user_metadata?.referred_by_code,
  });

  if (dobFromMeta) {
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

    // Apply referral if the signup page passed one via user_metadata
    // (primary) or the slimelog_ref cookie (fallback). Silently no-ops
    // when the code is missing, malformed, or already applied.
    await applyReferralIfPresent(
      user.id,
      user.user_metadata?.referred_by_code,
      cookieStore.get("slimelog_ref")?.value,
      adminClient,
    );

    // Sync Brevo list membership if the user opted in on signup.
    if (marketingConsentFromMeta && user.email) {
      try {
        const { syncContactMarketingConsent } = await import("@/lib/brevo");
        const result = await syncContactMarketingConsent({
          email: user.email,
          marketingConsent: true,
          source: "signup",
        });
        if (!result.success) {
          console.error(
            "[auth/confirm] Brevo sync failed on signup:",
            result.error,
          );
        }
      } catch (brevoErr) {
        console.error("[auth/confirm] Brevo sync threw:", brevoErr);
      }
    }
  }

  // Check if user needs username interstitial
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  if (profile?.username?.startsWith("user_")) {
    return NextResponse.redirect(
      `${origin}/welcome?next=${encodeURIComponent(next)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
