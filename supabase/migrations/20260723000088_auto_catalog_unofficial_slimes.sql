-- Track 1b: unofficial community catalog auto-creation
-- 2026-07-23: when a user logs a slime that has no catalog match, the
-- server auto-creates an unofficial (is_brand_official=false) slimes row
-- for the (brand_id, name) pair. Brand owner can later curate. This
-- unblocks analytics for brands that haven't seeded a catalog yet.

BEGIN;

-- Normalized name column for dedup. Keep the display `name` as-is.
ALTER TABLE public.slimes
  ADD COLUMN IF NOT EXISTS name_normalized text;

-- Backfill existing rows using the same normalization the server will
-- apply on new inserts: trim, lowercase, collapse internal whitespace.
-- (Mirror of apps/web/lib/normalize.ts and the JS in slime-actions.ts.)
UPDATE public.slimes
  SET name_normalized = LOWER(REGEXP_REPLACE(TRIM(name), '\s+', ' ', 'g'))
  WHERE name_normalized IS NULL;

-- Dedup guard BEFORE the unique index. A partial unique index cannot be
-- built if two existing rows already share (brand_id, name_normalized) —
-- a single collision would roll the whole migration back (see
-- docs/error-tracker.md: "a unique index cannot be created over existing
-- duplicates"). Collisions are unlikely in the small pre-launch catalog,
-- but we make the push un-failable without destroying data: keep the
-- earliest row's name_normalized and NULL the rest. Because the index is
-- partial (WHERE name_normalized IS NOT NULL), the NULLed rows are simply
-- excluded from the dedup guarantee. They stay fully intact, keep their
-- display `name`, and remain matchable by ILIKE on `name`. No slimes rows
-- are deleted, so no collection_logs.slime_id is orphaned.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY brand_id, name_normalized
      ORDER BY created_at, id
    ) AS rn
  FROM public.slimes
  WHERE name_normalized IS NOT NULL
)
UPDATE public.slimes s
  SET name_normalized = NULL
  FROM ranked r
  WHERE s.id = r.id
    AND r.rn > 1;

-- Partial unique index on (brand_id, name_normalized). Two users logging
-- the same slime for the same brand simultaneously converge on one row;
-- the second insert raises 23505 and the server action reads back the
-- winning row's id.
CREATE UNIQUE INDEX IF NOT EXISTS slimes_brand_name_normalized_uidx
  ON public.slimes (brand_id, name_normalized)
  WHERE name_normalized IS NOT NULL;

-- Widen brand_top_slimes view: drop the is_brand_official filter so
-- unofficial rows show up in the Top Slimes chart (it answers "what are
-- people logging", so community/unofficial rows belong). Consumers that
-- ever need official-only can filter on the is_official flag now carried
-- in the SELECT list. All previously-selected columns are preserved;
-- is_official is purely additive.
DROP VIEW IF EXISTS public.brand_top_slimes;

CREATE VIEW public.brand_top_slimes
  WITH (security_invoker = true)
AS
SELECT
  s.brand_id,
  s.id,
  s.name,
  s.base_type,
  s.avg_overall,
  s.total_ratings,
  s.is_brand_official AS is_official,
  count(cl.id) AS total_logs
FROM public.slimes s
LEFT JOIN public.collection_logs cl ON cl.slime_id = s.id
GROUP BY s.brand_id, s.id, s.name, s.base_type, s.avg_overall, s.total_ratings, s.is_brand_official;

COMMIT;
