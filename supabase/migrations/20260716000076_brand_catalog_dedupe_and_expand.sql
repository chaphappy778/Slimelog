-- 20260716000076_brand_catalog_dedupe_and_expand.sql
--
-- Brand catalog cleanup + expansion, per Jenn's 2026-07-16 audit + James's
-- approvals in the same session.
--
-- WHAT
-- ----
-- 1. Merges 9 duplicate brand pairs (splits ratings across two rows in
--    each case). For each pair we reassign every FK from the losing side
--    to the kept side, merge non-null contact/branding data from loser
--    into keeper, then DELETE the losing row. Verified status carries
--    forward via OR so a verified loser upgrades an unverified keeper.
-- 2. Renames 4 shops whose slugs / names don't match the actual brand:
--    Cosmic Slimez → Cosmic Slime, Minty Fresh Slimes → Minty Slimes,
--    King Slime Company (BR) → King Slime Brasil, Royal Slime Shop CA
--    → Royal Slime. These are name-only changes; row IDs stay stable so
--    no FK reassignment needed.
-- 3. Disambiguates Colour Slime AU / US names — both are currently
--    literally "Colour Slime" which is confusing and would block the
--    normalized-name unique index. Renames to "Colour Slime (AU)" and
--    "Colour Slime (US)".
-- 4. Deletes 3 misclassified rows:
--    - Holly Laing Slimes (merch site, not a slime shop)
--    - GuiGui Slime (Moose Toys) (corporate page, not a shop)
--    - KSC Slime (duplicate of Kawaii Slime Company — merged in via the
--      helper, not a plain delete)
-- 5. Inserts 18 Korean creator brands sourced from SeoulGAGE curator
--    scan (2026-07-15 brand-shop-scan phase 1 report). Korea flagged
--    as high-priority expansion market post-launch; adding the shops
--    now so users can log slimes from them + so future brand-scan runs
--    have targets. All 18 land as unverified/unclaimed.
-- 6. Adds a normalized-name unique index preventing future dupes
--    ("Snoop Slimes" vs "Snoopslimes" would now conflict at insert
--    time). Normalization: lowercase + strip all non-alphanumeric.
--
-- WHAT'S NOT INCLUDED
-- -------------------
-- - Snoop Crunch Slime Shop (slug `snoop-crunch-slime-shop`, id
--   9be32eec-529c-4a12-b76a-47f59260a7ff) — name looks like a Snoop
--   Slimes product-line entry rather than a distinct shop, but Jenn
--   didn't call it out explicitly. Preserved as-is; if it turns out
--   to be another dupe, follow-up migration handles it.
-- - The Slime Labs vs Slime Labs UK — both preserved as distinct rows
--   per Jenn's "keep both if distinct entities" default. Normalized
--   names are "theslimelabs" vs "slimelabsuk" so no unique-index
--   conflict.
--
-- FK-CARRYING TABLES HANDLED
-- --------------------------
-- Every table referencing brands.id is reassigned in the _merge_brand
-- helper (Section 1). The complete list:
--   - slimes.brand_id                       (ON DELETE RESTRICT)
--   - collection_logs.brand_id              (SET NULL)
--   - brand_ratings.brand_id                (CASCADE, has unique(user_id, brand_id))
--   - brand_follows.brand_id                (CASCADE, part of PK)
--   - drops.brand_id                        (CASCADE)
--   - activity_feed.brand_id                (CASCADE)
--   - notifications.brand_id                (CASCADE)
--   - subtypes.created_by_brand_id          (SET NULL)
--   - brand_claims.brand_id                 (CASCADE)
--   - brand_suggestions.resolved_brand_id   (SET NULL)
--   - profiles.favorite_brand_id            (SET NULL)
-- For the two tables with unique constraints on (user_id, brand_id) —
-- brand_ratings and brand_follows — we DELETE the losing side's row
-- for any user who already has a row on the winning side, before the
-- reassignment UPDATE runs.

BEGIN;

