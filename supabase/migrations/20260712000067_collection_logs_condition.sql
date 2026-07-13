-- 2026-07-12 — Add `condition` to collection_logs.
--
-- Optional physical condition of a logged slime. Serves two use cases:
--   1. Personal-shelf tracking today — users can note a sealed vs
--      well-loved slime for their own reference or when logging older
--      items.
--   2. Marketplace listing schema later — when the resale feature ships
--      (see docs/monetization-plan-2026-07-07.md, T marketplace item),
--      condition is the exact field a listing needs. Capturing now
--      means existing logs already carry condition data by launch.
--
-- Depends: 20260324000001_slimelog_initial_schema.sql

BEGIN;

-- 1. Enum type for slime condition.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slime_condition') THEN
    CREATE TYPE public.slime_condition AS ENUM (
      'sealed',      -- never opened
      'new',         -- opened, barely played with
      'like_new',    -- played with a few times, still fresh
      'used',        -- regular play, still in good shape
      'well_loved'   -- heavily played, may need revival
    );
  END IF;
END$$;

-- 2. Nullable column on collection_logs.
ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS condition public.slime_condition;

COMMENT ON COLUMN public.collection_logs.condition IS
  'Optional physical condition of the slime. Feeds personal-shelf tracking and, later, the marketplace resale listing form.';

COMMIT;
