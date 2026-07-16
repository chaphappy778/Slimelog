-- 20260716000077_taxonomy_phase2_schema.sql
--
-- Taxonomy Phase 2 — schema changes per Jenn's Section 5 + 5-supplement
-- resolutions (see docs/handoffs/2026-07-15-taxonomy-rework-plan.md).
--
-- WHAT
-- ----
-- 1. RENAME base type `cloud_cream` → `snowbutter` (Section 5.1). "Cloud Cream"
--    and "Cloud Creme" become searchable aliases on the new snowbutter base.
-- 2. ADD `basic` as a new base type (Section 5.7, from Phase 2 scan finding).
--    3 shops merchandise "Basic" / "Base" as a top-level texture; Jenn ruled
--    to add it as canonical rather than route to Clear.
-- 3. Add `subtypes.aliases text[] NOT NULL DEFAULT '{}'` column (Section 6
--    of the plan). Two alias surfaces total when combined with the
--    brand_variants table introduced below.
-- 4. Reassign Crunchy subtype from Floam+Snow Fizz to Beaded (Section 5.2).
--    Migration 37 seeded Crunchy under both Floam and Snow Fizz; Jenn
--    decided it belongs solely under Beaded. Delete both old rows AFTER
--    reassigning any collection_logs / slimes rows that reference them.
-- 5. Reassign Bingsu subtype from Snow Fizz to Beaded (Section 5.3). Same
--    pattern — add new Beaded/Bingsu row, migrate FKs, delete the Snow Fizz
--    row.
-- 6. Add Clear/Jiggly subtype (Section 5.4). Jenn picked dual-home for
--    Jiggly — the existing Water/Jiggly row stays; this adds a sibling
--    under Clear so the wizard finds it under either base.
-- 7. Rename `Fishbowl Beads` → `Fishbowl` in place (Section 5.5). Same row
--    UUID, so no FK reassignment. `fishbowl beads` becomes an alias.
-- 8. Insert new canonical subtypes drawn from Jenn's xlsx (Section 4 of the
--    plan) plus high-confidence Phase 2 scan additions (Sugar Beads, Pony
--    Bead, Perlite, Ground Pumice, Ultra Thickie, Cereal, Coated Clear,
--    Gel Clear, Pigment Clear). ~30 new rows.
-- 9. Seed aliases[] arrays on canonical subtypes using verbatim spellings
--    observed across Jenn's xlsx + Phase 1 + Phase 2 scans.
-- 10. CREATE brand_variants join table (schema only — seeding happens
--     incrementally via admin UI or brand-owner claim flow, not bulk seed
--     in this migration). Schema per Section 6 of the plan.
--
-- WHAT'S NOT INCLUDED
-- -------------------
-- - `basic` base type has no seeded subtypes yet. Jenn to add via admin
--   suggestion flow after she decides what "Basic" actually IS in her guide
--   (starter tier? default white-glue? etc.). Guide entry gets a placeholder
--   tagline + gradient-only hero photo per Jenn 2026-07-16.
-- - brand_variants seed data — the table exists but is empty. Wizard's
--   brand-aware picker (Commit B) queries against it; empty rows just mean
--   the "suggest a variant" CTA fires for every brand+base combo until the
--   table populates. Faster than trying to bulk-seed hundreds of rows.
-- - skill_level attribute — separate Commit C per T158, decoupled from
--   taxonomy.
-- - `variant_suggestions` table + notification enum values — Commit B.
--
-- WHY THIS IS SAFE
-- ----------------
-- Same enum-surgery pattern as the clay removal (mig 075). Wrapped in a
-- single BEGIN...COMMIT so a mid-migration failure rolls back atomically.
-- Every FK-carrying column referencing slime_base_type gets retyped in
-- lockstep. Subtype reassignments delete only AFTER FK reassignment so no
-- orphans.
--
-- The slimes_protect_attribution trigger was already broadened to allow
-- postgres role writes by migration 076. subtype_id is NOT protected by
-- any trigger — we verified by grepping migrations for `NEW.subtype_id`.
--
-- ROLLBACK
-- --------
-- Destructive by design. If a bad deploy needs undoing, restore from the
-- Supabase DB snapshot Vercel takes on migration apply, then re-run any
-- migrations that landed after the restore point.

