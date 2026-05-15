-- supabase/migrations/20260515000040_brands_featured_slime_rating.sql

-- ── Section 1: Add columns to brands ─────────────────────────────────────────

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_slime_rating numeric,
  ADD COLUMN IF NOT EXISTS total_slime_ratings integer NOT NULL DEFAULT 0;

-- ── Section 2: Trigger function ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.refresh_brand_slime_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id uuid;
  v_avg      numeric;
  v_count    integer;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_brand_id := OLD.brand_id;
  ELSE
    v_brand_id := NEW.brand_id;
  END IF;

  IF v_brand_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  SELECT
    ROUND(AVG(rating_overall)::numeric, 1),
    COUNT(*)
  INTO v_avg, v_count
  FROM public.collection_logs
  WHERE brand_id = v_brand_id
    AND rating_overall IS NOT NULL;

  UPDATE public.brands
  SET
    avg_slime_rating   = v_avg,
    total_slime_ratings = v_count
  WHERE id = v_brand_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- ── Section 3: Bind trigger ───────────────────────────────────────────────────

DROP TRIGGER IF EXISTS collection_logs_brand_rating_refresh ON public.collection_logs;

CREATE TRIGGER collection_logs_brand_rating_refresh
  AFTER INSERT OR UPDATE OF rating_overall OR DELETE
  ON public.collection_logs
  FOR EACH ROW EXECUTE FUNCTION public.refresh_brand_slime_rating();

-- ── Section 4: Backfill existing data ────────────────────────────────────────

UPDATE public.brands b
SET
  avg_slime_rating    = sub.avg_rating,
  total_slime_ratings = sub.cnt
FROM (
  SELECT
    brand_id,
    ROUND(AVG(rating_overall)::numeric, 1) AS avg_rating,
    COUNT(*) AS cnt
  FROM public.collection_logs
  WHERE brand_id IS NOT NULL
    AND rating_overall IS NOT NULL
  GROUP BY brand_id
) sub
WHERE b.id = sub.brand_id;
