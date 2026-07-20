-- 20260720000082_t125_care_actions.sql
--
-- T125 phase 2 — structured care-action tracking.
--
-- Backend for the "what did you do to your slime?" data collection
-- lane. Every check-in captures ONE OR MORE care action rows, each
-- with a canonical product key + optional quantity. Powers:
--
--   * Free tier: structured check-in modal (Kneaded auto-default;
--     activator/softener/additive/storage dropdowns).
--   * Pro tier: per-slime care history, care analytics dashboard,
--     personalized restock recommendations (when SlimeLog shop
--     launches — see monetization plan).
--   * Aggregate market intel: "78% of Aloe Nightmares butter
--     collectors add contact solution weekly."
--
-- Design choices worth calling out:
--
--   * `care_products` is a CATALOG table with a text primary key
--     (`contact_solution`, `borax_water`, etc). Adding new products
--     later is a data INSERT — no migration needed.
--   * `slime_care_actions` uses that key as an FK. Enums (category,
--     quantity_unit) provide the "shape" of care actions; the
--     product catalog provides the specific instances.
--   * `is_slimelog_branded` flag on `care_products` reserves the
--     column for when SlimeLog ships its own activator / bead pack /
--     etc. Analytics can filter on it for house-brand vs 3rd-party
--     insight.
--   * RLS: catalog is publicly readable (drives the check-in modal
--     dropdowns for all users). Care actions are user-scoped (users
--     see their own; aggregates run server-side with service_role).

BEGIN;

-- ─── Section 1. Enums ────────────────────────────────────────────────

-- Buckets the six community-recognized care categories.
CREATE TYPE public.care_action_type AS ENUM (
  'activator',    -- rehydrate / re-solidify (contact solution, borax, etc)
  'softener',     -- loosen tight slime (baby oil, lotion, warm water)
  'additive',     -- rebuild body / add texture (foam beads, cornstarch, clay)
  'physical',     -- no product, just handling (knead, air out, warm hands)
  'storage',      -- change how it's stored (jar, bag, refrigerate)
  'other'         -- escape hatch for uncataloged actions
);

