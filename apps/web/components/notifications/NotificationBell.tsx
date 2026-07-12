// apps/web/components/notifications/NotificationBell.tsx
//
// T29 (2026-07-12): bell icon that lives in PageHeader, top-right,
// between the back-button/wordmark cluster and the profile avatar /
// hamburger menu.
//
// Behavior
// --------
// * Hidden when signed out or when the user is already on /notifications
//   (no point in a self-nav point that's louder than the page they're
//   already on).
// * Fetches /api/notifications/unread-count on mount + every 60s + on
//   window focus. No realtime yet — filed as T29a.
// * Renders a small magenta badge (1..9, then 9+) over the top-right of
//   the bell when unread > 0.
// * Tap navigates to /notifications.

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const POLL_INTERVAL_MS = 60_000;

async function fetchUnread(): Promise<number> {
  try {
    const res = await fetch("/api/notifications/unread-count", {
      // Send cookies — server-side route uses the ssr client.
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { unread_count?: number };
    return typeof json.unread_count === "number" ? json.unread_count : 0;
  } catch {
    return 0;
  }
}

export default function NotificationBell(): React.ReactElement | null {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [unread, setUnread] = useState<number>(0);

  const refresh = useCallback(async () => {
    const n = await fetchUnread();
    setUnread(n);
  }, []);

  useEffect(() => {
    // Don't poll while auth is still resolving or when signed out.
    if (loading || !user) return;

    // Initial fetch + interval + focus refetch.
    let cancelled = false;
    (async () => {
      const n = await fetchUnread();
      if (!cancelled) setUnread(n);
    })();

    const timer = setInterval(() => {
      if (!cancelled) refresh();
    }, POLL_INTERVAL_MS);

    const onFocus = () => {
      if (!cancelled) refresh();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [loading, user, refresh]);

  // Hide when signed out or on /notifications itself (see PageHeader
  // hookup — this component still short-circuits so it's safe to
  // mount unconditionally).
  if (loading || !user) return null;
  if (pathname === "/notifications") return null;

  const badgeLabel = unread > 9 ? "9+" : String(unread);
  const showBadge = unread > 0;

  return (
    <Link
      href="/notifications"
      aria-label={
        showBadge
          ? `Notifications, ${unread} unread`
          : "Notifications"
      }
      className="relative flex items-center justify-center transition-colors"
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "rgba(10,0,20,0.55)",
        border: "1px solid rgba(255,255,255,0.12)",
        color: "#FFFFFF",
      }}
    >
      {/* Line bell — 2px stroke to match the app icon language */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-5 h-5"
        aria-hidden="true"
      >
        <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>

      {showBadge && (
        <span
          aria-hidden="true"
          className="absolute flex items-center justify-center text-[10px] font-bold"
          style={{
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            padding: "0 5px",
            borderRadius: 9,
            background: "#FF00E5",
            color: "#0A0A0A",
            border: "2px solid rgba(15,0,24,0.95)",
            lineHeight: 1,
          }}
        >
          {badgeLabel}
        </span>
      )}
    </Link>
  );
}
