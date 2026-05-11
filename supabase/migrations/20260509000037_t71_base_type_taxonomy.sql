-- Migration: 20260509000037_t71_base_type_taxonomy
-- Tables altered: collection_logs (TRUNCATEd, slime_type column dropped, base_type and subtype_id added),
--                 slimes (slime_type column dropped, base_type and subtype_id added with backfill)
-- Tables dropped: slime_type_reference (51-row metadata table — redundant under new model;
--                 base type metadata now lives in apps/web/lib/types.ts SLIME_BASE_TYPE_LABELS,
--                 subtype metadata lives in public.subtypes)
-- Views recreated: top_rated_slimes, brand_top_slimes, user_collection_summary
--                  (slime_type column references swapped to base_type — consumers swept in G3)
-- New objects: slime_base_type enum, subtypes table, 31 seeded subtype rows (across 17 unique subtypes — Crunchy under both Floam and Snow Fizz)
-- Reason: T71 — replace flat 51-type enum with 20-base-type + extensible subtypes model.
--         All collection_logs data is throwaway test data and is wiped.
--         slimes catalog (~10 rows) is backfilled onto base_type per locked mapping.
--         Three views depended on slime_type columns and one reference table used the enum directly.
--         All four objects are handled in dependency order: views dropped before column drops,
--         column drops auto-drop their indexes, reference table dropped before enum drop,
--         views recreated against base_type at end.
--         All three views had security_invoker = true set by prior migrations — preserved.

BEGIN;

-- 1. Create slime_base_type enum with 20 values in alphabetical order

