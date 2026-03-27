// apps/web/proxy.ts
// Next.js 16 middleware equivalent.
// IMPORTANT: The exported function must be named `proxy`, not `middleware`.
//
// Responsibilities:
//   1. Refresh the Supabase session cookie on every matched request
//   2. Redirect unauthenticated users away from protected routes
//   3. Redirect authenticated users away from /login and /signup

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require an active session.
const PROTECTED_PREFIXES = ["/log", "/collection", "/profile"];

// Auth-only routes — bounce already-authenticated users back to home.
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  // Start with a passthrough response; setAll below will replace it if
  // Supabase needs to write refreshed session cookies.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror cookies onto both the mutated request and the response so
          // every downstream Server Component sees the refreshed session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do NOT await anything between createServerClient and getUser().
  // The cookie refresh is tightly coupled to this call sequence.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Authenticated users → redirect away from auth pages ─────────────────
  if (user && AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ── Unauthenticated users → redirect away from protected routes ──────────
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname); // preserve destination
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on every path except Next.js internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
