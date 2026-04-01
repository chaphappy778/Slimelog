-- Brand dashboard setup
-- Adds is_brand_official flag, brand owner slime policies, and analytics views

ALTER TABLE slimes 
ADD COLUMN IF NOT EXISTS is_brand_official BOOLEAN NOT NULL DEFAULT FALSE;

CREATE POLICY "Brand owners can update their official slimes"
  ON slimes FOR UPDATE
  TO authenticated
  USING (
    is_brand_official = true
    AND brand_id IN (
      SELECT id FROM brands WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    is_brand_official = true
    AND brand_id IN (
      SELECT id FROM brands WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Brand owners can insert official slimes"
  ON slimes FOR INSERT
  TO authenticated
  WITH CHECK (
    is_brand_official = true
    AND brand_id IN (
      SELECT id FROM brands WHERE owner_id = auth.uid()
    )
  );

CREATE OR REPLACE VIEW brand_weekly_logs AS
SELECT 
  brand_id,
  date_trunc('week', created_at) as week,
  COUNT(*) as log_count
FROM collection_logs
WHERE brand_id IS NOT NULL
GROUP BY brand_id, week
ORDER BY week;

CREATE OR REPLACE VIEW brand_top_slimes AS
SELECT 
  s.brand_id,
  s.id,
  s.name,
  s.slime_type,
  s.avg_overall,
  s.total_ratings,
  COUNT(cl.id) as total_logs
FROM slimes s
LEFT JOIN collection_logs cl ON cl.slime_id = s.id
WHERE s.is_brand_official = true
GROUP BY s.brand_id, s.id, s.name, s.slime_type, s.avg_overall, s.total_ratings;
