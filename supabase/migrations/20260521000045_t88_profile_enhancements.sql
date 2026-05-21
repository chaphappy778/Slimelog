-- Add background_url to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS background_url text,
  ADD COLUMN IF NOT EXISTS favorite_brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

-- profile_links table
CREATE TABLE IF NOT EXISTS public.profile_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) <= 50),
  url text NOT NULL CHECK (char_length(url) <= 200),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on profile_links
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profile_links"
  ON public.profile_links FOR SELECT
  USING (true);

CREATE POLICY "Owner manages profile_links"
  ON public.profile_links FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Recreate profiles_public view
-- IMPORTANT: CREATE OR REPLACE VIEW can only append columns. We must DROP and recreate.
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
  WITH (security_invoker = true)
AS
SELECT
  id,
  username,
  -- display_name intentionally excluded
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
  (subscription_tier = ANY (ARRAY['pro'::text, 'brand_pro'::text]))
    AND subscription_status = 'active'::text AS is_premium,
  youtube_handle,
  pinterest_handle,
  twitter_handle,
  background_url,
  favorite_brand_id
FROM public.profiles
WHERE profile_visibility = 'public'::text;

