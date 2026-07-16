"use client";
// apps/web/components/auth/AppleAuthButton.tsx
//
// 2026-07-16 (#26 App Store checklist a): Sign in with Apple button.
//
// Apple requires SIWA at equal visual weight anywhere a third-party
// SSO is offered on iOS (currently we offer Google on /login + /signup,
// so SIWA is mandated pre-submission). Web SIWA runs through Supabase's
// signInWithOAuth({ provider: 'apple' }) OAuth flow — the callback is
// handled by the existing /auth/callback PKCE route since that's
// provider-agnostic.
//
// Styling follows Apple's Human Interface Guidelines for the button:
// black surface, white Apple glyph, "Continue with Apple" copy that
// exactly mirrors the "Continue with Google" wording used above. Same
// width, radius, padding, and disabled/hover treatment as the Google
// button to satisfy the equal-visual-weight requirement.
//
// The Apple glyph SVG is inlined (single monochrome path — Apple's
// preferred marks are provided as SVG in their SIWA design resources;
// this is the standard mark).

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** Post-auth redirect target — passed through to /auth/callback. */
  next: string;
  /** External disabled state (mirrors the Google button's isPending). */
  disabled?: boolean;
  /** Surfaces any Supabase OAuth error back to the page. */
  onError?: (message: string) => void;
}

export default function AppleAuthButton({ next, disabled, onError }: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      onError?.(error.message);
      setBusy(false);
    }
    // On success the browser navigates to Apple, so no need to clear busy.
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-black/80 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
      aria-label="Continue with Apple"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0"
        fill="#FFFFFF"
        aria-hidden="true"
      >
        <path d="M17.05 13.02c-.03-2.98 2.44-4.42 2.55-4.49-1.39-2.03-3.55-2.31-4.32-2.34-1.83-.19-3.58 1.08-4.51 1.08-.95 0-2.37-1.06-3.9-1.03-2 .03-3.87 1.17-4.9 2.94-2.09 3.63-.53 8.99 1.5 11.94.99 1.44 2.16 3.06 3.7 3 1.5-.06 2.06-.97 3.87-.97 1.8 0 2.31.97 3.9.94 1.61-.03 2.63-1.47 3.6-2.91 1.14-1.67 1.6-3.28 1.63-3.36-.04-.02-3.13-1.2-3.16-4.76zM14.71 4.65c.81-1 1.36-2.36 1.21-3.72-1.17.05-2.6.78-3.44 1.75-.75.87-1.42 2.27-1.24 3.6 1.31.1 2.65-.66 3.47-1.63z" />
      </svg>
      Continue with Apple
    </button>
  );
}
