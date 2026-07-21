// apps/web/components/feed/FeedShareButton.tsx
//
// Standalone add-on (2026-07-21): Instagram-style share affordance for
// feed cards. Sits in the like + comment icon row on both the photo-hero
// card (FeedCard) and the compact row (FeedCardCompact). Not related to
// the T127 reactions rebuild — this is a separate, self-contained button.
//
// Behavior
// --------
//   * Primary path: navigator.share() opens the native OS share sheet
//     (surfaces Instagram / TikTok / Messages / etc. natively on iOS +
//     Android + newer desktop browsers). TikTok is intentionally in the
//     copy even though video isn't built yet, so we don't re-touch this
//     UX when it ships.
//   * Fallback 1 (no navigator.share): copy the URL to the clipboard and
//     show a subtle toast.
//   * Fallback 2 (clipboard also fails): window.prompt() with the URL so
//     the user can copy it by hand.
//   * A user cancelling the OS share sheet throws AbortError. That is NOT
//     a real error — swallow it silently (no toast, no clipboard fallthrough,
//     no Sentry noise).
//
// Share payload reuses the T166 reshare-caption shape (see the ShareButton
// usages on apps/web/app/slimes/[id]/page.tsx) so feed shares read the same
// as post-log and detail-page shares. The feed query doesn't carry the
// brand's Instagram handle, so we take T166's `by <brand>` fallback branch.
//
// PostHog: fires `feed_card_shared` when the share is initiated (before the
// OS sheet opens — we can't observe which target the user ultimately picks).

"use client";

import { useCallback, useState } from "react";
import { usePostHog } from "posthog-js/react";

type FeedShareButtonProps = {
  logId: string;
  slimeName: string | null;
  brandName: string | null;
  brandSlug: string | null;
  ratingOverall: number | null;
  /** Icon glyph size in px. 17 on the photo-hero card, 12 on the compact row. */
  iconSize?: number;
  /** Extra layout classes (e.g. negative margin to keep dense rows tight). */
  className?: string;
};

// Build the absolute detail URL + UTM params. Uses window.location.origin
// (matching ShareButton's absoluteFromPath) so previews and the Capacitor
// WebView get the right host instead of a hardcoded domain.
function buildShareUrl(logId: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.slimelog.com";
  return `${origin}/slimes/${logId}?utm_source=share&utm_medium=feed_card&utm_campaign=user_share`;
}

// Mirrors the T166 caption builder verbatim. No brand IG handle on the feed
// query, so the `@handle` branch is unreachable here and we land on `by <brand>`.
function buildShareText(slimeName: string | null, brandName: string | null, ratingOverall: number | null): string {
  const parts: string[] = [`Just logged this on SlimeLog: ${slimeName ?? "this slime"}`];
  if (typeof ratingOverall === "number") {
    parts.push(`${ratingOverall.toFixed(1)}/5`);
  }
  if (brandName) {
    parts.push(`by ${brandName}`);
  }
  return parts.join(" · ");
}

export default function FeedShareButton({
  logId,
  slimeName,
  brandName,
  brandSlug,
  ratingOverall,
  iconSize = 17,
  className,
}: FeedShareButtonProps) {
  const posthog = usePostHog();
  const [toast, setToast] = useState(false);

  const handleShare = useCallback(
    async (e: React.MouseEvent) => {
      // Footer already stops propagation, but be defensive so a share tap
      // never also opens the detail modal.
      e.stopPropagation();

      const url = buildShareUrl(logId);
      const title = slimeName ?? "A slime on SlimeLog";
      const text = buildShareText(slimeName, brandName, ratingOverall);

      // Fire before the sheet opens — once the OS sheet is up we can't tell
      // which target the user picks (or whether they cancel). posthog is a
      // no-op when the SDK is dormant (no key in local/preview envs).
      posthog?.capture("feed_card_shared", {
        log_id: logId,
        slime_name: slimeName,
        brand_slug: brandSlug,
      });

      const nav = typeof navigator !== "undefined" ? navigator : null;

      // Primary: native share sheet.
      if (nav && "share" in nav) {
        const payload: ShareData = { title, text, url };
        const canShare =
          typeof nav.canShare === "function" ? nav.canShare(payload) : true;
        if (canShare) {
          try {
            await nav.share(payload);
            return;
          } catch (err) {
            // User dismissed the sheet — that's a cancel, not a failure.
            // Do NOT fall through to clipboard (they didn't ask to copy).
            if (err instanceof Error && err.name === "AbortError") return;
            // Any other share failure falls through to the clipboard path.
          }
        }
      }

      // Fallback 1: clipboard + toast.
      try {
        await nav?.clipboard.writeText(url);
        setToast(true);
        setTimeout(() => setToast(false), 2500);
        return;
      } catch {
        // Fallback 2: last-ditch manual copy for very old browsers.
        if (typeof window !== "undefined" && typeof window.prompt === "function") {
          window.prompt("Copy this link to share:", url);
        }
      }
    },
    [logId, slimeName, brandName, brandSlug, ratingOverall, posthog],
  );

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label="Share"
        // 44x44 hit target per Apple HIG; the glyph stays small and centered.
        // Negative-margin className (passed by dense callers) keeps the row
        // from growing while preserving the full tap area.
        className={`inline-flex items-center justify-center shrink-0 transition-opacity active:opacity-60${
          className ? ` ${className}` : ""
        }`}
        style={{ width: 44, height: 44, color: "rgba(255,255,255,0.55)" }}
      >
        {/* Line SVG paper airplane, 2px stroke — matches the comment glyph. */}
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>

      {toast && (
        <div
          className="fixed left-1/2 bottom-24 z-[300] -translate-x-1/2 px-4 py-2.5 rounded-2xl text-[13px] font-bold whitespace-nowrap pointer-events-none"
          style={{
            background: "rgba(10,0,20,0.92)",
            border: "1px solid rgba(0,240,255,0.4)",
            color: "#00F0FF",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
          role="status"
        >
          Link copied. Paste to Instagram or TikTok.
        </div>
      )}
    </>
  );
}
