-- 20260721000085_revert_log_reactions.sql
--
-- Revert of T127 (2026-07-21): tap-to-add emoji reactions.
--
-- Why
-- ---
-- T127 (migration 20260721000084) landed reactions on the wrong surface:
-- feed cards + the log detail action bar. Jennifer wanted reactions on
-- individual comments, inline in the comments section on log detail
-- pages, not on the log posts themselves. Reverting same-day so the
-- feature can be rebuilt in the right place (planned as `comment_reactions`
-- under a new ticket). See docs/SlimeLog_Tracker.md T127 note.
--
-- This migration undoes the schema side of 0084. The code side (feed
-- enrichment, ReactionRow, notification case, etc.) is reverted in the
-- same commit.


-- ─── 1. Drop the table ───────────────────────────────────────────────────
--
-- CASCADE so the RLS policies (log_reactions_select_all /
-- _insert_own / _delete_own), the two indexes
-- (log_reactions_user_log_type_uidx, log_reactions_log_id_idx), and the
-- FKs into profiles / collection_logs all go with it. No other object
-- depends on this table.
drop table if exists public.log_reactions cascade;


-- ─── 2. Clean up reaction notifications ──────────────────────────────────
--
-- Only Jennifer's smoke-test rows use this type; remove them so no row
-- references the now-orphaned enum member.
delete from public.notifications where type = 'log_reaction_received';


-- ─── 3. notification_type enum member: intentionally LEFT IN PLACE ────────
--
-- Postgres does not allow dropping a single enum value; removing
-- 'log_reaction_received' would mean a full DROP TYPE + recreate cycle,
-- which requires dropping and restoring every column typed on
-- notification_type. That is a heavy, data-risky lift to remove one
-- harmless orphan value. With the table gone and the rows above
-- deleted, nothing produces or reads this value, so it is left as an
-- intentional orphan enum member. The reactions rebuild will use a
-- different value (`comment_reaction_received`) and does not depend on
-- this one being absent.


-- ─── 4. notifications.metadata column: intentionally KEPT ─────────────────
--
-- The nullable `metadata jsonb` column added in 0084 is NOT tied to
-- T127 specifically. It is generally useful for any notification type
-- that carries context (comment IDs, reaction glyphs, etc.), so it stays.
