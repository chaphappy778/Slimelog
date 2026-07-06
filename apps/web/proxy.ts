// apps/web/proxy.ts
// Next.js 16 middleware equivalent.
// IMPORTANT: The exported function must be named `proxy`, not `middleware`.
//
// Responsibilities:
//   1. Refresh the Supabase session cookie on every request
//   2. Redirect unauthenticated users away from protected routes
//   3. Redirect authenticated users away from /login and /signup

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require an active session.
//
// 2026-07-06 (audit blocker #1): expanded from ["/logs","/collection","/profile"]
// to also cover every route that was relying on client-side useEffect redirects
// for auth. Without middleware-level protection, the full HTML/JS was shipping
// to unauthenticated visitors, which fails with JS off, during hydration
// races, or for any scraper. Each of the added prefixes has a corresponding
// route under app/: /settings/{email,password,profile,subscription}, /log (the
// logging composer, singular), /wishlist, /brand-dashboard/*, /admin/*.
//
// /admin is included here as a defense-in-depth layer; admin-only access is
// still enforced separately in the admin pages themselves via the
// role-based isAdminUser() helper (lib/is-admin-check.ts, audit #9).
const PROTECTED_PREFIXES = [
  "/logs",
  "/collection",
  "/profile",
  "/settings",
  "/log",
  "/wishlist",
  "/brand-dashboard",
  "/admin",
];

// Auth-only routes — bounce already-authenticated users back to home.
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
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
  if (
    !user &&
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/"),
    )
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
