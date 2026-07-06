-- 2026-07-06 audit high-priority #8: profiles + brands billing/trust
-- columns are user-writable via PostgREST.
--
-- Problem
-- -------
-- The self-update policy on public.profiles reads:
--
--   CREATE POLICY "Users can update their own profile"
--     ON public.profiles FOR UPDATE
--     USING     (auth.uid() = id)
--     WITH CHECK (auth.uid() = id);
--
-- There is no column filter. So any authenticated user can do:
--
--   PATCH /rest/v1/profiles?id=eq.<self>
--     { "subscription_tier": "pro",
--       "subscription_status": "active",
--       "is_verified": true,
--       "is_premium": true,
--       "subscription_current_period_end": "2099-01-01" }
--
-- and receive PRO forever plus a verified-brand badge without Stripe
-- ever seeing a dollar. Same story on public.brands via the
-- "Brand owners can update their brand" policy — a brand owner can
-- flip is_verified, subscription_tier=brand_pro, subscription_status
-- =active on their own row.
--
-- Fix
-- ---
-- BEFORE UPDATE triggers on both tables that revert changes to the
-- protected columns unless the caller is running as service_role
-- (i.e., the Stripe webhook handler or an admin script using the
-- service role key). Trigger-based rather than policy-based because
-- Postgres RLS policies can't distinguish "you can update row X" from
-- "you can update these columns of row X" without splitting the row
-- across multiple tables — and moving billing state to a sibling
-- table this late in the game is disproportionate to the risk.
--
-- Protected columns
-- -----------------
-- profiles:
--   is_premium                        (legacy stored bool — the live
--                                     value comes from public_profiles
--                                     view, but the column still
--                                     exists and is writable)
--   is_verified                       (brand verification badge)
--   stripe_customer_id
--   subscription_tier
--   subscription_status
--   subscription_current_period_end
--   subscription_cancel_at_period_end
--
-- brands:
--   is_verified
--   stripe_customer_id
--   subscription_tier
--   subscription_status
--   subscription_current_period_end
--   subscription_cancel_at_period_end
--
-- Silent revert vs. hard raise
-- ----------------------------
-- The trigger silently resets NEW.<col> := OLD.<col> instead of
-- raising an exception. Rationale: existing forms send back the full
-- row on save, so a legitimate settings-page save that happens to
-- include the current tier value in the PATCH shouldn't fail. The
-- silent revert makes PATCHes idempotent for legitimate flows and
-- neuters malicious ones without leaking that the column is
-- protected.
--
-- Legitimate write paths (all use service_role, all keep working):
--   - Stripe webhook: apps/web/app/api/stripe/webhook/route.ts
--   - Auth callback DOB update: apps/web/app/auth/callback/route.ts
--     (does not touch billing cols, but runs as service_role anyway)
--   - Admin brand-claims approve/reject: uses adminClient
--
-- Verification query (run after migration applies):
--   -- As authed user, should silently no-op the billing update:
--   UPDATE public.profiles SET subscription_tier = 'pro' WHERE id = auth.uid();
--   SELECT subscription_tier FROM public.profiles WHERE id = auth.uid();
--   -- expect: 'free'

-- ---------------------------------------------------------------------------
-- profiles: protect billing + trust columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role (Stripe webhook, admin scripts) can mutate anything.
  -- Everyone else gets their billing/trust edits silently reverted.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.is_premium                        := OLD.is_premium;
  NEW.is_verified                       := OLD.is_verified;
  NEW.stripe_customer_id                := OLD.stripe_customer_id;
  NEW.subscription_tier                 := OLD.subscription_tier;
  NEW.subscription_status               := OLD.subscription_status;
  NEW.subscription_current_period_end   := OLD.subscription_current_period_end;
  NEW.subscription_cancel_at_period_end := OLD.subscription_cancel_at_period_end;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_billing_columns() IS
  'Audit high-priority #8 (2026-07-06). Reverts unauthorized changes to '
  'billing/trust columns on profiles. Only service_role can bypass.';

DROP TRIGGER IF EXISTS profiles_protect_billing_columns ON public.profiles;
CREATE TRIGGER profiles_protect_billing_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_billing_columns();

-- ---------------------------------------------------------------------------
-- brands: protect billing + trust columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.brands_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user = 'service_role' THEN
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
  'Audit high-priority #8 (2026-07-06). Reverts unauthorized changes to '
  'billing/trust columns on brands. Only service_role can bypass.';

DROP TRIGGER IF EXISTS brands_protect_billing_columns ON public.brands;
CREATE TRIGGER brands_protect_billing_columns
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.brands_protect_billing_columns();
