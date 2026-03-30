"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import BottomNav from "@/components/BottomNav";

export default function BottomNavWrapper() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  const hideRoutes = ["/login", "/signup"];
  if (hideRoutes.includes(pathname)) return null;
  if (pathname === "/" && isLoggedIn === false) return null;
  if (isLoggedIn === null) return null; // loading — don't flash nav

  return <BottomNav />;
}