BEGIN;


-- ─── Section 1. Drop views that depend on base_type ───────────────────────
-- Same three views as mig 037 + mig 075: drop before column-type change,
-- recreate at end. security_invoker preserved on recreate.

DROP VIEW IF EXISTS public.top_rated_slimes;
DROP VIEW IF EXISTS public.brand_top_slimes;
DROP VIEW IF EXISTS public.user_collection_summary;


-- ─── Section 2. Enum surgery — rename + add ───────────────────────────────
-- Same pattern as mig 075 (clay removal). Postgres won't let us RENAME
-- an enum value OR add a value at an arbitrary position (only APPEND to
-- end), so we do a full rename-and-recreate.

ALTER TYPE public.slime_base_type RENAME TO slime_base_type_old;

-- New enum: 20 values total. Changes vs the 19-value post-clay enum:
--   - Added: `basic` (new base type per Jenn 2026-07-16, Section 5.7)
--   - Added: `snowbutter` (renames cloud_cream per Section 5.1)
--   - Removed: `cloud_cream` (replaced by snowbutter)
-- Ordered alphabetically. Note the ASCII sort quirk that makes 'snow_fizz'
-- sort BEFORE 'snowbutter' (underscore 0x5F < 'b' 0x62).

CREATE TYPE public.slime_base_type AS ENUM (
  'avalanche',
  'basic',
  'beaded',
  'butter',
  'clear',
  'cloud',
  'floam',
  'fluffy',
  'hybrid',
  'icee',
  'jelly',
  'magnetic',
  'sand',
  'slay',
  'snow_fizz',
  'snowbutter',
  'sugar_scrub',
  'thick_and_glossy',
  'water',
  'wax_and_wax_cracking'
);


-- ─── Section 3. Retype base_type columns with CASE-driven backfill ────────
-- USING (CASE ...) simultaneously casts to the new enum AND maps the old
-- `cloud_cream` value to `snowbutter`. Every other value keeps its text
-- and lands in the new enum unchanged. If any value doesn't exist in the
-- new enum, the cast raises and the transaction rolls back.

ALTER TABLE public.slimes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (
    CASE base_type::text
      WHEN 'cloud_cream' THEN 'snowbutter'::public.slime_base_type
      ELSE base_type::text::public.slime_base_type
    END
  );

ALTER TABLE public.collection_logs
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (
    CASE base_type::text
      WHEN 'cloud_cream' THEN 'snowbutter'::public.slime_base_type
      ELSE base_type::text::public.slime_base_type
    END
  );

ALTER TABLE public.subtypes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (
    CASE base_type::text
      WHEN 'cloud_cream' THEN 'snowbutter'::public.slime_base_type
      ELSE base_type::text::public.slime_base_type
    END
  );

ALTER TABLE public.drop_slimes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (
    CASE base_type::text
      WHEN 'cloud_cream' THEN 'snowbutter'::public.slime_base_type
      ELSE base_type::text::public.slime_base_type
    END
  );


-- ─── Section 4. Drop old enum ─────────────────────────────────────────────

DROP TYPE public.slime_base_type_old;


-- ─── Section 5. Recreate the three base_type-dependent views ──────────────
-- Copy-paste of migration 037 steps 11-13 with security_invoker preserved.
-- Query semantics unchanged; only the enum type behind s.base_type differs
-- (cloud_cream is now snowbutter, and basic joins the family).

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


-- ─── Section 6. Add subtypes.aliases text[] column ────────────────────────
-- Shared alias surface for canonical subtypes. Brand-specific aliases live
-- on brand_variants.aliases (Section 13). Wizard's search + typeahead
-- checks both when matching user input.

