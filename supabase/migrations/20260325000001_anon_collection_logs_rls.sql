-- =============================================================================
-- File: 20260325000001_anon_collection_logs_rls.sql
-- Description: Anon RLS policies for collection_logs (dev/testing only)
-- WARNING: Remove before beta — replace with auth-scoped policies
-- =============================================================================

-- Allow anon INSERT (skip user_id requirement for now)
CREATE POLICY "anon_insert_collection_logs"
ON collection_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon SELECT (see all rows — fine for solo dev testing)
CREATE POLICY "anon_select_collection_logs"
ON collection_logs
FOR SELECT
TO anon
USING (true);