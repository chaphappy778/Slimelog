// apps/web/lib/stripe-guards.ts
//
// 2026-07-06 audit blocker #4: Stripe endpoint hardening helpers.
//
// Shared checks used by both /api/stripe/checkout and /api/stripe/portal
// to make sure the client can't smuggle an arbitrary price ID or an
// off-site redirect URL through the request body.
//
// Rationale for centralizing:
//   - Every checkout endpoint needs the exact same price-allowlist logic
//   - Every Stripe redirect back to us (success_url, cancel_url, return_url)
//     needs the exact same origin check
//   - Duplicating either pattern makes it easy for one to drift out of
//     step with the other during a future refactor
//
// The price allowlist is built from the same env vars the client uses
// to render subscription buttons, so there's exactly one source of
// truth for "which prices does this app know about."

/** Prices the app is willing to check out for a given customer mode. */
export function allowedPriceIdsForMode(mode: "user" | "brand"): Set<string> {
  if (mode === "user") {
    return new Set(
      [
        process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
        process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
      ].filter((v): v is string => typeof v === "string" && v.length > 0),
    );
  }
  return new Set(
    [process.env.NEXT_PUBLIC_STRIPE_BRAND_PRO_PRICE_ID].filter(
      (v): v is string => typeof v === "string" && v.length > 0,
    ),
  );
}

/** True when `priceId` is one of the prices the app has configured for
 *  `mode`. Rejects any client-submitted price the app never advertised. */
export function isAllowedPriceIdForMode(
  priceId: string,
  mode: "user" | "brand",
): boolean {
  return allowedPriceIdsForMode(mode).has(priceId);
}

/** Verify a client-supplied redirect URL is safe to hand to Stripe as
 *  success_url / cancel_url / return_url. Returns null when the URL is
 *  parseable AND its origin matches this site; otherwise returns a
 *  short error message the caller can propagate to the response body.
 *
 *  Rules:
 *    - Must parse as an absolute URL
 *    - Must be http(s)
 *    - Its origin must equal NEXT_PUBLIC_SITE_URL (case-insensitive,
 *      trailing slash tolerated). Falls back to the request's own Host
 *      header when NEXT_PUBLIC_SITE_URL isn't configured — defence in
 *      depth for misconfigured environments. */
export function validateRedirectUrl(
  rawUrl: string,
  requestHost?: string | null,
): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return "Redirect URL must be an absolute URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Redirect URL must use http or https.";
  }
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configuredOrigin) {
    const parsedOrigin = parsed.origin.toLowerCase();
    if (parsedOrigin !== configuredOrigin.toLowerCase()) {
      return "Redirect URL is not on this site.";
    }
    return null;
  }
  // Fallback when the env var isn't set (staging/dev).
  if (!requestHost) {
    return "Cannot verify redirect URL origin.";
  }
  if (parsed.host.toLowerCase() !== requestHost.toLowerCase()) {
    return "Redirect URL is not on this site.";
  }
  return null;
}
