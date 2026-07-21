// apps/web/components/PostHogProvider.tsx
//
// Observability push (2026-07-20): client-side PostHog wiring.
//
//   * Initializes the browser SDK once from NEXT_PUBLIC_POSTHOG_KEY /
//     NEXT_PUBLIC_POSTHOG_HOST. If the key is unset (local dev without
//     envs), PostHog stays dormant and every capture is a no-op.
//   * Identifies the signed-in user when auth resolves, reusing the
//     shared useAuth() state (no extra getUser / profile round-trip).
//   * Captures $pageview manually on every App Router navigation. The
//     default history-based autocapture misses App Router client
//     transitions, so PostHog's Next.js guidance is to disable it and
//     fire $pageview from a usePathname/useSearchParams effect.
//
// person_profiles: "identified_only" keeps anonymous traffic from
// minting person profiles — cost-conscious for the free tier, and we
// only care about identified funnels pre-launch.

"use client";

import { Suspense, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    // No key locally or in an env-less preview → leave PostHog dormant.
    if (!key || posthog.__loaded) return;

    posthog.init(key, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // We fire $pageview ourselves (see PostHogPageview) so App Router
      // client navigations are tracked. Disable the built-in one to
      // avoid double-counting.
      capture_pageview: false,
      capture_pageleave: true,
      // Don't create person profiles for anonymous visitors — cheaper
      // and keeps the funnels focused on real accounts.
      person_profiles: "identified_only",
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogAuthIdentifier />
      {/* useSearchParams forces a client bailout; isolate it under
          Suspense so it doesn't de-opt the whole tree to CSR. */}
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}

// ── Fire $pageview on every route change ─────────────────────────────
function PostHogPageview() {
  const client = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || !client) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    client.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, client]);

  return null;
}

// ── Identify on login, reset on logout ───────────────────────────────
function PostHogAuthIdentifier() {
  const client = usePostHog();
  const { user, profile, loading } = useAuth();
  // Track the last id we identified so we only reset() on a genuine
  // identified → signed-out transition (avoids churning the anonymous
  // distinct_id for visitors who were never logged in).
  const lastIdentified = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !client) return;

    if (user) {
      if (lastIdentified.current !== user.id) {
        client.identify(user.id, {
          email: user.email,
          username: profile?.username ?? undefined,
          subscription_tier: profile?.subscription_tier ?? undefined,
        });
        lastIdentified.current = user.id;
      }
    } else if (lastIdentified.current !== null) {
      // Was identified, now signed out → detach future events.
      client.reset();
      lastIdentified.current = null;
    }
  }, [user, profile, loading, client]);

  return null;
}
