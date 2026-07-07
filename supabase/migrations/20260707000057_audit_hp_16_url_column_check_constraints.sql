-- 2026-07-07 audit high-priority #16: client-side writes to URL
-- columns trust RLS but perform no URL validation.
--
-- Problem
-- -------
-- BrandSettingsForm.tsx pushes brands.website_url, shop_url, logo_url,
-- banner_url (and contact_email + bio) directly via
--
--   supabase.from("brands").update({...})
--
-- from the browser. Same story with profile-actions.ts writing
-- avatar_url, background_url, website_url, shop_url on profiles.
-- Neither path validates that URL columns actually contain URLs. Any
-- RLS mis-configuration, or a future migration slip that relaxes a
-- policy, lets adversarial values land:
--
--   - `javascript:alert(1)` on brands.website_url renders as a live
--     <a href> on the brand page. Same class of stored XSS as audit
--     blocker #2 covered for profile_links.
--   - Tracker-beacon URLs (`https://pixel.badactor.com/...`) load as
--     invisible <img> tags when the app renders logo_url or banner_url
--     on public brand pages.
--   - Data-scheme URIs (`data:text/html,...`) embed inline HTML that
--     some renderers execute.
--
-- Fix
-- ---
-- DB-level CHECK constraints on every URL column: value must be NULL
-- or match `^https?://` (case-insensitive). This is a belt-and-
-- suspenders backstop. The app layer (lib/api-validation.ts) also
-- validates before send; the CHECK is what catches any adversarial
-- write that slips past client + server layers.
--
-- Deliberately NOT constraining to specific hosts here — different
-- columns have different acceptable hosts (profile.avatar_url must be
-- our Supabase Storage, but profile.website_url is any external URL),
-- and CHECK constraints can't reference env vars anyway. Host-specific
-- validation is enforced in the app layer via
-- lib/api-validation.optionalSupabaseUrl.
--
-- Columns covered
-- ---------------
--   profiles: avatar_url, website_url, shop_url, background_url
--   brands:   logo_url, website_url, shop_url, banner_url
--   slimes:   image_url
--   drops:    image_url, cover_image_url
--   collection_logs: image_url
--
-- All check constraints are `NOT VALID` at creation to skip validating
-- existing rows (we can't guarantee historical inserts pre-launch)
-- then explicitly VALIDATE at the end so future writes are enforced
-- but a pre-existing dirty row doesn't fail the migration. If VALIDATE
-- fails on any table, that surfaces a real leak that needs a data
-- clean before we can turn the constraint on.

-- Helper macro would be nice here but Supabase migrations don't
-- support them. Repeating the pattern per column.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_http_only;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_http_only
  CHECK (avatar_url IS NULL OR avatar_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_avatar_url_http_only;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_website_url_http_only;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_website_url_http_only
  CHECK (website_url IS NULL OR website_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_website_url_http_only;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_shop_url_http_only;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_shop_url_http_only
  CHECK (shop_url IS NULL OR shop_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_shop_url_http_only;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_background_url_http_only;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_background_url_http_only
  CHECK (background_url IS NULL OR background_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_background_url_http_only;

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------

ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_logo_url_http_only;
ALTER TABLE public.brands
  ADD CONSTRAINT brands_logo_url_http_only
  CHECK (logo_url IS NULL OR logo_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.brands VALIDATE CONSTRAINT brands_logo_url_http_only;

ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_website_url_http_only;
ALTER TABLE public.brands
  ADD CONSTRAINT brands_website_url_http_only
  CHECK (website_url IS NULL OR website_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.brands VALIDATE CONSTRAINT brands_website_url_http_only;

ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_shop_url_http_only;
ALTER TABLE public.brands
  ADD CONSTRAINT brands_shop_url_http_only
  CHECK (shop_url IS NULL OR shop_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.brands VALIDATE CONSTRAINT brands_shop_url_http_only;

ALTER TABLE public.brands
  DROP CONSTRAINT IF EXISTS brands_banner_url_http_only;
ALTER TABLE public.brands
  ADD CONSTRAINT brands_banner_url_http_only
  CHECK (banner_url IS NULL OR banner_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.brands VALIDATE CONSTRAINT brands_banner_url_http_only;

-- ---------------------------------------------------------------------------
-- slimes
-- ---------------------------------------------------------------------------

ALTER TABLE public.slimes
  DROP CONSTRAINT IF EXISTS slimes_image_url_http_only;
ALTER TABLE public.slimes
  ADD CONSTRAINT slimes_image_url_http_only
  CHECK (image_url IS NULL OR image_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.slimes VALIDATE CONSTRAINT slimes_image_url_http_only;

-- ---------------------------------------------------------------------------
-- drops
-- ---------------------------------------------------------------------------

ALTER TABLE public.drops
  DROP CONSTRAINT IF EXISTS drops_image_url_http_only;
ALTER TABLE public.drops
  ADD CONSTRAINT drops_image_url_http_only
  CHECK (image_url IS NULL OR image_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.drops VALIDATE CONSTRAINT drops_image_url_http_only;

ALTER TABLE public.drops
  DROP CONSTRAINT IF EXISTS drops_cover_image_url_http_only;
ALTER TABLE public.drops
  ADD CONSTRAINT drops_cover_image_url_http_only
  CHECK (cover_image_url IS NULL OR cover_image_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.drops VALIDATE CONSTRAINT drops_cover_image_url_http_only;

-- ---------------------------------------------------------------------------
-- collection_logs
-- ---------------------------------------------------------------------------

ALTER TABLE public.collection_logs
  DROP CONSTRAINT IF EXISTS collection_logs_image_url_http_only;
ALTER TABLE public.collection_logs
  ADD CONSTRAINT collection_logs_image_url_http_only
  CHECK (image_url IS NULL OR image_url ~* '^https?://')
  NOT VALID;
ALTER TABLE public.collection_logs VALIDATE CONSTRAINT collection_logs_image_url_http_only;
