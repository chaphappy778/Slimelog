-- 2026-07-10: add marketing consent tracking to profiles.
--
-- Context
-- -------
-- Waitlist path (public.waitlist) has captured marketing_consent since
-- mig 20260331000000. Direct signup path (via /signup → Supabase auth
-- → auth.users → profiles) has NOT — profiles has no column for it.
-- Result: anyone who bypasses the waitlist and signs up directly has
-- no consent record. When the waitlist gate opens post-launch and
-- direct signups become the primary onboarding path, this becomes a
-- GDPR/CCPA compliance gap.
--
-- Fix
-- ---
-- Add two columns to profiles:
--
--   marketing_consent      boolean NOT NULL DEFAULT false
--     Explicit opt-in. Default false satisfies GDPR "opt-in by
--     affirmative action" — a fresh signup starts unsubscribed until
--     they actively check the box.
--
--   marketing_consented_at timestamptz NULL
--     Audit trail proving when the user granted consent. Regulators
--     may ask for evidence of when + how consent was collected. Set
--     to NOW() by app code when marketing_consent flips from false
--     to true; left as-is when the user withdraws (preserves the
--     original grant time in case of later dispute).
--
-- The audit trail is more valuable than a boolean alone: a user who
-- withdraws consent has a record showing they DID grant it at some
-- point, which is important if there's ever a dispute about spam
-- complaints ("but I never signed up for anything").
--
-- Enforcement
-- -----------
-- No RLS changes required — profiles' existing "Users can update
-- their own profile" policy lets the user toggle their own consent
-- via a settings page. The HP-8 protect-billing-columns trigger
-- deliberately does NOT include marketing_consent in its protected
-- list because it's user-configurable by design.
--
-- Backfill
-- --------
-- Existing profiles remain at default false. If we want to bring
-- forward the consent from any waitlist rows that later became
-- profiles, that's a separate one-time job (join on lower(email)) and
-- should happen after we've verified the schema and the settings
-- toggle are working.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consented_at timestamptz;

COMMENT ON COLUMN public.profiles.marketing_consent IS
  'Explicit opt-in for promotional email (drop announcements, brand '
  'launches, product updates). GDPR/CCPA compliant: default false, '
  'set true only by the user affirmative action on signup or in '
  'settings. Transactional email (password reset, receipts, brand '
  'claim notices) does NOT check this flag.';

COMMENT ON COLUMN public.profiles.marketing_consented_at IS
  'Timestamp of the original consent grant. Set to NOW() when '
  'marketing_consent flips false -> true. Preserved on withdrawal '
  'as audit trail. Regulators may ask for evidence of when + how '
  'consent was collected.';

-- Convenience index for future queries filtering "who to email"
-- lists. Partial index because we only ever query for `= true`.
CREATE INDEX IF NOT EXISTS profiles_marketing_consent_idx
  ON public.profiles (id)
  WHERE marketing_consent = true;