CREATE TYPE public.slime_base_type AS ENUM (
  'avalanche',
  'beaded',
  'butter',
  'clay',
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

-- 2. Create subtypes table

CREATE TABLE public.subtypes (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  base_type           slime_base_type NOT NULL,
  name                text          NOT NULL,
  slug                text          NOT NULL,
  created_by          uuid          NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_brand_id uuid          NULL REFERENCES public.brands(id) ON DELETE SET NULL,
  is_admin_approved   boolean       NOT NULL DEFAULT false,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT subtypes_base_slug_unique UNIQUE (base_type, slug)
);

CREATE INDEX subtypes_base_type_idx ON public.subtypes(base_type);
CREATE INDEX subtypes_admin_approved_idx ON public.subtypes(is_admin_approved) WHERE is_admin_approved = true;

ALTER TABLE public.subtypes ENABLE ROW LEVEL SECURITY;

-- Subtypes RLS:
--   - Anyone authenticated can read approved subtypes
--   - Anyone authenticated can read their own pending submissions
--   - Admins can read all (uses public.is_admin() from migration 20260506000034)
--   - Authenticated users can insert pending subtypes
--   - Brand owners can insert auto-approved subtypes (handled in app layer; RLS allows insert)
--   - Only admins can update or delete

CREATE POLICY "Authenticated users can read approved subtypes"
  ON public.subtypes FOR SELECT
  TO authenticated
  USING (is_admin_approved = true);

CREATE POLICY "Users can read their own pending subtypes"
  ON public.subtypes FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Admins can read all subtypes"
  ON public.subtypes FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated users can suggest subtypes"
  ON public.subtypes FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update subtypes"
  ON public.subtypes FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete subtypes"
  ON public.subtypes FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 3. Seed subtypes from locked 51 -> 20 mapping
--
-- Locked mapping (Crunchy is intentionally seeded under both Floam and Snow Fizz —
-- (base_type, slug) is the unique key, so this is two distinct rows by design):
--
-- Clear: Glossy, Holographic, Pearl, Metallic, Galaxy, Thermochromic, Glow in the Dark
-- Jelly: Thiggly, Jelly Cube, Jelly Puff
-- Icee: Slushee
-- Thick & Glossy: Thicky
-- Slay: Sally Butter, Custard, Cream Cheese, Nougat
-- Cloud: Cloud Fizz, Cloud Dough, Mousse Fizz, Chiffon Fizz
-- Cloud Cream: Mochi, Putty Puff
-- Floam: Float, Crunchy
-- Snow Fizz: Bingsu, Crunchy
-- Beaded: Fishbowl Beads, Bead Bomb, Micro Dough
-- Wax & Wax Cracking: Wax Cracking
-- Water: Jiggly
--
-- All other base types have no seeded subtypes at this time.

INSERT INTO public.subtypes (base_type, name, slug, is_admin_approved) VALUES
  ('clear', 'Glossy', 'glossy', true),
  ('clear', 'Holographic', 'holographic', true),
  ('clear', 'Pearl', 'pearl', true),
  ('clear', 'Metallic', 'metallic', true),
  ('clear', 'Galaxy', 'galaxy', true),
  ('clear', 'Thermochromic', 'thermochromic', true),
  ('clear', 'Glow in the Dark', 'glow_in_the_dark', true),
  ('jelly', 'Thiggly', 'thiggly', true),
  ('jelly', 'Jelly Cube', 'jelly_cube', true),
  ('jelly', 'Jelly Puff', 'jelly_puff', true),
  ('icee', 'Slushee', 'slushee', true),
  ('thick_and_glossy', 'Thicky', 'thicky', true),
  ('slay', 'Sally Butter', 'sally_butter', true),
  ('slay', 'Custard', 'custard', true),
  ('slay', 'Cream Cheese', 'cream_cheese', true),
  ('slay', 'Nougat', 'nougat', true),
  ('cloud', 'Cloud Fizz', 'cloud_fizz', true),
  ('cloud', 'Cloud Dough', 'cloud_dough', true),
  ('cloud', 'Mousse Fizz', 'mousse_fizz', true),
  ('cloud', 'Chiffon Fizz', 'chiffon_fizz', true),
  ('cloud_cream', 'Mochi', 'mochi', true),
  ('cloud_cream', 'Putty Puff', 'putty_puff', true),
  ('floam', 'Float', 'float', true),
  ('floam', 'Crunchy', 'crunchy', true),
  ('snow_fizz', 'Bingsu', 'bingsu', true),
  ('snow_fizz', 'Crunchy', 'crunchy', true),
  ('beaded', 'Fishbowl Beads', 'fishbowl_beads', true),
  ('beaded', 'Bead Bomb', 'bead_bomb', true),
  ('beaded', 'Micro Dough', 'micro_dough', true),
  ('wax_and_wax_cracking', 'Wax Cracking', 'wax_cracking', true),
  ('water', 'Jiggly', 'jiggly', true);

-- 4. Add new columns to slimes (nullable initially for backfill)

ALTER TABLE public.slimes
  ADD COLUMN base_type   slime_base_type NULL,
  ADD COLUMN subtype_id  uuid            NULL REFERENCES public.subtypes(id) ON DELETE SET NULL;

-- 5. Backfill slimes.base_type from existing slimes.slime_type
--
-- For each of the 51 old slime_type values, map to the canonical base_type.
-- Subtypes are NOT auto-populated on existing slimes — slimes that were
-- logged under what is now a subtype name (e.g. an old slime with slime_type='mochi')
-- get base_type='cloud_cream' and subtype_id=NULL. The brand owner can edit
-- the slime later to add the specific subtype.

UPDATE public.slimes SET base_type = CASE slime_type::text
  -- Direct 1:1 base mappings
  WHEN 'avalanche'         THEN 'avalanche'::slime_base_type
  WHEN 'beaded'            THEN 'beaded'::slime_base_type
  WHEN 'butter'            THEN 'butter'::slime_base_type
  WHEN 'clay'              THEN 'clay'::slime_base_type
  WHEN 'clear'             THEN 'clear'::slime_base_type
  WHEN 'cloud'             THEN 'cloud'::slime_base_type
  WHEN 'cloud_cream'       THEN 'cloud_cream'::slime_base_type
  WHEN 'floam'             THEN 'floam'::slime_base_type
  WHEN 'fluffy'            THEN 'fluffy'::slime_base_type
  WHEN 'hybrid'            THEN 'hybrid'::slime_base_type
  WHEN 'icee'              THEN 'icee'::slime_base_type
  WHEN 'jelly'             THEN 'jelly'::slime_base_type
  WHEN 'magnetic'          THEN 'magnetic'::slime_base_type
  WHEN 'sand'              THEN 'sand'::slime_base_type
  WHEN 'slay'              THEN 'slay'::slime_base_type
  WHEN 'snow_fizz'         THEN 'snow_fizz'::slime_base_type
  WHEN 'sugar_scrub'       THEN 'sugar_scrub'::slime_base_type
  WHEN 'thick_and_glossy'  THEN 'thick_and_glossy'::slime_base_type
  WHEN 'water'             THEN 'water'::slime_base_type
  WHEN 'wax'               THEN 'wax_and_wax_cracking'::slime_base_type
  -- Subtype-of-Clear mappings
  WHEN 'glossy'            THEN 'clear'::slime_base_type
  WHEN 'holographic'       THEN 'clear'::slime_base_type
  WHEN 'pearl'             THEN 'clear'::slime_base_type
  WHEN 'metallic'          THEN 'clear'::slime_base_type
  WHEN 'galaxy'            THEN 'clear'::slime_base_type
  WHEN 'thermochromic'     THEN 'clear'::slime_base_type
  WHEN 'glow_in_the_dark'  THEN 'clear'::slime_base_type
  WHEN 'glitter'           THEN 'clear'::slime_base_type
  -- Subtype-of-Jelly mappings
  WHEN 'thiggly'           THEN 'jelly'::slime_base_type
  WHEN 'jelly_cube'        THEN 'jelly'::slime_base_type
  WHEN 'jelly_puff'        THEN 'jelly'::slime_base_type
  -- Subtype-of-Icee mappings
  WHEN 'slushee'           THEN 'icee'::slime_base_type
  -- Subtype-of-Thick & Glossy mappings
  WHEN 'thicky'            THEN 'thick_and_glossy'::slime_base_type
  -- Subtype-of-Slay mappings
  WHEN 'sally_butter'      THEN 'slay'::slime_base_type
  WHEN 'custard'           THEN 'slay'::slime_base_type
  WHEN 'cream_cheese'      THEN 'slay'::slime_base_type
  WHEN 'nougat'            THEN 'slay'::slime_base_type
  -- Subtype-of-Cloud mappings
  WHEN 'cloud_fizz'        THEN 'cloud'::slime_base_type
  WHEN 'cloud_dough'       THEN 'cloud'::slime_base_type
  WHEN 'mousse_fizz'       THEN 'cloud'::slime_base_type
  WHEN 'chiffon_fizz'      THEN 'cloud'::slime_base_type
  -- Subtype-of-Cloud Cream mappings
  WHEN 'mochi'             THEN 'cloud_cream'::slime_base_type
  WHEN 'putty_puff'        THEN 'cloud_cream'::slime_base_type
  -- Subtype-of-Floam mappings
  WHEN 'float'             THEN 'floam'::slime_base_type
  -- Subtype-of-Snow Fizz mappings
  WHEN 'bingsu'            THEN 'snow_fizz'::slime_base_type
  -- Subtype-of-Beaded mappings
  WHEN 'fishbowl_beads'    THEN 'beaded'::slime_base_type
  WHEN 'bead_bomb'         THEN 'beaded'::slime_base_type
  WHEN 'micro_dough'       THEN 'beaded'::slime_base_type
  -- Subtype-of-Wax & Wax Cracking mappings
  WHEN 'wax_cracking'      THEN 'wax_and_wax_cracking'::slime_base_type
  -- Subtype-of-Water mappings
  WHEN 'jiggly'            THEN 'water'::slime_base_type
  -- Crunchy is ambiguous (Floam OR Snow Fizz). Backfill defaults to Floam — brand owner can re-edit.
  WHEN 'crunchy'           THEN 'floam'::slime_base_type
  ELSE 'hybrid'::slime_base_type
END;

-- 6. Verify the backfill covered everything

DO $$
DECLARE
  unbackfilled_count integer;
BEGIN
  SELECT COUNT(*) INTO unbackfilled_count FROM public.slimes WHERE base_type IS NULL;
  IF unbackfilled_count > 0 THEN
    RAISE EXCEPTION 'slimes backfill failed: % rows still have NULL base_type', unbackfilled_count;
  END IF;
END $$;

-- 6a. Drop dependent views before dropping slime_type columns.
--     All three views are recreated against base_type at the end of this migration.
--     All three had security_invoker = true set by prior migrations — preserved on recreate.
--
--     top_rated_slimes        depends on slimes.slime_type
--     brand_top_slimes        depends on slimes.slime_type
--     user_collection_summary depends on collection_logs.slime_type

DROP VIEW IF EXISTS public.top_rated_slimes;
DROP VIEW IF EXISTS public.brand_top_slimes;
DROP VIEW IF EXISTS public.user_collection_summary;

-- 7. Make slimes.base_type NOT NULL and drop old slime_type column
--    Index slimes_type_idx is auto-dropped with the column.

ALTER TABLE public.slimes ALTER COLUMN base_type SET NOT NULL;
ALTER TABLE public.slimes DROP COLUMN slime_type;

CREATE INDEX slimes_base_type_idx ON public.slimes(base_type);

-- 8. Wipe collection_logs (all current data is throwaway test data)

TRUNCATE TABLE public.collection_logs CASCADE;

-- 9. Drop old slime_type column from collection_logs and add new columns
--    Index logs_type_idx is auto-dropped with the column.

ALTER TABLE public.collection_logs DROP COLUMN slime_type;

ALTER TABLE public.collection_logs
  ADD COLUMN base_type  slime_base_type NULL,
  ADD COLUMN subtype_id uuid            NULL REFERENCES public.subtypes(id) ON DELETE SET NULL;

CREATE INDEX collection_logs_base_type_idx ON public.collection_logs(base_type);

-- 9a. Drop slime_type_reference table.
--     This was a 51-row static metadata table (created by migration 20260404000018)
--     mirroring display_name, made_with, key_characteristics, what_to_rate, sort_order
--     for each of the legacy 51 types. Nothing in the app codebase queries it
--     (verified via grep). Under the new model:
--       - Base type display labels live in apps/web/lib/types.ts SLIME_BASE_TYPE_LABELS
--       - Subtype metadata lives in public.subtypes
--     The reference table is redundant. Drop and move on.

DROP TABLE IF EXISTS public.slime_type_reference;

-- 10. Drop the old slime_type enum

DROP TYPE public.slime_type;

-- 11. Recreate top_rated_slimes view against base_type.
--     Column renamed slime_type -> base_type. Consumers swept in G3.

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

-- 12. Recreate brand_top_slimes view against base_type.
--     Column renamed slime_type -> base_type. Consumers swept in G3.

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

-- 13. Recreate user_collection_summary view against base_type.
--     The DISTINCT count metric now operates on base_type::text instead of slime_type::text.
--     Semantically equivalent — counts distinct types a user has logged.
--     Since collection_logs was TRUNCATEd above, no historical metrics are affected.

CREATE VIEW public.user_collection_summary
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  count(*) FILTER (WHERE in_collection = true) AS total_in_collection,
  count(*) FILTER (WHERE in_wishlist = true) AS total_in_wishlist,
  count(*) FILTER (WHERE rating_overall IS NOT NULL) AS total_rated,
  round(avg(rating_overall), 2) AS avg_overall_given,
  count(DISTINCT brand_id) AS distinct_brands_tried,
  count(DISTINCT base_type::text) AS distinct_types_tried
FROM public.collection_logs
GROUP BY user_id;

COMMIT;
