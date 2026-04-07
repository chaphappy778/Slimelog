-- supabase/migrations/20260407000024_reports_table.sql

CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type text NOT NULL CHECK (content_type IN ('log', 'comment', 'profile')),
  content_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can insert reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "admins can read reports"
ON reports FOR SELECT
USING (auth.uid() = (SELECT id FROM profiles WHERE id = auth.uid()));