// apps/web/app/auth/callback/route.ts
// Handles the redirect back from:
//   • Google OAuth (after Supabase exchanges the Google code)
//   • Email confirmation link clicks
//
// Next.js 16 note: This is a Route Handler — no async params needed here
// since we read from searchParams, not dynamic segments.

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
      // Redirect to the intended destination — always scoped to our origin.
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
