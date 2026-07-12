-- 2026-07-12: T110 follow-up — brand-scout stats + duplicate-hint helper.
--
-- Depends: 20260711000065_brand_suggestions.sql
--
-- Context
-- -------
-- T110 shipped the community brand-suggestion pipeline. This migration
-- adds the "how much has this user scouted?" counter that (a) relaxes
-- the rate limit for users with at least one approved suggestion and
-- (b) powers the Brand Scout badge (T112) without recomputing from
-- brand_suggestions on every profile pageview.
--
-- What lands here
-- ---------------
--   1. profiles.approved_brand_suggestions_count column, guarded by a
--      >= 0 check constraint and locked against user writes via HP-8.
--   2. tg_brand_suggestion_scout_count() — AFTER-row trigger that
--      keeps the counter in sync on INSERT / UPDATE / DELETE of
--      brand_suggestions rows, including the submitter_id-changed edge
--      case where both statuses were approved.
--   3. Backfill for existing approved suggestions.
--   4. find_potential_brand_duplicates(text) SECURITY DEFINER RPC that
--      the admin queue uses to surface potential collisions to
--      reviewers before they approve a suggestion. Called from the
--      server-side admin client only (execute grant scoped to
--      service_role).

-- ─── 1. Counter column ───────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_brand_suggestions_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'profiles_approved_brand_suggestions_count_nonneg'
       AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_approved_brand_suggestions_count_nonneg
      CHECK (approved_brand_suggestions_count >= 0);
  END IF;
END;
$$;

COMMENT ON COLUMN public.profiles.approved_brand_suggestions_count IS
  'Lifetime count of brand suggestions this user has submitted that are '
  'currently in the approved state. Maintained by the '
  'tg_brand_suggestion_scout_count trigger on brand_suggestions. Locked '
  'against direct user writes via the HP-8 protect trigger (mig 66 extension).';

-- ─── 2. Extend HP-8 to protect the new counter ──────────────────────────────
-- The counter is trigger-maintained. Without this, a regular user could
-- self-award scout credit via a PATCH on their own profile row and
-- unlock the relaxed rate limit + Brand Scout badge without ever
-- shipping an approved suggestion.

