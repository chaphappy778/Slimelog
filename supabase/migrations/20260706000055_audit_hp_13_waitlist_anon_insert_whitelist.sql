-- 2026-07-06 audit high-priority #13: waitlist anon INSERT accepts
-- sync-state columns.
--
-- Problem
-- -------
-- The waitlist table has these columns (initial mig 20260331 + Brevo
-- mig 20260423):
--
--   id                     uuid    (default)
--   email                  text    (unique)
--   created_at             timestamptz (default now)
--   source                 text    (default 'landing_page')
--   marketing_consent      boolean (default false)
--   invited_at             timestamptz
--   notes                  text
--   brevo_contact_id       text
--   brevo_synced_at        timestamptz
--   brevo_sync_error       text
--
-- And the anon INSERT policy is:
--
--   CREATE POLICY "Anyone can join waitlist"
--     ON waitlist FOR INSERT TO anon WITH CHECK (true);
--
-- No column filter. An attacker hitting PostgREST directly with the
-- anon key can:
--
--   POST /rest/v1/waitlist
--   { "email": "foo@bar.com",
--     "brevo_contact_id": "spoofed",
--     "brevo_synced_at": "2099-01-01T00:00:00Z",
--     "notes": "arbitrary text",
--     "invited_at": "2099-01-01T00:00:00Z" }
--
-- Damage vectors:
--   1. `brevo_synced_at` set in the future makes the row look already
--      synced, so the scheduled Brevo backfill (which looks up rows
--      WHERE brevo_synced_at IS NULL) skips it — silently breaking
--      the Brevo pipeline.
--   2. `brevo_contact_id` set to a valid Brevo id (attacker can create
--      one on their own account first) collides with legitimate future
--      contacts.
--   3. `invited_at` set to a past date makes the row look already
--      invited, so an admin export skips them from the "who to invite
--      next" list.
--   4. `notes` is a free-form admin field — poisoning it with junk
--      pollutes the admin dashboard.
--   5. Unique-key enumeration is a separate concern (any INSERT
--      responds with a distinguishable error when the email exists),
--      but the whitelist doesn't make that worse.
--
-- Legit inserter is the API route /api/waitlist/route.ts, which uses
-- the service role client (line 103) and bypasses RLS. All the
-- Brevo/notes/invited_at writes it makes happen AFTER the row exists,
-- via .update(). None of them come through the anon INSERT path.
--
-- Fix
-- ---
-- Drop and recreate the anon INSERT policy with a column whitelist in
-- WITH CHECK. Anon may set only email + marketing_consent (the only
-- fields the frontend sends). Everything else must be NULL or take
-- the column default. Service-role INSERT is unchanged (RLS bypass).
--
-- Note on `source`
-- ----------------
-- source has a DEFAULT of 'landing_page' but no column that flags
-- "user supplied vs default". The API route only sends email +
-- marketing_consent, so 'source' comes from the column default. An
-- attacker could set source to something like "brand_partnership" to
-- taint attribution analytics — but this is a soft integrity concern
-- not a security one, and locking source to NULL would require
-- coordinating with the frontend if source ever gets threaded through
-- the form. Leaving source open for now. Revisit if we see abuse in
-- the admin dashboard.
--
-- Verification
-- ------------
-- As anon (using anon key against PostgREST), these should fail:
--   INSERT INTO waitlist (email, brevo_contact_id)
--     VALUES ('x@y.com', 'spoofed');
--   INSERT INTO waitlist (email, invited_at)
--     VALUES ('x@y.com', '2099-01-01');
--
-- This should succeed:
--   INSERT INTO waitlist (email, marketing_consent) VALUES ('x@y.com', true);

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  TO anon
  WITH CHECK (
    invited_at        IS NULL
    AND notes         IS NULL
    AND brevo_contact_id IS NULL
    AND brevo_synced_at  IS NULL
    AND brevo_sync_error IS NULL
  );

COMMENT ON POLICY "Anyone can join waitlist"
  ON public.waitlist
  IS 'Audit high-priority #13 (2026-07-06). Column whitelist: anon may '
     'set only email + marketing_consent (+ source via default). '
     'Server-managed columns (invited_at, notes, brevo_*) must be NULL. '
     'Service-role writes via /api/waitlist bypass RLS and are unaffected.';