-- ─── Section 0. Broaden slimes_protect_attribution bypass ─────────────────
-- First attempt of this migration failed silently at the Peachybbies merge
-- because the slimes_protect_attribution trigger (migration
-- 20260706000053_audit_hp_11_lock_slime_attribution.sql) only bypassed for
-- current_user = 'service_role'. supabase db push connects as 'postgres',
-- not 'service_role', so my UPDATE ran but the trigger silently reverted
-- the brand_id change. Then DELETE FROM brands failed with FK violation
-- because slimes still referenced the losing brand.
--
-- Migration 20260709000059 (HP-8 fix) already updated the profiles + brands
-- protective triggers to use a broader bypass pattern:
--   IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
-- ...which lets postgres, service_role, and background workers all bypass
-- while still enforcing the revert against the roles a normal API request
-- runs as. The slimes trigger from HP-11 was never updated to match.
--
-- This section brings slimes_protect_attribution in line. Same protection
-- against creator-initiated brand-id hijacks (the HP-11 attack vector) but
-- migration tooling can now do FK reassignments.

CREATE OR REPLACE FUNCTION public.slimes_protect_attribution()
RETURNS trigger
LANGUAGE plpgsql
-- SECURITY DEFINER removed for the same reason as mig 59: DEFINER forces
-- current_user to the function owner (postgres) inside the body, defeating
-- any current_user check. INVOKER (the LANGUAGE plpgsql default) lets
-- current_user reflect the actual calling role, which the bypass check
-- needs to work correctly.
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  NEW.brand_id          := OLD.brand_id;
  NEW.is_brand_official := OLD.is_brand_official;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.slimes_protect_attribution() IS
  'Audit HP-11 (2026-07-06). Reverts unauthorized changes to brand_id + '
  'is_brand_official on slimes. Bypasses when called by any role other than '
  'authenticated/anon. Broadened from service_role-only bypass on 2026-07-16 '
  'to match the HP-8 profiles/brands trigger pattern (mig 59) so migration '
  'tooling can do FK reassignments.';


-- ─── Section 1. Helper: merge a losing brand into a keeper ────────────────

CREATE OR REPLACE FUNCTION public._merge_brand(keep uuid, del uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  del_row public.brands;
BEGIN
  IF keep IS NULL OR del IS NULL THEN
    RAISE EXCEPTION '_merge_brand called with NULL id (keep=%, del=%)', keep, del;
  END IF;
  IF keep = del THEN
    RAISE EXCEPTION '_merge_brand called with keep = del (%)', keep;
  END IF;

  -- Pre-delete conflicting rows on the losing side to satisfy
  -- brand_ratings unique(user_id, brand_id) and brand_follows PK.
  DELETE FROM public.brand_ratings
   WHERE brand_id = del
     AND user_id IN (SELECT user_id FROM public.brand_ratings WHERE brand_id = keep);

  DELETE FROM public.brand_follows
   WHERE brand_id = del
     AND user_id IN (SELECT user_id FROM public.brand_follows WHERE brand_id = keep);

  -- Same defensive dedupe for brand_claims (unique(brand_id, user_id))
  DELETE FROM public.brand_claims
   WHERE brand_id = del
     AND user_id IN (SELECT user_id FROM public.brand_claims WHERE brand_id = keep);

  -- Reassign all remaining FKs from del to keep
  UPDATE public.slimes            SET brand_id = keep WHERE brand_id = del;
  UPDATE public.collection_logs   SET brand_id = keep WHERE brand_id = del;
  UPDATE public.brand_ratings     SET brand_id = keep WHERE brand_id = del;
  UPDATE public.brand_follows     SET brand_id = keep WHERE brand_id = del;
  UPDATE public.drops             SET brand_id = keep WHERE brand_id = del;
  UPDATE public.activity_feed     SET brand_id = keep WHERE brand_id = del;
  UPDATE public.notifications     SET brand_id = keep WHERE brand_id = del;
  UPDATE public.subtypes          SET created_by_brand_id = keep WHERE created_by_brand_id = del;
  UPDATE public.brand_claims      SET brand_id = keep WHERE brand_id = del;
  UPDATE public.brand_suggestions SET resolved_brand_id = keep WHERE resolved_brand_id = del;
  UPDATE public.profiles          SET favorite_brand_id = keep WHERE favorite_brand_id = del;

  -- Snapshot the losing row so we can pull COALESCE data from it before delete
  SELECT * INTO del_row FROM public.brands WHERE id = del;

  -- Merge non-null contact/branding data from del into keep
  UPDATE public.brands SET
    logo_url         = COALESCE(logo_url,         del_row.logo_url),
    website_url      = COALESCE(website_url,      del_row.website_url),
    shop_url         = COALESCE(shop_url,         del_row.shop_url),
    instagram_handle = COALESCE(instagram_handle, del_row.instagram_handle),
    tiktok_handle    = COALESCE(tiktok_handle,    del_row.tiktok_handle),
    description      = COALESCE(description,      del_row.description),
    banner_url       = COALESCE(banner_url,       del_row.banner_url),
    is_verified      = is_verified OR del_row.is_verified,
    updated_at       = now()
  WHERE id = keep;

  DELETE FROM public.brands WHERE id = del;
END;
$$;


-- ─── Section 2. Duplicate merges (9 pairs + KSC/Kawaii dedupe) ────────────

-- Peachybbies pair — the "verified" row is actually the 3-b typo.
-- Correct spelling wins; verified flag carries forward via OR.
SELECT public._merge_brand(
  keep => '6bb03b35-c1c7-4c2f-b799-8b2cd0013758'::uuid,  -- Peachybbies
  del  => 'b1000000-0000-0000-0000-000000000002'::uuid   -- Peachybbbies (typo)
);

-- Bleu Slimes pair
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000022'::uuid,  -- Bleu Slimes (verified)
  del  => 'ad6a9d26-3bac-4d6f-b6c0-8f786fba09e3'::uuid   -- Bleu Slime
);

