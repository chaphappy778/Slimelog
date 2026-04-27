-- =============================================================================
-- Migration: 20260426000032_public_profiles_and_logs.sql
--
-- Tables altered:
--   profiles
--     ADDED:
--       profile_visibility text NOT NULL DEFAULT 'public'
--         CHECK (profile_visibility IN ('public', 'private'))
--       Index: profiles_visibility_idx ON (profile_visibility)
--
--   profiles_public (NEW VIEW, security_invoker = true)
--     EXPOSES: id, username, display_name, avatar_url, bio, location,
--              website_url, is_verified, is_brand, featured_log_ids,
--              instagram_handle, tiktok_handle, shop_url, created_at,
--              and computed is_premium boolean
--     EXCLUDES: email, date_of_birth, age_verified, stripe_customer_id,
--               subscription_tier (raw), subscription_status,
--               subscription_current_period_end, marketing_consent,
--               brevo_*, updated_at, full_name, profile_visibility
--     FILTERS: profile_visibility = 'public'
--     GRANTED: SELECT to anon, authenticated
--
--   collection_logs
--     POLICY ADDED: anon_select_public_logs (SELECT, anon role)
--                   USING (is_public = true)
--
--   comments
--     POLICY DROPPED: "Users can see all comments"
--     POLICY ADDED: comments_select_public_or_own
--       USING parent log is_public = true OR auth.uid() owns the log
--
--   likes
--     POLICY DROPPED: "Users can see all likes"
--     POLICY ADDED: likes_select_public_or_own (same parent-log gate)
--
--   comment_likes
--     POLICY DROPPED: "comment likes are publicly readable"
--     POLICY ADDED: comment_likes_select_public_or_own
--       (joins comments → collection_logs)
--
-- Reasons:
--   1. Enable shareable public user profiles, slime pages, and brand pages
--      for logged-out users (#35).
--   2. Fix pre-existing privacy bug where comments/likes/comment_likes on
--      private logs were readable by any authenticated or anon user (#35).
--   3. Ship profile_visibility column now so a future opt-out UI is a
--      UI-only change rather than another migration.
--
-- Defense in depth:
--   - profiles_public view filters by profile_visibility AND only exposes
--     safe columns. Even if a future query forgets to limit columns, the
--     view physically can't return private fields.
--   - collection_logs anon SELECT requires is_public = true. The
--     authenticated policy retains its (is_public OR own) check.
--   - is_premium is computed (subscription_tier IN ('pro', 'brand_pro')
--     AND subscription_status = 'active'). Cancelled / past_due users
--     correctly do NOT show the Pro badge publicly.
--
-- NO anon write policies are added by this migration. Verified.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- A.1  profile_visibility column
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'public'
  CHECK (profile_visibility IN ('public', 'private'));

CREATE INDEX IF NOT EXISTS profiles_visibility_idx
  ON public.profiles (profile_visibility);


-- ─────────────────────────────────────────────────────────────────────────────
-- A.2  profiles_public view
--
-- security_invoker = true: the view runs queries as the calling user,
-- respecting their RLS context rather than the view-creator's. This is
-- required so that anon and authenticated users see consistent data
-- through the view.
--
-- The view filters out private profiles via the WHERE clause. The
-- profile_visibility column itself is NOT in the SELECT list because the
-- view's filter already does the work — clients never need to read the
-- column to know the profile is public (they only see public profiles).
--
-- is_premium is computed from subscription state. We expose only the
-- boolean result. Raw subscription_tier and subscription_status stay
-- private because subscription_status='past_due' should NOT show a Pro
-- badge — the AND check below handles that correctly.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  bio,
  location,
  website_url,
  is_verified,
  is_brand,
  featured_log_ids,
  instagram_handle,
  tiktok_handle,
  shop_url,
  created_at,
  (subscription_tier IN ('pro', 'brand_pro') AND subscription_status = 'active') AS is_premium
FROM public.profiles
WHERE profile_visibility = 'public';

GRANT SELECT ON public.profiles_public TO anon, authenticated;

COMMENT ON VIEW public.profiles_public IS
  'Public, anon-readable projection of profiles. Filters by profile_visibility = ''public''. '
  'Excludes email, date_of_birth, age_verified, stripe_customer_id, raw subscription state, '
  'marketing_consent, brevo_*, updated_at, full_name. Computes is_premium boolean from '
  'subscription_tier + subscription_status. Use this view for ALL cross-user profile reads. '
  'Owner self-reads (settings, account API) keep using the base profiles table.';


-- ─────────────────────────────────────────────────────────────────────────────
-- A.3  collection_logs — anon SELECT
--
-- Anon can read ONLY public logs. The existing authenticated policy
-- (collection_logs_select) keeps its (is_public OR auth.uid() = user_id)
-- semantics for logged-in users.
--
-- Defense in depth: every public-facing query in the app also filters
-- is_public = true explicitly. RLS is the floor, not the only barrier.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "anon_select_public_logs"
  ON public.collection_logs FOR SELECT
  TO anon
  USING (is_public = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- A.4  comments — tighten SELECT policy
--
-- The previous policy "Users can see all comments" used USING (true) with
-- no role restriction, meaning anon AND authenticated could read comments
-- on PRIVATE logs. Pre-existing privacy bug.
--
-- New policy: a comment is readable iff the parent collection_logs row is
-- public OR owned by the caller. Applies to all roles via the implicit
-- PUBLIC role of unrestricted policies.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can see all comments" ON public.comments;

CREATE POLICY "comments_select_public_or_own"
  ON public.comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.collection_logs cl
      WHERE cl.id = comments.log_id
        AND (cl.is_public = true OR cl.user_id = auth.uid())
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- A.5  likes — tighten SELECT policy
--
-- Same pattern: gate by parent log visibility / ownership.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can see all likes" ON public.likes;

CREATE POLICY "likes_select_public_or_own"
  ON public.likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.collection_logs cl
      WHERE cl.id = likes.log_id
        AND (cl.is_public = true OR cl.user_id = auth.uid())
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- A.6  comment_likes — tighten SELECT policy
--
-- Two-hop join: comment_likes → comments → collection_logs.
-- A like on a comment is readable iff the comment's parent log is public
-- or owned by the caller.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "comment likes are publicly readable" ON public.comment_likes;

CREATE POLICY "comment_likes_select_public_or_own"
  ON public.comment_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.comments c
      JOIN public.collection_logs cl ON cl.id = c.log_id
      WHERE c.id = comment_likes.comment_id
        AND (cl.is_public = true OR cl.user_id = auth.uid())
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- END OF MIGRATION
-- ─────────────────────────────────────────────────────────────────────────────