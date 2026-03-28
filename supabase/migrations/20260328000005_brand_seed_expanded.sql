  -- =============================================================================
-- SlimeLog — Expanded Brand Seed Data
-- File:    20260328000005_brand_seed_expanded.sql
-- Purpose: (1) Add all remaining brands-table columns for the full product.
--          (2) Add total_logs trigger on brands.
--          (3) Enrich existing 8 founding brands with URLs, social handles,
--              locations, owner names, and restock schedules.
--          (4) Insert 4 new community brands b009–b012.
-- Idempotent: column guards use DO $$ IF NOT EXISTS; INSERTs use
--             ON CONFLICT DO NOTHING; UPDATEs are WHERE-id-scoped.
-- Depends:  20260324000001_slimelog_initial_schema.sql
-- Note:     b008 original seed name was "Sandy Bros"; corrected to
--           "Sandy Slimes" per expanded brief. slug updated to 'sandy-slimes'.
--           If FK references to the old slug exist, update them before applying.
-- =============================================================================


-- ===========================================================================
-- SECTION 1  —  ADD MISSING COLUMNS TO brands
-- All guards follow the same DO $$ IF NOT EXISTS pattern.
-- ===========================================================================

-- location: city/state display string, e.g. "Austin, TX"
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'location'
  ) then
    alter table public.brands add column location text;
  end if;
end $$;

-- founded_year: year brand was established
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'founded_year'
  ) then
    alter table public.brands add column founded_year integer;
  end if;
end $$;

-- owner_name: maker/owner name, e.g. "Sally" or "Sarah & Trav"
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'owner_name'
  ) then
    alter table public.brands add column owner_name text;
  end if;
end $$;

-- bio: longer brand story, supplements description
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'bio'
  ) then
    alter table public.brands add column bio text;
  end if;
end $$;

-- restock_schedule: human-readable cadence, e.g. "Every Friday 6pm EST"
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'restock_schedule'
  ) then
    alter table public.brands add column restock_schedule text;
  end if;
end $$;

-- country_code: ISO 3166-1 alpha-2, default 'US'
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'country_code'
  ) then
    alter table public.brands add column country_code char(2) default 'US';
  end if;
end $$;

-- follower_count: denormalized count, maintained by brand_follows trigger
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'follower_count'
  ) then
    alter table public.brands add column follower_count integer not null default 0;
  end if;
end $$;

-- total_logs: how many collection_logs reference this brand, trigger-maintained
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'total_logs'
  ) then
    alter table public.brands add column total_logs integer not null default 0;
  end if;
end $$;

-- verification_tier: community / claimed / verified / partner
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'verification_tier'
  ) then
    alter table public.brands
      add column verification_tier text not null default 'community'
      check (verification_tier in ('community', 'claimed', 'verified', 'partner'));
  end if;
end $$;

-- verified_at: timestamptz, null until claimed or verified
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'verified_at'
  ) then
    alter table public.brands add column verified_at timestamptz;
  end if;
end $$;

-- contact_email: for brand outreach
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'contact_email'
  ) then
    alter table public.brands add column contact_email text;
  end if;
end $$;


-- ===========================================================================
-- SECTION 2  —  total_logs TRIGGER
--
-- Increments brands.total_logs on INSERT to collection_logs where brand_id
-- is not null; decrements on DELETE. On UPDATE, adjusts both old and new
-- brand rows if brand_id changed.
-- ===========================================================================

create or replace function public.refresh_brand_total_logs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.brand_id is not null then
      update public.brands
      set total_logs = total_logs + 1
      where id = new.brand_id;
    end if;

  elsif tg_op = 'DELETE' then
    if old.brand_id is not null then
      update public.brands
      set total_logs = greatest(total_logs - 1, 0)
      where id = old.brand_id;
    end if;

  elsif tg_op = 'UPDATE' then
    -- brand_id unchanged: nothing to do
    if old.brand_id is not distinct from new.brand_id then
      null;
    else
      -- decrement old brand
      if old.brand_id is not null then
        update public.brands
        set total_logs = greatest(total_logs - 1, 0)
        where id = old.brand_id;
      end if;
      -- increment new brand
      if new.brand_id is not null then
        update public.brands
        set total_logs = total_logs + 1
        where id = new.brand_id;
      end if;
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

comment on function public.refresh_brand_total_logs() is
  'Maintains brands.total_logs: increments on collection_logs INSERT, '
  'decrements on DELETE, adjusts both sides on brand_id UPDATE.';

drop trigger if exists collection_logs_update_brand_total_logs
  on public.collection_logs;

create trigger collection_logs_update_brand_total_logs
  after insert or update of brand_id or delete
  on public.collection_logs
  for each row
  execute function public.refresh_brand_total_logs();

