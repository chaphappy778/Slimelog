// apps/web/sentry.server.config.ts
//
// Observability push (2026-07-20): Sentry init for the Node.js server
// runtime (server components, server actions, route handlers). Loaded
// by instrumentation.ts via the Next.js `register()` hook.
//
// DSN + environment come from env vars — never hardcode. `enabled`
// gates on production so local dev doesn't spam the Sentry project.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only report from real deploys. NODE_ENV is "production" on Vercel
  // builds and "development" for `next dev`, so local runs stay quiet.
  enabled: process.env.NODE_ENV === "production",

  // Vercel sets VERCEL_ENV to "production" | "preview" | "development".
  // Falls back to "development" for local / non-Vercel runs.
  environment: process.env.VERCEL_ENV ?? "development",

  // 10% of transactions — cost-conscious for pre-launch traffic. Bump
  // once we have volume and want deeper performance sampling.
  tracesSampleRate: 0.1,

  // Keep the default integrations; we tune scrubbing later.
});
