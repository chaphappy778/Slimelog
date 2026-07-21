// apps/web/sentry.edge.config.ts
//
// Observability push (2026-07-20): Sentry init for the Edge runtime
// (middleware and any route handlers marked `runtime = "edge"`).
// Loaded by instrumentation.ts via the Next.js `register()` hook.
//
// Same shape as sentry.server.config.ts — the Edge runtime is a
// separate V8 isolate and needs its own init call.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  environment: process.env.VERCEL_ENV ?? "development",

  tracesSampleRate: 0.1,
});
