-- 20260716000079_skill_level_attribute.sql
--
-- T158 (2026-07-16) — Slime skill_level attribute.
--
-- WHAT
-- ----
-- 1. New enum public.slime_skill_level with values ('beginner',
--    'intermediate', 'advanced'). Idempotent DO-guard so re-running the
--    migration is a no-op.
-- 2. Add nullable column skill_level slime_skill_level NULL on
--    public.slimes (brand-catalog layer — brand-set on their products).
-- 3. Add nullable column skill_level slime_skill_level NULL on
--    public.collection_logs (per-log user override).
-- 4. Partial index on public.slimes(skill_level) WHERE skill_level IS
--    NOT NULL. Majority of rows will be NULL (attribute is optional at
--    every layer), so a full B-tree wastes space + write cost. The
--    filter clauses on /discover and /brands/[slug]/page.tsx pass
--    .eq("skill_level", <value>) which the partial index still serves.
--    NOT indexing collection_logs.skill_level here because the app
--    only filters collection_logs by skill_level scoped to a specific
--    brand_id (in brand detail community-logs) — that read already
--    rides brand_id-scoped scans, and adding a second column-only
--    partial index on the largest write table (collection_logs) isn't
--    worth the write cost for a filter that runs on a bounded subset.
-- 5. Column comments describing the "why both tables" rationale so
--    future maintainers don't try to consolidate.
--
-- WHY BOTH TABLES
-- ---------------
-- Some users find a slime harder (or easier) than the maker labeled
-- it. Storing it on `slimes` captures the brand-declared difficulty;
-- storing the same enum on `collection_logs` lets any user override
-- their personal experience without contradicting the catalog. Both
-- reads are surfaced separately in the UI — the log detail card
-- displays the log-level value, the brand catalog can render its own.
--
-- WHY THIS IS SAFE
-- ----------------
-- Additive-only. New enum, new nullable columns, no data reshaping,
-- no view drops. `slimes_protect_attribution` trigger + any RLS on
-- these tables continue to work because we're not touching the
-- protected column set (owner_id / brand_id / etc.). Wrapped in a
-- BEGIN...COMMIT for atomic rollback on failure.
--
-- ROLLBACK
-- --------
-- ALTER TABLE public.slimes DROP COLUMN IF EXISTS skill_level;
-- ALTER TABLE public.collection_logs DROP COLUMN IF EXISTS skill_level;
-- DROP INDEX IF EXISTS public.slimes_skill_level_idx;
-- DROP TYPE IF EXISTS public.slime_skill_level;

BEGIN;

-- 1. Enum type (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'slime_skill_level') THEN
    CREATE TYPE public.slime_skill_level AS ENUM (
      'beginner',
      'intermediate',
      'advanced'
    );
  END IF;
END$$;

-- 2. Brand-catalog column.
ALTER TABLE public.slimes
  ADD COLUMN IF NOT EXISTS skill_level public.slime_skill_level NULL;

COMMENT ON COLUMN public.slimes.skill_level IS
  'Optional brand-declared difficulty for this catalog slime. Companion '
  'column on collection_logs.skill_level lets individual users override '
  'per-log when their experience differs from the maker''s label.';

-- 3. Per-log user-override column.
ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS skill_level public.slime_skill_level NULL;

COMMENT ON COLUMN public.collection_logs.skill_level IS
  'Optional per-log user assessment of slime difficulty. Overrides '
  'slimes.skill_level for this individual log; both remain queryable '
  'so brand-catalog and community views can display each independently.';

-- 4. Partial index on slimes.skill_level.
--    Most rows will be NULL; partial index is cheaper on write + smaller.
CREATE INDEX IF NOT EXISTS slimes_skill_level_idx
  ON public.slimes(skill_level)
  WHERE skill_level IS NOT NULL;

COMMIT;
