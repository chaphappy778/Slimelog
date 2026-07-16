# SlimeLog Taxonomy Rework — Implementation Plan

Created 2026-07-15. Author: James (Claude). Reviewer: Jenn.

Status: **DRAFT — not for execution until Jenn signs off on Section 5.**

This plan takes the current 20-base-type / 31-subtype model (migration `20260509000037_t71_base_type_taxonomy.sql`) to a brand-aware taxonomy that reflects Jenn's shop-scan research (~56 distinct variants across 36 shops) and the design decisions locked in the 2026-07-15 planning session with James. It removes `clay` as a base type, adds brand-scoped variant terminology (Poppy Mello's "Bingsu" and On Cloud's "Coated Jiggly" are different display strings for the same underlying variant), stands up a user-suggestion pipeline for missing variants, and lands a v1 display treatment on `/slimes/[id]` that surfaces the variant chip.

---

## 1. Executive summary

**Scope.** Eight execution phases across roughly 12 to 16 working days. Every phase is independently mergeable and rolled up per convention `YYYYMMDDNNNNNN_description.sql`.

- **Phase 1** — Clay removal. Enum surgery + UI sweep. ~1.5 days.
- **Phase 2** — Chosen data model (recommendation: option **b**, `brand_variants` join table) + new subtypes seed. ~2 days.
- **Phase 3** — Aliases + brand-scoped variant seed from xlsx. ~1.5 days.
- **Phase 4** — Rename / move decisions after Jenn signs off on Section 5. ~1 day.
- **Phase 5** — Wizard changes (brand-aware variant picker + suggest CTA). ~2 days.
- **Phase 6** — Variant suggestion flow (submission, notification, approval, credit). ~2 days.
- **Phase 7** — Display + search v1 (slime detail chip, variant search index). ~1.5 days.
- **Phase 8** (v1.5, out of this cycle) — DIY-as-boolean, hybrid combos, remaining display surfaces. Estimated ~2 days but deferred.

**Blocking decisions for Jenn** are called out in Section 5 (six items) and Section 2 (one preferred model, alternatives shown). Nothing else in the plan requires her sign-off before drafting; adjustments after review land as scoped edits inside the affected phase.

**Non-goals.** Multi-tag hybrid support, feed / shelf / discover chip filter changes, and moving the base-type list past 19 values. All deferred to v1.5.

---

## 2. Backend data model for brand-scoped variants

Every option below assumes the current `public.subtypes` table (see migration `20260509000037`) continues to exist. All three preserve the invariant that a subtype belongs to exactly one base type. The choice is about **how a brand-specific spelling attaches** to a subtype.

Same underlying variant, different shop vocabulary — the concrete case the model has to solve:

