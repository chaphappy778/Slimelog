-- supabase/migrations/20260507000036_bundle_e_privacy_hygiene.sql
--
-- Bundle E privacy hygiene — four changes:
--
--   1. CREATE OR REPLACE log_collection_activity() — adds is_public guard
--      around the activity_feed INSERT. Trigger binding unchanged.
--
--   2. Backfill DELETE — removes activity_feed rows pointing at private
--      collection_logs (closes the existing leak introduced before this fix).
--
--   3. New cleanup_activity_on_privacy_flip() function + AFTER UPDATE trigger
--      on collection_logs. Fires only on public->private flip and DELETEs the
--      corresponding activity_feed row. Private->public is a no-op (no
--      retroactive insert — preserves activity_feed timestamp integrity).
--
--   4. Tighten public.reports RLS:
--        - DROP broken "admins can read reports" policy (always-true predicate)
--        - CREATE proper admin-gated SELECT, UPDATE, DELETE policies using
--          public.is_admin() (defined in 20260506000034)
--        - INSERT policy unchanged — any authenticated user can still report
--
-- Tables altered: public.collection_logs (trigger added — no schema change)
--                 public.activity_feed (data backfill — no schema change)
--                 public.reports (RLS policies only — no schema change)
-- Functions altered/added: public.log_collection_activity() (replaced)
--                          public.cleanup_activity_on_privacy_flip() (new)
-- Triggers added: collection_logs_privacy_flip_cleanup
-- Reason: Pre-launch privacy/security hygiene. Closes activity_feed leak on
--         private logs (insert + edit + backfill paths) and locks down admin
--         reports surface.

-- ---------------------------------------------------------------------------
-- 1. Update log_collection_activity() to skip activity_feed insert for
--    private logs. Function body otherwise preserved verbatim.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_collection_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only emit activity feed entries for public logs.
  IF NEW.is_public = true THEN
    INSERT INTO public.activity_feed (
      id,
      actor_id,
      activity_type,
      log_id,
      metadata,
      created_at
    ) VALUES (
      gen_random_uuid(),
      NEW.user_id,
      CASE
        WHEN NEW.in_wishlist = true THEN 'wishlist_added'::activity_type
        ELSE 'log_created'::activity_type
      END,
      NEW.id,
      jsonb_build_object(
        'slime_name',     NEW.slime_name,
        'slime_type',     NEW.slime_type,
        'brand_name_raw', NEW.brand_name_raw,
        'rating_overall', NEW.rating_overall,
        'in_wishlist',    NEW.in_wishlist,
        'image_url',      NEW.image_url
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Backfill: delete existing activity_feed rows that point at private
--    collection_logs. One-time cleanup of pre-fix leakage.
-- ---------------------------------------------------------------------------

DELETE FROM public.activity_feed
WHERE log_id IN (
  SELECT id FROM public.collection_logs WHERE is_public = false
);

-- ---------------------------------------------------------------------------
-- 3. New cleanup_activity_on_privacy_flip() function and AFTER UPDATE
--    trigger. Fires only when is_public flips from true to false. Private
--    -> public flips remain a no-op to preserve activity_feed timestamp
--    integrity (re-emitting on flip would either lie about the timestamp
--    or backdate, both of which break chronological feed scrolling).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cleanup_activity_on_privacy_flip()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.activity_feed WHERE log_id = OLD.id;
  RETURN NULL;
END;
$function$;

-- Idempotent: drop before create so re-runs of this migration are safe
DROP TRIGGER IF EXISTS collection_logs_privacy_flip_cleanup
  ON public.collection_logs;

CREATE TRIGGER collection_logs_privacy_flip_cleanup
AFTER UPDATE OF is_public ON public.collection_logs
FOR EACH ROW
WHEN (OLD.is_public = true AND NEW.is_public = false)
EXECUTE FUNCTION public.cleanup_activity_on_privacy_flip();

-- ---------------------------------------------------------------------------
-- 4. Tighten public.reports RLS — admin-only SELECT/UPDATE/DELETE.
--    INSERT policy unchanged.
-- ---------------------------------------------------------------------------

-- Drop the broken always-true admin-read policy. Both casings are dropped
-- to make this migration idempotent under repeat runs (Postgres policy
-- names are case-sensitive, and a future re-run would otherwise leave the
-- new "Admins can read reports" policy duplicated alongside the old one).
DROP POLICY IF EXISTS "admins can read reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can read reports" ON public.reports;

CREATE POLICY "Admins can read reports"
ON public.reports
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin-only UPDATE for managing reports (mark resolved, change status, etc.)
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Admin-only DELETE
DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;
CREATE POLICY "Admins can delete reports"
ON public.reports
FOR DELETE
TO authenticated
USING (public.is_admin());

-- INSERT policy "authenticated users can insert reports" is UNCHANGED.
-- Any authenticated user can still report content (with_check: auth.uid() = reporter_id).
