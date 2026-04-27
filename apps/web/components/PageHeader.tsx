// apps/web/components/PageHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import SlimeMenu from "@/components/SlimeMenu";
import { safeRedirect } from "@/lib/safe-redirect";

// [Change 1 — #35] Module-level client for the auth check.
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function PageHeader() {
  const pathname = usePathname();
  const profileActive = pathname === "/profile";

  // [Change 2 — #35] Auth state — null = resolving, true/false = resolved.
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, []);

  // Validated path for the Sign Up CTA's `next` param.
  const next = safeRedirect(pathname ?? "/", "/landing");
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
      style={{
        background: "rgba(10, 10, 10, 0.92)",
        borderBottom: "1px solid transparent",
        backgroundClip: "padding-box",
        boxShadow:
          "0 1px 0 0 rgba(0,240,255,0.15), 0 2px 0 0 rgba(57,255,20,0.08), 0 1px 16px 0 rgba(45,10,78,0.3)",
      }}
    >
      {/* Wordmark — full green-cyan-magenta holo gradient */}
      <Link href="/" className="flex items-center gap-2 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.svg"
          alt="SlimeLog"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <span
          className="text-lg font-black tracking-tight"
          style={{
            background:
              "linear-gradient(90deg, #39FF14 0%, #00F0FF 40%, #FF00E5 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            fontFamily: "'Montserrat', sans-serif",
          }}
        >
          SlimeLog
        </span>
      </Link>

      {/* Right side — depends on auth state.
          [Change 3 — #35] Logged-out: Log In text link + Sign Up gradient
          button. Logged-in: profile avatar + hamburger menu (existing).
          During resolution (isLoggedIn === null): render nothing on the
          right to avoid flicker. */}
      <div className="flex items-center gap-2">
        {isLoggedIn === true && (
          <>
            <Link
              href="/profile"
              aria-label="Profile"
              className={`rounded-full border p-2 transition-all duration-150 ${
                profileActive
                  ? "text-slime-accent border-slime-accent shadow-glow-green"
                  : "text-slime-muted border-slime-border hover:text-slime-accent hover:border-slime-accent/50"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-5 h-5"
              >
                <circle cx="12" cy="7" r="4" />
                <path d="M4 21v-1a8 8 0 0116 0v1" />
              </svg>
            </Link>
            <SlimeMenu />
          </>
        )}

        {isLoggedIn === false && (
          <>
            <Link
              href={loginHref}
              className="text-xs font-semibold text-slime-muted hover:text-slime-accent transition-colors px-2 py-2"
            >
              Log In
            </Link>
            <Link
              href={signupHref}
              className="inline-flex items-center px-4 py-2 rounded-full text-xs font-bold text-slime-bg shadow-glow-green active:scale-[0.97] transition-transform"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
