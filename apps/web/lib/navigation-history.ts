// apps/web/lib/navigation-history.ts
//
// In-app navigation history tracker with scroll position restoration.
//
// Why this exists: router.back() is unreliable in SPAs because
// document.referrer doesn't update on client-side navigation, and
// window.history.length includes external entries we don't control.
// This module gives us a sessionStorage-backed stack of in-app
// navigation entries that we control completely.
//
// Architecture — two sessionStorage slots:
//
// 1. STORAGE_KEY ("slimelog:nav-history") — the navigation stack.
//    JSON array of NavHistoryEntry objects { path, scrollY }. Cap at
//    20 entries (oldest dropped on push). The top entry's scrollY is
//    updated continuously via a throttled scroll listener (~100ms)
//    so when the user navigates away the final scroll position is
//    already recorded. The throttled writer verifies the top entry's
//    path matches the current pathname before writing — this prevents
//    a race where a navigation fires between the scroll event and
//    the throttle timeout, which would otherwise overwrite the
//    previous page's scroll with the new page's.
//
// 2. RESTORE_KEY ("slimelog:nav-pending-restore") — the pending
//    scroll restore handoff. Written by PageHeader.handleBack
//    immediately before router.push. Includes a timestamp; consume
//    rejects entries older than RESTORE_EXPIRY_MS (10 seconds, which
//    accommodates slow networks where destination rendering takes
//    several seconds). On path mismatch within the window, consume
//    returns null WITHOUT clearing — a different mount may still
//    consume it. On expiry, the slot is cleared on read.
//
// All functions are SSR-safe — they no-op when window/sessionStorage
// is unavailable.

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// [Change 1 — scroll restore] Constants. Added RESTORE_KEY,
// RESTORE_EXPIRY_MS, and SCROLL_THROTTLE_MS for the new mechanisms.
const STORAGE_KEY = "slimelog:nav-history";
const RESTORE_KEY = "slimelog:nav-pending-restore";
const RESTORE_EXPIRY_MS = 10000; // 10 seconds — accommodates slow network
const SCROLL_THROTTLE_MS = 100;
const MAX_STACK_SIZE = 20;
const DEFAULT_FALLBACK_PATH = "/";

// [Change 2 — scroll restore] Stack entry shape changed from string
// to a structured object. The stack is now an array of these.
interface NavHistoryEntry {
  path: string;
  scrollY: number;
}

// [Change 3 — scroll restore] Pending restore shape (internal only).
interface PendingRestore {
  path: string;
  scrollY: number;
  timestamp: number; // ms epoch
}

// [Change 4 — scroll restore] readStack now parses NavHistoryEntry
// objects. Backwards-compatibility filter: stale tabs from before this
// deploy may have raw strings in their stack — convert them to
// { path, scrollY: 0 }. Drop any entry that doesn't have a string path.
function readStack(): NavHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const entries: NavHistoryEntry[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        // Legacy entry from pre-deploy session.
        entries.push({ path: item, scrollY: 0 });
      } else if (
        item &&
        typeof item === "object" &&
        typeof item.path === "string"
      ) {
        const scrollY =
          typeof item.scrollY === "number" && Number.isFinite(item.scrollY)
            ? item.scrollY
            : 0;
        entries.push({ path: item.path, scrollY });
      }
      // Anything else: silently dropped.
    }
    return entries;
  } catch {
    return [];
  }
}

// [Change 5 — scroll restore] writeStack now writes NavHistoryEntry[].
function writeStack(stack: NavHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // Silent — storage is best-effort.
  }
}

