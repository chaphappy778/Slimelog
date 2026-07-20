-- 20260720000081_t125_aging_reminders.sql
--
-- T125 aging reminders + shelf-state tracking.
--
-- Ships four things:
--   1. `shelf_state` enum on collection_logs (on_shelf | for_sale | archived)
--   2. Aging state columns on collection_logs (aging_enabled, aging_interval_days,
--      last_checked_at, aging_state)
--   3. `base_type_activator_defaults` table — per-base-type default check-in
--      windows. Seed data included; Jenn adjusts as community data lands.
--   4. `aging_notifications_sent` table — dedupe log so the nightly cron
--      doesn't spam users with duplicate in-app notifications.
--
-- Aging reminders ONLY fire when shelf_state = 'on_shelf'. Archived and
-- for-sale slimes are excluded — reminders on slimes users no longer own
-- erode trust. Plus for-sale slimes tie into the future marketplace
-- flow, and archived slimes are historical records.
--
-- No new notification_type enum values needed today — we're reusing the
-- existing infra via a new `slime_needs_attention` enum value added below.
--
-- Backfill strategy: all existing collection_logs → shelf_state='on_shelf',
-- aging_enabled=true, aging_state='fresh', last_checked_at=created_at.
-- Users can bulk-archive from /collection in their own time. No made-up
-- historical data.

BEGIN;

-- ─── Section 1. Shelf state enum + column ──────────────────────────────

CREATE TYPE public.shelf_state AS ENUM (
  'on_shelf',    -- default; actively owned, in rotation, gets aging reminders
  'for_sale',    -- owned but listed (marketplace tie-in; green pill on feed)
  'archived'     -- no longer owned; kept as historical record, no reminders
);

ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS shelf_state public.shelf_state
    NOT NULL DEFAULT 'on_shelf';

COMMENT ON COLUMN public.collection_logs.shelf_state IS
  'Where this slime lives: on_shelf (default, active), for_sale (marketplace-ready), or archived (record-keeping only). Aging reminders only fire when on_shelf.';

-- Index for the aging-cron filter path. Partial index — the cron only
-- ever needs to scan on_shelf rows, and this is the far-and-away
-- most-common shelf state, so a partial index keeps write costs low
-- for the storage side.
CREATE INDEX IF NOT EXISTS collection_logs_aging_scan_idx
  ON public.collection_logs (user_id, last_checked_at)
  WHERE shelf_state = 'on_shelf' AND aging_enabled = true;

-- ─── Section 2. Aging state columns on collection_logs ────────────────

