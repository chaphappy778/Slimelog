-- 2026-07-06 audit high-priority #14: no rate limits on
-- Resend/Brevo-backed endpoints.
--
-- Problem
-- -------
--   /api/report          — fires a Resend email per call. Attacker-
--                          controlled `details` embedded in the mail
--                          body (report/route.ts line 100). Perfect
--                          spam-relay: attacker POSTs 10k reports
--                          from a scripted client, each generating a
--                          Resend send to support@slimelog.com.
--   /api/waitlist        — POSTs to Brevo per signup. Provider quotas
--                          exist (Brevo has monthly-send caps); a
--                          scripted flood exhausts them and blocks
--                          legit signups until the quota resets.
--   /api/brand-claims/
--     verify-email       — sends TWO Resend emails per success
--                          (claimant confirmation + admin
--                          notification). Even a modest loop is
--                          disproportionately expensive.
--
-- Fix
-- ---
-- Fixed-window counter table with an atomic increment function. Each
-- endpoint bumps a per-(actor, endpoint) counter; if the count for
-- the current window exceeds the endpoint's limit, the endpoint
-- returns 429 with a Retry-After header.
--
-- Fixed-window (not sliding-window) is a deliberate tradeoff: it's
-- less precise at the window boundary (an attacker can double their
-- effective rate by spraying at :59:59 and :00:00), but it's O(1) in
-- storage and CPU. For a personal app pre-launch, boundary imprecision
-- is not the failure mode — the failure mode is provider quota
-- burnout, and a fixed window blocks the 10k-call bursts that matter.
--
-- Table shape
-- -----------
--   bucket_key    Composite string like "report:user:<uuid>" or
--                 "waitlist:ip:1.2.3.4" — chosen by each caller.
--   bucket_start  Unix-aligned window start (e.g. floor(now/3600)*3600).
--                 Composite PK with bucket_key gives fast upsert.
--   count         Increment target.
--
-- Cleanup
-- -------
-- Old rows accumulate. A DELETE query trimming buckets older than
-- 7 days can run periodically (cron, or piggyback on any admin call).
-- Not building automated cleanup now — the table is tiny and disk
-- growth is < 1MB/month at expected traffic. Revisit if we scale.
--
-- Function
-- --------
-- rate_limit_increment(key, bucket_start) does the upsert-with-
-- increment atomically in one round trip and returns the new count.
-- SECURITY DEFINER so RLS doesn't complicate the callable surface;
-- EXECUTE granted to service_role only.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key   text        NOT NULL,
  bucket_start timestamptz NOT NULL,
  count        int         NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket_key, bucket_start)
);

COMMENT ON TABLE public.rate_limits IS
  'Audit high-priority #14 (2026-07-06). Fixed-window counter table '
  'for rate limits. Rows are upserted via rate_limit_increment(). Old '
  'buckets accumulate — trim periodically once traffic warrants.';

CREATE INDEX IF NOT EXISTS rate_limits_bucket_start_idx
  ON public.rate_limits (bucket_start);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies. Only service_role reaches this table (via the RPC below
-- or direct queries from the admin client).

-- ---------------------------------------------------------------------------
-- Atomic increment: upsert with count+1 on conflict, return the new count.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rate_limit_increment(
  p_bucket_key text,
  p_bucket_start timestamptz
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  INSERT INTO public.rate_limits (bucket_key, bucket_start, count)
  VALUES (p_bucket_key, p_bucket_start, 1)
  ON CONFLICT (bucket_key, bucket_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.rate_limit_increment(text, timestamptz) IS
  'Audit high-priority #14 (2026-07-06). Atomic upsert-with-increment '
  'for the rate_limits table. Called from lib/rate-limit.ts.';

-- Lock down the callable surface: only service_role executes.
REVOKE ALL ON FUNCTION public.rate_limit_increment(text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rate_limit_increment(text, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_increment(text, timestamptz) TO service_role;