-- Common units used across care products. Not all products need a
-- quantity (physical actions don't); nullable columns on the
-- actions table cover that case.
CREATE TYPE public.quantity_unit AS ENUM (
  'drops',
  'pumps',
  'tsp',
  'tbsp',
  'ml',
  'oz',
  'pinch',
  'squirt'
);

-- ─── Section 2. Care products catalog ────────────────────────────────

CREATE TABLE public.care_products (
  key                   text PRIMARY KEY,
  category              public.care_action_type NOT NULL,
  display_name          text NOT NULL,
  description           text,
  amazon_asin           text,
  is_slimelog_branded   boolean NOT NULL DEFAULT false,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.care_products IS
  'Catalog of care products / actions users can log via the check-in modal. Text PK so adding new products is a data insert, not a migration. amazon_asin reserved for affiliate + future direct-sell. is_slimelog_branded reserved for when SlimeLog ships its own activator / bead pack.';

CREATE INDEX care_products_category_sort_idx
  ON public.care_products (category, sort_order);

-- ─── Section 3. Care actions log ─────────────────────────────────────

CREATE TABLE public.slime_care_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id            uuid NOT NULL REFERENCES public.collection_logs(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  performed_at      timestamptz NOT NULL DEFAULT now(),
  action_type       public.care_action_type NOT NULL,
  product_key       text REFERENCES public.care_products(key),
  quantity_type     public.quantity_unit,
  quantity_amount   numeric(6,2),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.slime_care_actions IS
  'Every structured care action a user reports during a check-in. One check-in can produce multiple rows (e.g. kneaded + added contact solution + moved to airtight jar = 3 rows). Feeds per-user product profiles, aggregate market intel, and Pro-tier care analytics.';

-- Fast lookups: recent actions per log (care history), recent per user
-- (analytics), and aggregate by product+base_type (market intel joins
-- through collection_logs so a covering index on log_id is the
-- primary path).
CREATE INDEX slime_care_actions_log_recent_idx
  ON public.slime_care_actions (log_id, performed_at DESC);

CREATE INDEX slime_care_actions_user_recent_idx
  ON public.slime_care_actions (user_id, performed_at DESC);

-- Partial index for aggregate queries — only rows with a canonical
-- product key matter for aggregation. Physical actions (knead, rest)
-- with product_key=NULL don't need the aggregate index.
CREATE INDEX slime_care_actions_product_agg_idx
  ON public.slime_care_actions (product_key, performed_at)
  WHERE product_key IS NOT NULL;

-- ─── Section 4. RLS ──────────────────────────────────────────────────

-- Catalog is publicly readable (drives check-in modal dropdowns for
-- signed-out users too, in case we ever surface care content on
-- public /guide pages).
ALTER TABLE public.care_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "care products are public"
  ON public.care_products FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policy → only service_role can modify.
-- Matches the seed_follow_accounts + base_type_activator_defaults
-- patterns from earlier migrations.

-- Care actions are user-scoped. Users read + write their own only.
-- Aggregate views run server-side with service_role and are safe.
ALTER TABLE public.slime_care_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own care actions"
  ON public.slime_care_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own care actions"
  ON public.slime_care_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update the notes field on their own actions (fix a typo).
CREATE POLICY "users update own care actions"
  ON public.slime_care_actions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own care actions (correcting a mistaken
-- check-in). Cascade cleanup happens via collection_logs.id FK.
CREATE POLICY "users delete own care actions"
  ON public.slime_care_actions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── Section 4b. Pro care package field on collection_logs ──────────
--
-- Per-slime free-form care plan text. Pro users author this in the
-- new /collection/care page (T125 phase 2 UI). Free users see it
-- read-only if the log is theirs. Not gated at the DB level — the
-- Pro gate is enforced by the server action `setLogCarePlanNotes`
-- (see lib/aging-actions.ts). We could add a check constraint like
-- `WHERE profile.subscription_tier IN ('pro','brand_pro')` but that
-- would require a subquery in the constraint which Postgres doesn't
-- support directly — server-side gating is the standard pattern
-- across the app.

ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS care_plan_notes text;

COMMENT ON COLUMN public.collection_logs.care_plan_notes IS
  'Pro-only per-slime care plan free-form notes. E.g. "Add 1 pump contact solution every 2 weeks. Best after 3-day rest." Written via setLogCarePlanNotes server action which enforces Pro entitlement server-side.';

-- ─── Section 5. Seed the 30-product care catalog ─────────────────────
--
-- Categories x rough count:
--   activator (6), softener (5), additive (10),
--   physical (4), storage (4), other (1) = 30
--
-- amazon_asin left NULL for now — Jenn can fill in when we're ready
-- to add affiliate links. sort_order controls the order chips render
-- in the check-in modal within each category (most-common first).

INSERT INTO public.care_products (key, category, display_name, description, sort_order) VALUES
  -- Activators (top choice first)
  ('contact_solution',      'activator', 'Contact lens solution',   'Saline + boric acid. Most common activator. A few pumps at a time.', 10),
  ('saline_solution',       'activator', 'Saline solution',         'Milder activator. Good for delicate textures like cloud.', 20),
  ('borax_water',           'activator', 'Borax + water solution',  'Advanced DIY activator. Stronger than contact solution.', 30),
  ('baking_soda_contact',   'activator', 'Baking soda + contact',   'Butter / cloud reset. Small pinch baking soda + a few pumps contact.', 40),
  ('sodium_tetraborate',    'activator', 'Sodium tetraborate',      'Concentrated activator for stubborn stretchy slimes.', 50),
  ('liquid_starch',         'activator', 'Liquid starch',           'Older-recipe activator. Occasionally used for fluffy textures.', 60),

  -- Softeners
  ('baby_oil',              'softener',  'Baby oil / mineral oil',  'Loosens tight butter / glossy. A few drops at a time.', 10),
  ('baby_lotion',           'softener',  'Baby lotion',             'Softens cloud + butter. Adds moisture without changing texture.', 20),
  ('warm_water',            'softener',  'Warm water',              'Universal fix for tight slime. Hand-warm before kneading in.', 30),
  ('hand_cream',            'softener',  'Hand cream / moisturizer', 'Similar to baby lotion; personal preference.', 40),
  ('glycerin',              'softener',  'Glycerin',                'Restores shine to glossy + thick-and-glossy slimes.', 50),

  -- Additives (rebuild body / add texture)
  ('foam_beads',            'additive',  'Foam beads',              'Floam + beaded refresh. Sprinkle in and knead.', 10),
  ('instant_snow',          'additive',  'Instant snow',            'Cloud + snow-fizz body builder.', 20),
  ('cornstarch',            'additive',  'Cornstarch',              'Cloud slime rejuvenation.', 30),
  ('clay_daiso',            'additive',  'Daiso lightweight clay',  'Butter slime top-up. Community favorite.', 40),
  ('model_magic',           'additive',  'Model Magic',             'Convert regular slime into butter texture.', 50),
  ('fishbowl_beads',        'additive',  'Fishbowl beads',          'Crunch textures.', 60),
  ('glitter',               'additive',  'Glitter',                 'Cosmetic refresh.', 70),
  ('fragrance_oil',         'additive',  'Fragrance oil',           'Refresh scent. A drop or two, kneaded through.', 80),
  ('charms_sprinkles',      'additive',  'Charms or sprinkles',     'Decorative additions.', 90),
  ('shaving_cream',         'additive',  'Shaving cream',           'Fluffy slime refresh (specific recipes only).', 100),

  -- Physical actions (no product — most-common first)
  ('knead',                 'physical',  'Kneaded',                 'Warmed and worked with hands. Auto-checked on every check-in.', 10),
  ('air_out',               'physical',  'Aired out',               'Over-activated. Let breathe before storing.', 20),
  ('warm_hands',            'physical',  'Warmed with hands',       'Cold or tight slime. Body heat before kneading.', 30),
  ('rest',                  'physical',  'Rested',                  'Played with, then set aside for a few hours.', 40),

  -- Storage changes
  ('airtight_jar',          'storage',   'Moved to airtight jar',   'Snoop jar / screw-top mason. Best long-term storage.', 10),
  ('plastic_bag',           'storage',   'Moved to plastic bag',    'Ziplock or slime bag. Portable storage.', 20),
  ('refrigerate',           'storage',   'Refrigerated',            'Some brands recommend chilling to extend shelf life.', 30),
  ('original_container',    'storage',   'Back to original container', 'Return to the tub it shipped in.', 40),

  -- Escape hatch
  ('other',                 'other',     'Other',                   'Something not in the catalog. Add details in notes.', 10)
ON CONFLICT (key) DO NOTHING;

COMMIT;