// Internal: normalize a pathname.
// Strip query/hash, ensure leading "/", strip trailing "/" except for root.
function normalizePath(path: string): string {
  if (!path) return "/";

  // Strip query string and hash.
  let normalized = path;
  const queryIdx = normalized.indexOf("?");
  if (queryIdx !== -1) normalized = normalized.slice(0, queryIdx);
  const hashIdx = normalized.indexOf("#");
  if (hashIdx !== -1) normalized = normalized.slice(0, hashIdx);

  // Ensure leading slash.
  if (!normalized.startsWith("/")) normalized = "/" + normalized;

  // Strip trailing slash except for root.
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

// [Change 6 — scroll restore] useTrackNavigationHistory now has two
// responsibilities:
//
// 1. Push effect — on pathname change, push a new NavHistoryEntry
//    with scrollY: 0 (initial scroll on a fresh page is 0).
//
// 2. Scroll capture effect — subscribe to window scroll events,
//    throttle to SCROLL_THROTTLE_MS, and write the current scrollY
//    onto the top stack entry. Verifies the top entry's path matches
//    the current pathname before writing — race guard against a
//    navigation firing between the scroll event and throttle timeout.
export function useTrackNavigationHistory(): void {
  const pathname = usePathname();

  // Push effect.
  useEffect(() => {
    if (!pathname) return;

    const normalized = normalizePath(pathname);
    const stack = readStack();

    // Duplicate suppression: if the top of the stack is already
    // this path, do nothing. Handles double-renders and Next.js
    // routing quirks where the same pathname can fire twice.
    if (stack.length > 0 && stack[stack.length - 1].path === normalized) {
      return;
    }

    const next: NavHistoryEntry[] = [
      ...stack,
      { path: normalized, scrollY: 0 },
    ];

    // Cap the stack at MAX_STACK_SIZE. Dropping from the front
    // keeps the most recent entries.
    const capped =
      next.length > MAX_STACK_SIZE ? next.slice(-MAX_STACK_SIZE) : next;

    writeStack(capped);
  }, [pathname]);

  // [Change 7 — scroll restore] Scroll capture effect. Throttled to
  // SCROLL_THROTTLE_MS via setTimeout debounce. Race-guarded: only
  // writes when the top stack entry matches the current pathname.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;

    const currentPath = normalizePath(pathname);
    let throttleId: number | null = null;

    const handleScroll = () => {
      if (throttleId !== null) return;
      throttleId = window.setTimeout(() => {
        throttleId = null;
        const stack = readStack();
        if (stack.length === 0) return;
        const top = stack[stack.length - 1];
        // Race guard — if the top entry isn't the current page,
        // a navigation happened between the scroll event and now.
        // Don't write — we'd be overwriting the wrong entry.
        if (top.path !== currentPath) return;
        const updated: NavHistoryEntry[] = [
          ...stack.slice(0, -1),
          { path: top.path, scrollY: window.scrollY },
        ];
        writeStack(updated);
      }, SCROLL_THROTTLE_MS);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (throttleId !== null) {
        window.clearTimeout(throttleId);
        throttleId = null;
      }
    };
  }, [pathname]);
}

// [Change 8 — scroll restore] popNavigationHistory return type and
// signature changed. Returns NavHistoryEntry instead of string. Default
// fallback is { path: "/", scrollY: 0 }. Pop logic structure is
// unchanged: discard current top, get destination, pop destination too,
// write trimmed stack.
//
// Why we pop both the current page AND the destination:
// useTrackNavigationHistory will fire on the destination page after
// router.push() and re-add it to the stack. If we left it in place,
// the stack would end up with a duplicate entry. Cleaner to remove
// both during pop and let the natural push flow re-add it.
export function popNavigationHistory(
  fallback: NavHistoryEntry = { path: DEFAULT_FALLBACK_PATH, scrollY: 0 },
): NavHistoryEntry {
  const stack = readStack();

  if (stack.length === 0) {
    return fallback;
  }

  // Discard the current page (top of stack).
  const afterCurrent = stack.slice(0, -1);

  if (afterCurrent.length === 0) {
    // No previous page — write the empty stack and fall back.
    writeStack(afterCurrent);
    return fallback;
  }

  // Destination is the new top. Pop it too — it'll be re-pushed
  // by useTrackNavigationHistory when the destination page mounts.
  const destination = afterCurrent[afterCurrent.length - 1];
  const finalStack = afterCurrent.slice(0, -1);

  writeStack(finalStack);
  return { path: destination.path, scrollY: destination.scrollY };
}

// [Change 9 — scroll restore] Pending restore writer. Called from
// PageHeader.handleBack before router.push fires. Records timestamp
// so consumeScrollRestore can reject stale entries.
export function requestScrollRestore(path: string, scrollY: number): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingRestore = {
      path,
      scrollY,
      timestamp: Date.now(),
    };
    window.sessionStorage.setItem(RESTORE_KEY, JSON.stringify(payload));
  } catch {
    // Silent — storage is best-effort.
  }
}

// [Change 10 — scroll restore] Pending restore consumer. Called from
// useScrollRestore on every page mount.
//
// Behavior:
// - Empty slot or parse failure: return null
// - Older than RESTORE_EXPIRY_MS: clear slot, return null
// - Path mismatch within window: return null WITHOUT clearing (a
//   different mount may still consume it within the window)
// - Match within window: clear slot, return scrollY
export function consumeScrollRestore(path: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(RESTORE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.path !== "string" ||
      typeof parsed.scrollY !== "number" ||
      typeof parsed.timestamp !== "number"
    ) {
      // Malformed — clear it.
      window.sessionStorage.removeItem(RESTORE_KEY);
      return null;
    }

    const restore = parsed as PendingRestore;

    // Expiry check first.
    if (Date.now() - restore.timestamp > RESTORE_EXPIRY_MS) {
      window.sessionStorage.removeItem(RESTORE_KEY);
      return null;
    }

    // Path match check.
    if (restore.path !== path) {
      // Don't clear — a different mount may still consume this
      // within the expiry window.
      return null;
    }

    // Match within window — consume.
    window.sessionStorage.removeItem(RESTORE_KEY);
    return restore.scrollY;
  } catch {
    return null;
  }
}
