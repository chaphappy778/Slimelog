-- supabase/migrations/20260506000035_fix_is_admin_null_handling.sql
--
-- Patches public.is_admin() to return false (not NULL) when no JWT is
-- present. Functionally equivalent for RLS policies (NULL = deny), but
-- makes the function contract honest: a boolean predicate should return
-- true or false, never NULL.
--
-- Tables altered: none
-- Functions altered: public.is_admin()
-- Reason: Cleanup follow-on to 20260506000034. Wraps the IN check in
--         COALESCE so the function always returns a concrete boolean.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN ('chapmanjrjames@gmail.com'),
    false
  );
$$;
