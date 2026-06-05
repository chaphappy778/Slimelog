-- Fix user_collection_summary view: SECURITY DEFINER → SECURITY INVOKER
-- Ensures RLS on collection_logs is respected by the querying user
DROP VIEW IF EXISTS public.user_collection_summary;

CREATE VIEW public.user_collection_summary
WITH (security_invoker = true)
AS
SELECT
  user_id,
  count(*) FILTER (WHERE in_collection = true)        AS total_in_collection,
  count(*) FILTER (WHERE in_wishlist = true)           AS total_in_wishlist,
  count(*) FILTER (WHERE rating_overall IS NOT NULL)   AS total_rated,
  round(avg(rating_overall), 2)                        AS avg_overall_given,
  count(DISTINCT brand_id)                             AS distinct_brands_tried,
  count(DISTINCT base_type::text)                      AS distinct_types_tried
FROM collection_logs
GROUP BY user_id;