-- Sliimey Honey pair
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000027'::uuid,  -- Sliimey Honey (verified)
  del  => '4071a9ad-e68d-4978-93a1-ba2fc5617ece'::uuid   -- Sliimeyhoney
);

-- Snoop Slimes pair
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000034'::uuid,  -- Snoop Slimes (verified)
  del  => '3f5ad366-175c-4ea7-9563-6b9eeefae9c9'::uuid   -- Snoopslimes
);

-- Corn With Slime pair
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000018'::uuid,  -- Corn With Slime (verified)
  del  => '42237a02-6b04-4f93-ae37-748d35e89a68'::uuid   -- Cornwithslime
);

-- Dream Glow Slimes pair
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000016'::uuid,  -- Dream Glow Slimes (verified)
  del  => 'a7998070-3e25-4543-8ecc-99b4710e4412'::uuid   -- Dreamglow Slime
);

-- GT Creation Slime pair
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000055'::uuid,  -- GT Creation Slime (verified)
  del  => 'b7df4f09-483a-4b12-9863-3dcd7f06c451'::uuid   -- GTCREATION Slime
);

-- Pink Sugar Slimey — 3-way merge, two rounds
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000030'::uuid,  -- Pink Sugar Slimey (verified)
  del  => 'cd50ea64-6b19-4a87-8696-3c50d799852c'::uuid   -- Pink Sugar Slime
);
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000030'::uuid,  -- Pink Sugar Slimey
  del  => '7f5b5b15-bf37-4783-87f9-4f08eef8787d'::uuid   -- PinkSugarSlimey
);

-- Sloomoo — real brand is "Institute". Verified flag carries from the
-- deleted "Sloomoo Slime" row into the kept "Sloomoo Institute" row.
SELECT public._merge_brand(
  keep => '2df6ded4-76df-4c99-9841-7570647bc30e'::uuid,  -- Sloomoo Institute
  del  => 'b1000000-0000-0000-0000-000000000035'::uuid   -- Sloomoo Slime (verified, wrong name)
);

-- Slime Community — MGA was a collab, not a distinct brand
SELECT public._merge_brand(
  keep => 'b1000000-0000-0000-0000-000000000028'::uuid,  -- Slime Community (verified)
  del  => 'c9a0e471-f917-466f-94b5-8559a598e50b'::uuid   -- Slime Community (MGA)
);

-- KSC Slime is a duplicate of Kawaii Slime Company
SELECT public._merge_brand(
  keep => '8c48a214-8604-4bcb-91fa-8b8537bce65f'::uuid,  -- Kawaii Slime Company
  del  => '1cf5e41c-be8a-49bf-8530-69cbaeec8688'::uuid   -- KSC Slime
);


-- ─── Section 3. Rename cases (name + slug fixes) ──────────────────────────

-- Cosmic Slimez → Cosmic Slime (matches cosmicslime.com)
UPDATE public.brands
   SET name = 'Cosmic Slime',
       slug = 'cosmic-slime',
       updated_at = now()
 WHERE id = 'f6a920cf-b6e2-483e-a2f5-1f066c03ac28';

