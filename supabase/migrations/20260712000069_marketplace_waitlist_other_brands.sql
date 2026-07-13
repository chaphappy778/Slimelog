-- 2026-07-12 — Marketplace waitlist "Other brands" free-text column.
--
-- Users kept telling us "I'd buy from X brand" where X isn't in the
-- catalog yet, so the brand-chips multi-select is getting a free-text
-- "Other" chip that opens an input. Multiple freeform brand names are
-- captured as a text[] alongside the existing brand_ids uuid[].
--
-- Depends: 20260712000068_marketplace_waitlist.sql

BEGIN;

ALTER TABLE public.marketplace_waitlist
  ADD COLUMN IF NOT EXISTS brand_names_other text[];

COMMENT ON COLUMN public.marketplace_waitlist.brand_names_other IS
  'Free-text brand names entered via the "Other" chip on the research panel. Useful for spotting brands worth adding to the catalog before marketplace launch.';

COMMIT;