ALTER TABLE public.subtypes
  ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.subtypes.aliases IS
  'Shared spellings/variants for this canonical subtype. Wizard search and '
  'typeahead match against name + aliases[]. Brand-specific labels live on '
  'brand_variants.aliases.';


-- ─── Section 7. Move Crunchy from Floam+Snow Fizz to Beaded ───────────────
-- Section 5.2 resolution. Jenn: Crunchy belongs solely under Beaded.
-- Steps: create new Beaded/Crunchy → reassign FKs from old rows → delete
-- the two old rows.

INSERT INTO public.subtypes (base_type, name, slug, is_admin_approved, aliases)
VALUES (
  'beaded', 'Crunchy', 'crunchy', true,
  ARRAY['crunchy', 'crunchy slime', 'crunch', 'crunchy mixes', 'crunchy bomb']
);

DO $$
DECLARE
  new_crunchy_id uuid;
  old_ids uuid[];
BEGIN
  SELECT id INTO new_crunchy_id
    FROM public.subtypes
   WHERE base_type = 'beaded' AND slug = 'crunchy';

  SELECT array_agg(id) INTO old_ids
    FROM public.subtypes
   WHERE slug = 'crunchy' AND base_type IN ('floam', 'snow_fizz');

  IF new_crunchy_id IS NULL THEN
    RAISE EXCEPTION 'Beaded/Crunchy insert did not land — cannot reassign';
  END IF;

  IF old_ids IS NULL OR array_length(old_ids, 1) = 0 THEN
    RAISE NOTICE 'No old Crunchy rows found under Floam/Snow Fizz — skipping FK reassignment';
  ELSE
    UPDATE public.collection_logs
       SET subtype_id = new_crunchy_id
     WHERE subtype_id = ANY(old_ids);

    UPDATE public.slimes
       SET subtype_id = new_crunchy_id
     WHERE subtype_id = ANY(old_ids);

    DELETE FROM public.subtypes
     WHERE id = ANY(old_ids);
  END IF;
END $$;


-- ─── Section 8. Move Bingsu from Snow Fizz to Beaded ──────────────────────
-- Section 5.3 resolution. Same pattern as Crunchy — mig 37 seeded Bingsu
-- under Snow Fizz; Jenn wants a single canonical home under Beaded.

INSERT INTO public.subtypes (base_type, name, slug, is_admin_approved, aliases)
VALUES (
  'beaded', 'Bingsu', 'bingsu', true,
  ARRAY['bingsu', 'bingsu slime', 'bingsu beads', 'clear bingsu', 'bingsu textur']
);

DO $$
DECLARE
  new_bingsu_id uuid;
  old_ids uuid[];
BEGIN
  SELECT id INTO new_bingsu_id
    FROM public.subtypes
   WHERE base_type = 'beaded' AND slug = 'bingsu';

  SELECT array_agg(id) INTO old_ids
    FROM public.subtypes
   WHERE slug = 'bingsu' AND base_type = 'snow_fizz';

  IF new_bingsu_id IS NULL THEN
    RAISE EXCEPTION 'Beaded/Bingsu insert did not land — cannot reassign';
  END IF;

  IF old_ids IS NULL OR array_length(old_ids, 1) = 0 THEN
    RAISE NOTICE 'No old Bingsu row found under Snow Fizz — skipping FK reassignment';
  ELSE
    UPDATE public.collection_logs
       SET subtype_id = new_bingsu_id
     WHERE subtype_id = ANY(old_ids);

    UPDATE public.slimes
       SET subtype_id = new_bingsu_id
     WHERE subtype_id = ANY(old_ids);

    DELETE FROM public.subtypes
     WHERE id = ANY(old_ids);
  END IF;
END $$;


