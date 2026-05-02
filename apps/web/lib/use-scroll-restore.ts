// apps/web/lib/use-scroll-restore.ts
//
// Height-aware scroll restoration for back navigation.
//
// When a user clicks back, the destination's scrollY is written to
// sessionStorage by PageHeader. This hook runs on every page mount,
// reads any pending restore for the current path, and scrolls the
// window to that position.
//
// The complication: the destination page may not have fully rendered
// yet (lazy data, SSR streaming, image loads). We handle this with
// a MutationObserver watching document.body for height changes,
// scrolling as soon as the document becomes tall enough to support
// the target scrollY. Bounded by a 2-second retry budget.
//
// The MutationObserver callback is debounced to 50ms because rapid
// DOM changes during initial render would otherwise fire canScrollTo
// dozens of times in quick succession.
//
// useIsomorphicLayoutEffect (not useEffect) is used so the scroll
// happens synchronously before paint on the client — users never see
// a flash of the destination at scroll 0 before jumping to the target.

"use client";

import { usePathname } from "next/navigation";
import { consumeScrollRestore } from "@/lib/navigation-history";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

const HEIGHT_TOLERANCE = 100; // px — accept slight under-target heights
const MAX_RETRY_MS = 2000; // ms — bounded retry budget
const OBSERVER_DEBOUNCE_MS = 50;

// [Initial implementation — scroll restore]
export function useScrollRestore(): void {
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (!pathname) return;

    const target = consumeScrollRestore(pathname);
    if (target === null) return;

    // Fast path — already-rendered content
    if (canScrollTo(target)) {
      window.scrollTo(0, target);
      return;
    }

    // Slow path — wait for content to render.
    // All mutable refs declared up front so the closures below have
    // valid bindings at construction time (no use-before-declaration).
    let timedOut = false;
    let debounceId: number | null = null;
    let observer: MutationObserver | null = null;
    let timeoutId: number | null = null;

    const cleanup = () => {
      if (debounceId !== null) {
        window.clearTimeout(debounceId);
        debounceId = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };

    const tryScroll = () => {
      if (timedOut) return;
      if (canScrollTo(target)) {
        window.scrollTo(0, target);
        cleanup();
      }
    };

    observer = new MutationObserver(() => {
      if (timedOut) return;
      if (debounceId !== null) {
        window.clearTimeout(debounceId);
      }
      debounceId = window.setTimeout(tryScroll, OBSERVER_DEBOUNCE_MS);
    });

    timeoutId = window.setTimeout(() => {
      timedOut = true;
      // Best-effort final attempt
      window.scrollTo(0, target);
      cleanup();
    }, MAX_RETRY_MS);

    observer.observe(document.body, { childList: true, subtree: true });

    return cleanup;
  }, [pathname]);
}

function canScrollTo(targetY: number): boolean {
  const docHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  return docHeight >= targetY + viewportHeight - HEIGHT_TOLERANCE;
}