-- Was the reminder feature enabled for this specific log? Users can
-- opt out per-log via the aging view or slime detail. Global toggle
-- (all-off across a user's shelf) lives on `profiles.aging_reminders_enabled`
-- below.
ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS aging_enabled boolean NOT NULL DEFAULT true;

-- Days between check-ins. NULL means "use the base-type default from
-- base_type_activator_defaults." A per-log override supports the
-- scenario where a user knows their Aloe Nightmares butter goes longer
-- than the community default.
ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS aging_interval_days integer;

-- When was this log last "checked" (i.e., user tapped "Mark as checked"
-- from the aging view). NULL means never checked — reminder computation
-- falls back to created_at.
ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

-- Current aging state, maintained by the nightly cron. `fresh` is the
-- default; `warning` fires ~5 days before overdue; `overdue` when past
-- the interval. The three states drive UI (color, section grouping,
-- notification triggers).
CREATE TYPE public.aging_state AS ENUM (
  'fresh',
  'warning',
  'overdue'
);

ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS aging_state public.aging_state
    NOT NULL DEFAULT 'fresh';

CREATE INDEX IF NOT EXISTS collection_logs_aging_state_idx
  ON public.collection_logs (user_id, aging_state)
  WHERE shelf_state = 'on_shelf' AND aging_enabled = true;

-- Backfill: all existing logs get last_checked_at = created_at so the
-- interval computation has a real anchor. We're not inventing check-in
-- data — this just means "consider this log to have been last handled
-- when it was created" which is honest.
UPDATE public.collection_logs
SET last_checked_at = created_at
WHERE last_checked_at IS NULL;

-- ─── Section 3. Profile-level opt-out toggle ──────────────────────────

-- Global aging reminders toggle. Default ON per Jenn's opt-out design.
-- Lives in Settings → notifications section.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS aging_reminders_enabled boolean
    NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.aging_reminders_enabled IS
  'Global toggle for aging reminders on this profile. When false, cron skips this user entirely (regardless of per-log aging_enabled). Default true.';

-- ─── Section 4. base_type_activator_defaults + seed data ──────────────

CREATE TABLE public.base_type_activator_defaults (
  base_type              public.slime_base_type PRIMARY KEY,
  default_interval_days  integer NOT NULL,
  updated_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at             timestamptz NOT NULL DEFAULT now(),
  notes                  text
);

COMMENT ON TABLE public.base_type_activator_defaults IS
  'Per-base-type default check-in intervals (days). Users can override per-log via collection_logs.aging_interval_days. Jenn adjusts these as community data lands.';

-- Seed data — Claude's initial guesses per user 2026-07-20. All
-- intervals in DAYS. Jenn revises based on real community aging data
-- once the feature has been live long enough to produce medians.
--
-- Rationale (rough):
--   - Butter slime dries out fastest — 30 days
--   - Cloud + cloud-adjacent (snowbutter) hold up 45-60 days
--   - Floam is durable — 60 days
--   - Glossy/thick-glossy break down in ~35-40
--   - Jelly stays wet longer — 50
--   - Clear slime is the longest-living — 90
--   - Ice/snow-fizz are one-time-play textures, log as archived
--     probably — but if kept fresh, 30 days
--   - Magnetic and DIY are novelty categories — 45 days default
--
-- If your app doesn't have a base_type value in this table, the cron
-- falls back to a hard-coded 45-day default (see the get_aging_interval
-- function below).
INSERT INTO public.base_type_activator_defaults (base_type, default_interval_days, notes) VALUES
  ('avalanche',            45,  'Novelty base type — placeholder default.'),
  ('basic',                45,  'Generic base — 45-day sane default.'),
  ('beaded',               60,  'Bead-augmented body holds structure ~2 months.'),
  ('butter',               30,  'Butter slime firms up fastest without activator top-up.'),
  ('clear',                90,  'Longest-living slime, largely inert until dried out.'),
  ('cloud',                45,  'Cloud slimes stay fluffy ~6 weeks.'),
  ('floam',                60,  'Foam beads keep texture stable ~2 months.'),
  ('fluffy',               45,  'Similar aging profile to cloud.'),
  ('hybrid',               45,  'Mixed-type — split-the-difference default.'),
  ('icee',                 30,  'Instant-snow textures need frequent hydration.'),
  ('jelly',                50,  'Wet base holds up longer than most.'),
  ('magnetic',             45,  'Iron oxide adds no aging effect — texture default.'),
  ('sand',                 45,  'Sand adds body; texture default.'),
  ('slay',                 45,  'Novelty base — placeholder default.'),
  ('snow_fizz',            30,  'One-time-play unless refreshed frequently.'),
  ('snowbutter',           45,  'Butter-cloud hybrid — cloud-side aging profile.'),
  ('sugar_scrub',          30,  'Delicate texture — needs check-ins.'),
  ('thick_and_glossy',     35,  'Denser than glossy, dries a touch faster.'),
  ('water',                60,  'Wettest base type — holds up longer.'),
  ('wax_and_wax_cracking', 45,  'Wax hybrid — placeholder default.')
ON CONFLICT (base_type) DO NOTHING;

-- ─── Section 5. Notification dedupe log ───────────────────────────────

CREATE TABLE public.aging_notifications_sent (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  logs_flagged  integer NOT NULL,   -- how many logs were overdue+warning at send
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL
);

CREATE INDEX aging_notifications_sent_user_recent_idx
  ON public.aging_notifications_sent (user_id, sent_at DESC);

COMMENT ON TABLE public.aging_notifications_sent IS
  'Dedupe log for the nightly aging-reminders cron. One row per user per day at most; the cron checks the latest row and skips a fresh send if it already fired within the last 20 hours.';

-- ─── Section 6. Notification type enum value ──────────────────────────

ALTER TYPE public.notification_type
  ADD VALUE IF NOT EXISTS 'slime_needs_attention';

-- ─── Section 7. Helper: resolve the effective aging interval ──────────

-- Returns the interval that applies to a specific log — the per-log
-- override if set, else the base-type default, else a hard-coded 45
-- days for base types not yet in the defaults table.
CREATE OR REPLACE FUNCTION public.get_effective_aging_interval(log_row public.collection_logs)
RETURNS integer
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  default_days integer;
BEGIN
  IF log_row.aging_interval_days IS NOT NULL THEN
    RETURN log_row.aging_interval_days;
  END IF;

  SELECT default_interval_days INTO default_days
  FROM public.base_type_activator_defaults
  WHERE base_type = log_row.base_type;

  RETURN COALESCE(default_days, 45);
END
$$;

COMMENT ON FUNCTION public.get_effective_aging_interval(public.collection_logs) IS
  'Resolves the aging interval that applies to a log: per-log override → base-type default → hard-coded 45-day fallback.';

-- ─── Section 8. RLS on new tables ─────────────────────────────────────

-- base_type_activator_defaults: publicly readable (defaults inform UI),
-- writable only by service_role (Jenn adjusts via SQL editor or
-- future admin UI).
ALTER TABLE public.base_type_activator_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activator defaults are public"
  ON public.base_type_activator_defaults FOR SELECT USING (true);

-- No INSERT/UPDATE policy → only service_role can modify. Matches the
-- seed_follow_accounts pattern in mig 71.

-- aging_notifications_sent: users can read their own entries (for
-- debugging + settings display). Only service_role can INSERT (the cron
-- runs with service_role).
ALTER TABLE public.aging_notifications_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own aging notification history"
  ON public.aging_notifications_sent FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT policy → only service_role.

COMMIT;
