-- Migration: add recurrence_pattern to drops
-- Stores recurrence metadata as JSONB on each drop record
-- Pattern shape: { frequency: 'weekly'|'biweekly'|'monthly', day_of_week: 0-6 | null, day_of_month: 1-31 | null, hour: 0-23, minute: 0-59, end_type: 'never'|'after'|'on_date', end_after: number | null, end_date: string | null, parent_drop_id: uuid | null }

ALTER TABLE public.drops
  ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS parent_drop_id UUID REFERENCES public.drops(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.drops.recurrence_pattern IS 'JSON recurrence config. Null = one-time drop.';
COMMENT ON COLUMN public.drops.parent_drop_id IS 'For auto-generated recurring instances, references the original drop.';