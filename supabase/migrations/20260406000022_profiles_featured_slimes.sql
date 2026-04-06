-- Migration: 20260406000022_profiles_featured_slimes
-- Table altered: profiles
-- Column added: featured_log_ids uuid[]
-- Reason: Allow users to pin up to 3 collection logs to their profile

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS featured_log_ids uuid[] DEFAULT '{}';