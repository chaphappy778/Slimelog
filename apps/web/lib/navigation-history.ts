// apps/web/lib/navigation-history.ts
//
// In-app navigation history tracker.
//
// Why this exists: router.back() is unreliable in SPAs because
// document.referrer doesn't update on client-side navigation, and
// window.history.length includes external entries we don't control.
// This module gives us a sessionStorage-backed stack of in-app
// pathnames that we control completely.
//
// Stack lives at sessionStorage["slimelog:nav-history"] as a JSON
// array of strings. Cap at 20 entries (oldest dropped on push).
// All functions are SSR-safe — they no-op when window/sessionStorage
// is unavailable.

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// [Initial implementation — T31 v2] Constants.
const STORAGE_KEY = "slimelog:nav-history";
const MAX_STACK_SIZE = 20;
const DEFAULT_FALLBACK = "/";

// [Initial implementation — T31 v2] Internal: read the stack from
// sessionStorage. Returns [] on any error or unavailability.
function readStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: filter out any non-string entries that may have
    // been written by a buggy older build.
    return parsed.filter((entry): entry is string => typeof entry === "string");
  } catch {
    return [];
  }
}

// [Initial implementation — T31 v2] Internal: write the stack to
// sessionStorage. No-ops on error (e.g. private browsing in some
// configurations can throw on writes).
function writeStack(stack: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // Silent — storage is best-effort.
  }
}

// [Initial implementation — T31 v2] Internal: normalize a pathname.
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

// [Initial implementation — T31 v2] React hook — subscribes to
// pathname changes via usePathname() and pushes each new path onto
// the stack. Mount once globally via NavigationHistoryTracker.
export function useTrackNavigationHistory(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    const normalized = normalizePath(pathname);
    const stack = readStack();

    // Duplicate suppression: if the top of the stack is already
    // this path, do nothing. Handles double-renders and Next.js
    // routing quirks where the same pathname can fire twice.
    if (stack.length > 0 && stack[stack.length - 1] === normalized) {
      return;
    }

    const next = [...stack, normalized];

    // Cap the stack at MAX_STACK_SIZE. Dropping from the front
    // keeps the most recent entries.
    const capped =
      next.length > MAX_STACK_SIZE ? next.slice(-MAX_STACK_SIZE) : next;

    writeStack(capped);
  }, [pathname]);
}

// [Initial implementation — T31 v2] Pop the current page from the
// stack and return the previous in-app pathname. If the stack is
// empty after popping, return the fallback. Always safe to call.
//
// Why we pop both the current page AND the destination:
// useTrackNavigationHistory will fire on the destination page after
// router.push() and re-add it to the stack. If we left it in place,
// the stack would end up with a duplicate entry. Cleaner to remove
// both during pop and let the natural push flow re-add it.
export function popNavigationHistory(
  fallback: string = DEFAULT_FALLBACK,
): string {
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
  return destination;
}
