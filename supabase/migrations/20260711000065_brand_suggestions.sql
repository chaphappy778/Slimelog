-- 2026-07-11: T110 — community brand-suggestion pipeline.
--
-- Context
-- -------
-- Users can suggest slime shops we don't have in the catalog yet. Submissions
-- land in a moderation queue; an admin can approve (spawns a new brands row
-- with verification_tier='community'), reject, or mark as duplicate. On
-- approve/reject the submitter gets an in-app notification.
--
-- This migration lays down:
--   1. Two new notification_type enum values (approved / rejected variants).
--   2. The brand_suggestions table + shape checks + status enum-as-check.
--   3. Indexes for the two query paths that matter:
--        (submitter_id, created_at desc) — rate-limit lookups
--        (status, created_at desc)       — admin queue
--   4. set_updated_at trigger (reuses the existing public.set_updated_at
--      helper defined in the initial schema migration).
--   5. RLS: users can INSERT + SELECT their own rows; admins can do
--      anything via public.is_admin(). No plain-user UPDATE / DELETE.
--
-- Not in scope
-- ------------
-- Content moderation (banned-words check on the name field) — filed as
-- T111. Ships before this flow gets heavy usage.

-- ─── 1. Extend notification_type enum ────────────────────────────────────────

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'brand_suggestion_approved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'brand_suggestion_rejected';

-- ─── 2. Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.brand_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submitter — ON DELETE SET NULL so admins can still see historical
  -- suggestions after a user deletes their account, but PII disappears.
  submitter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  name text NOT NULL
    CHECK (length(trim(name)) BETWEEN 2 AND 60),

  -- URL columns follow the http-only CHECK pattern established in
  -- migration 20260707000057. NULL is fine (fields are optional).
  website_url text
    CHECK (website_url IS NULL OR website_url ~* '^https?://'),

  instagram_handle text
    CHECK (instagram_handle IS NULL OR length(instagram_handle) <= 40),

  tiktok_handle text
    CHECK (tiktok_handle IS NULL OR length(tiktok_handle) <= 40),

  note text
    CHECK (note IS NULL OR length(note) <= 200),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),

  admin_notes text,

  -- Points at the resulting brands row on approve OR the existing brand
  -- when marked duplicate. Null when rejected outright.
  resolved_brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.brand_suggestions IS
  'T110 (2026-07-11). Community-submitted brand suggestions awaiting admin '
  'moderation. Approved rows spawn a brands row with verification_tier='
  'community.';

-- ─── 3. updated_at trigger — reuses public.set_updated_at() ─────────────────

DROP TRIGGER IF EXISTS brand_suggestions_updated_at ON public.brand_suggestions;
CREATE TRIGGER brand_suggestions_updated_at
  BEFORE UPDATE ON public.brand_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 4. Indexes ─────────────────────────────────────────────────────────────

-- Rate-limit lookup: "how many has this user submitted in the last 24h?"
CREATE INDEX IF NOT EXISTS brand_suggestions_submitter_created_idx
  ON public.brand_suggestions (submitter_id, created_at DESC);

-- Admin queue: "list all pending, newest first".
CREATE INDEX IF NOT EXISTS brand_suggestions_status_created_idx
  ON public.brand_suggestions (status, created_at DESC);

-- ─── 5. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.brand_suggestions ENABLE ROW LEVEL SECURITY;

-- INSERT: any authenticated user can submit — as long as submitter_id
-- matches auth.uid(). Server route uses the anon client for INSERT so
-- RLS applies (not a service-role bypass).
CREATE POLICY "Users insert own suggestions"
  ON public.brand_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id = auth.uid());

-- SELECT: submitter can read own rows. Admins can read everything.
CREATE POLICY "Submitter reads own suggestions"
  ON public.brand_suggestions FOR SELECT
  TO authenticated
  USING (submitter_id = auth.uid() OR public.is_admin());

-- UPDATE: admins only. No plain-user update — status transitions happen
-- server-side via the admin routes.
CREATE POLICY "Admins update suggestions"
  ON public.brand_suggestions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: admins only. Same reasoning.
CREATE POLICY "Admins delete suggestions"
  ON public.brand_suggestions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── 6. Column comments ─────────────────────────────────────────────────────

COMMENT ON COLUMN public.brand_suggestions.submitter_id IS
  'The user who submitted the suggestion. Nullable so admins can see '
  'historical rows after a submitter deletes their account.';

COMMENT ON COLUMN public.brand_suggestions.status IS
  'Lifecycle: pending (default) -> approved | rejected | duplicate. Only '
  'admins transition state via /api/admin/brand-suggestions/*.';

COMMENT ON COLUMN public.brand_suggestions.resolved_brand_id IS
  'On approve: the new brands.id spawned from this suggestion. On '
  'duplicate: the existing brands.id the admin linked it to. Null when '
  'pending or rejected.';

COMMENT ON COLUMN public.brand_suggestions.admin_notes IS
  'Private admin-only notes. Never surfaced to the submitter (their '
  'copy of the resolution is the notification body).';
