-- ============================================================
-- File: supabase/migrations/20260329000010_activity_feed_trigger.sql
-- Writes activity_feed rows on collection_logs INSERT and
-- follows INSERT. Both functions are SECURITY DEFINER so they
-- run as the function owner (postgres/service role) and can
-- INSERT into activity_feed regardless of caller RLS.
-- ============================================================

-- ── 1. collection_logs → activity_feed ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_collection_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    'log_created',
    NEW.id,
    jsonb_build_object(
      'slime_name',     NEW.slime_name,
      'slime_type',     NEW.slime_type,
      'brand_name_raw', NEW.brand_name_raw,
      'rating_overall', NEW.rating_overall
    ),
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collection_logs_create_activity ON public.collection_logs;

CREATE TRIGGER collection_logs_create_activity
  AFTER INSERT ON public.collection_logs
  FOR EACH ROW
  WHEN (NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.log_collection_activity();

-- ── 2. follows → activity_feed ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.log_follow_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_feed (
    id,
    actor_id,
    activity_type,
    target_user_id,
    created_at
  ) VALUES (
    gen_random_uuid(),
    NEW.follower_id,
    'user_followed',
    NEW.following_id,
    NOW()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS follows_create_activity ON public.follows;

CREATE TRIGGER follows_create_activity
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.log_follow_activity();

-- ── RLS note ──────────────────────────────────────────────────────────────────
-- activity_feed rows written by these triggers are owned by the
-- postgres role. Ensure activity_feed has an RLS SELECT policy
-- that allows authenticated users to read rows where actor_id
-- matches a user they follow, or expose that via the query layer
-- (page.tsx filters by actor_id = ANY(following_ids)).
-- Minimal policy to add if not already present:
--
--   ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
--
--   CREATE POLICY "Users can read activity from followed users"
--     ON public.activity_feed FOR SELECT TO authenticated
--     USING (true);   -- filter happens in app query, not RLS
--
-- Tighten the USING clause if you want DB-level enforcement:
--   USING (
--     actor_id IN (
--       SELECT following_id FROM public.follows
--       WHERE follower_id = auth.uid()
--     )
--   );