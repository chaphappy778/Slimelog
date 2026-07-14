-- 20260713000073_drops_tubs_available.sql
-- [T38 2026-07-13] Optional inventory count on drops.
--
-- Brands can optionally set `tubs_available` on any of their drops.
-- When set, the brand detail page + featured-drop cards display
-- "N tubs available" alongside the T-minus pill. When null (default),
-- nothing is shown.
--
-- No real-time sync — brands update the number manually via the
-- brand dashboard as sales happen. The naming ("available" rather
-- than "left") is deliberate: implies a snapshot, not a live
-- decreasing count.

alter table public.drops
  add column if not exists tubs_available int;

comment on column public.drops.tubs_available is
  'Optional inventory hint. When set, the brand detail + drop card display "N tubs available". Manually managed by the brand — no real-time sync from sales.';

-- Rebuild the view so tubs_available flows through to code that
-- queries upcoming_drops. Postgres restriction: `CREATE OR REPLACE
-- VIEW` can only APPEND columns — it refuses to reorder or rename
-- existing ones. So the new column MUST go at the end of the
-- projection, not in "logical" order. First tried inserting it after
-- `cover_image_url` (before `brand_id`) and it errored with
-- "cannot change name of view column brand_id to tubs_available."
-- Appending is the only safe path without a full DROP + CREATE.

create or replace view public.upcoming_drops as
  select
    d.id,
    d.name,
    d.description,
    d.drop_at,
    d.status,
    d.shop_url,
    d.cover_image_url,
    b.id   as brand_id,
    b.name as brand_name,
    b.slug as brand_slug,
    b.logo_url,
    (select count(*) from public.brand_follows bf where bf.brand_id = b.id) as follower_count,
    d.tubs_available
  from public.drops d
  join public.brands b on b.id = d.brand_id
  where d.status in ('announced', 'live')
  order by d.drop_at asc nulls last;
