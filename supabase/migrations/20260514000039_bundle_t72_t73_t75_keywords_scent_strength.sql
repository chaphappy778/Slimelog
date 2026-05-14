-- supabase/migrations/20260514000039_bundle_t72_t73_t75_keywords_scent_strength.sql
-- T72: tags + log_tags tables
-- T73: scent_strength enum + column, drop scent
-- T75: seed starter tags

-- ─── Section 1: scent_strength enum ──────────────────────────────────────────

CREATE TYPE public.scent_strength AS ENUM ('unscented', 'weak', 'medium', 'strong');

-- ─── Section 2: Add scent_strength, drop scent ───────────────────────────────

ALTER TABLE public.collection_logs
  ADD COLUMN scent_strength public.scent_strength NULL,
  DROP COLUMN IF EXISTS scent;

-- ─── Section 3: tags table ────────────────────────────────────────────────────

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_public"
  ON public.tags FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "tags_insert_authenticated"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ─── Section 4: log_tags junction table ──────────────────────────────────────

CREATE TABLE public.log_tags (
  log_id uuid NOT NULL REFERENCES public.collection_logs(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (log_id, tag_id)
);

ALTER TABLE public.log_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_tags_select_public"
  ON public.log_tags FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "log_tags_insert_owner"
  ON public.log_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    log_id IN (
      SELECT id FROM public.collection_logs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "log_tags_delete_owner"
  ON public.log_tags FOR DELETE
  TO authenticated
  USING (
    log_id IN (
      SELECT id FROM public.collection_logs WHERE user_id = auth.uid()
    )
  );

-- ─── Section 5: max 10 tags per log trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_log_tag_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.log_tags WHERE log_id = NEW.log_id) >= 10 THEN
    RAISE EXCEPTION 'A log may have at most 10 tags.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_log_tag_limit
  BEFORE INSERT ON public.log_tags
  FOR EACH ROW EXECUTE FUNCTION public.check_log_tag_limit();

-- ─── Section 6: seed starter tags ────────────────────────────────────────────

INSERT INTO public.tags (name) VALUES
  ('pastel'),
  ('glitter'),
  ('galaxy'),
  ('neon'),
  ('holographic'),
  ('kawaii'),
  ('floral'),
  ('halloween'),
  ('christmas'),
  ('valentines'),
  ('summer'),
  ('winter'),
  ('spring'),
  ('fall'),
  ('sparkle'),
  ('iridescent'),
  ('cottagecore'),
  ('dark'),
  ('gothic'),
  ('fairy'),
  ('ocean'),
  ('rainbow'),
  ('vintage'),
  ('aesthetic'),
  ('dreamy'),
  ('spooky'),
  ('minimal'),
  ('maximalist'),
  ('food'),
  ('dessert'),
  ('fruity'),
  ('candy'),
  ('cloud'),
  ('butter'),
  ('slay')
ON CONFLICT (name) DO NOTHING;

-- ─── Section 7: indexes ───────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_log_tags_log_id ON public.log_tags(log_id);
CREATE INDEX IF NOT EXISTS idx_log_tags_tag_id ON public.log_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON public.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON public.tags(use_count DESC);
