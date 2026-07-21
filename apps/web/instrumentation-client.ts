// apps/web/instrumentation-client.ts
//
// Observability push (2026-07-20): client-side instrumentation entry
// point. Next.js 16 loads this file on the browser before hydration
// (the modern replacement for auto-loading sentry.client.config).
//
// The actual Sentry.init lives in sentry.client.config.ts (imported
// below) so the config keeps its conventional, discoverable name.
// `onRouterTransitionStart` lets Sentry instrument App Router client
// navigations for tracing.

import "./sentry.client.config";
import * as Sentry from "@sentry/nextjs";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
