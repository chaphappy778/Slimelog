-- supabase/migrations/20260420000030_profile_social_links.sql
-- Issue 27 — Add social link columns to profiles table for public user profile display.
-- Handles stored without @ prefix; URLs constructed in UI. shop_url stored as full URL.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS shop_url TEXT;

COMMENT ON COLUMN profiles.instagram_handle IS
  'Instagram handle only — no @ prefix, no URL. UI constructs https://instagram.com/{handle}. Nullable.';

COMMENT ON COLUMN profiles.tiktok_handle IS
  'TikTok handle only — no @ prefix, no URL. UI constructs https://www.tiktok.com/@{handle}. Nullable.';

COMMENT ON COLUMN profiles.shop_url IS
  'Full shop URL including protocol (e.g. https://myshop.etsy.com). Stored as full URL because shops live on varied platforms. Nullable.';