-- Backfill total_logs for any existing logs
update public.brands b
set total_logs = (
  select count(*)
  from public.collection_logs cl
  where cl.brand_id = b.id
)
where exists (
  select 1 from public.collection_logs cl where cl.brand_id = b.id
);


-- ===========================================================================
-- SECTION 3  —  ENRICH EXISTING 8 FOUNDING BRANDS
--
-- Each UPDATE sets only the columns being populated for that brand.
-- country_code = 'US' applied to all 8. verification_tier set to 'verified'
-- for all founding brands as they are pre-curated community names.
-- ===========================================================================

-- b001 — Momo Slimes
update public.brands
set
  website_url       = 'https://momoslimes.com',
  instagram_handle  = 'momoslimes_',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000001'::uuid;

-- b002 — Peachybbbies  (Austin TX)
update public.brands
set
  website_url       = 'https://peachybbies.com',
  instagram_handle  = 'peachybbies',
  tiktok_handle     = 'peachyslime',
  location          = 'Austin, TX',
  restock_schedule  = 'Every Friday 7pm EST',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000002'::uuid;

-- b003 — Ky Slimes  (Honolulu HI)
update public.brands
set
  website_url       = 'https://kyslime.com',
  instagram_handle  = 'ky.slime',
  location          = 'Honolulu, HI',
  owner_name        = 'Cher and Kylee',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000003'::uuid;

-- b004 — Dope Slimes
update public.brands
set
  website_url       = 'https://dopeslimes.com',
  instagram_handle  = 'dopeslimes',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000004'::uuid;

-- b005 — Slime Sweet Pea  (New York)
update public.brands
set
  website_url       = 'https://sallysweetpea.com',
  instagram_handle  = 'slime.sweetpea',
  tiktok_handle     = 'slimesweetpea',
  location          = 'New York, NY',
  owner_name        = 'Sally',
  restock_schedule  = 'Every Friday 6pm EST',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000005'::uuid;

-- b006 — Obsidian Slimes
update public.brands
set
  website_url       = 'https://slimeobsidian.com',
  instagram_handle  = 'slimeobsidian',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000006'::uuid;

-- b007 — Pilot Slimes
update public.brands
set
  website_url       = 'https://pilotslime.com',
  instagram_handle  = 'pilotslime',
  owner_name        = 'Sarah & Trav',
  restock_schedule  = 'Monthly',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000007'::uuid;

-- b008 — Sandy Slimes  (San Antonio TX)
-- Name corrected from "Sandy Bros" to "Sandy Slimes"; slug updated to match.
update public.brands
set
  name              = 'Sandy Slimes',
  slug              = 'sandy-slimes',
  website_url       = 'https://sandyslimes.com',
  location          = 'San Antonio, TX',
  country_code      = 'US',
  verification_tier = 'verified',
  updated_at        = now()
where id = 'b1000000-0000-0000-0000-000000000008'::uuid;


-- ===========================================================================
-- SECTION 4  —  INSERT 4 NEW BRANDS  (b009 – b012)
--
-- ON CONFLICT DO NOTHING makes every re-run a no-op for these rows.
-- shop_url is used for Etsy storefronts; website_url for owned domains.
-- restock_schedule now has a dedicated column — no description fallback needed.
-- ===========================================================================

insert into public.brands
  ( id, slug, name,
    website_url, shop_url, tiktok_handle,
    restock_schedule, country_code,
    verification_tier, is_verified, is_active )
values

  -- b009 — OG Slimes
  (
    'b1000000-0000-0000-0000-000000000009'::uuid,
    'og-slimes', 'OG Slimes',
    'https://ogslimes.com', null, null,
    'Every Friday 3pm PST', 'US',
    'verified', true, true
  ),

  -- b010 — Strawb Slimes  (website + Etsy; TikTok @strawbslimeshop)
  (
    'b1000000-0000-0000-0000-000000000010'::uuid,
    'strawb-slimes', 'Strawb Slimes',
    'https://strawbslimes.com', 'https://www.etsy.com/shop/strawbslimes', 'strawbslimeshop',
    null, 'US',
    'verified', true, true
  ),

  -- b011 — AfterDark Slimes  (Etsy only; TikTok @afterdarkslimes)
  (
    'b1000000-0000-0000-0000-000000000011'::uuid,
    'afterdark-slimes', 'AfterDark Slimes',
    null, 'https://www.etsy.com/shop/afterdarkslimes', 'afterdarkslimes',
    null, 'US',
    'verified', true, true
  ),

  -- b012 — Swae Slimes  (Etsy only; TikTok @swaeslimes)
  (
    'b1000000-0000-0000-0000-000000000012'::uuid,
    'swae-slimes', 'Swae Slimes',
    null, 'https://www.etsy.com/shop/swaeslimes', 'swaeslimes',
    null, 'US',
    'verified', true, true
  )

on conflict (id) do nothing;


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================