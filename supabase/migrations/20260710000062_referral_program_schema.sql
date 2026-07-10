-- 2026-07-10: referral program schema (issue #5 + #30 combined).
--
-- Context
-- -------
-- Every SlimeLog user gets a unique 6-character referral code they can
-- share. When a new user signs up with a code, we record the referrer.
-- When the referred user *activates* (email verified + logs their first
-- slime), the referrer gets credit toward milestone rewards:
--
--   5  activated referrals  ->  1 month  free Pro
--   25 activated referrals  ->  6 months free Pro
--   100 activated referrals ->  12 months free Pro
--
-- This migration lays down the schema. Application logic (activation
-- trigger, milestone check, ?ref= capture, share UX) ships in later steps.
--
-- Columns added to public.profiles
-- --------------------------------
--   referral_code           text unique NOT NULL
--     6 characters from a 32-char alphabet (no 0/O/1/I/L to avoid
--     misreads when spoken or hand-copied). ~1B combinations — collision
--     risk is negligible for launch-scale user counts, but the generator
--     retries on collision anyway.
--
--   referred_by_user_id     uuid references profiles(id)
--     Set at signup if the user came in with a valid ?ref=. Nullable
--     because most users arrive organically. Immutable in application
--     code once set; DB doesn't enforce that (a trigger would be more
--     ceremony than value).
--
--   referral_activations    int NOT NULL default 0
--     Cached count of referrals that have reached activation. Kept in
--     sync by a trigger on profile updates (activation event). Avoids
--     scanning the whole referred_by index every time we check for a
--     milestone.
--
--   pro_credit_months       int NOT NULL default 0
--     Banked Pro months granted by hitting milestones. The subscription
--     resolver (step 3) treats a user with credit > 0 as Pro when they
--     don't have an active Stripe sub. Stacks independently of Stripe —
--     credit kicks in only when paid Pro wouldn't otherwise cover.
--
-- Constraints
-- -----------
--   * unique(referral_code)
--   * check(referral_code ~ '^[A-Z0-9]{6}$') — enforces shape at DB level
--     so bad values can never land (defense in depth vs. the generator).
--   * check(referred_by_user_id != id) — no self-referral, obvious.
--   * check(referral_activations >= 0)
--   * check(pro_credit_months >= 0)
--
-- Generator function
-- ------------------
--   public.generate_referral_code() returns text
--     Loops until it produces a code that doesn't collide with an existing
--     row. Charset: 23456789ABCDEFGHJKMNPQRSTUVWXYZ (32 chars, no
--     ambiguous). Uses built-in random() for entropy — not cryptographic,
--     but 32^6 (~1B) combos + retry-on-collision means predictability isn't
--     the risk here (a referral code isn't a secret). If we ever need
--     hardened generation we can swap in gen_random_bytes after ensuring
--     pgcrypto is enabled and qualified with its schema.
--
-- Trigger
-- -------
--   profiles_before_insert_referral_code
--     BEFORE INSERT on profiles. Sets referral_code = generate_referral_code()
--     when NEW.referral_code is null. Handles both direct inserts and
--     any signup path (email, OAuth, admin) without app code changes.
--
-- Backfill
-- --------
-- Every existing profile gets a fresh code in an UPDATE at the end of this
-- migration. Loop is safe because generate_referral_code() retries on
-- collision. We flip referral_code to NOT NULL only after backfill.

-- ─── 1. Add columns (nullable initially so backfill can populate) ────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS referred_by_user_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS referral_activations int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_credit_months int NOT NULL DEFAULT 0;

-- ─── 2. Generator function ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  charset   constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code      text;
  i         int;
  idx       int;
  exists_ct int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      -- random() returns a double in [0, 1). Multiply by charset length
      -- and floor to get an integer index in [0, 31]. Referral codes
      -- aren't secrets, so non-crypto entropy is fine; collisions are
      -- handled by the outer loop's unique check.
      idx := floor(random() * length(charset))::int;
      code := code || substring(charset FROM idx + 1 FOR 1);
    END LOOP;

    SELECT count(*) INTO exists_ct
      FROM public.profiles
      WHERE referral_code = code;

    EXIT WHEN exists_ct = 0;
  END LOOP;

  RETURN code;
END;
$$;

COMMENT ON FUNCTION public.generate_referral_code IS
  'Generates a unique 6-char referral code from a 32-char alphabet with '
  'no ambiguous glyphs. Retries on collision. Called by the BEFORE INSERT '
  'trigger on profiles, or manually for backfill.';

-- ─── 3. Backfill existing profiles ──────────────────────────────────────────

UPDATE public.profiles
  SET referral_code = public.generate_referral_code()
  WHERE referral_code IS NULL;

-- ─── 4. Now-safe: mark referral_code NOT NULL + unique + shape check ────────

ALTER TABLE public.profiles
  ALTER COLUMN referral_code SET NOT NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referral_code_shape_check
    CHECK (referral_code ~ '^[A-Z0-9]{6}$');

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_no_self_referral_check
    CHECK (referred_by_user_id IS NULL OR referred_by_user_id != id);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_referral_activations_nonneg_check
    CHECK (referral_activations >= 0);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pro_credit_months_nonneg_check
    CHECK (pro_credit_months >= 0);

-- ─── 5. Index for "who did X refer" lookups ─────────────────────────────────

CREATE INDEX IF NOT EXISTS profiles_referred_by_user_id_idx
  ON public.profiles (referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

-- ─── 6. BEFORE INSERT trigger — auto-gen code for new rows ──────────────────

CREATE OR REPLACE FUNCTION public.set_referral_code_on_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_before_insert_referral_code ON public.profiles;

CREATE TRIGGER profiles_before_insert_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_referral_code_on_insert();

-- ─── 7. Extend HP-8 billing-column protection to referral columns ──────────
--
-- The existing profiles_protect_billing_columns trigger (mig 50 / mig 59)
-- reverts unauthorized writes to billing/trust columns. Referral columns
-- are billing-adjacent: pro_credit_months literally grants Pro access,
-- referral_activations gates when that credit is earned, referral_code
-- is an identity token, and referred_by_user_id is the input signal
-- feeding activation. All four must be write-locked against
-- authenticated/anon roles. Service_role (webhook + our signup flow) and
-- postgres retain write access.

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
  NEW.referral_code         := OLD.referral_code;
  NEW.referred_by_user_id   := OLD.referred_by_user_id;
  NEW.referral_activations  := OLD.referral_activations;
  NEW.pro_credit_months     := OLD.pro_credit_months;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_billing_columns() IS
  'Audit HP-8/#9 (2026-07-06) + referral (2026-07-10, mig 62). Reverts '
  'unauthorized changes to billing/trust/referral columns. Bypasses when '
  'called by any role other than authenticated/anon.';

-- ─── 8. Column comments ─────────────────────────────────────────────────────

COMMENT ON COLUMN public.profiles.referral_code IS
  'Unique 6-character invite code. 32-char alphabet excludes 0/O/1/I/L. '
  'Generated on insert by trigger, immutable in application code.';

COMMENT ON COLUMN public.profiles.referred_by_user_id IS
  'The user who invited this user, if any. Set at signup when ?ref= '
  'query param resolved to a valid code. Immutable once set (app-level).';

COMMENT ON COLUMN public.profiles.referral_activations IS
  'Cached count of this user''s referrals that have activated (email '
  'verified + first slime logged). Kept in sync by application code on '
  'activation event. Used for milestone checks.';

COMMENT ON COLUMN public.profiles.pro_credit_months IS
  'Banked Pro months earned by hitting referral milestones. Sub resolver '
  'treats user as Pro when this > 0 and no active Stripe sub. Independent '
  'of stripe_current_period_end / pro_expires_at.';
