-- 20260716000078_variant_suggestions.sql
--
-- Taxonomy Phase 2 — Commit B foundation. Community-submitted brand-scoped
-- variant suggestions. Mirrors the T110 brand_suggestions shape and shares
-- the same notification/moderation pattern.
--
-- WHAT
-- ----
-- 1. Two new notification_type enum values (variant_suggestion_approved /
--    variant_suggestion_rejected). Reject-received notification for admin
--    is implicit via /admin/variant-suggestions polling; brand-owner
--    submissions notify the admin queue via the existing patterns.
-- 2. variant_suggestions table + status enum-as-check + admin-approval
--    trail (resolved_subtype_id, resolved_brand_variant_id, resolved_by,
--    resolved_at, admin_notes).
-- 3. Indexes: (submitter_id, created_at desc) for rate-limit lookups;
--    (status, created_at desc) for the admin queue.
-- 4. set_updated_at trigger reusing the existing helper.
-- 5. RLS: users INSERT + read own; brand owners read pending for their
--    own brand; admins do everything.
-- 6. approved_variant_contributions column on profiles for future badge
--    system (per T125 spec + the wider taxonomy plan Section 7).
-- 7. Trigger on variant_suggestions.status → 'approved' that increments
--    the submitter's approved_variant_contributions counter.
--
-- CONTEXT
-- -------
-- Wizard flow (implemented in code as part of the same Commit B):
--   1. User picks brand + base type in log wizard
--   2. Wizard queries brand_variants for brand_id + subtype.base_type match
--   3. If empty results AND brand_id is a real catalog brand (not free-text):
--      render magenta ghost "Suggest a variant" CTA
--   4. User taps CTA → mini form (variant name + optional note)
--   5. POST to /api/variant-suggestions → INSERT into this table (pending)
--   6. Notification fires to brand owner if brand is claimed; otherwise
--      fires to admins via the /admin/variant-suggestions queue.
--   7. On approval, admin picks an existing subtype OR creates a new one;
--      brand_variants row auto-created; submitter's contribution counter
--      auto-incremented via the trigger below.
--
-- NOT IN SCOPE
-- ------------
-- - Auto-detection of near-duplicate suggestions (fuzzy-match against
--   existing subtype names / aliases). Filed for post-launch; for now
--   admins manually catch dupes during review.
-- - Brand-owner-only auto-approve path (brand owner suggests variants for
--   their own brand → auto-approved). Handled at the app layer, not schema.


-- ─── 1. Extend notification_type enum ────────────────────────────────────

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'variant_suggestion_approved';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'variant_suggestion_rejected';


-- ─── 2. approved_variant_contributions column on profiles ────────────────
-- Denormalized counter (avoid a per-render COUNT aggregate). Incremented
-- by the trigger below on suggestion approval. Sets up the future badge
-- system (per T125 spec — "Slime Scout" or similar tier badge every N
-- approved contributions).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_variant_contributions integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.approved_variant_contributions IS
  'Count of variant suggestions this user submitted that were approved. '
  'Denormalized to avoid per-render COUNT. Feeds the future badge system.';


-- ─── 3. variant_suggestions table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.variant_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Submitter — ON DELETE SET NULL so admins can still see historical
  -- suggestions after a user deletes their account.
  submitter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Which brand + base type the suggestion applies to. brand_id required
  -- (variant is always brand-scoped in the wizard flow). base_type stored
  -- as enum so the DB rejects invalid values.
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  base_type public.slime_base_type NOT NULL,

  -- User-proposed variant name. Length matches the subtypes.name domain
  -- (informal cap of 60 chars matches brand_suggestions.name).
  proposed_name text NOT NULL
    CHECK (length(trim(proposed_name)) BETWEEN 2 AND 60),

  -- Optional user note (why this is a distinct variant, where they've seen
  -- it used, etc.). Helps admin during review.
  note text
    CHECK (note IS NULL OR length(note) <= 300),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')),

  admin_notes text,

  -- On approve: the subtype the admin either picked (existing) or created
  -- (new). Null when pending, rejected, or duplicate.
  resolved_subtype_id uuid REFERENCES public.subtypes(id) ON DELETE SET NULL,

  -- On approve: the brand_variants row spawned from this suggestion,
  -- linking the brand to the resolved subtype. Null in all other states.
  resolved_brand_variant_id uuid REFERENCES public.brand_variants(id) ON DELETE SET NULL,

  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.variant_suggestions IS
  'Community-submitted brand-scoped variant suggestions awaiting admin '
  'moderation. Wizard fallback when a brand+base combo has no known '
  'variants; user proposes a name; admin approves + picks/creates the '
  'canonical subtype + spawns a brand_variants row. Mirrors T110 brand '
  'suggestions pattern.';


