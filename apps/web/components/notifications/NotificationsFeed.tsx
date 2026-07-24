// apps/web/components/notifications/NotificationsFeed.tsx
//
// T29 (2026-07-12): the /notifications page body. Client component so
// we can:
//   * hold the growing list across "load more" clicks,
//   * flip local is_read state on row taps without a full refetch,
//   * poll the count implicitly via NotificationBell (bell owns its own
//     polling — feed owner just wants a clean render).
//
// Layout
// ------
//   [ unread pill ]                       [ Mark all read ]
//   ────────────────────────────────────────────────────────
//   <NotificationRow />
//   <NotificationRow />
//   ...
//   [ Load more ]  (only when the last fetch returned a full page)

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Notification, NotificationsResponse } from "@/lib/types";
import NotificationRow from "./NotificationRow";

const PAGE_SIZE = 50;
// 2026-07-17 T169: how often the feed auto-refreshes while the tab is
// visible. Matches the bell's 60s cadence loosely (30s here so anyone
// staring at the inbox after a save sees new rows land within half a
// minute). Longer than that and users assume the app is broken; shorter
// and we burn RPC quota + battery for no real gain.
const AUTO_REFRESH_MS = 30_000;

async function fetchPage(
  before?: string,
): Promise<NotificationsResponse | null> {
  const params = new URLSearchParams();
  if (before) params.set("before", before);
  const qs = params.toString();
  const url = `/api/notifications${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as NotificationsResponse;
  } catch (err) {
    console.error("[NotificationsFeed] fetch failed:", err);
    return null;
  }
}

async function markAll(): Promise<number> {
  try {
    const res = await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { marked?: number };
    return json.marked ?? 0;
  } catch (err) {
    console.error("[NotificationsFeed] mark-all failed:", err);
    return 0;
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton(): React.ReactElement {
  return (
    <div
      className="w-full rounded-2xl"
      style={{
        background: "rgba(45,10,78,0.2)",
        border: "1px solid rgba(45,10,78,0.6)",
        height: 64,
      }}
    />
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState(): React.ReactElement {
  return (
    <div
      className="rounded-2xl px-6 py-10 text-center"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* Geometric SVG — deliberately abstract. No character art per
          the anti-AI-art community sensitivity note. Concentric ring
          + a lonely little dot inside. */}
      <div className="flex justify-center mb-4">
        <svg
          width={72}
          height={72}
          viewBox="0 0 72 72"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="36"
            cy="36"
            r="30"
            stroke="rgba(0,240,255,0.35)"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
          <circle
            cx="36"
            cy="36"
            r="18"
            stroke="rgba(255,0,229,0.45)"
            strokeWidth="2"
          />
          <circle cx="36" cy="36" r="4" fill="#39FF14" />
        </svg>
      </div>
      <p
        className="text-sm leading-relaxed"
        style={{ color: "#B4A9C4" }}
      >
        No notifications yet. Log some slimes and follow scouts to see
        updates here.
      </p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsFeed(): React.ReactElement {
  const { user, loading: authLoading } = useAuth();

  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  // 2026-07-17 T169: refreshing state drives the button spinner without
  // showing the full-page skeleton, so users see a smooth top-of-list
  // update instead of a jarring reload. Separate from `loading` (which
  // covers the initial mount) so the two paths don't step on each other.
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    const page = await fetchPage();
    if (page) {
      setItems(page.notifications);
      setUnread(page.unread_count);
      setHasMore(page.notifications.length === PAGE_SIZE);
    } else {
      setError("Could not load your notifications.");
    }
    setLoading(false);
  }, []);

  // 2026-07-17 T169: silent-ish re-fetch used by both the manual Refresh
  // button and the auto-poll timer. Skips the skeleton flash so it feels
  // like a live list rather than a full reload. Preserves the current
  // hasMore state at the tail so pagination doesn't reset if the user
  // was mid-way through Load More.
  const refreshList = useCallback(async () => {
    setRefreshing(true);
    const page = await fetchPage();
    if (page) {
      setItems(page.notifications);
      setUnread(page.unread_count);
      setHasMore(page.notifications.length === PAGE_SIZE);
      setError(null);
    }
    // On failure we keep the existing list quietly rather than blowing
    // it away — the next successful poll will heal it.
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    void initialLoad();
  }, [authLoading, user, initialLoad]);

  // 2026-07-17 T169: auto-poll every AUTO_REFRESH_MS while the tab is
  // visible. Uses the Page Visibility API to pause polling when the tab
  // is backgrounded — no need to burn quota + battery updating an inbox
  // no one is looking at. Fires an immediate refresh on visibilitychange
  // → visible so users returning to the tab see fresh data without
  // waiting a full 30s cycle. Cleaned up on unmount.
  const refreshRef = useRef(refreshList);
  // Latest-ref publish happens post-commit, never in the render body. A
  // discarded render must not hand the poller a closure that was never
  // committed. No dep array: runs after every commit, cheap.
  useEffect(() => {
    refreshRef.current = refreshList;
  });
  useEffect(() => {
    if (authLoading || !user) return;
    if (typeof document === "undefined") return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(() => {
        void refreshRef.current();
      }, AUTO_REFRESH_MS);
    };
    const stop = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // Catch-up refresh on tab return so users don't wait a full
        // cycle after coming back from another tab.
        void refreshRef.current();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [authLoading, user]);

  const handleLoadMore = async () => {
    if (loadingMore || items.length === 0) return;
    setLoadingMore(true);
    const last = items[items.length - 1];
    const page = await fetchPage(last.created_at);
    if (page) {
      setItems((prev) => [...prev, ...page.notifications]);
      setUnread(page.unread_count);
      setHasMore(page.notifications.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  const handleMarkAll = async () => {
    if (markingAll || unread === 0) return;
    setMarkingAll(true);
    const marked = await markAll();
    if (marked > 0) {
      setItems((prev) =>
        prev.map((n) => (n.is_read ? n : { ...n, is_read: true })),
      );
      setUnread(0);
    }
    setMarkingAll(false);
  };

  const handleRowMarkedRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    setUnread((c) => (c > 0 ? c - 1 : 0));
  }, []);

  // ─── Auth guard fallback ───────────────────────────────────────────────────
  // The page.tsx wrapper redirects signed-out users server-side. This
  // client fallback is here in case AuthProvider resolves to null
  // mid-session (session expired, cookie cleared, etc.) — we want a
  // graceful "please sign in" instead of a broken render.
  if (!authLoading && !user) {
    return (
      <div
        className="rounded-2xl px-6 py-10 text-center"
        style={{
          background: "rgba(45,10,78,0.3)",
          border: "1px solid rgba(45,10,78,0.7)",
          color: "#B4A9C4",
        }}
      >
        Please sign in to see your notifications.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row: unread pill + mark all read button */}
      <div className="flex items-center justify-between">
        {unread > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              background: "rgba(0,240,255,0.12)",
              color: "#00F0FF",
              border: "1px solid rgba(0,240,255,0.35)",
            }}
          >
            <span
              className="inline-block rounded-full"
              style={{
                width: 6,
                height: 6,
                background: "#00F0FF",
              }}
            />
            {unread} unread
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {/* 2026-07-17 T169: manual Refresh button so users can force a
              re-fetch without waiting on the 30s auto-poll. Small circular
              arrow glyph in cyan. Disabled while a fetch is in flight so
              a spam-click doesn't fire duplicate requests. */}
          <button
            type="button"
            onClick={() => void refreshList()}
            disabled={refreshing || loading}
            aria-label="Refresh notifications"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: "rgba(0,240,255,0.08)",
              color: "#00F0FF",
              border: "1px solid rgba(0,240,255,0.35)",
              opacity: refreshing || loading ? 0.6 : 1,
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                animation: refreshing ? "spin 0.7s linear infinite" : undefined,
              }}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            {refreshing ? "Refreshing" : "Refresh"}
          </button>

          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={markingAll}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: "rgba(57,255,20,0.10)",
                color: "#39FF14",
                border: "1px solid rgba(57,255,20,0.35)",
                opacity: markingAll ? 0.6 : 1,
              }}
            >
              {markingAll ? "Marking..." : "Mark all read"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : error ? (
        <div
          className="rounded-2xl px-4 py-6 text-sm"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(255,0,229,0.35)",
            color: "#FF00E5",
          }}
        >
          {error}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onMarkedRead={handleRowMarkedRead}
            />
          ))}

          {hasMore && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                style={{
                  background: "rgba(45,10,78,0.5)",
                  color: "#E7E1F3",
                  border: "1px solid rgba(255,255,255,0.15)",
                  opacity: loadingMore ? 0.6 : 1,
                }}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
