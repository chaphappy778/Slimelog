-- 20260713000070_anon_read_public_logs.sql
-- Discover V1 fix: allow anonymous visitors to read public collection_logs.
--
-- The T33 Discover rework aggregates `collection_logs` server-side to
-- produce the "Top Rated Slimes" leaderboard, the trending pulse feed,
-- per-base-type counts, and popular-collector enrichment. All of these
-- filter to `is_public = true` in the query — but the existing SELECT
-- policy on `collection_logs` was scoped `TO authenticated`, so an
-- anonymous visitor to /discover got zero rows back and rendered
-- empty leaderboards + a pre-launch empty state.
--
-- This migration grants a matching anon SELECT policy that mirrors the
-- authenticated one, restricted to `is_public = true`. Nothing about
-- private logs, write operations, or updates changes.
--
-- Related: docs/error-tracker.md — migration-lag / silent-empty pattern.

-- Idempotent guard so re-runs don't error.
DROP POLICY IF EXISTS "anon_select_public_collection_logs"
  ON public.collection_logs;

CREATE POLICY "anon_select_public_collection_logs"
  ON public.collection_logs
  FOR SELECT
  TO anon
  USING (is_public = true);