- On Cloud sells "Coated Jiggly" (per xlsx: their `coated-thick-clear-slime` slug reveals it's a thick clear, not a water slime).
- Poppy Mello sells "Crunchy" but files it under `/collections/bingsu`.
- The Slime Space uses "Iceey" for what everyone else calls "Icee".
- Poppy Mello uses "Metallic" as a top-level texture nav item (elsewhere it's a Clear subtype).

The wizard needs to fetch: "Given brand X and base type Y, what variants should this picker show, and what spellings should each variant respond to when I search?"

### Option (a) — `subtypes.brand_id` nullable

**Schema.**
```sql
ALTER TABLE public.subtypes
  ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE;

-- New uniqueness: (brand_id, base_type, slug) — NULL brand_id = global.
ALTER TABLE public.subtypes
  DROP CONSTRAINT subtypes_base_slug_unique;
CREATE UNIQUE INDEX subtypes_global_unique
  ON public.subtypes (base_type, slug) WHERE brand_id IS NULL;
CREATE UNIQUE INDEX subtypes_brand_unique
  ON public.subtypes (brand_id, base_type, slug) WHERE brand_id IS NOT NULL;
```

**Wizard query.**
```sql
SELECT * FROM public.subtypes
 WHERE base_type = $1
   AND (brand_id = $2 OR brand_id IS NULL)
 ORDER BY brand_id NULLS LAST, name;
```

**Tradeoffs.**
- (+) Single-table read, matches existing shape.
- (+) `subtype_id` FK on `slimes` and `collection_logs` continues to work with no change.
- (-) The same conceptual variant ("Bingsu") ends up as multiple rows — one global + one per brand that spells it differently. No shared canonical ID means aggregate queries ("all Bingsu logs across all brands") need a name-based join or a separate canonical column.
- (-) No place for brand-specific aliases; the xlsx `verbatim_spellings_seen` data has nowhere clean to live.

### Option (b, RECOMMENDED) — join table `brand_variants`

**Schema.**
```sql
-- subtypes stays the canonical, brand-agnostic layer.
-- Add an aliases column so search can match every observed spelling.
ALTER TABLE public.subtypes
  ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';

-- New table: how a specific brand markets a specific canonical variant.
CREATE TABLE public.brand_variants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id             uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  subtype_id           uuid NOT NULL REFERENCES public.subtypes(id) ON DELETE CASCADE,
  brand_display_name   text NOT NULL,          -- "Iceey", "Coated Jiggly"
  aliases              text[] NOT NULL DEFAULT '{}', -- brand-specific extras
  created_by           uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_admin_approved    boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, subtype_id)                -- one brand-facing row per canonical variant
);
CREATE INDEX brand_variants_brand_idx     ON public.brand_variants (brand_id);
CREATE INDEX brand_variants_subtype_idx   ON public.brand_variants (subtype_id);
CREATE INDEX brand_variants_approved_idx  ON public.brand_variants (is_admin_approved) WHERE is_admin_approved = true;

ALTER TABLE public.brand_variants ENABLE ROW LEVEL SECURITY;
-- RLS mirrors public.subtypes: authenticated read approved, admins read all,
-- authenticated insert only their own rows (pending), admins update/delete.
```

`slimes.subtype_id` and `collection_logs.subtype_id` continue to point at `public.subtypes.id` (the canonical row). The display layer joins `brand_variants` when a brand-scoped label exists.

**Wizard query.**
```sql
-- Fetch the picker options for brand $1 + base $2.
-- Returns: canonical rows the brand has "adopted" via brand_variants,
--          plus the brand's display name for each.
SELECT s.id           AS subtype_id,
       s.name         AS canonical_name,
       s.slug,
       s.aliases      AS canonical_aliases,
       bv.brand_display_name,
       bv.aliases     AS brand_aliases
  FROM public.subtypes s
  JOIN public.brand_variants bv
    ON bv.subtype_id = s.id
   AND bv.brand_id = $1
   AND bv.is_admin_approved = true
 WHERE s.base_type = $2
   AND s.is_admin_approved = true
 ORDER BY bv.brand_display_name;
```

If the join returns zero rows, the wizard shows the magenta "Suggest a variant" ghost CTA.

**Tradeoffs.**
- (+) Same canonical variant across brands, so aggregations ("count all Bingsu logs across all brands") are trivial.
- (+) Aliases live on the canonical row for spellings everyone shares (`Iceey` for `Icee`) and per-brand for shop-idiosyncratic ones.
- (+) Adding a brand to a variant is a small INSERT, not a schema change.
- (+) Handles the same-word-different-meaning case cleanly: Poppy Mello's "Crunchy" attaches to `subtypes.slug = 'bingsu'`, other shops' "Crunchy" attaches to `subtypes.slug = 'crunchy'` under Floam.
- (-) Two-table query for the picker (still small, both tables index on the join keys).
- (-) One more RLS surface to keep straight.

### Option (c) — aliases as text[] on subtypes only

**Schema.**
```sql
ALTER TABLE public.subtypes
  ADD COLUMN aliases text[] NOT NULL DEFAULT '{}';
```
Brand-specific display is a lookup baked into `apps/web/lib/brand-variant-map.ts` — a hand-maintained TypeScript object keyed by `${brand_slug}:${subtype_slug}` returning the display label.

**Tradeoffs.**
- (+) Zero new tables. Fewest moving parts.
- (-) Brand-specific vocab is code, not data — every new brand claim requires a code change to add their vocabulary. Unworkable once brand growth passes ~50.
- (-) Same conceptual mismatch as (a) for the "Poppy Mello's Crunchy is really Bingsu" case: nowhere in the data model to represent brand-scoped mapping.

### Recommendation

**Option (b).** It's the only option that keeps aggregation clean (same canonical row across all brands) while still letting each shop show the vocabulary its customers know. The xlsx directly justifies the shape: `verbatim_spellings_seen` becomes canonical `aliases`; `shops` per variant becomes `brand_variants` rows once we decide which brands to seed. Rest of the plan assumes (b) — if Jenn or James prefer (a) or (c), Section 3 and Section 6 are the only pieces that need to be rewritten.

---

## 3. Clay removal migration

### Migration name
`20260716000069_clay_removal.sql` (assuming this ships next after mig 68 marketplace waitlist)

### Contract

- Enum surgery removes `'clay'` from `slime_base_type`, ending at 19 values.
- Any `slimes.base_type = 'clay'` or `collection_logs.base_type = 'clay'` gets backfilled to `'butter'` **before** the column-type migration.
- Three views (`top_rated_slimes`, `brand_top_slimes`, `user_collection_summary`) drop and recreate against the new enum — same pattern migration 37 established.
- No orphaned data at the end.

### SQL sketch

```sql
BEGIN;

-- 1. Backfill: rewrite all 'clay' rows to 'butter' while the old enum
--    still accepts both values. Aligns with Jenn's guide: Butter and Clay
--    are the same underlying clay-heavy base; Clay was a redundant alias.

UPDATE public.slimes           SET base_type = 'butter' WHERE base_type = 'clay';
UPDATE public.collection_logs  SET base_type = 'butter' WHERE base_type = 'clay';

-- 2. Sanity: no clay rows remain.
DO $$
DECLARE remaining int;
BEGIN
  SELECT count(*) INTO remaining FROM public.slimes           WHERE base_type::text = 'clay';
  IF remaining > 0 THEN RAISE EXCEPTION 'slimes still has % clay rows', remaining; END IF;
  SELECT count(*) INTO remaining FROM public.collection_logs  WHERE base_type::text = 'clay';
  IF remaining > 0 THEN RAISE EXCEPTION 'collection_logs still has % clay rows', remaining; END IF;
END $$;

-- 3. Drop the views that reference base_type (identical pattern to mig 37).
DROP VIEW IF EXISTS public.top_rated_slimes;
DROP VIEW IF EXISTS public.brand_top_slimes;
DROP VIEW IF EXISTS public.user_collection_summary;

-- 4. Enum swap. Postgres won't let us DROP a value from an in-use enum,
--    so we create a parallel enum without 'clay', re-type the columns,
--    then drop the old enum.

ALTER TYPE public.slime_base_type RENAME TO slime_base_type_old;

CREATE TYPE public.slime_base_type AS ENUM (
  'avalanche', 'beaded', 'butter', 'clear', 'cloud', 'cloud_cream',
  'floam', 'fluffy', 'hybrid', 'icee', 'jelly', 'magnetic', 'sand',
  'slay', 'snow_fizz', 'sugar_scrub', 'thick_and_glossy', 'water',
  'wax_and_wax_cracking'
);

-- 5. Migrate columns onto the new enum. USING clause casts text-safely.
ALTER TABLE public.slimes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);

ALTER TABLE public.collection_logs
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);

ALTER TABLE public.subtypes
  ALTER COLUMN base_type TYPE public.slime_base_type
  USING (base_type::text::public.slime_base_type);

-- 6. Any function signatures or defaults referencing the old enum need
--    a similar rewrite. Sweep before dropping the old type.
--    (None known today; grep confirms only these three tables reference it.)

-- 7. Drop the old enum.
DROP TYPE public.slime_base_type_old;

-- 8. Recreate the three views against the new enum. Copy-paste from
--    migration 20260509000037 (steps 11, 12, 13); no query changes needed,
--    just the DDL to re-establish them. Preserve security_invoker = true.

CREATE VIEW public.top_rated_slimes WITH (security_invoker = true) AS
SELECT s.id, s.name, s.base_type, b.name AS brand_name, b.slug AS brand_slug,
       s.avg_overall, s.avg_texture, s.avg_scent, s.avg_sound, s.avg_drizzle,
       s.avg_creativity, s.total_ratings, s.image_url
  FROM public.slimes s
  JOIN public.brands b ON b.id = s.brand_id
 WHERE s.total_ratings >= 3
 ORDER BY s.avg_overall DESC NULLS LAST, s.total_ratings DESC;

CREATE VIEW public.brand_top_slimes WITH (security_invoker = true) AS
SELECT s.brand_id, s.id, s.name, s.base_type, s.avg_overall, s.total_ratings,
       count(cl.id) AS total_logs
  FROM public.slimes s
  LEFT JOIN public.collection_logs cl ON cl.slime_id = s.id
 WHERE s.is_brand_official = true
 GROUP BY s.brand_id, s.id, s.name, s.base_type, s.avg_overall, s.total_ratings;

CREATE VIEW public.user_collection_summary WITH (security_invoker = true) AS
SELECT user_id,
       count(*) FILTER (WHERE in_collection = true)      AS total_in_collection,
       count(*) FILTER (WHERE in_wishlist = true)        AS total_in_wishlist,
       count(*) FILTER (WHERE rating_overall IS NOT NULL) AS total_rated,
       round(avg(rating_overall), 2)                     AS avg_overall_given,
       count(DISTINCT brand_id)                          AS distinct_brands_tried,
       count(DISTINCT base_type::text)                   AS distinct_types_tried
  FROM public.collection_logs
 GROUP BY user_id;

COMMIT;
```

### UI sweep (paired with the migration)

Files that hard-code `'clay'` and must lose it in the same PR (see Section 11 for the full list). If the migration ships alone the type-check will still pass because the enum-derived string union in `types.ts` shrinks in the same commit.

### Rollback

This is destructive by design. Recovery from a bad deploy is: restore the branch database snapshot Vercel's Supabase integration takes on migration apply, then re-run. Document that at the head of the migration.

---

## 4. New subtypes seed

Every row below is a canonical (base_type, name) pair pulled from the xlsx `v2_home` column. Row for row I skip xlsx entries flagged as `descriptor/product naming`, `shop-specific` single-shop inventions, and `hybrid combo` (those go into v1.5's hybrid handling, not the subtypes table).

Migration file: `20260717000070_subtypes_seed_v2.sql` (Phase 2).

```sql
-- Seed the new canonical variants. Every row inherits is_admin_approved = true
-- because Jenn has vetted the vocabulary. Aliases per row come from the xlsx
-- verbatim_spellings_seen column — see Section 6 for the alias-only follow-up.

INSERT INTO public.subtypes
  (base_type, name, slug, is_admin_approved, aliases)
VALUES
  -- ─── Butter family additions ────────────────────────────────────────────
  ('butter', 'Japanese Clay',   'japanese_clay',   true, ARRAY['japanese clay']),
    -- Jenn-added variant, not in the xlsx. Butter subtype per Jenn's decision.
  ('butter', 'Korean Clay',     'korean_clay',     true, ARRAY['korean clay', 'k-clay']),
    -- Jenn-added. Butter subtype per Jenn's decision.
  ('butter', 'Marshmallow',     'marshmallow',     true, ARRAY['marshmallow slime']),
    -- xlsx: On Cloud describes it as clay-based.
  ('butter', 'Dough',           'dough',           true, ARRAY['dough slime', 'play dough', 'focus dough']),
    -- xlsx: The Slime Space uses "Dough Slime" as a top-level category (3 shops).
  ('butter', 'DIY Clay',        'diy_clay',        true, ARRAY['diy clay', 'diy clay slime', 'clay kit', 'super clay']),
    -- xlsx: 14 shops merchandise as top-level. See Section 9 — recommend
    -- is_diy boolean as the durable mechanism; keep this row for search coverage
    -- until the boolean lands.

  -- ─── Clear family additions ─────────────────────────────────────────────
  ('clear', 'Coated Clear',     'coated_clear',    true, ARRAY['coated clear', 'coated clear slime']),
  ('clear', 'Milky Clear',      'milky_clear',     true, ARRAY['milky clear', 'coated milky clear']),
  ('clear', 'Pigmented Clear',  'pigmented_clear', true, ARRAY['pigmented clear', 'clear pigment slime', 'pigment putty']),
  ('clear', 'Korean Glue Clear','korean_glue_clear', true, ARRAY['korean glue clear', 'k-glue clear']),
  ('clear', 'Crystal',          'crystal',         true, ARRAY['crystal slime']),

  -- ─── Cloud family additions ─────────────────────────────────────────────
  ('cloud', 'Mousse',           'mousse',          true, ARRAY['mousse slime']),
    -- xlsx: plain "Mousse" observed alongside existing Mousse Fizz subtype.

  -- ─── Cloud Cream additions ──────────────────────────────────────────────
  ('cloud_cream', 'Snowbutter', 'snowbutter',      true, ARRAY['snowbutter', 'snow butter', 'snow-butter']),
    -- xlsx: 4 shops; per Section 5 open decision, this may become the
    -- canonical name and Cloud Cream becomes the alias (or vice versa).

  -- ─── Floam additions ────────────────────────────────────────────────────
  ('floam', 'Microfloam',       'microfloam',      true, ARRAY['micro floam', 'semi-floam']),
  ('floam', 'Foam Beads',       'foam_beads',      true, ARRAY['foam bead', 'foam']),

  -- ─── Snow Fizz — note: existing 'Bingsu' row STAYS ──────────────────────
  --   No additions here; Bingsu already seeded by migration 37.

  -- ─── Beaded additions ───────────────────────────────────────────────────
  ('beaded', 'Fishbowl',        'fishbowl',        true, ARRAY['fishbowl', 'fishbowl slime', 'fishbowl bead']),
    -- Existing seed uses 'Fishbowl Beads'; add 'Fishbowl' as separate row
    -- OR merge (see Section 5 alias/merge decision).
  ('beaded', 'Crunch Bomb',     'crunch_bomb',     true, ARRAY['crunchbomb', 'silica crunch bomb']),
  ('beaded', 'Sequin Bomb',     'sequin_bomb',     true, ARRAY['sequin bomb', 'cg bubble sequin', 'glitter bomb']),
  ('beaded', 'Gravel',          'gravel',          true, ARRAY['gravel slime']),
  ('beaded', 'Frogspawn',       'frogspawn',       true, ARRAY['frogspawn']),
  ('beaded', 'Lava Rocks',      'lava_rocks',      true, ARRAY['lava rocks']),

  -- ─── Jelly additions ────────────────────────────────────────────────────
  ('jelly', 'Jelly Putty',      'jelly_putty',     true, ARRAY['jelly putty slime']),
  ('jelly', 'Jelly Bubble',     'jelly_bubble',    true, ARRAY['jelly bubble slime']),

  -- ─── Sand additions ─────────────────────────────────────────────────────
  ('sand', 'Silica Sand',       'silica_sand',     true, ARRAY['silica sand']),

  -- ─── Wax additions ──────────────────────────────────────────────────────
  ('wax_and_wax_cracking', 'Butter Wax', 'butter_wax', true, ARRAY['butter wax']),
  ('wax_and_wax_cracking', 'Clear Wax',  'clear_wax',  true, ARRAY['clear wax']),
  ('wax_and_wax_cracking', 'Jelly Wax',  'jelly_wax',  true, ARRAY['jelly wax']),
    -- xlsx: Sloomoo subdivides. Wax Cracking already seeded by mig 37.

  -- ─── Clear finishes — already seeded, alias rewrite only ────────────────
  -- Metallic exists on clear; xlsx notes Poppy Mello uses it as top-level.
  -- No new subtype row needed; use brand_variants (Phase 3) to promote it
  -- for Poppy Mello's brand-scoped picker.
;
```

**Deliberately excluded** from the seed:

| xlsx term | Reason |
|---|---|
| Perlite | xlsx flags REVIEW; Jenn call in Section 5. |
| Frosting | xlsx flags REVIEW; overlaps Slay and Butter. Jenn call. |
| Soft Serve | Likely Snowbutter/Icee adjacent; single-shop. Wait for it to recur. |
| Gooey Yogurt | Single-shop invention (gtcreationslime). Alias only if it recurs. |
| Cake Batter, Butter Batter | Product naming, not texture. |
| Boba Milk | Theme naming. |
| Creamy Snow | Freeform product description, not a texture term. |
| Butterfizz, Bingsu Butter | Hybrid combos — handled in Section 10, not as subtypes. |

---

## 5. Rename / move decisions flagged for Jenn

**RESOLVED 2026-07-16.** Jenn walked through all six items and picked her canonical answers. The picks are inlined under each item below (look for `► JENN 2026-07-16:`). Phase 2 execution follows those picks — no re-litigation needed.

Summary of picks (for quick reference):
- 5.1 → Option B: rename base type `cloud_cream` → `snowbutter`, Cloud Cream / Cloud Creme become aliases
- 5.2 → Custom of Option B: Crunchy lives under Beaded (not Floam, not Snow Fizz)
- 5.3 → Custom of Option B: Beaded stays canonical, Bingsu stays as a subtype under Beaded (already there)
- 5.4 → Option C: Jiggly dual-home under both Water AND Clear
- 5.5 → Option A: rename Fishbowl Beads → Fishbowl, `fishbowl beads` becomes alias
- 5.6 → Option A for now, feature request added to T137 for brand dashboard redesign scope

### 5.1 Cloud Cream vs Snowbutter as canonical name

**Data.** xlsx shows `Cloud Creme` at 9 shops (dominant `Creme` spelling: babycatslimes, chappyslimes, mintyslimes, oncloudslime, royalslime, sliimeyhoney, slimeaficionados, sloomooslime, squishysquashyslimes). `Snowbutter` at 4 shops (ammaslimes, babycatslimes, scentedslimebyamy, sliimeyhoney). Babycat treats them as different products.

**Options.**
- **(A)** Keep `cloud_cream` as canonical; `Snowbutter` becomes a separate subtype row under Cloud Cream (as seeded in Section 4).
- **(B)** Rename base type `cloud_cream` → `snowbutter`; `Cloud Cream` / `Cloud Creme` become aliases.
- **(C)** Keep `cloud_cream` canonical, treat `Snowbutter` as a top-level alias on the base type (i.e. brands can label their entire base-type card as "Snowbutter" via a `brands.base_type_labels` override, deferred).

**Tradeoff.** Option A is the additive path — no enum rename, both terms searchable, market data (9 vs 4) wins by default. Option B honors the naming Jenn drafted in the V4.1 guide (Part One: "Cloud Cream" is Jenn's own canonical choice, but the guide also notes "snowbutter built on clear glue rather than white usually goes by mochi" — suggesting Snowbutter is the more precise underlying term). Option C is theoretically neutral but needs infrastructure we don't have. **Default if no decision: A.**

**► JENN 2026-07-16: Option B.** Rename base type `cloud_cream` → `snowbutter`. "Cloud Cream" / "Cloud Creme" become searchable aliases on the base type. Phase 2 migration needs: enum rename via the same dance we used for clay removal (rename old enum → create new with `snowbutter` instead of `cloud_cream` → ALTER TABLE ... USING with CASE mapping `cloud_cream` → `snowbutter` on all four dependent tables including drop_slimes → drop old enum). Plus code sweep of every file that hardcodes `cloud_cream` (types.ts SlimeBaseType union + LABELS + COLORS, base-type-hero.ts photo + tint keys, 5 chart color maps, guide/content.ts entry, wishlist validator, feed card style maps, opengraph image). Plus updates to seeded subtypes that currently reference cloud_cream (Mochi, Putty Puff — their `base_type` column value migrates automatically via the CASE, but the alias data added for them should reference "snowbutter" going forward).

### 5.2 Crunchy home (Floam vs Bingsu / Beaded vs both)

**Data.** xlsx: 13 shops use "Crunchy" as a top-level category (cosmicslime, elmers, mintyslimes, mythicalmushbunny, poppymelloslimes, slimeaficionados, slimedazzle, slimeprincess, squishysquashyslimes, talisatossell, thechaosshop, theslimelabs, theslimespace). Poppy Mello's Crunchy slug is `/collections/bingsu`. The Slime Space's Bingsu slug is `bingsu-crunchy-bubbly`. Current model (mig 37) seeds "Crunchy" under **both** Floam and Snow Fizz (two rows).

**Options.**
- **(A)** Keep dual-home (current mig 37 shape). Wizard shows two "Crunchy" options when Floam or Snow Fizz is the base; user picks the right one.
- **(B)** Consolidate under Beaded (rename `snow_fizz` base type to `bingsu` per 5.3? See below). Every shop that says "Crunchy" is really talking about the bead crunch, per xlsx analyst notes.
- **(C)** Make "Crunchy" a **brand-scoped display label** in `brand_variants` — the canonical row stays a specific bead type per brand's shop taxonomy, but their picker labels it "Crunchy" for their customers.

**Tradeoff.** (A) is what mig 37 already ships and is the safest; the dual-home is only a mild UX confusion. (B) is Jenn's tightest naming but requires her to declare which existing shop mappings we override. (C) is the model-purist path — matches xlsx evidence that "Crunchy" is a shop-choice label, not a durable texture — but ends up hiding the canonical variant name behind branded chrome. **Default if no decision: A.**

**► JENN 2026-07-16: Custom of Option B — Crunchy lives ONLY under Beaded** (paired with 5.3 which keeps Beaded as canonical). Phase 2 migration needs to: (a) INSERT a new `crunchy` subtype under `beaded`, (b) reassign any collection_logs / slimes rows currently referencing the Floam/Crunchy or Snow Fizz/Crunchy subtype IDs to the new Beaded/Crunchy ID, (c) DELETE the two obsolete Crunchy rows (Floam/Crunchy and Snow Fizz/Crunchy from mig 37). All within one transaction so subtype_id FK never points at a missing row.

### 5.3 Bingsu vs Beaded — merge or keep distinct

**Data.** xlsx `v2_home` labels 13 shops as "Bingsu / Beaded" — analyst treats the two as convergent. Migration 37 seeds `beaded` as a base type with a separate `bingsu` subtype under `snow_fizz`. xlsx `Bingsu` variant note: "Validates the Bingsu / Beaded rename".

**Options.**
- **(A)** Rename base type `snow_fizz` → `bingsu`, fold `snow_fizz` subtype references. But `snow_fizz` is a distinct texture per Jenn's guide (plastic snow, crisp/dry crunch), so a rename would collapse two real textures.
- **(B)** Keep `snow_fizz` and `beaded` as separate base types (current). Add `Bingsu` as a subtype **under Beaded also**, so both bead-crunch flavors are discoverable.
- **(C)** Rename base type `beaded` → `bingsu`, subsume `Bingsu Beads`, `Fishbowl`, etc. as subtypes.

**Tradeoff.** (B) preserves Jenn's V4.1 guide (Beaded, Snow Fizz, Bingsu are distinct concepts) while adding search coverage. (C) matches shop merchandising but overwrites Jenn's guide vocabulary. (A) would lose the plastic-snow specificity of Snow Fizz. **Default if no decision: B.**

**► JENN 2026-07-16: Custom of Option B — Beaded stays canonical; Bingsu stays as a subtype under Beaded** (Bingsu is already seeded under Snow Fizz per mig 37 — that row can stay for now as a search-coverage alias, or Phase 2 moves it under Beaded too to match Jenn's mental model of "bingsu is a bead type"). Snow Fizz stays its own base type (plastic snow, crisp/dry crunch per Jenn's guide). Phase 2 decision: relocate the existing Snow Fizz/Bingsu subtype row to Beaded/Bingsu (single canonical home for Bingsu = Beaded), following the same reassignment-then-delete dance as Crunchy in 5.2.

### 5.4 Jiggly home (Water vs Thick Clear)

**Data.** xlsx flags On Cloud's `Coated Jiggly` slug as `coated-thick-clear-slime`, i.e. their jiggly is a thick clear not a water slime. Poppy Mello also uses Jiggly. Current model seeds `Jiggly` as a subtype under `water`.

**Options.**
- **(A)** Keep `Jiggly` under `water` (current). On Cloud gets a `brand_variants` row mapping "Coated Jiggly" to a Clear subtype so their picker matches their catalog.
- **(B)** Move canonical `Jiggly` under `clear` (accepting On Cloud's slug as the tiebreaker on what the wider community means).
- **(C)** Add a second `Jiggly` under `clear` in addition to the Water one, so both wizards find it.

**Tradeoff.** Jenn's V4.1 guide places Jiggly in the Water family ("kindred textures that share the same runny, wobbly personality"). (A) honors the guide + treats On Cloud as the outlier. (C) is the most permissive but creates the same dual-home confusion as Crunchy. **Default if no decision: A.**

**► JENN 2026-07-16: Option C — Jiggly dual-home under both Water AND Clear.** Phase 2 keeps the existing Water/Jiggly subtype row + INSERTs a new Clear/Jiggly subtype row. Wizard's brand-scoped picker will show the right one based on whichever base the user selected. Note the mild UX gotcha: users picking "Water" base then seeing Jiggly, and users picking "Clear" base ALSO seeing Jiggly, may briefly wonder if they picked the wrong base. Acceptable per Jenn — matches how the market actually uses the term (both wet/wobbly and thick-clear-wobbly get called Jiggly).

### 5.5 Fishbowl vs Fishbowl Beads — merge

**Data.** Current mig 37 seeds `Fishbowl Beads` under Beaded. xlsx observes 4 shops using shorter `Fishbowl` (chappyslimes, poppymelloslimes, slimeprincess, thechaosshop). Section 4 draft adds a second `Fishbowl` row.

**Options.**
- **(A)** Merge into one canonical: rename `Fishbowl Beads` → `Fishbowl`, add `fishbowl beads` as alias.
- **(B)** Keep as two rows (shorter form is a distinct enough consumer term).

**Tradeoff.** (A) collapses redundancy. **Default if no decision: A.**

**► JENN 2026-07-16: Option A.** Phase 2 UPDATEs the existing `fishbowl_beads` subtype row: `name` becomes "Fishbowl", `slug` becomes `fishbowl`, `aliases` array gains `["fishbowl beads", "fishbowl bead"]`. No collection_logs / slimes reassignment needed since the row's `id` doesn't change — only its `name` and `slug`. FKs stay intact.

### 5.6 Metallic promotion for Poppy Mello

**Data.** xlsx: Poppy Mello uses `Metallic` as a top-level texture nav item, elsewhere Metallic is a Clear subtype (seeded mig 37).

**Options.**
- **(A)** Leave the canonical row alone. Poppy Mello's variant picker under Clear surfaces Metallic (already there). No special treatment.
- **(B)** Wire a `brand_top_level_variants` join (new) allowing brands to promote a subtype to the top of their brand catalog view. Deferred infrastructure — bigger than the taxonomy rework.

**Tradeoff.** (A) ships with the plan; (B) is a wishlist for the T137 brand dashboard redesign. **Default if no decision: A.**

**► JENN 2026-07-16: Option A for now, feature request added to T137.** Phase 2 makes no change here. The `brand_top_level_variants` join table + brand-side UI to promote a subtype to top-level filter chips gets scoped into T137 (brand dashboard visual redesign) as a small addition. When we hit T137, decide whether to include this micro-feature or defer further. Rationale: only 1 brand (Poppy Mello) needs it today, but the pattern will recur as more brands claim their catalogs (Peachybbies with Butter, Cats Craft, etc.) — better to add it inside the dashboard redesign than as one-off infra now.

---

## 6. Aliases + brand-specific terms design

Assumes Option (b) from Section 2. Two alias surfaces:

1. **`subtypes.aliases text[]`** — shared spellings that apply regardless of brand. `iceey`, `snow butter`, `TNG`, `slushy`.
2. **`brand_variants.aliases text[]`** — brand-idiosyncratic labels layered on top. Empty for most rows.

### Search behavior

Variant search (Section 8) queries both surfaces:

```sql
-- Given a search term $q and (optional) brand_id $b:
SELECT s.id, s.base_type, s.name AS canonical, bv.brand_display_name
  FROM public.subtypes s
  LEFT JOIN public.brand_variants bv
    ON bv.subtype_id = s.id
   AND ($b IS NULL OR bv.brand_id = $b)
 WHERE s.is_admin_approved = true
   AND (
     lower(s.name) ILIKE '%' || lower($q) || '%'
     OR lower(s.slug) = lower($q)
     OR EXISTS (SELECT 1 FROM unnest(s.aliases) a WHERE lower(a) ILIKE '%' || lower($q) || '%')
     OR EXISTS (SELECT 1 FROM unnest(coalesce(bv.aliases, '{}')) a WHERE lower(a) ILIKE '%' || lower($q) || '%')
     OR lower(coalesce(bv.brand_display_name, '')) ILIKE '%' || lower($q) || '%'
   );
```

### Seed data — top 10 variants (Phase 3)

Migration file: `20260718000071_variant_aliases_and_brand_variants.sql`.

Each brand slug below assumes the brand exists in the catalog (verify at migration time; drop the row silently if it doesn't yet). All rows land with `is_admin_approved = true` because Jenn's shop-scan is the source of truth.

```sql
-- ─── Canonical alias updates on public.subtypes ─────────────────────────────
UPDATE public.subtypes SET aliases = ARRAY['butter slime', 'butters']
  WHERE base_type = 'butter' AND slug = ... /* the primary butter subtype
    (there is none seeded currently — see note below) */;
-- NOTE: today 'butter' has NO subtypes seeded. The alias surface for the
-- base type itself lives elsewhere (Section 5 open item about brand-level
-- overrides). For now put the base-type aliases on the label file:
--   apps/web/lib/types.ts SLIME_BASE_TYPE_LABELS stays "Butter"
--   apps/web/lib/base-type-aliases.ts (new, tiny): { butter: ['butter slime','butters'], ...}
-- Search hits base-type first via SLIME_BASE_TYPE_LABELS; aliases file
-- catches the rest.

-- ─── Subtype-level canonical aliases (seed additions) ───────────────────────
UPDATE public.subtypes SET aliases = ARRAY['iceey', 'ice', 'soft icee']
  WHERE base_type = 'icee' AND slug = 'slushee';
-- NOTE: 'Icee' itself has no subtype row — it's the base type. The Icee
-- alias 'iceey' belongs on the base-type alias file mentioned above.

UPDATE public.subtypes SET aliases = ARRAY['bingsu slime', 'bingsu beads', 'clear bingsu']
  WHERE base_type = 'snow_fizz' AND slug = 'bingsu';

UPDATE public.subtypes SET aliases = ARRAY['crunch', 'crunchy slime', 'crunchy mixes']
  WHERE slug = 'crunchy';  -- applies to both floam+crunchy and snow_fizz+crunchy

UPDATE public.subtypes SET aliases = ARRAY['jello cubes', 'cube slime']
  WHERE base_type = 'jelly' AND slug = 'jelly_cube';

UPDATE public.subtypes SET aliases = ARRAY['fishbowl', 'fishbowl bead']
  WHERE base_type = 'beaded' AND slug = 'fishbowl_beads';

-- Cloud Cream: reflect the xlsx-observed Creme spelling
UPDATE public.subtypes SET aliases = ARRAY['cloud creme', 'cloud cream']
  WHERE base_type = 'cloud_cream' AND slug = 'snowbutter';
  -- NOTE: depends on Section 5.1 outcome.

-- ─── brand_variants seed (top 10 variants × their observed shops) ──────────
INSERT INTO public.brand_variants (brand_id, subtype_id, brand_display_name, aliases, is_admin_approved)
SELECT b.id, s.id, 'Iceey', ARRAY[]::text[], true
  FROM public.brands b, public.subtypes s
 WHERE b.slug = 'the-slime-space' AND s.base_type = 'icee'
   AND s.slug = 'slushee'  -- or the icee base-type-level row if we go that way
ON CONFLICT (brand_id, subtype_id) DO NOTHING;

-- Repeat pattern for the 9 remaining top variants. Rather than 100+
-- INSERT SELECTs in this document, the migration will use a CTE that
-- unpivots a values table:
--
--   WITH shop_variant_map(brand_slug, subtype_slug, base_type_txt, display) AS (
--     VALUES
--       ('poppymelloslimes',     'bingsu',       'snow_fizz', 'Crunchy'),
--       ('theslimespace',        'bingsu',       'snow_fizz', 'Bingsu Crunchy Bubbly'),
--       ('oncloudslime',         'jiggly',       'water',     'Coated Jiggly'),
--       ('babycatslimes',        'snowbutter',   'cloud_cream','Snowbutter'),
--       ...
--   )
--   INSERT INTO public.brand_variants (brand_id, subtype_id, brand_display_name, is_admin_approved)
--     SELECT b.id, s.id, m.display, true
--       FROM shop_variant_map m
--       JOIN public.brands b ON b.slug = m.brand_slug
--       JOIN public.subtypes s ON s.slug = m.subtype_slug AND s.base_type::text = m.base_type_txt
--     ON CONFLICT (brand_id, subtype_id) DO NOTHING;
--
-- The full VALUES list gets built from the xlsx `shops` column in Phase 3.
```

### Base-type alias file

New file `apps/web/lib/base-type-aliases.ts`:

```ts
// Non-canonical spellings for base types themselves. Consumed by
// search (Section 8) and the wizard search fallback.
import type { SlimeBaseType } from "@/lib/types";

export const BASE_TYPE_ALIASES: Partial<Record<SlimeBaseType, string[]>> = {
  icee:             ['iceey', 'ice', 'soft icee'],
  thick_and_glossy: ['tng', 'thick and glossy', 'thick glossy'],
  snow_fizz:        ['snowfizz', 'snow-fizz'],
  cloud_cream:      ['cloud creme', 'cloud cream'],
  fluffy:           ['fluff', 'cotton candy fluff', 'cloud fluff'],
  butter:           ['butter slime', 'butters'],
  cloud:            ['cloud slime', 'cloud slimes'],
  clear:            ['clear slime', 'extra clear', 'clear glue based'],
};
```

---

## 7. Variant suggestion flow (full spec)

### Table

Migration file: `20260719000072_variant_suggestions.sql`.

```sql
-- 1. Extend the notification_type enum with two new values.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'variant_suggestion_received';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'variant_suggestion_approved';
-- Rejected notifications reuse variant_suggestion_received's inverse pattern —
-- if we want a separate 'variant_suggestion_rejected' add it here; T110 shipped
-- both approved and rejected so we mirror it:
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'variant_suggestion_rejected';

-- 2. The table itself.
CREATE TABLE public.variant_suggestions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  brand_id          uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  base_type         public.slime_base_type NOT NULL,
  proposed_name     text NOT NULL CHECK (length(trim(proposed_name)) BETWEEN 2 AND 60),
  notes             text CHECK (notes IS NULL OR length(notes) <= 200),
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','duplicate')),
  admin_notes       text,
  -- On approve: the subtype (and brand_variant if brand-scoped) that got created.
  resolved_subtype_id       uuid REFERENCES public.subtypes(id)       ON DELETE SET NULL,
  resolved_brand_variant_id uuid REFERENCES public.brand_variants(id) ON DELETE SET NULL,
  resolved_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX variant_suggestions_submitter_created_idx
  ON public.variant_suggestions (submitter_id, created_at DESC);
CREATE INDEX variant_suggestions_status_created_idx
  ON public.variant_suggestions (status, created_at DESC);
CREATE INDEX variant_suggestions_brand_status_idx
  ON public.variant_suggestions (brand_id, status);

-- 3. RLS mirrors brand_suggestions (mig 65):
--    INSERT: authenticated users, submitter_id = auth.uid()
--    SELECT: submitter reads own; brand owner reads their brand's rows;
--            admins read all
--    UPDATE/DELETE: admin OR (brand owner where brand_id matches AND still pending)
ALTER TABLE public.variant_suggestions ENABLE ROW LEVEL SECURITY;
-- (policies elided here — literal migration will follow mig 65's pattern exactly)

-- 4. updated_at trigger reuses public.set_updated_at().
CREATE TRIGGER variant_suggestions_updated_at
  BEFORE UPDATE ON public.variant_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### Wizard mini-form design

Fires from wizard step 6 when the "Suggest a variant" magenta ghost CTA is tapped.

**Fields.**
- **Proposed name** (required, 2–60 chars). Placeholder: "What do you call this variant?" Moderated via `lib/moderation.ts` — reuse `slime_name` rule (letters/spaces/light punctuation allowed, no profanity).
- **Notes** (optional, ≤200 chars). Placeholder: "Anything the brand should know? Optional." Reuse `brand_note` moderation rule.
- **Base type + brand** are read-only, populated from the wizard state.

**Placement.** Half-height sheet slides up from the bottom (matches `BrandSuggestionSheet` treatment used in the brand wizard step). Cyan submit button "Send suggestion" + white ghost "Cancel."

**Submission.** `POST /api/variant-suggestions` — server route, anon client so RLS runs. Both fields run through `moderateText()` before insert; failures surface the moderation `message` inline. On success, sheet closes with a slime-green toast: "Suggestion sent. We'll notify you when it's reviewed."

**Rate limit.** Same shape as brand suggestions (5 pending per user per 24h; users with at least one approved variant get 15 per 24h). The `variant_suggestions_submitter_created_idx` powers the count.

### Notification hook

On INSERT the server route also fires a notification to the resolver — brand owner if `brands.owner_id IS NOT NULL`, otherwise the admin role.

```ts
// after insert, in the route handler:
if (brand.owner_id) {
  await insertNotification({
    user_id: brand.owner_id,
    type: 'variant_suggestion_received',
    brand_id: brand.id,
    // The link click routes to /brand/[slug]/dashboard#pending-variants
  });
} else {
  await insertAdminNotifications('variant_suggestion_received', { brand_id });
}
```

Reuses the T29 notifications pipeline (`public.notifications` insert + realtime broadcast).

### Approval surfaces

**Brand owner** (claimed brands) — `/brand/[slug]/dashboard` gets a new "Pending Variants" section, part of T137 brand dashboard redesign scope. Rows show proposed name + submitter username + notes. Approve → creates:
1. A new `subtypes` row if the canonical variant doesn't exist yet (base_type + normalized slug from proposed_name).
2. A `brand_variants` row linking that subtype to this brand with `brand_display_name = proposed_name`.
3. Updates the suggestion row: `status='approved'`, `resolved_subtype_id`, `resolved_brand_variant_id`, `resolved_at`, `resolved_by`.
4. Fires trigger (see Contribution counter below).
5. Sends `variant_suggestion_approved` notification to the submitter.

Reject → status='rejected', admin_notes required, fires `variant_suggestion_rejected` to the submitter (per T110 rejection copy pattern).

**Admin** (unclaimed brands) — new page `/admin/variant-suggestions` mirroring `/admin/brand-suggestions/page.tsx` (filter tabs Pending / Approved / Rejected / Duplicate, row-level actions). Same approval flow as brand-owner side; the admin user is `resolved_by`.

### Profile contribution counter + trigger

Migration adds `profiles.approved_variant_contributions int NOT NULL DEFAULT 0` with the same guardrails as `approved_brand_suggestions_count` (Section 4 of mig 66).

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved_variant_contributions integer NOT NULL DEFAULT 0
    CHECK (approved_variant_contributions >= 0);

-- Extend the HP-8 protect trigger to lock this new counter (add one
-- more NEW.<col> := OLD.<col> line to profiles_protect_billing_columns).

-- Trigger on variant_suggestions mirrors tg_brand_suggestion_scout_count():
CREATE OR REPLACE FUNCTION public.tg_variant_suggestion_credit_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  -- INSERT approved: +1 to submitter
  -- UPDATE not-approved -> approved: +1
  -- UPDATE approved -> not-approved: -1 (clamp at 0)
  -- UPDATE both approved with submitter change: -1/+1
  -- DELETE approved: -1 (clamp)
  -- Same body shape as tg_brand_suggestion_scout_count.
  RETURN NULL;
END;
$$;

CREATE TRIGGER variant_suggestions_credit_count
  AFTER INSERT OR UPDATE OR DELETE ON public.variant_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.tg_variant_suggestion_credit_count();
```

The counter sets up a Variant Scout badge (analog to Brand Scout / T112) that Design can spec later. No badge UI in this cycle.

---

## 8. Display treatment — v1 minimum

Only two surfaces get design work in v1: **`/slimes/[id]`** and **variant search**. Everything else — feed, my shelf, brand community logs, discover chip filter — is called out as v1.5 tail so we don't lose the thread.

### 8.1 Slime detail page (`apps/web/app/slimes/[id]/page.tsx`)

Current shape (line 349–362): one pill combining base type + subtype separated by `·`. The plan is to **split into two chips**, so the variant reads as a distinct piece of metadata.

**Change.** Replace the single-pill block with:

```tsx
<div className="flex flex-wrap gap-2 items-center">
  {baseTypeLabel && (
    <span
      className="px-3 py-1 rounded-full text-xs font-semibold border"
      style={{ background: `${typeColor}20`, color: typeColor, borderColor: `${typeColor}50` }}
    >
      {baseTypeLabel}
    </span>
  )}
  {variantDisplay && (
    <span
      className="px-3 py-1 rounded-full text-xs font-medium border"
      style={{
        // Same tint as base type but muted; variant is subordinate metadata.
        background: `${typeColor}12`,
        color: typeColor,
        borderColor: `${typeColor}30`,
        opacity: 0.9,
      }}
    >
      {variantDisplay}
    </span>
  )}
  {/* wishlist / in-collection pills continue as-is */}
</div>
```

Where `variantDisplay` prefers the brand's display label if one exists:

```ts
// derived server-side in the same fetchLog cache() call:
const variantDisplay =
  log.brand_variant?.brand_display_name ??
  log.subtype?.name ??
  null;
```

`fetchLog` gets a wider select:

```ts
.select(`
  *,
  subtype:subtypes(name, slug),
  brand_variant:brand_variants!brand_variants_subtype_id_fkey(brand_display_name)
`)
```

**Visual note.** No em-dashes; the visible copy is single-word labels only. Colors reuse `SLIME_BASE_TYPE_COLORS[base_type]` — the variant chip is a muted-opacity variation of the base chip, so the pair reads as one meta group. Follows the neon palette (Sec: styling) established in CLAUDE.md.

### 8.2 Log detail — same file

`/slimes/[id]` is the log detail page (confirmed: it reads from `collection_logs`, not `slimes`). No separate `/logs/[id]` route exists. The chip change above covers both.

### 8.3 Variant search

`apps/web/app/search/page.tsx` today: builds type results from `SLIME_BASE_TYPE_LABELS` (line 259–261) and slime results from a `slimes` table filter (line 265–281). No variant search.

**Change.** Add a fourth Promise.all fetch that queries subtypes + brand_variants aliases, using the query in Section 6:

```ts
supabase.rpc('search_variants', { q: trimmed }),
```

Backing it: a new SQL function `public.search_variants(text)` returning `{ subtype_id, canonical_name, base_type, brand_display_name, brand_slug }[]`. Rendered as its own results section under "Variants" with a chip visual and a click-through to `/discover/type/[base_type]?variant=<slug>` (the query-param filter is a v1.5 add; for v1 the click just filters to the base type page).

### 8.4 v1.5 tail (documented, not built)

- **Feed cards** (`components/FeedCard.tsx`, `components/feed/FeedCardCompact.tsx`) — add variant chip inline with base-type chip. Current FeedCard has a whole 20-entry `TYPE_STYLES` map that duplicates `SLIME_BASE_TYPE_COLORS`; consolidate at the same time.
- **My shelf cards** (`components/collection/CollectionCard.tsx`) — add subtitle line under slime name with variant.
- **Brand community logs** — surface variant in the community-logs list on `/brand/[slug]`.
- **Discover `/type/[base]` chip filter row** — horizontal scroll of variant chips filtering the base-type page.

---

## 9. DIY-as-boolean recommendation

**Recommendation:** yes, add `is_diy boolean NOT NULL DEFAULT false` to both `slimes` and `collection_logs`. Keep the `DIY Clay` subtype seeded (Section 4) as a search-coverage safety net until the boolean has been in the wild for a few weeks; then we can decide whether to retire the subtype row.

### Rationale

Per the xlsx: 14 of 36 shops merchandise DIY Clay as a top-level category. But it's not a texture — it's a product format (the buyer mixes it themselves). Butter is what it becomes once mixed. If we jam "DIY Clay" into the taxonomy as if it were a texture, we compromise the model.

### Migration sketch

Migration file: `20260720000073_is_diy_flag.sql`.

```sql
ALTER TABLE public.slimes
  ADD COLUMN is_diy boolean NOT NULL DEFAULT false;
ALTER TABLE public.collection_logs
  ADD COLUMN is_diy boolean NOT NULL DEFAULT false;

CREATE INDEX slimes_is_diy_idx           ON public.slimes(is_diy)          WHERE is_diy = true;
CREATE INDEX collection_logs_is_diy_idx  ON public.collection_logs(is_diy) WHERE is_diy = true;

-- Backfill: any row with subtype_id pointing at the DIY Clay subtype
-- gets is_diy = true.
UPDATE public.slimes s
   SET is_diy = true
  FROM public.subtypes t
 WHERE t.id = s.subtype_id AND t.slug = 'diy_clay';

UPDATE public.collection_logs cl
   SET is_diy = true
  FROM public.subtypes t
 WHERE t.id = cl.subtype_id AND t.slug = 'diy_clay';
```

### UI implications (deferred, mentioned)

- **Log wizard** step 6 grows a small "DIY kit" toggle above the variant picker (defaults off). Independent of variant selection.
- **Cards** (feed, shelf, slime detail) gain a small "DIY" badge next to the base-type chip when `is_diy` is true. Ghost outline in gold (`#FFD24A`) — sparingly per the CLAUDE.md palette rule.
- **Discover filter** gains a "DIY only" chip on `/discover/type/[base]`.

All three UI additions are v1.5 scope; the migration + defensive backend can land in Phase 8.

---

## 10. Hybrid combos — defer plan

Xlsx flags `Butterfizz` (butter × snow fizz, chappyslimes), `Bingsu Butter` (bingsu × butter, ammaslimes). More will appear as scanning continues. These are combinations, not new textures.

### v1 handling (no schema change)

Users capture hybrid intent using the existing model:

- `base_type = 'hybrid'`
- Variant text left free or set to whichever subtype is dominant
- Notes field carries the combination description ("Butter + Snow Fizz — the crunch of snow fizz with butter body")

The wizard already supports this — `hybrid` is a seeded base type with no subtypes. The user path is: pick Hybrid, skip variant, describe in notes.

### v1.5 path (proper multi-tag)

New many-to-many table `slime_texture_tags`:

```sql
CREATE TABLE public.slime_texture_tags (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slime_id       uuid NULL REFERENCES public.slimes(id) ON DELETE CASCADE,
  log_id         uuid NULL REFERENCES public.collection_logs(id) ON DELETE CASCADE,
  subtype_id     uuid NOT NULL REFERENCES public.subtypes(id) ON DELETE CASCADE,
  is_primary     boolean NOT NULL DEFAULT false,
  weight         numeric CHECK (weight IS NULL OR (weight >= 0 AND weight <= 1)),
  CHECK ((slime_id IS NULL) <> (log_id IS NULL))
);
CREATE INDEX slime_texture_tags_slime_idx ON public.slime_texture_tags(slime_id);
CREATE INDEX slime_texture_tags_log_idx   ON public.slime_texture_tags(log_id);
CREATE UNIQUE INDEX slime_texture_tags_slime_subtype
  ON public.slime_texture_tags (slime_id, subtype_id) WHERE slime_id IS NOT NULL;
CREATE UNIQUE INDEX slime_texture_tags_log_subtype
  ON public.slime_texture_tags (log_id, subtype_id) WHERE log_id IS NOT NULL;
```

`base_type` on `slimes` / `collection_logs` stays as the primary category; `slime_texture_tags` carries the additional tags. Wizard step 6 in v1.5 gains a multi-select. Chip display becomes primary + up to two secondaries.

Deferred to v1.5 per the locked scope. Don't build in this cycle.

---

## 11. UI sweep — files that must change

### 11.1 Files that hard-code the 20-base-type list (must drop `clay`)

| File | Line | What it does |
|---|---|---|
| `apps/web/lib/types.ts` | 95 (SlimeBaseType union), 117 (SLIME_BASE_TYPE_LABELS), 143 (SLIME_BASE_TYPE_COLORS) | Canonical labels + color tokens. |
| `apps/web/lib/base-type-hero.ts` | 18 (BASE_TYPE_HERO_PHOTO), 48 (BASE_TYPE_HERO_TINT) | Wizard picker + Discover hero. Also drop `hybrid: "/guide/textures/hybrid-bingsu-jelly-clay-ky.webp"` filename? No — that's a filename that happens to contain "clay"; the file itself represents a hybrid, keep. |
| `apps/web/app/api/wishlist/route.ts` | 21 | Validator array. Drop `'clay'`. |
| `apps/web/components/FeedCard.tsx` | 82 | Style map. Drop `clay` entry. |
| `apps/web/components/feed/FeedCardCompact.tsx` | 73 | Label map. Drop `clay`. |
| `apps/web/components/collection/CollectionCard.tsx` | 72 | Chip map. Drop `clay`. |
| `apps/web/components/collection/TasteInsights.tsx` | 45 | Chart color map. Drop `clay`. |
| `apps/web/components/collection/SpiralView.tsx` | 25 | Chart color map. Drop `clay`. |
| `apps/web/components/collection/TimelineView.tsx` | 27 | Chart color map. Drop `clay`. |
| `apps/web/components/collection/CollectionSummaryChart.tsx` | 30 | Chart color map. Drop `clay`. |
| `apps/web/app/slimes/[id]/opengraph-image.tsx` | 19 | OG background color. Drop `clay`. |

### 11.2 Files that reference "Clay" in copy (content only, no logic)

| File | Line | Note |
|---|---|---|
| `apps/web/app/guide/content.ts` | 285–309 | Full guide entry for the Clay base type. **Delete this entry entirely.** Adjust the Butter entry (164) to drop `"Clay"` from `variantsAndRelated`, and the Slay entry to soften its `"blends 'slight' and 'clay'"` phrasing to match Jenn's V4.1 guide (which retains the phrase but no longer treats Clay as a standalone base). |
| `apps/web/app/guide/content.ts` | 162–164 | Butter definition mentions "at least half air-dry clay" — factually correct + fine to keep; "clay" here is the ingredient, not the base type. Keep. |
| `apps/web/app/guide/content.ts` | 198 | Cloud Cream definition mentions "skipping air dry clay entirely" — keep, ingredient reference. |
| `apps/web/app/guide/content.ts` | 552–555 | Add-ins entry for "Air Dry Clay" — the ingredient. Keep, unchanged. |
| `apps/web/app/guide/content.ts` | 585, 1319, 1329, 1377, 1490, 1500 | Miscellaneous copy references to clay-the-ingredient. Keep. |
| `apps/web/app/guide/content.ts` | 301–304 | Example slime "Palmetto Clay" — the slime name itself; if the linked slime still exists in the catalog under this name, keep it referenced elsewhere; the Clay guide page removal takes the block down with it. |

### 11.3 Files that render base type on a slime/log summary (Section 8.4 v1.5 touchpoints)

Not urgent for v1. Listed here for completeness in v1.5 planning:

- `apps/web/components/FeedCard.tsx` — TYPE_STYLES map + chip rendering
- `apps/web/components/feed/FeedCardCompact.tsx`
- `apps/web/components/collection/CollectionCard.tsx`
- `apps/web/components/collection/SlimeDetailCard.tsx`
- `apps/web/components/SlimeCard.tsx` (uses TypeBadge)
- `apps/web/app/brands/[slug]/page.tsx` — brand community logs list
- `apps/web/app/discover/type/[base_type]/page.tsx` — variant filter chip row (v1.5)

Plus `apps/web/components/TypeBadge.tsx` already accepts an optional `subtypeName` prop — no changes needed to that component itself; the callers just need to start passing it.

---

## 12. Execution phase order

Migration file numbering below assumes we're at mig 68 (marketplace waitlist, `20260712000068`) and starting the next block at 69. If new migrations land in between, bump.

### Phase 1 — Clay removal (Section 3 + Section 11)
- **Migration:** `20260716000069_clay_removal.sql`
- **Code:** Sweep the 11 files in Section 11.1 to drop `'clay'`. Delete the Clay guide entry (Section 11.2).
- **Verify:** `npm run type-check` clean; `/guide` still renders 19 base-type sections; loading `/slimes/[id]` for a formerly-clay slime shows Butter chip.
- **Risk:** Any code path that switch/case's over base_type and expects `'clay'` will throw. Type-check catches most; grep for `'clay'` again after the sweep.
- **Estimate:** 1.5 days.

### Phase 2 — Data model + new subtypes seed (Section 2 + Section 4)
- **Migrations:**
  - `20260717000070a_brand_variants_table.sql` — adds `subtypes.aliases`, creates `public.brand_variants`, RLS.
  - `20260717000070b_subtypes_seed_v2.sql` — inserts the ~25 new subtype rows from Section 4 (excluding rename-affected rows).
- **Code:** New file `apps/web/lib/base-type-aliases.ts` (Section 6). Update `types.ts` `Subtype` interface if we adopt aliases; add `BrandVariant` interface.
- **Verify:** Sample query returns expected variants for `(brand X, base Y)`. Wizard still works (nothing yet reads brand_variants).
- **Estimate:** 2 days.

### Phase 3 — Aliases + brand-scoped variants seed (Section 6)
- **Migration:** `20260718000071_variant_aliases_and_brand_variants.sql` — CTE-driven INSERT unpacking the xlsx's shop-per-variant map. Pull the full VALUES list from a scripted CSV export of the xlsx in the same PR.
- **Code:** None (data-only).
- **Verify:** Row counts match xlsx: at least the top 10 variants have their observed brand rows. Manual sample of the wizard query for 2–3 brands returns the expected labels.
- **Estimate:** 1.5 days.

### Phase 4 — Rename / move decisions after Jenn signs off (Section 5)
- **Migrations:** Named per outcome. If Section 5.1 selects rename Cloud Cream → Snowbutter, migration `20260721000074_rename_cloud_cream_to_snowbutter.sql` follows the same enum-swap pattern as Phase 1. Otherwise no migration needed for that item.
- **Code:** Sweep call-sites for whatever renames land.
- **Estimate:** 1 day.

### Phase 5 — Wizard changes (locked UX from prompt)
- **Code (no migration):**
  - Add step 6 to `apps/web/app/log/page.tsx` and `apps/web/app/log/edit/[id]/page.tsx` — variant picker or magenta ghost CTA, driven by brand + base type.
  - Replace `SubtypeAutocomplete` with a chip-picker component `BrandAwareVariantPicker` (new). Falls back to the current autocomplete search inside the picker when the brand has more than 6 approved variants.
  - New route `POST /api/variants/for-brand` returning the wizard query result from Section 2. Or use a client-side `.rpc('variants_for_brand', ...)`.
  - Wire the fallback CTA to open the `VariantSuggestionSheet` (Section 7).
- **Verify:** For a claimed brand with brand_variants rows, picker shows brand labels; for a claimed brand without any at that base type, ghost CTA renders; for a free-text brand (`brand_id = null`), step 6 is skipped entirely.
- **Estimate:** 2 days.

### Phase 6 — Variant suggestion flow (Section 7)
- **Migration:** `20260719000072_variant_suggestions.sql` — table, notification enum values, `profiles.approved_variant_contributions` column, HP-8 protect trigger extension, counter trigger.
- **Code:**
  - `POST /api/variant-suggestions` server route with moderation gate.
  - `VariantSuggestionSheet` client component (matches BrandSuggestionSheet visual).
  - Brand-owner surface: new section on `/brand/[slug]/dashboard` (coordinate with T137). File a follow-up if T137 is not yet in flight.
  - Admin surface: `/admin/variant-suggestions/page.tsx` + row component, cloned from `/admin/brand-suggestions`.
  - Approve action: creates subtype (if new) + brand_variant, fires `variant_suggestion_approved` notification, increments counter via trigger.
  - Reject action: fires `variant_suggestion_rejected` notification.
  - Notification renderer: extend `NotificationRow` for the two new types.
- **Verify:** End-to-end submit → notify → approve → credit works in a smoke test.
- **Estimate:** 2 days.

### Phase 7 — Display + search v1 (Section 8)
- **Migration:** New RPC `public.search_variants(text)` (Section 8.3).
- **Code:**
  - `apps/web/app/slimes/[id]/page.tsx` — split chip block into base + variant chips (Section 8.1). Widen `fetchLog` select for brand_variant.
  - `apps/web/app/search/page.tsx` — fourth Promise.all fetch + Variants results section.
- **Verify:** Slime detail chip renders variant with brand-scoped label when appropriate; search for "iceey" returns the Icee base type + The Slime Space brand context; search for "bingsu" returns Poppy Mello's crunchy row.
- **Estimate:** 1.5 days.

### Phase 8 (v1.5, out of this cycle) — DIY-as-boolean + hybrid combos + remaining display surfaces
- **Migrations:** `20260720000073_is_diy_flag.sql` (Section 9) + `20260722000075_slime_texture_tags.sql` (Section 10).
- **Code:** Feed / shelf / brand community / discover chip row (Section 8.4), DIY toggle + badge, multi-tag picker.
- **Estimate:** 2 days when scheduled.

---

## Hard constraints checklist

- [x] Base type list stays at 19 values after clay removal — Section 3.
- [x] New base type candidates flagged for Jenn, not baked in — Section 5 (Snowbutter rename is the only base-type-adjacent decision).
- [x] No em-dashes in any user-visible string proposed — reviewed every quoted string in Sections 7 and 8.
- [x] Every user-authored text path (variant name suggestions) references `lib/moderation.ts` — Section 7 wizard mini-form.
- [x] Additive migrations preferred; the clay removal is unavoidably destructive and documented as such — Section 3 rollback note.
- [x] No new libraries or major dependencies introduced.

---

## Deliverable stats

- **Sections:** 12
- **Open decisions for Jenn:** 6 (Section 5.1 through 5.6)
- **Migrations proposed:** 6 primary (69, 70a, 70b, 71, 72, plus Phase 4 conditional) + 2 v1.5 (73, 75)
- **New tables:** `public.brand_variants`, `public.variant_suggestions` (+ v1.5: `public.slime_texture_tags`)
- **New notification enum values:** 3 (`variant_suggestion_received`, `variant_suggestion_approved`, `variant_suggestion_rejected`)
- **UI files sweeping in Phase 1:** 11 (Section 11.1)
- **Guide entries removed:** 1 (Clay base type entry, Section 11.2)
