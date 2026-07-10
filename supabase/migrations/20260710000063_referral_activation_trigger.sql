-- 2026-07-10: referral activation trigger + milestone rewards.
--
-- Context
-- -------
-- Migration 62 laid down the referral schema (referral_code, referred_by_user_id,
-- referral_activations, pro_credit_months) and the ?ref= capture at signup.
-- Referred_by_user_id is now populated at signup time, but no code path
-- was bumping referral_activations or granting rewards. This migration
-- closes the loop.
--
-- Activation definition (per user decision Q1-A on 2026-07-10)
-- ----------------------------------------------------------
--   Email verified + logged first slime.
--
-- Email verification is already gated by auth flow — a user cannot INSERT
-- into collection_logs (RLS) without an authenticated session, and the
-- session only exists post-verification. So detecting "first collection
-- log INSERT for this user" is a sufficient proxy for the compound rule.
--
-- Idempotency
-- -----------
-- We only want to fire activation exactly once per referred user. If the
-- user deletes their first slime and re-adds a new one, we do NOT re-fire.
-- This is enforced by a new boolean column profiles.referral_activation_fired
-- that flips from false to true on the first successful activation.
--
-- Milestones (per user decision Q2-A on 2026-07-10)
-- -------------------------------------------------
--   5 activated referrals   -> +1  month pro_credit_months
--   25 activated referrals  -> +6  months pro_credit_months
--   100 activated referrals -> +12 months pro_credit_months
--
-- Credit stacks additively — a user who reaches 100 across their lifetime
-- has banked 1 + 6 + 12 = 19 months of Pro credit. Consumption logic
-- (subscription resolver reading from pro_credit_months) ships separately.
--
-- Security context
-- ----------------
-- The trigger fires on INSERT into collection_logs, which is called by
-- the referred user in an 'authenticated' session. It then UPDATEs a
-- different user's profile (the referrer's) to bump referral_activations
-- and pro_credit_months. Both of those columns are locked by the HP-8
-- protect_billing_columns trigger against authenticated/anon writes.
--
-- We use SECURITY DEFINER so this function runs as postgres. Inside the
-- function, current_user = 'postgres', which triggers the HP-8 bypass
-- ("NOT IN ('authenticated', 'anon')") — so the referrer's protected
-- columns can be updated.
--
-- Note: this is exactly the SECURITY DEFINER usage that mig 59 warned
-- against for the HP-8 trigger itself, but it's correct here for the
-- opposite reason — we WANT current_user to differ from the caller so
-- the bypass fires.

-- ─── 1. Idempotency flag ─────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_activation_fired boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.referral_activation_fired IS
  'Set to true when this user has triggered a referral activation event '
  '(first collection log). Prevents re-firing on subsequent logs, and '
  'also prevents re-firing if the user deletes and re-adds their first '
  'slime. Locked against authenticated writes by the HP-8 trigger.';

-- ─── 2. Extend HP-8 to protect the new column ────────────────────────────────

CREATE OR REPLACE FUNCTION public.profiles_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Billing/trust columns (audit HP-8)
  NEW.is_premium                        := OLD.is_premium;
  NEW.is_verified                       := OLD.is_verified;
  NEW.stripe_customer_id                := OLD.stripe_customer_id;
  NEW.subscription_tier                 := OLD.subscription_tier;
  NEW.subscription_status               := OLD.subscription_status;
  NEW.subscription_current_period_end   := OLD.subscription_current_period_end;
  NEW.subscription_cancel_at_period_end := OLD.subscription_cancel_at_period_end;

  -- Admin role (audit HP-9)
  NEW.role := OLD.role;

  -- Referral program columns (mig 62 / issue #5+#30)
  NEW.referral_code             := OLD.referral_code;
  NEW.referred_by_user_id       := OLD.referred_by_user_id;
  NEW.referral_activations      := OLD.referral_activations;
  NEW.pro_credit_months         := OLD.pro_credit_months;
  -- Idempotency flag (mig 63)
  NEW.referral_activation_fired := OLD.referral_activation_fired;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_billing_columns() IS
  'Audit HP-8/#9 (mig 50/51/59) + referral schema (mig 62) + activation '
  'flag (mig 63). Reverts unauthorized changes to billing/trust/referral '
  'columns. Bypasses when called by any role other than authenticated/anon.';

-- ─── 3. Activation function ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.apply_referral_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- see header note; required to bypass HP-8 for the referrer update
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_profile        RECORD;
  v_new_activation_ct   int;
  v_credit_award        int := 0;
BEGIN
  -- Load the acting user's referral state.
  SELECT referred_by_user_id, referral_activation_fired
    INTO v_user_profile
    FROM public.profiles
    WHERE id = NEW.user_id;

  -- Already fired for this user; nothing to do.
  IF v_user_profile.referral_activation_fired THEN
    RETURN NEW;
  END IF;

  -- Flip the flag regardless of whether there's a referrer. This makes
  -- sure organic (non-referred) users still get marked as "activation
  -- checked" so we don't re-scan their profile on every subsequent log.
  UPDATE public.profiles
    SET referral_activation_fired = true
    WHERE id = NEW.user_id;

  -- No referrer -> we're done.
  IF v_user_profile.referred_by_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bump the referrer's activation count.
  UPDATE public.profiles
    SET referral_activations = referral_activations + 1
    WHERE id = v_user_profile.referred_by_user_id
    RETURNING referral_activations INTO v_new_activation_ct;

  -- Milestone rewards. Additive, not exclusive: hitting 100 across a
  -- lifetime yields 1 + 6 + 12 = 19 banked Pro months.
  IF v_new_activation_ct = 5 THEN
    v_credit_award := 1;
  ELSIF v_new_activation_ct = 25 THEN
    v_credit_award := 6;
  ELSIF v_new_activation_ct = 100 THEN
    v_credit_award := 12;
  END IF;

  IF v_credit_award > 0 THEN
    UPDATE public.profiles
      SET pro_credit_months = pro_credit_months + v_credit_award
      WHERE id = v_user_profile.referred_by_user_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_referral_activation IS
  'Fires on first collection_logs INSERT per user. Marks the user as '
  'activated, bumps referrer.referral_activations, and grants milestone '
  'Pro credit at 5/25/100. SECURITY DEFINER so the writes to the '
  'referrer''s protected columns bypass HP-8.';

-- ─── 4. Trigger on collection_logs ──────────────────────────────────────────

DROP TRIGGER IF EXISTS collection_logs_after_insert_apply_referral
  ON public.collection_logs;

CREATE TRIGGER collection_logs_after_insert_apply_referral
  AFTER INSERT ON public.collection_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_referral_activation();

-- ─── 5. Backfill existing users to prevent retroactive milestone firing ─────
--
-- Every existing profile has referral_activation_fired = false by default.
-- Left as-is, the first collection_logs INSERT by any existing user would
-- fire activation — potentially retroactively crediting referrers who
-- referred them before this system existed (referred_by_user_id is null
-- for them, so the referrer branch is a no-op — but the flag would still
-- flip). That's harmless but noisy.
--
-- Backfill: if a user already has any collection_logs rows, mark them as
-- already-activated so the trigger no-ops on their next log too. Users
-- who signed up through the fixed referral flow (chaptest23 onward) with
-- zero logs yet remain at false so their next log fires activation
-- correctly.

UPDATE public.profiles p
  SET referral_activation_fired = true
  WHERE EXISTS (
    SELECT 1 FROM public.collection_logs c WHERE c.user_id = p.id
  );
