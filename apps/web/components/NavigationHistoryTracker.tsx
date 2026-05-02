// apps/web/components/NavigationHistoryTracker.tsx
//
// Thin client wrapper that mounts the navigation history hook once
// globally from the root layout. No DOM output. The hook does all
// the work — this component just provides a client boundary so the
// hook can use usePathname().

"use client";

import { useTrackNavigationHistory } from "@/lib/navigation-history";

// [Initial implementation — T31 v2] Mount once in app/layout.tsx.
export default function NavigationHistoryTracker() {
  useTrackNavigationHistory();
  return null;
}
