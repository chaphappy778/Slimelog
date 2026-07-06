-- 2026-07-06 audit blocker #5: drops write policy missing WITH CHECK
--
-- The initial schema (20260324000001) defined the "Brand owners can
-- manage drops" policy as:
--
--   CREATE POLICY "Brand owners can manage drops"
--     ON public.drops FOR ALL
--     USING (
--       auth.uid() = announced_by
--       OR auth.uid() = (SELECT owner_id FROM brands WHERE id = brand_id)
--     );
--
-- Two problems:
--
-- 1. No WITH CHECK. Postgres falls back to USING for the check on
--    INSERT and UPDATE writes. That means any INSERT that satisfies
--    USING is accepted, and any UPDATE where the resulting row still
--    satisfies USING is accepted.
--
-- 2. The USING clause allows `auth.uid() = announced_by`. On INSERT,
--    the caller controls the value of announced_by, so any authenticated
--    user can create a drop on any brand simply by setting
--    announced_by = self. On UPDATE they can rewrite brand_id to point
--    at a different brand as long as they keep announced_by = self.
--
-- Together, any signed-in user could create or edit drops on any
-- brand's behalf. announced_by was meant as an authorship trail
-- (nullable FK to profiles), not an authorization gate.
--
-- Fix: drop the old policy and create a strict one that ties BOTH
-- read-write eligibility AND write-content acceptance to brand
-- ownership. Only the brand's owner_id can manage its drops. Scope to
-- the authenticated role for good measure (anon shouldn't be
-- managing drops either, though the previous PUBLIC role scope was
-- functionally the same because anon can't obtain an auth.uid()).
--
-- All existing write callers in the codebase come from the brand
-- dashboard, which is already gated on brand ownership, so this
-- doesn't break any legitimate path — it only closes the smuggle-in
-- vector.

DROP POLICY IF EXISTS "Brand owners can manage drops" ON public.drops;

CREATE POLICY drops_brand_owner_write
  ON public.drops
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = (SELECT owner_id FROM public.brands WHERE id = brand_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT owner_id FROM public.brands WHERE id = brand_id)
  );

COMMENT ON POLICY drops_brand_owner_write ON public.drops
  IS 'Audit blocker #5 (2026-07-06). Both USING and WITH CHECK anchor on brand ownership so no announce_by shortcut lets a non-owner smuggle a drop through INSERT/UPDATE.';