-- ─── Section 9. Add Clear/Jiggly (dual-home for Section 5.4) ──────────────
-- Existing Water/Jiggly row stays. This adds a sibling under Clear so the
-- wizard picker surfaces Jiggly for either base. Mild UX side-effect: a
-- user picking Water then Jiggly, and another user picking Clear then
-- Jiggly, both find it — matches how the market actually uses the term.

INSERT INTO public.subtypes (base_type, name, slug, is_admin_approved, aliases)
VALUES (
  'clear', 'Jiggly', 'jiggly', true,
  ARRAY['jiggly', 'coated jiggly', 'jiggly clear', 'thick clear']
);


-- ─── Section 10. Rename Fishbowl Beads → Fishbowl in place ────────────────
-- Section 5.5 resolution. Same row UUID so no FK reassignment. The shorter
-- form is what 4+ shops use canonically; `fishbowl beads` becomes an alias.

UPDATE public.subtypes
   SET name = 'Fishbowl',
       slug = 'fishbowl',
       aliases = ARRAY['fishbowl', 'fishbowl slime', 'fishbowl beads', 'fishbowl bead']
 WHERE slug = 'fishbowl_beads';


-- ─── Section 11. Insert new canonical subtypes ────────────────────────────
-- Draws from Section 4 of the plan (Jenn's xlsx-driven proposals) plus
-- high-confidence additions from the Phase 2 brand scan
-- (docs/handoffs/2026-07-16-brand-shop-scan-phase2.md). Every row inherits
-- is_admin_approved = true because either Jenn has vetted the vocabulary
-- or the term appears in 2+ shops with unambiguous mapping.
--
-- SKIPPED from the plan's Section 4 list:
--   - `('cloud_cream', 'Snowbutter', ...)` — no longer needed; snowbutter
--     IS the base type now per Section 5.1
--   - `('beaded', 'Fishbowl', ...)` — handled via rename in Section 10
--
-- SKIPPED from Phase 2 scan:
--   - Metallic — Phase 2 flagged REVIEW (attribute/finish vs base); Jenn's
--     Section 5.6 pick keeps Metallic as a Clear subtype (already there in
--     mig 37), no new row needed
--   - Slushee promotion — Jenn Section 5.8 kept as-is under Icee, no change
--   - Brand-specific names (Nebula, memoryDOUGH®, Signature Dome™) —
--     belong in brand_variants (Commit B populates via admin flow), not
--     as global subtypes
--   - REVIEW-flagged Sizzly, Soft, Edible Slime Candy — Jenn call needed;
--     defer

INSERT INTO public.subtypes (base_type, name, slug, is_admin_approved, aliases)
VALUES
  -- Butter family (5 rows)
  ('butter', 'Japanese Clay',   'japanese_clay',   true, ARRAY['japanese clay', 'jp clay']),
  ('butter', 'Korean Clay',     'korean_clay',     true, ARRAY['korean clay', 'k-clay']),
  ('butter', 'Marshmallow',     'marshmallow',     true, ARRAY['marshmallow slime']),
  ('butter', 'Dough',           'dough',           true, ARRAY['dough slime', 'play dough', 'focus dough']),
  ('butter', 'DIY Clay',        'diy_clay',        true, ARRAY['diy clay', 'diy clay slime', 'clay kit', 'super clay']),

  -- Clear family (7 rows — Coated/Gel/Pigment/Milky/Semi from Phase 2 scan)
  ('clear', 'Coated Clear',     'coated_clear',    true, ARRAY['coated clear', 'coated clear slime']),
  ('clear', 'Milky Clear',      'milky_clear',     true, ARRAY['milky clear', 'coated milky clear']),
  ('clear', 'Pigmented Clear',  'pigmented_clear', true, ARRAY['pigmented clear', 'clear pigment slime', 'pigment putty', 'pigment clear']),
  ('clear', 'Korean Glue Clear','korean_glue_clear', true, ARRAY['korean glue clear', 'k-glue clear']),
  ('clear', 'Crystal',          'crystal',         true, ARRAY['crystal slime']),
  ('clear', 'Gel Clear',        'gel_clear',       true, ARRAY['gel clear', 'gel clear slime']),
  ('clear', 'Semi Clear',       'semi_clear',      true, ARRAY['semi clear', 'semi-clear']),

  -- Cloud family (1 row)
  ('cloud', 'Mousse',           'mousse',          true, ARRAY['mousse slime', 'mousseslime']),

  -- Floam family (2 rows)
  ('floam', 'Microfloam',       'microfloam',      true, ARRAY['micro floam', 'semi-floam', 'micro floam slime']),
  ('floam', 'Foam Beads',       'foam_beads',      true, ARRAY['foam bead', 'foam', 'foam ball']),

  -- Beaded family (7 rows including new Phase 2 finds)
  ('beaded', 'Crunch Bomb',     'crunch_bomb',     true, ARRAY['crunchbomb', 'silica crunch bomb']),
  ('beaded', 'Sequin Bomb',     'sequin_bomb',     true, ARRAY['sequin bomb', 'cg bubble sequin', 'glitter bomb']),
  ('beaded', 'Gravel',          'gravel',          true, ARRAY['gravel slime']),
  ('beaded', 'Frogspawn',       'frogspawn',       true, ARRAY['frogspawn']),
  ('beaded', 'Lava Rocks',      'lava_rocks',      true, ARRAY['lava rocks']),
  ('beaded', 'Sugar Beads',     'sugar_beads',     true, ARRAY['sugar beads', 'sugar beads slime']),
  ('beaded', 'Pony Bead',       'pony_bead',       true, ARRAY['pony bead', 'pony beads', 'pony bead slime']),
  ('beaded', 'Cereal',          'cereal',          true, ARRAY['cereal slime', 'clear cereal slime', 'cereal slime kit']),
  ('beaded', 'Block Bead',      'block_bead',      true, ARRAY['block bead', 'block beads']),

  -- Floam sub-variants (specific bead materials — Phase 2 additions)
  ('floam', 'Perlite',          'perlite',         true, ARRAY['perlite', 'perlite slime', 'crunchy perlite', 'perlite gloss']),
  ('floam', 'Ground Pumice',    'ground_pumice',   true, ARRAY['ground pumice', 'pumice stone', 'pumice stone glossy']),

  -- Jelly family (2 rows)
  ('jelly', 'Jelly Putty',      'jelly_putty',     true, ARRAY['jelly putty slime']),
  ('jelly', 'Jelly Bubble',     'jelly_bubble',    true, ARRAY['jelly bubble slime']),

  -- Sand family (1 row)
  ('sand', 'Silica Sand',       'silica_sand',     true, ARRAY['silica sand']),

  -- Thick & Glossy sub-variants
  ('thick_and_glossy', 'Ultra Thickie', 'ultra_thickie', true, ARRAY['ultra thickie', 'ultra thick']),

  -- Wax family (3 rows — Sloomoo Institute subdivides)
  ('wax_and_wax_cracking', 'Butter Wax', 'butter_wax', true, ARRAY['butter wax']),
  ('wax_and_wax_cracking', 'Clear Wax',  'clear_wax',  true, ARRAY['clear wax']),
  ('wax_and_wax_cracking', 'Jelly Wax',  'jelly_wax',  true, ARRAY['jelly wax'])
;


-- ─── Section 12. Seed aliases on existing canonical subtypes ──────────────
-- Backfills the aliases[] column for subtypes that were seeded before this
-- column existed. Data sourced from Jenn's xlsx verbatim_spellings_seen +
-- Phase 1 + Phase 2 scan reports.

-- Clear subtypes (from mig 37 seed) — spelling variants observed
UPDATE public.subtypes SET aliases = ARRAY['glossy', 'glossy slime', 'perlite gloss'] WHERE slug = 'glossy' AND base_type = 'clear';
UPDATE public.subtypes SET aliases = ARRAY['holographic', 'holo', 'holographic slime']  WHERE slug = 'holographic' AND base_type = 'clear';
UPDATE public.subtypes SET aliases = ARRAY['pearl', 'pearl slime']                       WHERE slug = 'pearl' AND base_type = 'clear';
UPDATE public.subtypes SET aliases = ARRAY['metallic', 'metallic slime', 'metallic slimes'] WHERE slug = 'metallic' AND base_type = 'clear';
UPDATE public.subtypes SET aliases = ARRAY['galaxy', 'galaxy slime']                     WHERE slug = 'galaxy' AND base_type = 'clear';
UPDATE public.subtypes SET aliases = ARRAY['thermochromic', 'thermal', 'color changing'] WHERE slug = 'thermochromic' AND base_type = 'clear';
UPDATE public.subtypes SET aliases = ARRAY['glow in the dark', 'gitd', 'glow']           WHERE slug = 'glow_in_the_dark' AND base_type = 'clear';

-- Jelly subtypes
UPDATE public.subtypes SET aliases = ARRAY['thiggly', 'thick jelly']                     WHERE slug = 'thiggly';
UPDATE public.subtypes SET aliases = ARRAY['jelly cube', 'jelly cube slime', 'cube slime', 'jello cubes'] WHERE slug = 'jelly_cube';
UPDATE public.subtypes SET aliases = ARRAY['jelly puff']                                 WHERE slug = 'jelly_puff';

-- Icee
UPDATE public.subtypes SET aliases = ARRAY['slushee', 'slushy', 'slushees', 'clear slay slushee', 'slushie'] WHERE slug = 'slushee';

-- Thick & Glossy
UPDATE public.subtypes SET aliases = ARRAY['thicky', 'thickie', 'thickkk']               WHERE slug = 'thicky';

-- Slay subtypes
UPDATE public.subtypes SET aliases = ARRAY['sally butter']                               WHERE slug = 'sally_butter';
UPDATE public.subtypes SET aliases = ARRAY['custard', 'custard slime']                   WHERE slug = 'custard';
UPDATE public.subtypes SET aliases = ARRAY['cream cheese', 'cream cheese slime']         WHERE slug = 'cream_cheese';
UPDATE public.subtypes SET aliases = ARRAY['nougat']                                     WHERE slug = 'nougat';

-- Cloud subtypes
UPDATE public.subtypes SET aliases = ARRAY['cloud fizz', 'cloud fizz slime']             WHERE slug = 'cloud_fizz';
UPDATE public.subtypes SET aliases = ARRAY['cloud dough', 'cloud dough slime']           WHERE slug = 'cloud_dough';
UPDATE public.subtypes SET aliases = ARRAY['mousse fizz']                                WHERE slug = 'mousse_fizz';
UPDATE public.subtypes SET aliases = ARRAY['chiffon fizz']                               WHERE slug = 'chiffon_fizz';

-- Snowbutter (was cloud_cream — renamed in Section 2/3 above) subtypes still under snowbutter
UPDATE public.subtypes SET aliases = ARRAY['mochi', 'mochi slime']                       WHERE slug = 'mochi';
UPDATE public.subtypes SET aliases = ARRAY['putty puff']                                 WHERE slug = 'putty_puff';

-- Floam
UPDATE public.subtypes SET aliases = ARRAY['float']                                      WHERE slug = 'float';

-- Wax (from mig 37)
UPDATE public.subtypes SET aliases = ARRAY['wax cracking', 'cracking wax']               WHERE slug = 'wax_cracking';

-- Water
UPDATE public.subtypes SET aliases = ARRAY['jiggly', 'coated jiggly', 'water jiggly']    WHERE slug = 'jiggly' AND base_type = 'water';


-- ─── Section 13. Create brand_variants join table ─────────────────────────
-- Per Section 6 of the taxonomy plan (Option b data model). Records
-- brand-specific display terminology for canonical subtypes. Wizard's
-- variant picker queries this table for the selected brand+base combo;
-- if any rows exist, render the picker using each row's brand_display_name
-- (fall back to subtype.name when NULL). If no rows, fall back to
-- suggest-a-variant CTA (implemented in Commit B).

CREATE TABLE public.brand_variants (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id            uuid          NOT NULL REFERENCES public.brands(id)   ON DELETE CASCADE,
  subtype_id          uuid          NOT NULL REFERENCES public.subtypes(id) ON DELETE CASCADE,
  brand_display_name  text          NULL,
    -- Optional per-brand label (e.g., "Iceey" for a brand that spells Icee as "Iceey").
    -- NULL means the canonical subtype.name is used.
  aliases             text[]        NOT NULL DEFAULT '{}',
    -- Brand-idiosyncratic spellings layered on top of subtypes.aliases.
    -- Wizard search matches against subtype.aliases UNION brand_variants.aliases.
  is_admin_approved   boolean       NOT NULL DEFAULT true,
    -- Admin-authored rows default true; user-suggested rows will default
    -- false via the variant_suggestions flow in Commit B.
  created_by          uuid          NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT brand_variants_brand_subtype_unique UNIQUE (brand_id, subtype_id)
);

CREATE INDEX brand_variants_brand_id_idx  ON public.brand_variants(brand_id);
CREATE INDEX brand_variants_subtype_id_idx ON public.brand_variants(subtype_id);
CREATE INDEX brand_variants_admin_approved_idx ON public.brand_variants(is_admin_approved) WHERE is_admin_approved = true;

COMMENT ON TABLE public.brand_variants IS
  'Join table linking brands to the canonical subtypes they sell, with '
  'optional per-brand display labels + aliases. Wizard variant picker '
  'queries this for the selected brand+base combo. Seeded incrementally '
  'via admin approval flow (T111 pattern) or brand-owner claim flow.';

ALTER TABLE public.brand_variants ENABLE ROW LEVEL SECURITY;

-- RLS: anon+authenticated can read approved rows (public catalog surface)
CREATE POLICY "brand_variants public read approved"
  ON public.brand_variants FOR SELECT
  USING (is_admin_approved = true);

-- RLS: admins can read all rows (including pending suggestions)
CREATE POLICY "brand_variants admins read all"
  ON public.brand_variants FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- RLS: brand owners can read their own brand's rows (approved or not)
CREATE POLICY "brand_variants owners read own"
  ON public.brand_variants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
       WHERE b.id = brand_variants.brand_id
         AND b.owner_id = auth.uid()
    )
  );

