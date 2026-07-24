// apps/web/next.config.js
//
// Audit hp-20 (2026-07-07): security headers + tightened remote image
// hostnames. Previously the config had no CSP, HSTS, X-Frame-Options,
// or Referrer-Policy — the app was relying entirely on defaults, which
// leaves clickjacking, protocol downgrade, referer leak, and stored
// XSS surfaces uncovered.
//
// Header choices (in order below):
//   1. Strict-Transport-Security  — HSTS, 2yr + includeSubDomains + preload
//   2. X-Frame-Options: DENY      — clickjacking defense (belt-and-
//                                   suspenders with CSP frame-ancestors)
//   3. Referrer-Policy            — strict-origin-when-cross-origin
//   4. X-Content-Type-Options     — nosniff (with audit hp-17 pairs)
//   5. Permissions-Policy         — disable camera / mic / geo / payment
//                                   API / USB — none used by SlimeLog
//   6. Content-Security-Policy    — REPORT-ONLY for the initial rollout
//                                   so we can watch DevTools Console for
//                                   real violations vs. browser-extension
//                                   noise before flipping to enforce.
//
// CSP shape:
//   default-src 'self'
//   script-src  self + Stripe.js + Vercel analytics + unsafe-inline/eval
//               (Next.js hydration needs these; a nonce-based upgrade is
//               a post-launch task once we're comfortable with the base
//               policy).
//   style-src   self + Google Fonts CSS + unsafe-inline (styled-jsx)
//   img-src     self + data: + blob: + Supabase Storage + Google avatars
//   font-src    self + Google Fonts binaries
//   connect-src self + Supabase (REST + WS) + Stripe API + Vercel vitals
//   frame-src   Stripe checkout + hooks + Google OAuth
//   frame-ancestors 'none'   — no one can iframe us
//   form-action 'self'       — form posts stay on our origin
//   base-uri 'self'          — blocks base tag injection
//   object-src 'none'        — no Flash/Java plugins
//   upgrade-insecure-requests — force http:// -> https:// for any leaks
//
// Once we run Report-Only for a few days and confirm the app functions
// clean (only browser-extension noise in console), rename the header to
// `Content-Security-Policy` to enforce.
//
// Remote images:
//   - Supabase Storage (project bucket): /storage/v1/object/public/**
//   - Google avatars: locked to /a/** so no arbitrary user content

const SUPABASE_ORIGIN = "https://zxxjpxpchvsjkvslwtvx.supabase.co";
const SUPABASE_WS_ORIGIN = "wss://zxxjpxpchvsjkvslwtvx.supabase.co";

// Build the CSP as a single string so we can flip Report-Only ↔ enforce
// by swapping one header key without touching the value.
//
// Note: `upgrade-insecure-requests` is intentionally omitted here.
// The browser prints a console warning ("directive 'upgrade-insecure-
// requests' is ignored when delivered in a report-only policy") because
// it's a modification directive that only takes effect in enforcing mode.
// When we flip to enforcing (rename the header key below), add
// "upgrade-insecure-requests" back to this array. In the meantime it's
// largely redundant anyway — Vercel serves us on HTTPS-only and the
// codebase has no hardcoded http:// resource URLs.
const CSP_DIRECTIVES = [
  "default-src 'self'",
  // 'unsafe-inline' + 'unsafe-eval' required for Next.js hydration
  // scripts and some webpack chunks. Removing them is a nonce upgrade
  // (post-launch item).
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://vitals.vercel-insights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} https://lh3.googleusercontent.com`,
  "font-src 'self' https://fonts.gstatic.com",
  // Observability push (2026-07-20): PostHog ingestion + static-asset
  // hosts (US cloud). Sentry does NOT need an entry here — it tunnels
  // through the same-origin /monitoring route (see withSentryConfig
  // tunnelRoute below), which 'self' already covers. If PostHog is moved
  // to the EU region, swap these for https://eu.i.posthog.com +
  // https://eu-assets.i.posthog.com.
  `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN} https://api.stripe.com https://vitals.vercel-insights.com https://us.i.posthog.com https://us-assets.i.posthog.com`,
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com https://accounts.google.com",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "camera=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
  // Chrome-specific FLoC / Topics opt-out
  "interest-cohort=()",
  "browsing-topics=()",
].join(", ");

const securityHeaders = [
  // HSTS. 2 years, subdomains, preload-eligible.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Clickjacking defense (paired with CSP frame-ancestors).
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Don't leak full URLs on outbound clicks.
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Stop the browser from guessing file types (pairs with audit hp-17).
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Lock down browser features SlimeLog doesn't use.
  {
    key: "Permissions-Policy",
    value: PERMISSIONS_POLICY,
  },
  // CSP in REPORT-ONLY mode for the initial rollout. Any violations
  // appear in the DevTools Console as red text prefixed with "Refused
  // to load the ..." — nothing is actually blocked. Once we've watched
  // the console for a few days of normal use and refined based on real
  // violations, rename this key to `Content-Security-Policy` (drop the
  // -Report-Only suffix) to enforce.
  {
    key: "Content-Security-Policy-Report-Only",
    value: CSP_DIRECTIVES,
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zxxjpxpchvsjkvslwtvx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Audit hp-20 (2026-07-07): restrict Google user-content host
        // to the /a/** path — that's the Google OAuth profile-photo
        // namespace. Blocks any arbitrary lh3.googleusercontent.com
        // URL (which could otherwise be attacker-controlled uploaded
        // content that renders inside our origin trust boundary via
        // <Image>).
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/a/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// ── Observability push (2026-07-20): wrap with Sentry ────────────────
// withSentryConfig injects the build-time source-map upload + tunnels
// the Sentry webpack/turbopack plugin. org/project/authToken all come
// from env vars (never hardcode). Source maps only upload when
// SENTRY_AUTH_TOKEN is present, so local builds without it are a no-op.
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only log Sentry plugin output in CI; keep local builds quiet.
  silent: !process.env.CI,

  // Upload a wider set of client bundles so stack frames resolve.
  widenClientFileUpload: true,

  // Strip the Sentry SDK's own logger from the client bundle.
  // T198 (2026-07-23): `disableLogger` is deprecated in @sentry/nextjs v10;
  // the replacement is `webpack.treeshake.removeDebugLogging`.
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },

  // Route Sentry's browser requests through a same-origin path so ad
  // blockers / CSP connect-src don't drop them. Matches our strict CSP
  // (connect-src 'self') without needing a Sentry ingest host allowlist.
  tunnelRoute: "/monitoring",
});
