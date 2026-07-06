-- 2026-07-06 audit high-priority #9: admin identity is a single
-- `NEXT_PUBLIC_ADMIN_EMAIL` string equality check inlined into every
-- browser bundle.
--
-- Problems
-- --------
--   1. NEXT_PUBLIC_ prefix means the admin's email is baked into every
--      client bundle — a precise phishing target.
--   2. The email is checked in ~8 places (6 admin pages/API routes +
--      SlimeMenu.tsx + a DB function). Any missed spot is a bypass.
--   3. `public.is_admin()` hardcodes 'chapmanjrjames@gmail.com' inline
--      in a migration file. Rotating the admin means a code change +
--      migration, not a data change.
--   4. No `email_confirmed_at` assertion. If a future OAuth provider
--      handed back an unverified-email user, admin escalation would
--      collapse to "sign up with that email."
--
-- Fix
-- ---
--   1. Add `profiles.role text NOT NULL DEFAULT 'user'` with a CHECK
--      constraint (only 'user' or 'admin' allowed).
--   2. Seed the existing admin (chapmanjrjames@gmail.com) by looking
--      up their auth.users id and flipping their profile row's role.
--      Idempotent — safe to re-run.
--   3. Rewrite `public.is_admin()` to:
--        (a) require a non-null auth.uid()
--        (b) require email_confirmed_at IS NOT NULL on the auth.users row
--        (c) require the profile row's role = 'admin'
--      All three must hold. Any RLS policy already using is_admin() picks
--      up the new logic automatically.
--   4. Extend the audit #8 trigger (profiles_protect_billing_columns)
--      to also revert user-driven writes to `role`. Otherwise self-
--      elevation just moves from "PATCH subscription_tier=pro" to
--      "PATCH role=admin".
--
-- App code changes (delivered in the same PR):
--   - lib/is-admin-check.ts: shared helper `isAdminUser(supabase, user)`
--     that queries profiles.role and asserts email_confirmed_at.
--   - 8 call sites migrated off `user.email === NEXT_PUBLIC_ADMIN_EMAIL`
--     onto the helper.
--   - NEXT_PUBLIC_ADMIN_EMAIL env var no longer read anywhere. Safe to
--     delete from Vercel envs after this ships; leaving it in place is
--     harmless (nothing consumes it).
--
-- Rotation flow (post-migration):
--   -- Promote a new admin:
--   UPDATE public.profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users WHERE email = 'new-admin@example.com');
--   -- Demote:
--   UPDATE public.profiles SET role = 'user' WHERE id = '<uuid>';
--
-- ---------------------------------------------------------------------------
-- 1. Add role column
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.profiles.role IS
  'Admin gate. Only service_role can modify (enforced by trigger). '
  'Used by public.is_admin() and by app-layer admin checks.';

-- ---------------------------------------------------------------------------
-- 2. Seed the existing admin
-- ---------------------------------------------------------------------------
-- Idempotent: setting role=admin when it's already admin is a no-op.
-- If the admin account doesn't exist yet in this environment (e.g. a
-- fresh dev DB), the UPDATE matches zero rows and quietly succeeds.

UPDATE public.profiles
  SET role = 'admin'
  WHERE id = (
    SELECT id FROM auth.users WHERE email = 'chapmanjrjames@gmail.com' LIMIT 1
  );

-- ---------------------------------------------------------------------------
-- 3. Rewrite is_admin() to use role + email_confirmed_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT p.role = 'admin'
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
      WHERE p.id = auth.uid()
        AND u.email_confirmed_at IS NOT NULL
    ),
    false
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Audit high-priority #9 (2026-07-06). Returns true only when the '
  'calling user has profiles.role = admin AND auth.users.email_confirmed_at '
  'is set. All existing RLS policies pick up the new gate automatically.';

-- Re-grant (CREATE OR REPLACE preserves grants but be explicit).
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 4. Extend profiles_protect_billing_columns to cover `role`
-- ---------------------------------------------------------------------------
-- Otherwise a signed-in user could PATCH /rest/v1/profiles?id=eq.self
-- with { "role": "admin" } and become admin without service_role.

CREATE OR REPLACE FUNCTION public.profiles_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role (Stripe webhook, admin scripts) can mutate anything.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Billing/trust columns (audit #8)
  NEW.is_premium                        := OLD.is_premium;
  NEW.is_verified                       := OLD.is_verified;
  NEW.stripe_customer_id                := OLD.stripe_customer_id;
  NEW.subscription_tier                 := OLD.subscription_tier;
  NEW.subscription_status               := OLD.subscription_status;
  NEW.subscription_current_period_end   := OLD.subscription_current_period_end;
  NEW.subscription_cancel_at_period_end := OLD.subscription_cancel_at_period_end;

  -- Admin role (audit #9)
  NEW.role := OLD.role;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_billing_columns() IS
  'Audit #8 + #9 (2026-07-06). Reverts unauthorized changes to '
  'billing/trust columns and role on profiles. Only service_role can bypass.';
