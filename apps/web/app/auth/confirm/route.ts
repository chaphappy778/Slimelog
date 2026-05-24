// apps/web/app/auth/confirm/route.ts
// Handles email confirmation via token_hash — no PKCE cookie required.
// This works cross-browser and cross-device, unlike the /auth/callback
// PKCE flow which requires the code verifier cookie from the original session.
//
// Supabase email template should link to:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/welcome

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

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

  // Save DOB from signup metadata and mark age_verified via admin client
  const dobFromMeta = user.user_metadata?.date_of_birth as string | undefined;

  if (dobFromMeta) {
    const adminClient = createAdminClient();
    await adminClient
      .from("profiles")
      .update({ date_of_birth: dobFromMeta, age_verified: true })
      .eq("id", user.id);
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
