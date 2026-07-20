-- 20260720000083_care_action_dedupe.sql
--
-- T125 follow-up — server-side dedupe for care action check-ins.
--
-- Bug: CareCheckinModal pre-seeds its pill selections from the last
-- 24h of check-ins (so reopening the modal shows what you already
-- did). markLogChecked then inserted every selected pill
-- unconditionally, so reopening the modal and adding ONE new product
-- re-inserted all the pre-checked ones alongside it. Result: inflated
-- actions_this_month, duplicate tiles on /care, corrupted history.
--
-- Fix: make the database the source of truth for "is this a
-- duplicate" via a unique index, and let markLogChecked upsert with
-- ON CONFLICT DO NOTHING.
--
-- ── Why hour granularity ────────────────────────────────────────────
--
-- Identical (user, log, action_type, product) inside the same hour is
-- effectively always the pre-seeding artifact. Across hours it's
-- legitimate: a user genuinely can add contact solution in the
-- morning and again at night. One hour is short enough to catch every
-- real dupe and long enough to permit intentional repeat logging.
--
-- ── Why a generated column instead of an expression index ───────────
--
-- Two constraints force this shape:
--
--   1. `date_trunc('hour', <timestamptz>)` is STABLE, not IMMUTABLE
--      (its result depends on the session TimeZone setting), so
--      Postgres REJECTS it directly in an index expression. Pinning
--      the zone with `AT TIME ZONE 'UTC'` yields
--      `date_trunc(text, timestamp)`, which IS immutable.
--
--   2. PostgREST's `on_conflict` parameter accepts a comma-separated
--      COLUMN LIST only. It cannot reference an index expression, so
--      an expression index would be uninferrable from supabase-js and
--      the upsert would fail with "no unique or exclusion constraint
--      matching the ON CONFLICT specification".
--
-- A STORED generated column satisfies both: it's a real column
-- PostgREST can name, and the immutability requirement is met by the
-- explicit UTC pin.
--
-- ── Why NOT a partial index ─────────────────────────────────────────
--
-- A partial unique index is only inferrable if the ON CONFLICT clause
-- repeats the index predicate, which PostgREST cannot emit. So this
-- index is unconditional.
--
-- !! READ THIS BEFORE CHANGING THE INDEX !!
-- Postgres unique indexes are NULLS DISTINCT by default, meaning two
-- rows with product_key = NULL never conflict with each other. That
-- is DELIBERATE here: a quick category re-log from the /care "Recent
-- care" strip writes product_key = NULL and must always be allowed
-- through. If you ever add NULLS NOT DISTINCT to this index you will
-- silently break quick re-logging.

BEGIN;

-- ─── Section 1. Clear pre-existing duplicates ────────────────────────
--
-- The bug has been live, so real duplicate rows exist. CREATE UNIQUE
-- INDEX would fail against them. Keep the earliest row in each
-- (user, log, action_type, product, hour) group and drop the rest.
-- Rows with product_key IS NULL are untouched — they are never
-- considered duplicates (see the NULLS DISTINCT note above).

DELETE FROM public.slime_care_actions a
USING public.slime_care_actions b
WHERE a.product_key IS NOT NULL
  AND b.product_key IS NOT NULL
  AND a.user_id     = b.user_id
  AND a.log_id      = b.log_id
  AND a.action_type = b.action_type
  AND a.product_key = b.product_key
  AND date_trunc('hour', a.performed_at AT TIME ZONE 'UTC')
    = date_trunc('hour', b.performed_at AT TIME ZONE 'UTC')
  AND a.performed_at > b.performed_at;

-- Tie-break for rows that landed on the identical timestamp (the
-- exact pre-seeding case: one markLogChecked call stamps every row
-- with the same nowIso). The clause above can't separate those, so
-- fall back to keeping the lowest id.
DELETE FROM public.slime_care_actions a
USING public.slime_care_actions b
WHERE a.product_key IS NOT NULL
  AND b.product_key IS NOT NULL
  AND a.user_id      = b.user_id
  AND a.log_id       = b.log_id
  AND a.action_type  = b.action_type
  AND a.product_key  = b.product_key
  AND a.performed_at = b.performed_at
  AND a.id > b.id;

-- ─── Section 2. Hour bucket as a generated column ────────────────────

ALTER TABLE public.slime_care_actions
  ADD COLUMN IF NOT EXISTS performed_hour timestamp
  GENERATED ALWAYS AS (
    date_trunc('hour', performed_at AT TIME ZONE 'UTC')
  ) STORED;

COMMENT ON COLUMN public.slime_care_actions.performed_hour IS
  'UTC hour bucket of performed_at. Exists purely so the dedupe unique index has a nameable column for PostgREST on_conflict. Never write to this directly, it is GENERATED ALWAYS.';

-- ─── Section 3. The dedupe index ─────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS slime_care_actions_hourly_dedupe_idx
  ON public.slime_care_actions
  (user_id, log_id, action_type, product_key, performed_hour);

COMMENT ON INDEX public.slime_care_actions_hourly_dedupe_idx IS
  'Collapses identical care actions logged within the same UTC hour, which is the CareCheckinModal 24h pre-seeding artifact. markLogChecked upserts against this with ON CONFLICT DO NOTHING. NULLS DISTINCT (the default) is intentional: product_key = NULL quick re-logs always insert.';

COMMIT;
