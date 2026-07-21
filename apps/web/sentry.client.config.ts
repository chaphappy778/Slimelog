// apps/web/sentry.client.config.ts
//
// Observability push (2026-07-20): Sentry init for the browser runtime.
// This is imported by instrumentation-client.ts, which is the entry
// point Next.js 16 loads on the client (the modern replacement for the
// old auto-loaded sentry.client.config). Keeping the real init here so
// there is a single, clearly named source of truth.
//
// Session Replay is wired but sampled to zero on baseline sessions —
// we only capture a replay when an error fires (replaysOnErrorSampleRate
// = 1.0). Replays are expensive and pre-launch traffic does not justify
// baseline sampling yet.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  // On the client, non-NEXT_PUBLIC env vars are not inlined into the
  // bundle, so VERCEL_ENV resolves to undefined in the browser. Prefer
  // NEXT_PUBLIC_VERCEL_ENV when the user sets it (see .env.example note),
  // fall back to VERCEL_ENV for parity with the server config, then
  // "development".
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.VERCEL_ENV ??
    "development",

  tracesSampleRate: 0.1,

  // Session Replay: no baseline capture, full capture on error.
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [Sentry.replayIntegration()],
});
