DROP TRIGGER IF EXISTS collection_logs_brand_rating_refresh ON public.collection_logs;

DROP VIEW IF EXISTS user_collection_summary;

ALTER TABLE collection_logs
  ALTER COLUMN rating_texture TYPE numeric USING rating_texture::numeric,
  ALTER COLUMN rating_sound TYPE numeric USING rating_sound::numeric,
  ALTER COLUMN rating_drizzle TYPE numeric USING rating_drizzle::numeric,
  ALTER COLUMN rating_creativity TYPE numeric USING rating_creativity::numeric,
  ALTER COLUMN rating_sensory_fit TYPE numeric USING rating_sensory_fit::numeric,
  ALTER COLUMN rating_overall TYPE numeric USING rating_overall::numeric;

CREATE TRIGGER collection_logs_brand_rating_refresh
  AFTER INSERT OR DELETE OR UPDATE OF rating_overall
  ON public.collection_logs
  FOR EACH ROW EXECUTE FUNCTION refresh_brand_slime_rating();

CREATE VIEW user_collection_summary AS
SELECT
  user_id,
  count(*) FILTER (WHERE in_collection = true) AS total_in_collection,
  count(*) FILTER (WHERE in_wishlist = true) AS total_in_wishlist,
  count(*) FILTER (WHERE rating_overall IS NOT NULL) AS total_rated,
  round(avg(rating_overall), 2) AS avg_overall_given,
  count(DISTINCT brand_id) AS distinct_brands_tried,
  count(DISTINCT base_type::text) AS distinct_types_tried
FROM collection_logs
GROUP BY user_id;