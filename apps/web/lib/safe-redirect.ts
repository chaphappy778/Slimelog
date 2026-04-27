// apps/web/lib/safe-redirect.ts
//
// Open-redirect protection for `?next=` query params consumed by login,
// signup, and the auth callback route. Without this, a phishing link like
//   slimelog.com/login?next=https://evil.com/fake-login
// would send users straight off-site after a successful auth.
//
// Validation rules (all must pass — otherwise return `fallback`):
//   • input must be a non-empty string
//   • must start with "/"
//   • must NOT start with "//" (protocol-relative URL bypass)
//   • must NOT contain "http:" or "https:" anywhere (case-insensitive)
//   • must NOT contain backslashes ("\")
//   • must NOT contain null bytes ("\0" or the percent-encoded "%00")
//
// Defaults:
//   • Logged-in contexts: pass "/"
//   • Logged-out contexts: pass "/landing"
//
// Examples:
//   safeRedirect("/users/jenny", "/")               -> "/users/jenny"
//   safeRedirect("/slimes/abc-123?tab=foo", "/")    -> "/slimes/abc-123?tab=foo"
//   safeRedirect(null, "/")                         -> "/"
//   safeRedirect("", "/")                           -> "/"
//   safeRedirect("https://evil.com", "/")           -> "/"
//   safeRedirect("//evil.com/phish", "/")           -> "/"
//   safeRedirect("/legit?redirect=https://evil", "/") -> "/"  (any http: in string blocked)
//   safeRedirect("/foo\\bar", "/")                  -> "/"
//   safeRedirect("/foo%00bar", "/landing")          -> "/landing"
//   safeRedirect("foo", "/")                        -> "/"  (must start with "/")

export function safeRedirect(
  input: string | null | undefined,
  fallback: string,
): string {
  if (typeof input !== "string" || input.length === 0) return fallback;

  // Must start with a single forward slash.
  if (!input.startsWith("/")) return fallback;

  // Reject protocol-relative URLs ("//evil.com/path").
  if (input.startsWith("//")) return fallback;

  // Reject any embedded protocol — even nested in a query string.
  // Case-insensitive because URL schemes are case-insensitive.
  const lower = input.toLowerCase();
  if (lower.includes("http:") || lower.includes("https:")) return fallback;

  // Reject backslashes — Windows path separator and a known browser
  // normalization vector.
  if (input.includes("\\")) return fallback;

  // Reject literal and percent-encoded null bytes.
  if (input.includes("\0") || lower.includes("%00")) return fallback;

  return input;
}
