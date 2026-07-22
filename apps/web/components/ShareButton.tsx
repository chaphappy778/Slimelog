// apps/web/components/ShareButton.tsx
// Shared share-button component used on slime detail, drop detail, brand,
// profile pages and the invite dashboard.
//
// Behavior
// --------
// * On mobile / any device where navigator.share exists AND canShare
//   accepts our payload, opens the native share sheet.
// * Otherwise copies the share URL to the clipboard and shows a "Copied!"
//   confirmation for 2 seconds.
// * If a signed-in user shares, we append ?ref=<their referral code> to
//   the URL so every share doubles as an invite (the receiver clicking
//   through gets credited to the sharer if they sign up).
//
// The component accepts a base path (like `/slimes/abc`) and enriches
// it with the ref param at share time. Callers don't have to know or
// care about referral wiring — they just pass path + title + text.

"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type ShareButtonProps = {
  /** Path (or full URL) to share. Referral code is appended at share time. */
  path: string;
  /** Native share sheet title (mobile only). */
  title: string;
  /** Native share sheet text / prefix that goes above the URL. */
  text: string;
  /** Optional custom label; defaults to "Share". */
  label?: string;
  /**
   * Optional visual variant.
   * - "primary": gradient fill (post-log CTA)
   * - "ghost": violet card + cyan text/border (default action bar)
   * - "icon": circular glass icon-only button, no label. Added T188
   *   (2026-07-22) for the /slimes/[id] hero top-right corner.
   */
  variant?: "primary" | "ghost" | "icon";
  /** Optional className to extend layout. */
  className?: string;
};

function absoluteFromPath(path: string): string {
  if (typeof window === "undefined") return path;
  if (path.startsWith("http")) return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function appendRefParam(url: string, code: string | null): string {
  if (!code) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}ref=${code}`;
}

export default function ShareButton({
  path,
  title,
  text,
  label = "Share",
  variant = "ghost",
  className,
}: ShareButtonProps) {
  // T104: read referral code from the shared AuthProvider instead of
  // firing an independent auth.getUser + profiles fetch. Anonymous
  // viewers still get a working share, just without the referral credit.
  const { profile } = useAuth();
  const referralCode = profile?.referral_code ?? null;
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(async () => {
    const url = appendRefParam(absoluteFromPath(path), referralCode);
    // Prefer native share where supported. canShare returns false for
    // some payloads on some browsers (e.g., desktop Chrome without a
    // permitted URL). We check it so we don't invoke share() and get an
    // AbortError we can't distinguish from a user cancel.
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (nav && "share" in nav) {
      const payload: ShareData = { title, text, url };
      const canShare =
        typeof nav.canShare === "function" ? nav.canShare(payload) : true;
      if (canShare) {
        try {
          await nav.share(payload);
          return;
        } catch {
          // User cancelled or something failed — fall through to clipboard.
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard failed too; last-ditch, open a mailto: to give the user
      // *some* way to share. Rarely reached in practice.
      window.location.href = `mailto:?subject=${encodeURIComponent(
        title,
      )}&body=${encodeURIComponent(`${text}\n\n${url}`)}`;
    }
  }, [path, referralCode, title, text]);

  const isIcon = variant === "icon";

  // Icon variant is a fixed 44x44 circular glass button (no gap/padding
  // for a label); the other two keep the pill layout.
  const baseClasses = isIcon
    ? "inline-flex items-center justify-center rounded-full transition-opacity active:opacity-80"
    : "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-opacity active:opacity-80";

  const style =
    variant === "primary"
      ? {
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
        }
      : variant === "icon"
        ? {
            width: 44,
            height: 44,
            background: "rgba(10,0,20,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(0,240,255,0.35)",
            boxShadow: "0 0 12px rgba(0,240,255,0.20)",
            color: "#00F0FF",
          }
        : {
            background: "rgba(45,10,78,0.5)",
            border: "1px solid rgba(0,240,255,0.35)",
            color: "#00F0FF",
          };

  // Icon-only variant swaps to a checkmark on copy so the tap still gives
  // feedback without adding a text label.
  const glyphSize = isIcon ? 20 : 16;

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`${baseClasses}${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={copied ? "Copied" : label}
      title={label}
    >
      {isIcon && copied ? (
        // Copied checkmark (icon variant only)
        <svg
          viewBox="0 0 24 24"
          width={glyphSize}
          height={glyphSize}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        // Share glyph
        <svg
          viewBox="0 0 24 24"
          width={glyphSize}
          height={glyphSize}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
      {!isIcon && (copied ? "Copied!" : label)}
    </button>
  );
}
