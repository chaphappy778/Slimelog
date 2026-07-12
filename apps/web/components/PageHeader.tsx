// apps/web/components/PageHeader.tsx
"use client";

import Link from "next/link";
// [Change 4 — T31] Add useRouter alongside the existing usePathname import.
import { usePathname, useRouter } from "next/navigation";
import SlimeMenu from "@/components/SlimeMenu";
// T29 (2026-07-12): notification bell renders between the profile
// avatar and the hamburger. It short-circuits itself when signed out
// or when the user is already on /notifications, so it's safe to
// mount unconditionally here.
import NotificationBell from "@/components/notifications/NotificationBell";
// T104 follow-up (2026-07-11): use shared AuthProvider so PageHeader's
// isLoggedIn stays in lockstep with the rest of the tree (previously it
// held its own getSession() result which could drift on partial sign-out
// and leave the avatar + hamburger hidden while the rest of the app
// still thought the user was signed in).
import { useAuth } from "@/components/AuthProvider";
import { safeRedirect } from "@/lib/safe-redirect";
// [Change 8 — T31 v2] Use the in-app navigation history stack instead of
// the unreliable router.back() / document.referrer approach.
// [Change 1 — scroll restore] Also import requestScrollRestore so handleBack
// can hand a target scrollY to the destination's useScrollRestore on mount.
import {
  popNavigationHistory,
  requestScrollRestore,
} from "@/lib/navigation-history";

// [Change 5 — T31] Route matcher for back button visibility.
// Detail/leaf pages where users need an affordance to navigate back.
// [Change 1 — Bundle A] Added /brands/[slug]/claim and /brand-verification
// so PageHeader renders its own back button on those routes (with scroll
// restoration via the navigation history stack). The inline back buttons
// previously rendered on those pages have been removed.
const BACK_BUTTON_ROUTES = [
  /^\/slimes\/[^/]+$/,
  /^\/drops\/[^/]+$/,
  /^\/brands\/[^/]+$/,
  /^\/users\/[^/]+$/,
  /^\/privacy$/,
  /^\/terms$/,
  /^\/wishlist$/,
  /^\/brands\/[^/]+\/claim$/,
  /^\/brand-verification$/,
  // Admin sub-pages: back button routes them to /admin. Not needed on
  // /admin itself since that's a top-level dashboard.
  /^\/admin\/subscriptions$/,
  /^\/admin\/waitlist$/,
  /^\/admin\/brand-claims(\/.+)?$/,
  /^\/admin\/brand-suggestions(\/.+)?$/,
];

function shouldShowBackButton(pathname: string | null): boolean {
  if (!pathname) return false;
  return BACK_BUTTON_ROUTES.some((re) => re.test(pathname));
}

export default function PageHeader() {
  const pathname = usePathname();
  const profileActive = pathname === "/profile";

  // [Change 6 — T31] Router + back-button visibility.
  // [Change 9 — T31 v2] handleBack now pops the in-app nav stack and
  // routes to whatever the user was on before this page. Falls back to
  // "/" if the stack is empty (fresh tab, external entry, etc.).
  // [Change 2 — scroll restore] handleBack now receives a NavHistoryEntry
  // ({ path, scrollY }) instead of a plain string. If the destination has
  // a non-zero scrollY recorded, write a pending restore so the destination's
  // useScrollRestore consumes it on mount and scrolls the user back to where
  // they were when they navigated away.
  const router = useRouter();
  const showBack = shouldShowBackButton(pathname);

  const handleBack = () => {
    const { path, scrollY } = popNavigationHistory({ path: "/", scrollY: 0 });
    // Set the pending restore BEFORE pushing — destination's
    // useScrollRestore consumes it on mount.
    if (scrollY > 0) {
      requestScrollRestore(path, scrollY);
    }
    router.push(path, { scroll: false });
  };

  // [Change 2 — #35] Auth state — resolved from AuthProvider so this
  // never drifts out of sync with the rest of the tree. During the
  // initial load `loading === true`; we treat that as "resolving" and
  // render nothing on the right to avoid flicker.
  const { user, loading } = useAuth();
  const isLoggedIn: boolean | null = loading ? null : !!user;

  // Validated path for the Sign Up CTA's `next` param.
  const next = safeRedirect(pathname ?? "/", "/landing");
  const signupHref = `/signup?next=${encodeURIComponent(next)}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-30 h-14 flex items-center justify-between px-4"
      style={{
        // 2026-07-11 (T105 Option A restyle): swapped the solid-black
        // #0A0A0A background for a translucent purple gradient with
        // backdrop-blur, so the neon-purple content underneath bleeds
        // through the bar instead of being cut off by an opaque strip.
        // The old bar felt like a utility toolbar glued on top of the
        // app; the new one reads as part of the app's atmosphere.
        //
        // Gradient runs from a slightly heavier top (for legibility of
        // the wordmark against light images / white photos) to a
        // softer bottom that fades into the page content.
        background:
          "linear-gradient(180deg, rgba(15,0,24,0.85) 0%, rgba(15,0,24,0.55) 100%)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        borderBottom: "1px solid rgba(45,10,78,0.55)",
        boxShadow:
          "0 1px 0 0 rgba(0,240,255,0.12), 0 8px 20px 0 rgba(0,0,0,0.35)",
      }}
    >
      {/* [Change 7 — T31] Wrap back button + wordmark in a left-side flex
          container so they stay grouped, while justify-between keeps the
          auth/menu controls pinned right. Back button only renders on
          detail/leaf routes per BACK_BUTTON_ROUTES. */}
      <div className="flex items-center gap-3">
        {showBack && (
          // [Change 10 — T31 v2] Rounded-square (borderRadius: 10) to match
          // the SlimeDetailCard overlay back button. Removed `rounded-full`
          // class; all other styling unchanged.
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="flex items-center justify-center transition-colors"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(10,0,20,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#FFFFFF",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}

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
      </div>

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
            {/* T29 (2026-07-12): notification bell sits to the left of
                the hamburger. Hides itself on /notifications so we
                don't dead-end the user. */}
            <NotificationBell />
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
