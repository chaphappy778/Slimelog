ALTER TABLE public.collection_logs
  ADD COLUMN IF NOT EXISTS scent_notes text,
  ADD CONSTRAINT collection_logs_scent_notes_length
    CHECK (char_length(scent_notes) <= 100);

