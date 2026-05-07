-- supabase/migrations/20260506000034_brands_rls_tightening.sql
--
-- Tightens RLS on public.brands now that brand claiming (#3) is shipped.
-- Adds reusable public.is_admin() function for admin-gated policies.
--
-- Changes:
--   1. CREATE OR REPLACE public.is_admin() — returns true when authenticated
--      user's JWT email matches the admin email.
--   2. DROP and re-create the INSERT policy on public.brands — restrict to
--      admin only (was: any authenticated user via with_check: true).
--   3. CREATE a DELETE policy on public.brands — admin only (none existed
--      previously; default-deny was effectively in place).
--
-- Tables altered: public.brands (RLS policies only — no schema change)
-- Functions added: public.is_admin()
-- Reason: Pre-launch RLS hygiene. Brand creation should not be open to
--         every authenticated user; only admin tooling should INSERT.

-- ---------------------------------------------------------------------------
-- 1. Reusable admin check function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email') IN ('chapmanjrjames@gmail.com');
$$;

-- Allow authenticated and anon roles to call the function (the function
-- itself returns false for unauthenticated requests, so this is safe).
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2. Tighten INSERT policy on public.brands
-- ---------------------------------------------------------------------------

-- Drop the old permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create brands" ON public.brands;

-- Replace with admin-only INSERT policy
CREATE POLICY "Admins can create brands"
ON public.brands
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Add explicit admin-only DELETE policy on public.brands
-- ---------------------------------------------------------------------------

-- Add explicit admin-only DELETE policy (none existed before)
DROP POLICY IF EXISTS "Admins can delete brands" ON public.brands;

CREATE POLICY "Admins can delete brands"
ON public.brands
FOR DELETE
TO authenticated
USING (public.is_admin());
