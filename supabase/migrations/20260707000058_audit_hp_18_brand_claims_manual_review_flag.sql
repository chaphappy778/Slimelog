-- 2026-07-07 audit high-priority #18: brand claim skips domain match
-- when brand has no website_url.
--
-- Context
-- -------
-- Submit route (apps/web/app/api/brand-claims/submit/route.ts:119-130)
-- runs an email-domain match ONLY when brandRow.website_url is
-- truthy:
--
--   if (brandRow.website_url && !emailMatchesBrandDomain(...)) { 400 }
--
-- Brands with no website_url skip that check entirely — which happens
-- to be the fraud-prone case (small no-domain brands are the easiest
-- to impersonate). The email code + document upload still gate the
-- claim, but admins have no visible signal that "no domain match was
-- performed here."
--
-- Fix
-- ---
-- Add `requires_manual_review` boolean to brand_claims. Set to true
-- when the brand had no website_url at submit time. Admin queue and
-- detail pages display a warning badge on flagged claims so the
-- reviewer knows extra scrutiny is needed (document authenticity,
-- Instagram cross-check, etc.).
--
-- No state-machine change: verify-email still transitions to
-- pending_review the same way. The flag is a visual audit marker,
-- not a gate — admin review is already required for all claims to
-- reach 'approved', and this just tells the admin what kind of
-- review this one needs.
--
-- Backfill
-- --------
-- Sets the flag TRUE for existing claims whose brand currently has
-- no website_url. Approved claims are left untouched — they've
-- already been reviewed, so flipping the flag now would be noisy
-- without changing any decision.

ALTER TABLE public.brand_claims
  ADD COLUMN IF NOT EXISTS requires_manual_review boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.brand_claims.requires_manual_review IS
  'Audit high-priority #18 (2026-07-07). True when the brand had no '
  'website_url at claim submit time, so the email-domain match could '
  'not run. Admin queue displays this as a warning badge.';

-- Backfill: mark existing not-yet-approved claims for brands with no
-- website. Only rows in in-flight states (pending_email_verification
-- or pending_review) get updated — historical approved/rejected rows
-- are left alone.
UPDATE public.brand_claims bc
   SET requires_manual_review = true
  FROM public.brands b
 WHERE bc.brand_id = b.id
   AND (b.website_url IS NULL OR b.website_url = '')
   AND bc.status IN ('pending_email_verification', 'pending_review')
   AND bc.requires_manual_review = false;