CREATE OR REPLACE FUNCTION public.profiles_protect_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  -- Billing/trust columns (audit HP-8)
  NEW.is_premium                        := OLD.is_premium;
  NEW.is_verified                       := OLD.is_verified;
  NEW.stripe_customer_id                := OLD.stripe_customer_id;
  NEW.subscription_tier                 := OLD.subscription_tier;
  NEW.subscription_status               := OLD.subscription_status;
  NEW.subscription_current_period_end   := OLD.subscription_current_period_end;
  NEW.subscription_cancel_at_period_end := OLD.subscription_cancel_at_period_end;

  -- Admin role (audit HP-9)
  NEW.role := OLD.role;

  -- Referral program columns (mig 62 / issue #5+#30)
  NEW.referral_code             := OLD.referral_code;
  NEW.referred_by_user_id       := OLD.referred_by_user_id;
  NEW.referral_activations      := OLD.referral_activations;
  NEW.pro_credit_months         := OLD.pro_credit_months;
  -- Idempotency flag (mig 63)
  NEW.referral_activation_fired := OLD.referral_activation_fired;

  -- Brand scout counter (mig 66)
  NEW.approved_brand_suggestions_count := OLD.approved_brand_suggestions_count;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.profiles_protect_billing_columns() IS
  'Audit HP-8/#9 (mig 50/51/59) + referral schema (mig 62) + activation '
  'flag (mig 63) + brand scout counter (mig 66). Reverts unauthorized '
  'changes to billing/trust/referral/scout columns. Bypasses when called '
  'by any role other than authenticated/anon.';

-- ─── 3. Counter-maintenance trigger ─────────────────────────────────────────
-- Rules
--   INSERT   status='approved'                      -> +1 to submitter
--   UPDATE   old != approved AND new = approved     -> +1 to new.submitter
--   UPDATE   old = approved AND new != approved     -> -1 from old.submitter
--   UPDATE   both approved AND submitter_id changed -> -1 old / +1 new
--   DELETE   status='approved'                      -> -1 from submitter
-- Decrements clamp at 0 with GREATEST so a mid-flight admin correction
-- can't push the check constraint into a rollback.
-- SECURITY DEFINER so the profiles UPDATE bypasses the HP-8 lock on
-- the counter column.

CREATE OR REPLACE FUNCTION public.tg_brand_suggestion_scout_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' AND NEW.submitter_id IS NOT NULL THEN
      UPDATE public.profiles
         SET approved_brand_suggestions_count = approved_brand_suggestions_count + 1
       WHERE id = NEW.submitter_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Edge case: submitter_id changed while both statuses were approved.
    IF OLD.status = 'approved'
       AND NEW.status = 'approved'
       AND COALESCE(OLD.submitter_id::text, '') <> COALESCE(NEW.submitter_id::text, '') THEN
      IF OLD.submitter_id IS NOT NULL THEN
        UPDATE public.profiles
           SET approved_brand_suggestions_count =
                 GREATEST(approved_brand_suggestions_count - 1, 0)
         WHERE id = OLD.submitter_id;
      END IF;
      IF NEW.submitter_id IS NOT NULL THEN
        UPDATE public.profiles
           SET approved_brand_suggestions_count = approved_brand_suggestions_count + 1
         WHERE id = NEW.submitter_id;
      END IF;
      RETURN NEW;
    END IF;

    -- Not approved -> approved: increment on new.submitter_id.
    IF OLD.status <> 'approved' AND NEW.status = 'approved' THEN
      IF NEW.submitter_id IS NOT NULL THEN
        UPDATE public.profiles
           SET approved_brand_suggestions_count = approved_brand_suggestions_count + 1
         WHERE id = NEW.submitter_id;
      END IF;
      RETURN NEW;
    END IF;

    -- Approved -> not approved: decrement on old.submitter_id.
    IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
      IF OLD.submitter_id IS NOT NULL THEN
        UPDATE public.profiles
           SET approved_brand_suggestions_count =
                 GREATEST(approved_brand_suggestions_count - 1, 0)
         WHERE id = OLD.submitter_id;
      END IF;
      RETURN NEW;
    END IF;

    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'approved' AND OLD.submitter_id IS NOT NULL THEN
      UPDATE public.profiles
         SET approved_brand_suggestions_count =
               GREATEST(approved_brand_suggestions_count - 1, 0)
       WHERE id = OLD.submitter_id;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.tg_brand_suggestion_scout_count() IS
  'Maintains profiles.approved_brand_suggestions_count as brand_suggestions '
  'rows change. SECURITY DEFINER so the profiles UPDATE bypasses the HP-8 '
  'lock on this counter column.';

DROP TRIGGER IF EXISTS brand_suggestions_scout_count ON public.brand_suggestions;
CREATE TRIGGER brand_suggestions_scout_count
  AFTER INSERT OR UPDATE OR DELETE ON public.brand_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_brand_suggestion_scout_count();

-- ─── 4. Backfill ────────────────────────────────────────────────────────────

UPDATE public.profiles p
   SET approved_brand_suggestions_count = COALESCE(t.n, 0)
  FROM (
    SELECT submitter_id, count(*) AS n
      FROM public.brand_suggestions
     WHERE status = 'approved'
       AND submitter_id IS NOT NULL
     GROUP BY submitter_id
  ) t
 WHERE p.id = t.submitter_id;

-- ─── 5. Duplicate-hint RPC ──────────────────────────────────────────────────
-- Returns up to 5 brands whose name overlaps the given suggestion name
-- in either direction (brand.name contains p_name OR p_name contains
-- brand.name). Catches the "Cloud Nine" <-> "Cloud Nine Slimes" case
-- that a plain name equality check would miss.
--
-- SECURITY DEFINER + execute grant scoped to service_role because the
-- only caller is the server-side admin client on the /admin/brand-
-- suggestions queue.

CREATE OR REPLACE FUNCTION public.find_potential_brand_duplicates(p_name text)
RETURNS TABLE (id uuid, slug text, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT b.id, b.slug, b.name
    FROM public.brands b
   WHERE p_name IS NOT NULL
     AND length(trim(p_name)) > 0
     AND (
       lower(b.name) LIKE '%' || lower(trim(p_name)) || '%'
       OR lower(trim(p_name)) LIKE '%' || lower(b.name) || '%'
     )
   ORDER BY b.name
   LIMIT 5;
$$;

COMMENT ON FUNCTION public.find_potential_brand_duplicates(text) IS
  'Admin queue helper (T110 mig 66). Given a suggested brand name, returns '
  'up to 5 brands whose name overlaps in either direction. Called from the '
  'server-side admin client on /admin/brand-suggestions before approve.';

REVOKE ALL ON FUNCTION public.find_potential_brand_duplicates(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_potential_brand_duplicates(text)
  TO service_role;
