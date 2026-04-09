-- ── 1. Fix Security Definer Views ─────────────────────────────────────────────
-- Recreate all views with security_invoker = true so they respect the
-- querying user's RLS policies rather than the view creator's permissions.

CREATE OR REPLACE VIEW public.brand_top_slimes
WITH (security_invoker = true) AS
SELECT s.brand_id,
    s.id,
    s.name,
    s.slime_type,
    s.avg_overall,
    s.total_ratings,
    count(cl.id) AS total_logs
FROM (slimes s
    LEFT JOIN collection_logs cl ON (cl.slime_id = s.id))
WHERE s.is_brand_official = true
GROUP BY s.brand_id, s.id, s.name, s.slime_type, s.avg_overall, s.total_ratings;

CREATE OR REPLACE VIEW public.brand_weekly_logs
WITH (security_invoker = true) AS
SELECT brand_id,
    date_trunc('week'::text, created_at) AS week,
    count(*) AS log_count
FROM collection_logs
WHERE brand_id IS NOT NULL
GROUP BY brand_id, date_trunc('week'::text, created_at)
ORDER BY date_trunc('week'::text, created_at);

CREATE OR REPLACE VIEW public.profile_follow_counts
WITH (security_invoker = true) AS
SELECT id,
    username,
    (SELECT count(*) FROM follows f WHERE f.following_id = p.id) AS follower_count,
    (SELECT count(*) FROM follows f WHERE f.follower_id = p.id) AS following_count,
    (SELECT count(*) FROM brand_follows bf WHERE bf.user_id = p.id) AS brand_follow_count
FROM profiles p;

CREATE OR REPLACE VIEW public.top_rated_slimes
WITH (security_invoker = true) AS
SELECT s.id,
    s.name,
    s.slime_type,
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
FROM (slimes s
    JOIN brands b ON (b.id = s.brand_id))
WHERE s.total_ratings >= 3
ORDER BY s.avg_overall DESC NULLS LAST, s.total_ratings DESC;

CREATE OR REPLACE VIEW public.upcoming_drops
WITH (security_invoker = true) AS
SELECT d.id,
    d.name,
    d.description,
    d.drop_at,
    d.status,
    d.shop_url,
    d.cover_image_url,
    b.id AS brand_id,
    b.name AS brand_name,
    b.slug AS brand_slug,
    b.logo_url,
    (SELECT count(*) FROM brand_follows bf WHERE bf.brand_id = b.id) AS follower_count
FROM (drops d
    JOIN brands b ON (b.id = d.brand_id))
WHERE d.status = ANY (ARRAY['announced'::drop_status, 'live'::drop_status])
ORDER BY d.drop_at;

CREATE OR REPLACE VIEW public.user_collection_summary
WITH (security_invoker = true) AS
SELECT user_id,
    count(*) FILTER (WHERE in_collection = true) AS total_in_collection,
    count(*) FILTER (WHERE in_wishlist = true) AS total_in_wishlist,
    count(*) FILTER (WHERE rating_overall IS NOT NULL) AS total_rated,
    round(avg(rating_overall), 2) AS avg_overall_given,
    count(DISTINCT brand_id) AS distinct_brands_tried,
    count(DISTINCT slime_type::text) AS distinct_types_tried
FROM collection_logs
GROUP BY user_id;

-- ── 2. Fix Function Search Path ───────────────────────────────────────────────
-- Add SET search_path = public to all functions to prevent schema injection.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.refresh_brand_rating_averages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_brand_id uuid;
begin
  v_brand_id := coalesce(new.brand_id, old.brand_id);

  update public.brands
  set
    avg_shipping         = (select round(avg(rating_shipping)::numeric,         2) from public.brand_ratings where brand_id = v_brand_id and rating_shipping         is not null),
    avg_customer_service = (select round(avg(rating_customer_service)::numeric, 2) from public.brand_ratings where brand_id = v_brand_id and rating_customer_service is not null),
    total_brand_ratings  = (select count(*) from public.brand_ratings where brand_id = v_brand_id)
  where id = v_brand_id;

  return coalesce(new, old);
end;
$$;

CREATE OR REPLACE FUNCTION public.refresh_slime_rating_averages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_slime_id uuid;
begin
  v_slime_id := coalesce(new.slime_id, old.slime_id);
  if v_slime_id is null then
    return coalesce(new, old);
  end if;

  update public.slimes
  set
    avg_texture     = (select round(avg(rating_texture)::numeric,     2) from public.collection_logs where slime_id = v_slime_id and rating_texture     is not null),
    avg_scent       = (select round(avg(rating_scent)::numeric,       2) from public.collection_logs where slime_id = v_slime_id and rating_scent       is not null),
    avg_sound       = (select round(avg(rating_sound)::numeric,       2) from public.collection_logs where slime_id = v_slime_id and rating_sound       is not null),
    avg_drizzle     = (select round(avg(rating_drizzle)::numeric,     2) from public.collection_logs where slime_id = v_slime_id and rating_drizzle     is not null),
    avg_creativity  = (select round(avg(rating_creativity)::numeric,  2) from public.collection_logs where slime_id = v_slime_id and rating_creativity  is not null),
    avg_sensory_fit = (select round(avg(rating_sensory_fit)::numeric, 2) from public.collection_logs where slime_id = v_slime_id and rating_sensory_fit is not null),
    avg_overall     = (select round(avg(rating_overall)::numeric,     2) from public.collection_logs where slime_id = v_slime_id and rating_overall     is not null),
    total_ratings   = (select count(*) from public.collection_logs where slime_id = v_slime_id and rating_overall is not null)
  where id = v_slime_id;

  return coalesce(new, old);
end;
$$;

-- ── 3. Move pg_trgm to extensions schema ──────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;