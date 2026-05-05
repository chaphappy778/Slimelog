// apps/web/components/BottomNavWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import BottomNav from "@/components/BottomNav";
import SignupCTABanner from "@/components/SignupCTABanner";

// Module-level client (absolute rule).
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// [Change 1 — #35] Public routes where logged-out users should see the
// signup CTA banner. Match either exact path or the path's prefix +"/".
function isPublicRouteForLoggedOut(pathname: string): boolean {
  if (pathname === "/brands") return true;
  if (pathname.startsWith("/users/")) return true;
  if (pathname.startsWith("/slimes/")) return true;
  if (pathname.startsWith("/brands/")) return true;
  return false;
}

export default function BottomNavWrapper() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  // [Change 2 — Bundle C] Suppress on all admin routes regardless of auth
  // state. The consumer bottom nav has no place in the admin surface.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return null;

  // Hide entirely on auth/landing routes regardless of auth state.
  const hideRoutes = ["/login", "/signup", "/landing", "/waitlist"];
  if (hideRoutes.includes(pathname)) return null;
  if (pathname.startsWith("/brand-dashboard")) return null;

  // Logged-out home: nothing to show — page redirects to /landing anyway.
  if (pathname === "/" && isLoggedIn === false) return null;

  // Auth state still resolving — render nothing (T20: tracked as
  // tech debt; brief flash on public routes is acceptable per CTO).
  if (isLoggedIn === null) return null;

  // [Change 2 — #35] Logged-out users on public routes get the CTA
  // banner instead of the BottomNav.
  if (isLoggedIn === false && isPublicRouteForLoggedOut(pathname)) {
    return <SignupCTABanner pathname={pathname} />;
  }

  return <BottomNav />;
}
