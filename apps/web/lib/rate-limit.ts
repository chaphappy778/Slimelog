// apps/web/lib/rate-limit.ts
//
// Audit high-priority #14 (2026-07-06). Fixed-window rate limiter
// backed by the public.rate_limits table and the
// rate_limit_increment() RPC (migration 20260706000056).
//
// Design notes
// ------------
// - Fixed window, not sliding window. Boundary imprecision (an
//   attacker can effectively double their rate at :59:59 / :00:00)
//   is not the failure mode we care about — provider quota burnout
//   from 10k-call bursts is, and a fixed window blocks those.
// - Fail open. If the RPC errors (network blip, DB down, etc.) we
//   let the request through and log. Rate limiting is defense in
//   depth; downtime shouldn't lock users out of the app.
// - Bucket keys are opaque strings chosen by the caller. Convention:
//   "<endpoint>:<actor-type>:<actor-id>", e.g. "report:user:<uuid>"
//   or "waitlist:ip:1.2.3.4".
//
// Usage
// -----
//   import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
//
//   const ip = getClientIp(req);
//   const { allowed, retryAfterSeconds } = await checkRateLimit({
//     key: `waitlist:ip:${ip}`,
//     limit: 10,
//     windowSeconds: 3600,
//   });
//   if (!allowed) {
//     return NextResponse.json(
//       { error: "Too many requests" },
//       { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
//     );
//   }

import { createClient } from "@supabase/supabase-js";

interface CheckArgs {
  key: string;
  limit: number;
  windowSeconds: number;
}

interface CheckResult {
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "checkRateLimit: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
    );
  }
  cachedClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

export async function checkRateLimit(args: CheckArgs): Promise<CheckResult> {
  const { key, limit, windowSeconds } = args;

  // Bucket start: aligned Unix-second boundary of the current window.
  const nowSeconds = Math.floor(Date.now() / 1000);
  const bucketStartSeconds =
    Math.floor(nowSeconds / windowSeconds) * windowSeconds;
  const bucketStartIso = new Date(bucketStartSeconds * 1000).toISOString();
  const retryAfterSeconds = bucketStartSeconds + windowSeconds - nowSeconds;

  try {
    const admin = getAdminClient();
    const { data, error } = await admin.rpc("rate_limit_increment", {
      p_bucket_key: key,
      p_bucket_start: bucketStartIso,
    });

    if (error) {
      // Fail open with a log line — never lock users out due to
      // rate-limit-store outages.
      console.error("[rate-limit] RPC error, failing open:", error.message);
      return { allowed: true, count: 0, retryAfterSeconds: 0 };
    }

    const count = typeof data === "number" ? data : 0;
    const allowed = count <= limit;
    return {
      allowed,
      count,
      retryAfterSeconds: allowed ? 0 : retryAfterSeconds,
    };
  } catch (err) {
    console.error("[rate-limit] unexpected error, failing open:", err);
    return { allowed: true, count: 0, retryAfterSeconds: 0 };
  }
}

// ---------------------------------------------------------------------------
// getClientIp — extract the caller IP from Vercel-forwarded headers.
// ---------------------------------------------------------------------------
//
// Vercel sets x-forwarded-for as a comma-separated list, leftmost being
// the original client. Fall back to x-real-ip. Never trust the raw
// TCP peer — Vercel's edge is always the direct peer.

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
