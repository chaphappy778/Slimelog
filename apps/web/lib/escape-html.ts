// apps/web/lib/escape-html.ts
//
// Audit HP-25 (2026-07-10). Shared HTML entity escaper for use in
// transactional email bodies and any other server-rendered HTML that
// interpolates user-supplied strings. Previously three different
// email routes each defined their own local copy of this function
// with slight variance (&#39; vs &#039;) and a fourth (admin brand-
// claims approve) was missing it entirely — meaning a brand name
// containing HTML tags could inject live payload into the
// transactional email HTML on some native mail clients.
//
// Consolidating into one implementation ensures every email route
// gets the same escape behavior and future routes get it for free.
//
// Encoded characters:
//   &  ->  &amp;
//   <  ->  &lt;
//   >  ->  &gt;
//   "  ->  &quot;
//   '  ->  &#39;
//
// Notes:
//   - `&` MUST be replaced FIRST or the subsequent replacements
//     would double-encode the ampersands introduced.
//   - The apostrophe uses `&#39;` (shorter, equivalent to `&#039;`
//     that verify-email/route.ts previously used).
//   - This helper is for HTML entity contexts. It does NOT escape
//     JavaScript, URL, or CSS contexts — do not reuse it there.

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
