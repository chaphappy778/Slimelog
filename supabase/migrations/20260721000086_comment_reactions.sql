-- 20260721000086_comment_reactions.sql
--
-- T192 (2026-07-21): tap-to-add emoji reactions on individual COMMENTS.
--
-- Context
-- -------
-- This is the T127 reaction feature rebuilt on the right surface.
-- T127 (migration 0084) shipped reactions on feed cards / log posts and
-- was reverted same-day (migration 0085) because Jennifer wanted them
-- inline in the comments section, reacting to individual comments, not
-- to the log itself. Same 5-reaction vocabulary, same toggle behavior,
-- re-scoped from `log_id` to `comment_id`.
--
-- Reaction set (stored as slugs, mapped to emoji in the app layer):
--   like       👍
--   love       ❤️
--   fire       🔥
--   nailed_it  🎯
--   celebrate  🙌
--
-- Storing the slug (not the raw emoji char) keeps the column stable if
-- we ever re-skin which glyph a slug renders as, and the CHECK
-- constraint below is the DB-level guard that only known slugs land.
--
-- Volume
-- ------
-- One row per (user, comment, reaction). Grows with engagement, not
-- with users directly. Batch-fetched per comment thread via
-- `.in('comment_id', ids)` (see apps/web/lib/reaction-actions.ts) so the
-- read pattern is a single indexed IN query per thread, not N+1. See
-- docs/cost-tracker.md.
--
-- Comments table note
-- -------------------
-- The active comments table is `public.comments` (migration 0016), the
-- one CommentSection reads/writes. `public.log_comments` from the
-- initial schema is a legacy table CommentSection does not use, so the
-- FK below points at `comments`.


-- ─── 1. Table ────────────────────────────────────────────────────────────
--
-- user_id references public.profiles(id) to match the T127 convention
-- (profiles.id is 1:1 with auth.users.id). comment_id cascades from
-- public.comments.
create table public.comment_reactions (
  id            uuid primary key default gen_random_uuid(),
  comment_id    uuid not null references public.comments (id)  on delete cascade,
  user_id       uuid not null references public.profiles (id)  on delete cascade,
  reaction_type text not null,
  created_at    timestamptz not null default now(),

  -- DB-level guard: only the five known reaction slugs. The app layer
  -- (lib/reactions.ts) is the source of truth for this set; keep the
  -- two in sync if the set ever changes (additive: add the slug here
  -- AND to REACTION_TYPES).
  constraint comment_reactions_type_check check (
    reaction_type in ('like', 'love', 'fire', 'nailed_it', 'celebrate')
  )
);

comment on table public.comment_reactions is
  'T192: per-user emoji reactions on individual comments. One of each reaction type per user per comment.';

-- One of each reaction type per user per comment — a user can add
-- several different reactions to the same comment but not double up on
-- one. Also the target of the ON CONFLICT DO NOTHING race guard.
create unique index comment_reactions_user_comment_type_uidx
  on public.comment_reactions (user_id, comment_id, reaction_type);

-- Supports the thread batch-fetch (`.in('comment_id', ids)`).
create index comment_reactions_comment_id_idx
  on public.comment_reactions (comment_id);


-- ─── 2. Row Level Security ───────────────────────────────────────────────
alter table public.comment_reactions enable row level security;

-- Reactions are public (counts render on every visible comment).
create policy comment_reactions_select_all
  on public.comment_reactions
  for select
  using (true);

-- A user may only add their own reactions.
create policy comment_reactions_insert_own
  on public.comment_reactions
  for insert
  with check (auth.uid() = user_id);

-- A user may only remove their own reactions. No UPDATE policy —
-- reactions are add-or-delete, never edited.
create policy comment_reactions_delete_own
  on public.comment_reactions
  for delete
  using (auth.uid() = user_id);


-- ─── 3. Notification enum value ──────────────────────────────────────────
--
-- New notification type fired when someone reacts to your comment (only
-- on add, never on remove, never for self-reactions). The specific
-- emoji + the reacted comment's id both live in notifications.metadata
-- so the renderer can show "reacted 🔥 to your comment on <slime>" and
-- deep-link to the exact comment.
--
-- Enum-add double-trap (see docs/error-tracker.md, 2026-07-21 entry):
-- ADD VALUE IF NOT EXISTS is the idempotent form, and this migration
-- never USES the new value in the same transaction (the value is only
-- written at runtime by toggleCommentReaction, in a later request), so
-- it is safe to keep in this file. `notification_type` and the
-- NotificationRow switch case land together with this migration.
alter type public.notification_type
  add value if not exists 'comment_reaction_received';


-- ─── 4. notifications.metadata column: already present ───────────────────
--
-- The nullable `metadata jsonb` column was added by T127 migration 0084
-- and intentionally KEPT by the T127 revert 0085 (it is generally
-- useful for any notification carrying context). It already exists, so
-- there is nothing to add here. comment_reaction_received notifications
-- store { reaction_type, comment_id } in it.
