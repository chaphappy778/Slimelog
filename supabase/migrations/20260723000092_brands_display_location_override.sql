-- ============================================================================
-- 20260723000092_brands_display_location_override.sql
-- T137 Batch 6c (2026-07-23)
--
-- Optional free-text override for the public location pill.
-- When set, wins over the derived "City, ST" value.
-- Structured fields (country_code, state, city) remain authoritative
-- for filtering, analytics, and marketplace shipping. The override is
-- display-only ("SlimeLog HQ", "Portland-ish", etc.).
--
-- ── How this sits on top of Batch 6b ───────────────────────────────────────
-- 20260723000091 established the derived-location contract: brands.location is
-- written on every save as deriveLocation(city, state) so the public readers
-- keep reading one column. That contract is UNCHANGED. This column does not
-- feed it, does not replace it, and is never written by deriveLocation().
--
-- Readers render `display_location_override || location`:
--   apps/web/app/brands/[slug]/page.tsx   location pill on the public page
--
-- The pill is the ONLY surface allowed to prefer this column. Anything that
-- filters, groups, ships to, or counts brands by geography must use
-- country_code / state / city. A free-text label cannot be trusted to parse.
--
-- ── Moderation gap (tracker T196) ──────────────────────────────────────────
-- This column and brands.city are both user-authored free text on a public
-- page, and BrandSettingsForm does not run its writes through
-- apps/web/lib/moderation.ts today. Tracked as T196, not fixed here.
--
-- Nullable, no default, no backfill. Existing rows keep showing whatever
-- brands.location already holds.
-- ============================================================================

alter table public.brands
  add column if not exists display_location_override text;

comment on column public.brands.display_location_override is
  'Optional free-text display label for the public location pill. Overrides derived City, State when set. Not used for filtering: structured fields (country_code/state/city) remain authoritative.';
