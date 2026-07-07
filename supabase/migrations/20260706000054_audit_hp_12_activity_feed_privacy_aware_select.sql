-- 2026-07-06 audit high-priority #12: activity_feed SELECT policy is
-- fully public (USING (true)) — private-log leak surface.
--
-- Context
-- -------
-- Migration 36 (bundle_e_privacy_hygiene) already:
--
--   1. Added an is_public guard to log_collection_activity() so new
--      private logs don't emit activity_feed rows.
--   2. Deleted existing activity_feed rows pointing at private
--      collection_logs (one-time backfill).
--   3. Added cleanup_activity_on_privacy_flip() — public→private log
--      flips delete the corresponding activity_feed row.
--
-- So the DATA today is clean. But the RLS policy on activity_feed
-- SELECT is still:
--
--   CREATE POLICY "Activity feed is publicly readable"
--     ON public.activity_feed FOR SELECT USING (true);
--
-- Any future code path (a new INSERT trigger, a service-role script,
-- an ad-hoc backfill) that inserts an activity_feed row for a private
-- log immediately becomes anon-readable. The trigger guard is
-- necessary but not sufficient; RLS should enforce the same
-- invariant independently.
--
-- Fix
-- ---
-- Replace the "always true" SELECT policy with a privacy-aware one:
--
--   - log_id IS NULL              → non-log activity, publicly readable
--                                   (follow events, brand actions, drop
--                                   announcements, etc. — no log
--                                   privacy angle).
--   - log_id IS NOT NULL          → the referenced collection_log must
--                                   have is_public = true, OR the
--                                   calling user must be the log owner
--                                   (self-visibility for defense-in-
--                                   depth if a stray private-log row
--                                   ever slips past the trigger guard).
--
-- What the app query does today (app/page.tsx:326)
-- ------------------------------------------------
--   SELECT ... FROM activity_feed
--   WHERE activity_type IN ('log_created', 'wishlist_added')
--     AND actor_id IN (followingIds)
--
-- Both activity_types always come with log_id set, and since mig 36
-- filters out private-log inserts, every returned row already has a
-- public log behind it. The new policy is a no-op for the current
-- query, but it locks the invariant into RLS so future queries can't
-- accidentally surface a private-log row via a different filter path.
--
-- Performance note
-- ----------------
-- The EXISTS predicate hits collection_logs by primary key. On a feed
-- limit-20 query it's 20 index lookups — negligible.
--
-- Verification (as an authenticated non-owner user):
--   -- Insert a fake private-log activity row (requires service_role):
--   -- INSERT INTO activity_feed (actor_id, activity_type, log_id) ...
--   -- Then read as a normal user — the row should NOT appear.

DROP POLICY IF EXISTS "Activity feed is publicly readable" ON public.activity_feed;

CREATE POLICY "Activity feed is privacy-aware readable"
  ON public.activity_feed
  FOR SELECT
  USING (
    -- Non-log activities: publicly readable.
    log_id IS NULL
    OR
    -- Log activities: only if the underlying collection_log is
    -- public, OR the requesting user is the log's owner.
    EXISTS (
      SELECT 1
      FROM public.collection_logs cl
      WHERE cl.id = activity_feed.log_id
        AND (
          cl.is_public = true
          OR cl.user_id = auth.uid()
        )
    )
  );

COMMENT ON POLICY "Activity feed is privacy-aware readable"
  ON public.activity_feed
  IS 'Audit high-priority #12 (2026-07-06). RLS-level guarantee that '
     'private-log activity rows are not readable by non-owners, '
     'independent of the mig 36 trigger.';
