-- supabase/migrations/20260407000027_profiles_age_verification.sql
-- Adds date_of_birth and age_verified columns to profiles table
-- Required for App Store COPPA compliance (age gate at signup)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS age_verified boolean NOT NULL DEFAULT false;