// apps/web/components/dashboard/FormattedDropDate.tsx
"use client";

import { useEffect, useState } from "react";

interface Props {
  iso: string | null;
  fallback?: string; // shown when iso is null (e.g. "TBA")
  options?: Intl.DateTimeFormatOptions;
}

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/**
 * Renders an ISO date string in the viewer's local timezone WITHOUT causing a
 * hydration mismatch. `toLocaleString` with hour/minute renders in the caller's
 * TZ, so the SSR (UTC) output differs from the client (local) output for the
 * same ISO string. We gate the real render behind a mount flag: the server and
 * the first client render both emit a stable placeholder, then the mount effect
 * fires and swaps in the localized string. (Sentry SLIMELOG-1)
 */
export default function FormattedDropDate({ iso, fallback = "TBA", options }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!iso) return <>{fallback}</>;
  if (!mounted) {
    // Stable placeholder — roughly a date's width so there's no layout shift.
    return <span suppressHydrationWarning>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>;
  }
  return <>{new Date(iso).toLocaleString("en-US", options ?? DEFAULT_OPTIONS)}</>;
}
