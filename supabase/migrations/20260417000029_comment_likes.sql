-- supabase/migrations/20260417000029_comment_likes.sql
-- Adds comment_likes table to support per-comment like toggles in CommentSection.
-- Table: public.comment_likes
-- Columns added: id (uuid pk), user_id (fk -> auth.users), comment_id (fk -> public.comments), created_at
-- Reason: Issue 6 — Comment Likes. Enables lightweight engagement on individual comments.

CREATE TABLE public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

-- Index to keep "did this user like this comment?" lookups fast.
CREATE INDEX comment_likes_comment_id_idx ON public.comment_likes(comment_id);
CREATE INDEX comment_likes_user_id_idx ON public.comment_likes(user_id);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can insert comment likes"
ON public.comment_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated users can delete own comment likes"
ON public.comment_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "comment likes are publicly readable"
ON public.comment_likes FOR SELECT
USING (true);