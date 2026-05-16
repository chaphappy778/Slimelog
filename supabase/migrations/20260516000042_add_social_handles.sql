ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS youtube_handle text,
  ADD COLUMN IF NOT EXISTS pinterest_handle text,
  ADD COLUMN IF NOT EXISTS twitter_handle text;

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true)
AS
SELECT
  id,
  username,
  display_name,
  avatar_url,
  bio,
  location,
  website_url,
  is_verified,
  is_brand,
  featured_log_ids,
  instagram_handle,
  tiktok_handle,
  shop_url,
  created_at,
  (
    (subscription_tier = ANY (ARRAY['pro'::text, 'brand_pro'::text]))
    AND (subscription_status = 'active'::text)
  ) AS is_premium,
  youtube_handle,
  pinterest_handle,
  twitter_handle
FROM profiles
WHERE (profile_visibility = 'public'::text);