-- Minty Fresh Slimes → Minty Slimes (matches mintyslimes.com)
UPDATE public.brands
   SET name = 'Minty Slimes',
       slug = 'minty-slimes',
       updated_at = now()
 WHERE id = '027f0c74-c7b1-420e-b339-2cdfe2584282';

-- King Slime Company (BR) → King Slime Brasil (cleaner display)
UPDATE public.brands
   SET name = 'King Slime Brasil',
       slug = 'king-slime-brasil',
       updated_at = now()
 WHERE id = '2ef10377-126a-45a3-a888-34868924a022';

-- Royal Slime Shop CA → Royal Slime (matches royalslime.com)
UPDATE public.brands
   SET name = 'Royal Slime',
       slug = 'royal-slime',
       updated_at = now()
 WHERE id = '0d3efcef-a0ec-4141-a596-aef39612897c';


-- ─── Section 4. Disambiguate Colour Slime AU / US ─────────────────────────
-- Both are literally named "Colour Slime" today. Confusing on /brands and
-- would block the normalized-name unique index in Section 7.

UPDATE public.brands
   SET name = 'Colour Slime (AU)',
       updated_at = now()
 WHERE id = 'b1000000-0000-0000-0000-000000000060';

UPDATE public.brands
   SET name = 'Colour Slime (US)',
       updated_at = now()
 WHERE id = 'b1000000-0000-0000-0000-000000000038';


-- ─── Section 5. Delete misclassified rows ─────────────────────────────────
-- Holly Laing Slimes is a merch site, not a slime shop. Delete cascade
-- handles any FK cleanup automatically (brand_ratings, follows, etc.).

DELETE FROM public.brands WHERE id = '8ba1d355-fac4-4ad9-9ab7-bec279e5e5ba';

-- GuiGui Slime (Moose Toys) is a corporate page, not a shop.
DELETE FROM public.brands WHERE id = '5f11d695-f961-40d6-9f28-34e9440ae5b5';


-- ─── Section 6. Insert 18 Korean creator brands (SeoulGAGE curator scan) ──
-- From 2026-07-15 brand-shop-scan report. All land unverified/unclaimed;
-- future brand-scan pass will fill in shop URLs + variant terminology.
-- Names preserved as-listed by SeoulGAGE (many use all-caps typography
-- as their brand identity).

INSERT INTO public.brands (slug, name, is_active, is_verified)
VALUES
  ('332',            '332',            true, false),
  ('abouttime',      'ABOUTTIME',      true, false),
  ('bbiya',          'BBIYA',          true, false),
  ('gina',           'GINA',           true, false),
  ('ho-c',           'HO.C',           true, false),
  ('magma',          'MAGMA',          true, false),
  ('moa',            'MOA',            true, false),
  ('monglefactory',  'MONGLEFACTORY',  true, false),
  ('oni',            'ONI',            true, false),
  ('painkiller',     'PAINKILLER',     true, false),
  ('pastello',       'PASTELLO',       true, false),
  ('sg-slime',       'SG Slime',       true, false),
  ('singibakery',    'SINGIBAKERY',    true, false),
  ('slrk',           'SLRK',           true, false),
  ('swampyland',     'SWAMPYLAND',     true, false),
  ('waak',           'WAAK',           true, false),
  ('yom',            'YOM',            true, false),
  ('yyoung',         'YYOUNG',         true, false);


-- ─── Section 7. Normalized-name unique index ──────────────────────────────
-- Prevents future dupes like "Snoop Slimes" and "Snoopslimes" both existing.
-- Normalization: lowercase + strip all non-alphanumeric characters. Same-
-- spelling brands with different punctuation collide; distinct spellings
-- (including typos like "Peachybbbies" vs "Peachybbies") remain allowed
-- since typo detection is a separate class of problem.
--
-- If this CREATE fails, one or more brands still normalize to the same
-- string — grep with the same expression to find the collision:
--   SELECT lower(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g')) AS n,
--          array_agg(name) AS names
--     FROM public.brands GROUP BY n HAVING count(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS brands_normalized_name_key
  ON public.brands (
    lower(regexp_replace(name, '[^a-zA-Z0-9]+', '', 'g'))
  );


-- ─── Section 8. Drop the helper function ──────────────────────────────────
-- One-time use during this migration; not needed going forward.

DROP FUNCTION IF EXISTS public._merge_brand(uuid, uuid);

COMMIT;
