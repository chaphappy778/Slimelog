-- 2026-07-09: fix HP-8 / HP-9 trigger bypass check.
--
-- Root cause
-- ----------
-- Migrations 50 + 51 shipped `profiles_protect_billing_columns` and
-- `brands_protect_billing_columns` triggers with `SECURITY DEFINER`
-- and a bypass check of `IF current_user = 'service_role'`.
--
-- Inside a SECURITY DEFINER function `current_user` returns the
-- function OWNER, not the calling role. Both functions are owned by
-- postgres, so `current_user` inside them was always 'postgres',
-- never 'service_role'. The bypass check never triggered — every
-- UPDATE to a protected column got reverted, INCLUDING legitimate
-- service_role webhook writes.
--
-- Symptom: Stripe webhook events returned 200 OK, the UPDATE
-- appeared to succeed in the client, but subscription_tier /
-- subscription_status / stripe_customer_id all reset to their OLD
-- values. Debugging opaque because the update chain reported success
-- (rowcount=1) but the row's actual state was unchanged.
--
-- Fix
-- ---
-- 1. Remove `SECURITY DEFINER` — trigger now runs as the caller, so
--    `current_user` correctly reflects the calling role at the
--    Postgres level. The trigger doesn't need elevated privileges;
--    it only reads NEW/OLD and mutates NEW.
--
-- 2. Broaden the bypass check from `= 'service_role'` to
--    `NOT IN ('authenticated', 'anon')`. Rationale: the trigger's
--    intent is to block user-driven writes to billing/trust columns.
--    The only two roles user writes come through are 'authenticated'
--    and 'anon'. Every other role (service_role, postgres,
--    supabase_admin, etc.) has legitimate admin/service reasons to
--    write to these columns. Explicit denylist is more robust than
--    a single allow-value.
--
-- Verification query after applying:
--   SELECT proname, prosecdef FROM pg_proc
--   WHERE proname IN ('profiles_protect_billing_columns',
--                     'brands_protect_billing_columns');
--   -- Expect prosecdef = false on both.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profiles_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
-- Removed SECURITY DEFINER so current_user reflects the calling role.
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Allow the write through for any role that isn't a user-facing
  -- PostgREST role (i.e., authenticated or anon). service_role,
  -- postgres, supabase_admin all bypass.
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

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_billing_columns() IS
  'Audit HP-8/#9 (2026-07-06). Reverts unauthorized changes to '
  'billing/trust columns + role on profiles. Bypasses when called by '
  'any role other than authenticated/anon. Fixed 2026-07-09 (mig 59) '
  'to remove SECURITY DEFINER and broaden bypass check.';

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.brands_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
-- Removed SECURITY DEFINER so current_user reflects the calling role.
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  NEW.is_verified                       := OLD.is_verified;
  NEW.stripe_customer_id                := OLD.stripe_customer_id;
  NEW.subscription_tier                 := OLD.subscription_tier;
  NEW.subscription_status               := OLD.subscription_status;
  NEW.subscription_current_period_end   := OLD.subscription_current_period_end;
  NEW.subscription_cancel_at_period_end := OLD.subscription_cancel_at_period_end;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.brands_protect_billing_columns() IS
  'Audit HP-8 (2026-07-06). Reverts unauthorized changes to '
  'billing/trust columns on brands. Bypasses when called by any role '
  'other than authenticated/anon. Fixed 2026-07-09 (mig 59) to remove '
  'SECURITY DEFINER and broaden bypass check.';
