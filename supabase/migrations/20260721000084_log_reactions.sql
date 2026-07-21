-- 20260721000084_log_reactions.sql
--
-- T127 (2026-07-21): tap-to-add emoji reactions on feed cards.
--
-- Context
-- -------
-- A lightweight engagement layer that sits between a like (T33d, too
-- little signal) and a comment (T120, too much friction). A fixed set
-- of five reactions, each toggleable on/off per log per user. Counts
-- aggregate per log and render as a pill cluster under the feed card.
--
-- This is the "reactions" middle ground filed under T127. Scope is
-- deliberately narrow: no free-form emoji picker, no per-reactor
-- viewer, no reaction analytics.
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
-- One row per (user, log, reaction). Grows with engagement, not with
-- users directly. Batch-fetched per feed page via `.in('log_id', ids)`
-- (see apps/web/lib/feed.ts) exactly like log_likes / log_comments, so
-- the read pattern is a single indexed IN query per page, not N+1.
-- See docs/cost-tracker.md.


-- ─── 1. Table ────────────────────────────────────────────────────────────
--
-- Mirrors the log_likes / log_comments engagement-table convention:
-- user_id references public.profiles(id) (same 1:1 uuid as auth.users),
-- log_id cascades from collection_logs.
create table public.log_reactions (
  id            uuid primary key default gen_random_uuid(),
  log_id        uuid not null references public.collection_logs (id) on delete cascade,
  user_id       uuid not null references public.profiles (id)         on delete cascade,
  reaction_type text not null,
  created_at    timestamptz not null default now(),

  -- DB-level guard: only the five known reaction slugs. The app layer
  -- (lib/reactions.ts) is the source of truth for this set; keep the
  -- two in sync if the set ever changes (additive: add the slug here
  -- AND to REACTION_TYPES).
  constraint log_reactions_type_check check (
    reaction_type in ('like', 'love', 'fire', 'nailed_it', 'celebrate')
  )
);

comment on table public.log_reactions is
  'T127: per-user emoji reactions on collection_logs. One of each reaction type per user per log.';

-- One of each reaction type per user per log — a user can add several
-- different reactions to the same log but not double up on one.
create unique index log_reactions_user_log_type_uidx
  on public.log_reactions (user_id, log_id, reaction_type);

-- Supports the feed batch-fetch (`.in('log_id', ids)`) and the
-- per-log detail aggregation.
create index log_reactions_log_id_idx
  on public.log_reactions (log_id);


-- ─── 2. Row Level Security ───────────────────────────────────────────────
alter table public.log_reactions enable row level security;

-- Reactions are public (counts render on every public feed card).
create policy log_reactions_select_all
  on public.log_reactions
  for select
  using (true);

-- A user may only add their own reactions.
create policy log_reactions_insert_own
  on public.log_reactions
  for insert
  with check (auth.uid() = user_id);

-- A user may only remove their own reactions. No UPDATE policy —
-- reactions are add-or-delete, never edited.
create policy log_reactions_delete_own
  on public.log_reactions
  for delete
  using (auth.uid() = user_id);


-- ─── 3. Notification enum + payload ──────────────────────────────────────
--
-- New notification type fired when someone reacts to your log (only on
-- add, never on remove, never for self-reactions). The specific emoji
-- lives in the new metadata column so the renderer can show
-- "reacted 🔥 to your <slime> log".
alter type public.notification_type add value if not exists 'log_reaction_received';

-- Additive, nullable payload column. Reaction notifications store
-- { "reaction_type": "fire" }; all existing rows keep NULL. Nothing
-- reads it except the reaction case in the notification renderer.
alter table public.notifications add column if not exists metadata jsonb;
