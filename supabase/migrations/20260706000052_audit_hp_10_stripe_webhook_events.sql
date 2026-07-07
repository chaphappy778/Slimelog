-- 2026-07-06 audit high-priority #10: Stripe webhook has no idempotency
-- table.
--
-- Problem
-- -------
-- Subscription state (subscription_tier, subscription_status, period
-- fields, is_premium) is denormalized onto public.profiles and
-- public.brands. The webhook route processes events straight into
-- those columns with no record of which event_ids have already run.
--
-- Stripe retries webhook delivery on any non-2xx response — and also
-- occasionally delivers the same event more than once for other
-- reasons (network hiccups, at-least-once semantics). Without a
-- dedup layer, a replay of `customer.subscription.updated` between
-- a period-end refresh and a portal-driven cancel could stomp state
-- back to the older values, silently downgrading a paying customer
-- to free or extending an expired sub.
--
-- Fix
-- ---
-- Log every processed event_id in a service-role-only table. The
-- webhook route inserts the row with ON CONFLICT DO NOTHING before
-- running any handler. If the insert affects zero rows, another
-- invocation already claimed this event and we return 200 with a
-- short-circuit — no handler code runs.
--
-- Why insert-first rather than check-then-insert
-- ----------------------------------------------
-- A check-then-insert pattern has a race window where two concurrent
-- webhook deliveries both read "not present" and both process. Postgres
-- PRIMARY KEY conflict on the second insert would tell us afterwards,
-- but the state damage is already done. Insert-first with the primary
-- key on event_id is atomic: exactly one caller wins the insert;
-- everyone else sees affected_rows = 0 and skips processing.
--
-- Retry semantics
-- ---------------
-- If the handler throws after the insert succeeds, we still want
-- Stripe to retry. The webhook route rolls back the insert on error
-- (DELETE by event_id inside the catch) so the next Stripe retry can
-- claim the event fresh. This means the idempotency guarantee is
-- "at most once processed" — a handler failure isn't preserved as a
-- lockout.
--
-- Schema
-- ------
-- event_id      Stripe's evt_* id — PRIMARY KEY does the dedup work.
-- event_type    Denormalized for cheap dashboards / debugging.
-- received_at   For monitoring latency / spotting stalled retries.
-- payload       Optional — full event.data.object as JSONB. Storing
--               it makes it possible to reprocess an event by clearing
--               the row and re-triggering; without it, we'd have to
--               fetch from Stripe. Cheap on disk, high value in a
--               postmortem.
--
-- RLS
-- ---
-- Enabled with no policies. Only service_role (webhook handler,
-- admin scripts) can read/write. authenticated + anon get nothing.

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id     text        PRIMARY KEY,
  event_type   text        NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  payload      jsonb
);

COMMENT ON TABLE public.stripe_webhook_events IS
  'Audit high-priority #10 (2026-07-06). Idempotency log for Stripe '
  'webhook events. Insert-first ON CONFLICT DO NOTHING gives at-most-once '
  'processing; on handler error the row is deleted so Stripe retries '
  'can claim the event fresh.';

CREATE INDEX IF NOT EXISTS stripe_webhook_events_received_at_idx
  ON public.stripe_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS stripe_webhook_events_event_type_idx
  ON public.stripe_webhook_events (event_type);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No SELECT / INSERT / UPDATE / DELETE policies. service_role
-- (the only caller) bypasses RLS by design; authenticated and anon
-- get nothing.
