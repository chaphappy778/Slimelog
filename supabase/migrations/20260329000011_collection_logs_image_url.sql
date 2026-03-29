-- =============================================================================
-- SlimeLog — Add image_url to collection_logs
-- File:    20260329000011_collection_logs_image_url.sql
-- Purpose: Adds image_url text column to collection_logs so users can
--          attach a photo to a log entry (e.g. their slime shelf shot,
--          unboxing photo, or texture close-up).
-- Idempotent: ADD COLUMN IF NOT EXISTS is safe to re-run.
-- Depends:  20260324000001_slimelog_initial_schema.sql
-- =============================================================================

alter table public.collection_logs
  add column if not exists image_url text;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================