-- ─── 4. updated_at trigger — reuses public.set_updated_at() ──────────────

DROP TRIGGER IF EXISTS variant_suggestions_updated_at ON public.variant_suggestions;
CREATE TRIGGER variant_suggestions_updated_at
  BEFORE UPDATE ON public.variant_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─── 5. Indexes ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS variant_suggestions_submitter_created_idx
  ON public.variant_suggestions (submitter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS variant_suggestions_status_created_idx
  ON public.variant_suggestions (status, created_at DESC);

-- Brand-owner queue: "show me pending suggestions for MY brand"
CREATE INDEX IF NOT EXISTS variant_suggestions_brand_status_idx
  ON public.variant_suggestions (brand_id, status);


-- ─── 6. RLS ──────────────────────────────────────────────────────────────

ALTER TABLE public.variant_suggestions ENABLE ROW LEVEL SECURITY;

-- INSERT: any authenticated user can submit — submitter_id must match
-- auth.uid(). Server route uses anon client for INSERT so RLS applies.
CREATE POLICY "Users insert own variant suggestions"
  ON public.variant_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (submitter_id = auth.uid());

-- SELECT: submitter reads own; brand owners read pending for their brand;
-- admins read everything.
CREATE POLICY "Submitter reads own variant suggestions"
  ON public.variant_suggestions FOR SELECT
  TO authenticated
  USING (submitter_id = auth.uid());

CREATE POLICY "Brand owners read pending for their brand"
  ON public.variant_suggestions FOR SELECT
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.brands b
       WHERE b.id = variant_suggestions.brand_id
         AND b.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins read all variant suggestions"
  ON public.variant_suggestions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- UPDATE: admins only. Brand owners can approve suggestions for their own
-- brand — enforced at the app layer since RLS on UPDATE doesn't easily
-- express "brand owner can update rows where brand.owner_id = auth.uid()".
-- App layer routes /api/admin/variant-suggestions/* and
-- /api/brand-dashboard/variant-suggestions/* both use the admin client
-- for the actual UPDATE.
CREATE POLICY "Admins update variant suggestions"
  ON public.variant_suggestions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete variant suggestions"
  ON public.variant_suggestions FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ─── 7. Approval trigger — increment submitter's contribution counter ────
-- Fires when status transitions to 'approved'. Bumps
-- profiles.approved_variant_contributions by 1 for the submitter (unless
-- submitter deleted their account, in which case submitter_id is NULL
-- and the update is a no-op).

CREATE OR REPLACE FUNCTION public.variant_suggestion_credit_contributor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only fire on the transition INTO 'approved' — not on subsequent
  -- updates that happen to leave status = 'approved' (e.g., admin_notes
  -- edit).
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.submitter_id IS NOT NULL THEN
      UPDATE public.profiles
         SET approved_variant_contributions = approved_variant_contributions + 1
       WHERE id = NEW.submitter_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.variant_suggestion_credit_contributor() IS
  '2026-07-16 T158/Commit B. Fires on variant_suggestions transition to '
  'approved. Increments submitter contribution counter for future badge '
  'system.';

DROP TRIGGER IF EXISTS variant_suggestions_credit_contributor ON public.variant_suggestions;
CREATE TRIGGER variant_suggestions_credit_contributor
  AFTER UPDATE ON public.variant_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.variant_suggestion_credit_contributor();


-- ─── 8. Column comments ──────────────────────────────────────────────────

COMMENT ON COLUMN public.variant_suggestions.brand_id IS
  'The brand this variant suggestion applies to. Required — the wizard '
  'always has a brand_id in scope when the suggest-a-variant CTA fires.';

COMMENT ON COLUMN public.variant_suggestions.base_type IS
  'The base type the user was viewing when they submitted. Stored as enum '
  'so DB rejects invalid values. Admin can override to a different base '
  'at approval time if the user picked wrong.';

COMMENT ON COLUMN public.variant_suggestions.resolved_subtype_id IS
  'On approve: the subtype (either pre-existing or admin-created at '
  'approval time) that the variant maps to. Enables the wizard to render '
  'the picker with the canonical name post-approval.';

COMMENT ON COLUMN public.variant_suggestions.resolved_brand_variant_id IS
  'On approve: the brand_variants row created from this suggestion. '
  'Enables the wizard to render brand-specific display + aliases going '
  'forward.';

COMMENT ON COLUMN public.variant_suggestions.admin_notes IS
  'Private admin-only notes. Never surfaced to the submitter (their copy '
  'of the resolution is the notification body).';
