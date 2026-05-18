ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS youtube_handle text,
  ADD COLUMN IF NOT EXISTS pinterest_handle text,
  ADD COLUMN IF NOT EXISTS twitter_handle text;
  