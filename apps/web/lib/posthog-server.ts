// apps/web/lib/posthog-server.ts
//
// Observability push (2026-07-20): server-side PostHog client for
// capturing events from server actions and API route handlers (events
// the browser can't see, like a Stripe checkout session being created
// or a care check-in landing in the DB).
//
// Usage:
//   import { posthogServer } from "@/lib/posthog-server";
//   posthogServer()?.capture({ distinctId: userId, event: "log_created" });
//
// Notes:
//   * Returns null when NEXT_PUBLIC_POSTHOG_KEY is unset (local dev
//     without envs, or preview builds) so callers no-op cleanly instead
//     of throwing. Every call site uses optional chaining on the result.
//   * posthog-node batches events and flushes on an interval. In a
//     short-lived serverless invocation we can't rely on the timer, so
//     capture sites should `await posthogServer()?.flush()` (or the
//     helper below) before the handler returns, best-effort.
//   * flushAt: 1 makes each capture eligible to send immediately, which
//     matches serverless where the process may freeze right after the
//     response.

import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function posthogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Serverless-friendly: don't sit on events waiting for a batch.
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/**
 * Capture a server-side event and best-effort flush it before the
 * serverless function freezes. Swallows all errors — analytics must
 * never break a user-facing request.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = posthogServer();
  if (!ph) return;
  try {
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch (err) {
    console.warn(`[posthog-server] capture "${event}" failed:`, err);
  }
}