-- RLS: authenticated users can INSERT pending rows via the suggest-a-variant
-- flow. Enforced default is_admin_approved = false at insert; admin/owner
-- approval flips the flag via UPDATE.
CREATE POLICY "brand_variants suggest insert"
  ON public.brand_variants FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS: brand owners can INSERT auto-approved rows for their own brand
-- (the app layer sets is_admin_approved = true for owner submissions).
CREATE POLICY "brand_variants owners insert own"
  ON public.brand_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands b
       WHERE b.id = brand_variants.brand_id
         AND b.owner_id = auth.uid()
    )
  );

-- RLS: admins update any row; brand owners update their own brand's rows
CREATE POLICY "brand_variants admins update"
  ON public.brand_variants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "brand_variants owners update own"
  ON public.brand_variants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
       WHERE b.id = brand_variants.brand_id
         AND b.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands b
       WHERE b.id = brand_variants.brand_id
         AND b.owner_id = auth.uid()
    )
  );

-- RLS: admins can delete any row (moderation). Brand owners can delete
-- their own rows to remove a variant they no longer sell.
CREATE POLICY "brand_variants admins delete"
  ON public.brand_variants FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "brand_variants owners delete own"
  ON public.brand_variants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
       WHERE b.id = brand_variants.brand_id
         AND b.owner_id = auth.uid()
    )
  );

COMMIT;
