// apps/web/components/SignupCTABanner.tsx
"use client";

// Replaces BottomNav for logged-out users on public routes
// (/users/*, /slimes/*, /brands, /brands/*). The whole banner is a single
// click target that routes to /signup with the current path as ?next=.

import { useRouter } from "next/navigation";
import { safeRedirect } from "@/lib/safe-redirect";

interface Props {
  pathname: string;
}

export default function SignupCTABanner({ pathname }: Props) {
  const router = useRouter();

  function handleClick() {
    const next = safeRedirect(pathname, "/landing");
    router.push(`/signup?next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      {/* Spacer so page content isn't hidden behind the fixed banner —
          mirrors BottomNav's spacer pattern. */}
      <div className="h-16 shrink-0" aria-hidden="true" />

      <button
        type="button"
        onClick={handleClick}
        aria-label="Sign up to SlimeLog"
        className="fixed bottom-0 inset-x-0 z-20 flex items-center justify-between gap-3 px-4 h-16 active:scale-[0.99] transition-transform"
        style={{
          background: "rgba(10, 10, 10, 0.96)",
          borderTop: "1px solid rgba(57, 255, 20, 0.18)",
          boxShadow: "0 -4px 24px 0 rgba(57, 255, 20, 0.08)",
        }}
      >
        <div className="flex flex-col items-start text-left min-w-0 flex-1">
          <span
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color: "#00F0FF" }}
          >
            Join SlimeLog
          </span>
          <span className="text-[11px] text-slime-muted mt-0.5 truncate w-full">
            Rate, log, and discover slime
          </span>
        </div>

        <span
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slime-bg"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          Sign Up
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </button>
    </>
  );
}
