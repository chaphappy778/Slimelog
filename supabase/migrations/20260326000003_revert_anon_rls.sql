-- =============================================================================
-- Migration: 20260326000001_revert_anon_rls.sql
-- Depends on: 20260324000001_slimelog_initial_schema.sql
--             20260325000001_anon_collection_logs_rls.sql
--
-- PURPOSE:
--   Remove the anonymous-access RLS policies added during development
--   (migration 000002) and replace them with proper owner-only write policies
--   on collection_logs.
--
-- ⚠️  APPLY ONLY after auth is confirmed working end-to-end:
--     1. Users can sign up and sign in (email + Google)
--     2. logSlime() successfully writes user_id from session to collection_logs
--     3. Users can read their own logs on /collection
--     4. Unauthenticated requests to /log are redirected to /login
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the anon dev policies added in migration 000002
--    (Adjust policy names below if yours differ — check with:
--     SELECT policyname FROM pg_policies WHERE tablename = 'collection_logs';)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "anon_insert_collection_logs"  ON public.collection_logs;
DROP POLICY IF EXISTS "anon_select_collection_logs"  ON public.collection_logs;
DROP POLICY IF EXISTS "anon_update_collection_logs"  ON public.collection_logs;
DROP POLICY IF EXISTS "anon_delete_collection_logs"  ON public.collection_logs;

-- Also drop any catch-all permissive policies that may have been added
-- for local testing:
DROP POLICY IF EXISTS "allow_all_anon"               ON public.collection_logs;
DROP POLICY IF EXISTS "dev_allow_all"                ON public.collection_logs;

-- ---------------------------------------------------------------------------
-- 2. Ensure RLS is enabled (it should already be on from migration 000001,
--    but this is idempotent and safe to re-state).
-- ---------------------------------------------------------------------------
ALTER TABLE public.collection_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Owner-only write policies
--    Users may only INSERT / UPDATE / DELETE their own rows.
--    The user_id column is now always populated server-side from the session.
-- ---------------------------------------------------------------------------

-- SELECT: users see only their own logs
--   (Public log discovery / social feed uses service_role or a SECURITY
--    DEFINER function — add a separate select policy for that when needed.)
CREATE POLICY "owners_select_own_logs"
  ON public.collection_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: the user_id being inserted must match the authenticated user
CREATE POLICY "owners_insert_own_logs"
  ON public.collection_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: only the owning user may update their own rows
CREATE POLICY "owners_update_own_logs"
  ON public.collection_logs
  FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: only the owning user may delete their own rows
CREATE POLICY "owners_delete_own_logs"
  ON public.collection_logs
  FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Make user_id NOT NULL now that auth is wired
--    This enforces at the DB level that no orphan rows can be created.
--    If the column is already NOT NULL from migration 000001, this is a no-op.
-- ---------------------------------------------------------------------------
ALTER TABLE public.collection_logs
  ALTER COLUMN user_id SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Verification query (run manually after applying to confirm)
-- ---------------------------------------------------------------------------
-- SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--  WHERE tablename = 'collection_logs'
--  ORDER BY cmd;