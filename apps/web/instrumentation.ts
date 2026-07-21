// apps/web/instrumentation.ts
//
// Observability push (2026-07-20): Next.js instrumentation hook. The
// `register()` function runs once when the server starts and pulls in
// the correct Sentry init for whichever runtime is booting (Node.js vs
// Edge). `onRequestError` forwards errors thrown from server components,
// route handlers, and middleware to Sentry automatically — the catch
// blocks we add in server actions / API routes are for errors that get
// SWALLOWED into result unions or JSON responses (which onRequestError
// never sees because they are never thrown).

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
