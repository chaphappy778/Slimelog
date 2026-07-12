// apps/web/lib/format-time.ts
//
// T29 (2026-07-12): extracted from apps/web/app/brands/[slug]/page.tsx so
// the notification feed + brand page (+ any future consumer) share one
// implementation. The brand page previously owned this helper inline; the
// notifications feed and NotificationRow both need it too and duplicating
// a 12-line function three times isn't the move.

// Relative time in the "2m", "1h", "3d", "4mo", "1y" style. `long`
// appends " ago" and a "just now" case for sub-minute deltas — that's
// the shape the brand page has been rendering. The notification feed
// uses the short form.
export function formatRelativeTime(
  isoString: string,
  opts: { long?: boolean } = {},
): string {
  const { long = false } = opts;
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);

  if (diffMins < 1) return long ? "just now" : "now";
  if (diffMins < 60) return long ? `${diffMins}m ago` : `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return long ? `${diffHours}h ago` : `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return long ? `${diffDays}d ago` : `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12)
    return long ? `${diffMonths}mo ago` : `${diffMonths}mo`;
  const diffYears = Math.floor(diffMonths / 12);
  return long ? `${diffYears}y ago` : `${diffYears}y`;
}
