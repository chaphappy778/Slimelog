-- supabase/migrations/20260423000030_waitlist_brevo_sync.sql
--
-- Migration: waitlist_brevo_sync
-- Table altered: waitlist
-- Columns added:
--   brevo_contact_id  TEXT        - Brevo's internal contact ID returned from POST /v3/contacts
--   brevo_synced_at   TIMESTAMPTZ - Timestamp of last successful Brevo sync
--   brevo_sync_error  TEXT        - Last error message if most recent Brevo sync failed
-- Index added: partial index on brevo_synced_at IS NULL for efficient unsynced-row lookups
--
-- Reason: Track state of the Supabase -> Brevo contact sync performed by
-- /api/waitlist. Supabase remains source of truth; Brevo is a mirror used for
-- sending the welcome automation and future newsletter campaigns. When Brevo
-- is unavailable at signup time, the signup still succeeds and the failure is
-- recorded in brevo_sync_error for later retry.
--
-- Backfill note: 7 rows pre-existed at the time of this migration and were
-- manually synced to Brevo via the dashboard on the deploy date. Those rows
-- retain NULL values for brevo_contact_id and brevo_synced_at - this is
-- intentional and accurate. The code in this deploy never synced them, so the
-- NULL values honestly reflect that fact.

-- [Change 1] Add Brevo sync tracking columns to waitlist
ALTER TABLE waitlist
  ADD COLUMN brevo_contact_id TEXT,
  ADD COLUMN brevo_synced_at TIMESTAMPTZ,
  ADD COLUMN brevo_sync_error TEXT;

-- [Change 2] Partial index for finding rows that have not yet been synced
CREATE INDEX waitlist_brevo_unsynced_idx
  ON waitlist (created_at)
  WHERE brevo_synced_at IS NULL;

-- [Change 3] Column comments for schema documentation
COMMENT ON COLUMN waitlist.brevo_contact_id IS
  'Brevo internal contact ID returned by POST /v3/contacts. NULL if never successfully synced.';

COMMENT ON COLUMN waitlist.brevo_synced_at IS
  'Timestamp of most recent successful Brevo sync. NULL if never successfully synced.';

COMMENT ON COLUMN waitlist.brevo_sync_error IS
  'Error message from most recent failed Brevo sync. NULL if last sync was successful or never attempted.';