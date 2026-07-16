-- 20260716000075_remove_clay_base_type.sql
--
-- [Phase 1 of taxonomy rework, per docs/handoffs/2026-07-15-taxonomy-rework-plan.md]
--
-- WHAT
-- ----
-- Removes 'clay' from the public.slime_base_type enum. Ends at 19 values.
-- Per Jenn's V4.1 guide + Section 5 signoff: Clay is not a real base type; it
-- was a redundant alias for Butter (both are clay-heavy at the ingredient
-- level). Japanese Clay + Korean Clay end up as butter variants in Phase 2.
--
-- WHY IT'S SAFE TO SHIP NOW
-- -------------------------
-- Verified at 2026-07-15 via
--   SELECT count(*) FROM public.slimes           WHERE base_type = 'clay'; -- 0
--   SELECT count(*) FROM public.collection_logs  WHERE base_type = 'clay'; -- 0
--   SELECT count(*) FROM public.subtypes         WHERE base_type = 'clay'; -- 0
-- Zero rows tied to clay across the three primary tables that carry the enum.
--
-- First attempt on 2026-07-16 failed with SQLSTATE 2BP01 because a FOURTH
-- table also carries the enum: public.drop_slimes.base_type, added by
-- migration 20260516000043_drops_overhaul.sql. Postgres refused to DROP
-- the old enum type while drop_slimes.base_type still referenced it. The
-- whole transaction rolled back — no drift, no orphans — and this rewrite
-- adds drop_slimes to every backfill / retype step. drop_slimes clay-row
-- count is assumed 0 (same real-world state as the other three tables)
-- but the defensive UPDATE handles any straggler either way.
--
-- The UPDATE + sanity DO block stays in as defense-in-depth safety net in
-- case rows land between the pre-check and migration apply — same-txn
-- backfill means the ALTER TABLE ... USING (::text::new_enum) cast can't
-- hit an unmappable value.
--
-- WHY WE CAN'T "JUST DROP THE VALUE"
-- ----------------------------------
-- Postgres does not support DROP VALUE on an enum type in use. Workaround:
-- create a parallel enum, migrate columns onto it, drop the old type. That's
-- exactly what migration 20260509000037 (T71 base_type_taxonomy) did when it
-- collapsed the 51-value slime_type enum into the 20-value slime_base_type.
-- We follow the same pattern, including the view drop-and-recreate dance
-- (three views depend on base_type).
--
-- ROLLBACK
-- --------
-- Destructive by design. If a bad deploy needs to be undone, restore from
-- the Supabase database snapshot Vercel takes on migration apply, then
-- re-run any migrations that landed after the restore point.
--
-- SEQUENCE NOTE
-- -------------
-- The taxonomy plan referenced this migration as `20260716000069_clay_removal.sql`
-- but that number pre-dates migrations 070-074 that shipped between plan-write
-- and Phase 1 execution. Renumbered to 075 to preserve strict ascending order.

BEGIN;

-- ─── 1. Backfill (defensive) ──────────────────────────────────────────────
-- Any row currently tagged 'clay' becomes 'butter'. Runs while the old enum
-- still accepts both values. Zero rows are expected per the pre-check above.

UPDATE public.slimes           SET base_type = 'butter' WHERE base_type = 'clay';
UPDATE public.collection_logs  SET base_type = 'butter' WHERE base_type = 'clay';

-- Subtypes tagged with base_type = 'clay' would prevent the enum swap since
-- subtypes.base_type also references the enum. Reassign to butter for the
-- same reason. Zero rows expected.
UPDATE public.subtypes         SET base_type = 'butter' WHERE base_type = 'clay';

-- drop_slimes.base_type (added by migration 20260516000043_drops_overhaul.sql)
-- also references slime_base_type. Missed on the first attempt — the DROP
-- TYPE step failed on this dependency. Reassign clay → butter here too.
UPDATE public.drop_slimes      SET base_type = 'butter' WHERE base_type = 'clay';


-- ─── 2. Sanity check — no clay rows remain ────────────────────────────────

DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM public.slimes           WHERE base_type::text = 'clay';
  IF remaining > 0 THEN RAISE EXCEPTION 'slimes still has % clay rows, backfill failed', remaining; END IF;

  SELECT count(*) INTO remaining FROM public.collection_logs  WHERE base_type::text = 'clay';
  IF remaining > 0 THEN RAISE EXCEPTION 'collection_logs still has % clay rows, backfill failed', remaining; END IF;

  SELECT count(*) INTO remaining FROM public.subtypes         WHERE base_type::text = 'clay';
  IF remaining > 0 THEN RAISE EXCEPTION 'subtypes still has % clay rows, backfill failed', remaining; END IF;

  SELECT count(*) INTO remaining FROM public.drop_slimes      WHERE base_type::text = 'clay';
  IF remaining > 0 THEN RAISE EXCEPTION 'drop_slimes still has % clay rows, backfill failed', remaining; END IF;
END $$;


-- ─── 3. Drop the three views that depend on base_type ─────────────────────
-- Same pattern as migration 20260509000037 (steps 6a + 11-13). Views must be
-- dropped before the column type change and recreated after.

DROP VIEW IF EXISTS public.top_rated_slimes;
DROP VIEW IF EXISTS public.brand_top_slimes;
DROP VIEW IF EXISTS public.user_collection_summary;


-- ─── 4. Create the new 19-value enum ──────────────────────────────────────
-- Rename the current enum to _old, create a fresh enum without 'clay', then
-- retype the columns. Alphabetical order (identical to migration 37) minus
-- the 'clay' entry that sat between 'butter' and 'clear'.

ALTER TYPE public.slime_base_type RENAME TO slime_base_type_old;

CREATE TYPE public.slime_base_type AS ENUM (
  'avalanche',
  'beaded',
  'butter',
  'clear',
  'cloud',
  'cloud_cream',
  'floam',
  'fluffy',
  'hybrid',
  'icee',
  'jelly',
  'magnetic',
  'sand',
  'slay',
  'snow_fizz',
  'sugar_scrub',
  'thick_and_glossy',
  'water',
  'wax_and_wax_cracking'
);


-- ─── 5. Retype the three columns onto the new enum ────────────────────────
-- USING (base_type::text::public.slime_base_type) casts every existing value
-- to text and back into the new enum. Because we backfilled 'clay' → 'butter'
-- in step 1, every remaining text value is present in the new enum and the
-- cast succeeds. If a value slipped through, Postgres raises here and the
-- transaction rolls back.

ALTER TABLE public.slimes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);

ALTER TABLE public.collection_logs
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);

ALTER TABLE public.subtypes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);

-- drop_slimes.base_type was the missed table on the first attempt. Retype
-- the same way. Column is nullable per migration 20260516000043 so the
-- cast is straightforward.
ALTER TABLE public.drop_slimes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);


-- ─── 6. Drop the old enum ─────────────────────────────────────────────────
-- Safe now — no columns reference slime_base_type_old.

DROP TYPE public.slime_base_type_old;


-- ─── 7. Recreate the three views against the new enum ─────────────────────
-- Copy-paste of migration 20260509000037 steps 11-13 with security_invoker
-- preserved. Query semantics unchanged; only the enum type behind
-- s.base_type differs.

CREATE VIEW public.top_rated_slimes
  WITH (security_invoker = true)
AS
SELECT
  s.id,
  s.name,
  s.base_type,
  b.name AS brand_name,
  b.slug AS brand_slug,
  s.avg_overall,
  s.avg_texture,
  s.avg_scent,
  s.avg_sound,
  s.avg_drizzle,
  s.avg_creativity,
  s.total_ratings,
  s.image_url
FROM public.slimes s
JOIN public.brands b ON b.id = s.brand_id
WHERE s.total_ratings >= 3
ORDER BY s.avg_overall DESC NULLS LAST, s.total_ratings DESC;


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
  count(cl.id) AS total_logs
FROM public.slimes s
LEFT JOIN public.collection_logs cl ON cl.slime_id = s.id
WHERE s.is_brand_official = true
GROUP BY s.brand_id, s.id, s.name, s.base_type, s.avg_overall, s.total_ratings;


CREATE VIEW public.user_collection_summary
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  count(*) FILTER (WHERE in_collection = true)         AS total_in_collection,
  count(*) FILTER (WHERE in_wishlist = true)           AS total_in_wishlist,
  count(*) FILTER (WHERE rating_overall IS NOT NULL)   AS total_rated,
  round(avg(rating_overall), 2)                        AS avg_overall_given,
  count(DISTINCT brand_id)                             AS distinct_brands_tried,
  count(DISTINCT base_type::text)                      AS distinct_types_tried
FROM public.collection_logs
GROUP BY user_id;

COMMIT;
