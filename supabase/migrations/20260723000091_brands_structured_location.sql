-- ===========================================================================
-- 20260723000091_brands_structured_location.sql
-- T137 Batch 6b (2026-07-23)
--
-- Structured brand location: country / state (or province) / city.
-- US and Canada only for now, which is where effectively the whole slime
-- maker community sits. Adding another country later is a code-only change
-- (a new list in apps/web/lib/geo.ts) because the columns are plain text.
--
-- ── The derived-location contract ─────────────────────────────────────────
-- `brands.location` is NOT dropped and is NOT going away. It stays as the
-- single display value that every read path already uses:
--
--   apps/web/app/brands/[slug]/page.tsx   location pill on the public page
--   apps/web/app/brands/page.tsx          brand directory select list
--
-- BrandSettingsForm now computes it on save as `city, state` (or whichever
-- single part is set, or NULL when neither is) and writes it in the same
-- `.update()` as the structured parts. So:
--
--   * every existing read keeps working with no change
--   * there is exactly one source of truth for what the pill shows
--   * nothing needs to join or re-assemble the parts at read time
--
-- If a future writer touches state/city, it MUST recompute `location` in the
-- same statement or the pill goes stale. Keep the derivation next to the
-- write, never at read time.
--
-- ── Backfill ──────────────────────────────────────────────────────────────
-- Intentionally none. state/city stay NULL on existing rows; parsing the
-- free-text `location` values ("Brooklyn, NY (ships worldwide)") would be
-- guesswork. Owners fill the structured fields from the Settings page, and
-- until they save, the pill keeps showing whatever `location` holds today.
-- ===========================================================================

alter table public.brands
  add column if not exists state text,
  add column if not exists city  text;

-- country_code char(2) already exists (added in 20260328000005_brand_seed_expanded.sql,
-- default 'US') and has been unused by the app until now. Batch 6b adopts it
-- as the country half of the structured location. No type or default change,
-- so the seeded 'US' values stay valid.

comment on column public.brands.state is
  'Structured location: 2-letter US state or Canadian province code (CA, ON, ...). Display string lives in brands.location, derived on save.';

comment on column public.brands.city is
  'Structured location: free-text city. Display string lives in brands.location, derived on save.';

comment on column public.brands.location is
  'Derived display location written on save as "City, ST". Read by the public brand page and the brand directory. Do not write state/city without recomputing this.';
