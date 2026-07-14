-- 20260713000072_seed_follows_jenn_fix.sql
-- [T36 fix 2026-07-13] `jenn_slimelogapp` didn't land in the seed
-- follows table when 20260713000071 ran because that migration used
-- a case-SENSITIVE username lookup. Actual profile row is stored with
-- a different capitalization. Also backfill the seed follow for any
-- user who signed up between the initial migration and this fix
-- (the AFTER INSERT trigger only fires on new profile creation, so
-- users created in the gap window need a one-time catch-up).

-- ─── Case-insensitive re-seed of Jenn ─────────────────────────────────
--
-- ILIKE matches regardless of case. If the profile still isn't found
-- (e.g. username was renamed further), this is a no-op and the seed
-- table stays as-is.

insert into public.seed_follow_accounts (profile_id, note)
select p.id, 'Jenn — founder account'
from public.profiles p
where p.username ilike 'jenn_slimelogapp'
on conflict (profile_id) do nothing;

-- ─── Backfill Jenn follows for users who signed up in the gap ────────
--
-- Anyone whose profile row was created between the initial seed
-- migration (20260713000071) and this fix missed Jenn on their
-- initial trigger fire. Cross-join every existing profile against
-- every current seed, ON CONFLICT DO NOTHING so idempotent + safe to
-- re-run. Skips self-follows to satisfy the follows.no_self_follow
-- check constraint.

insert into public.follows (follower_id, following_id)
select p.id, s.profile_id
from public.profiles p
cross join public.seed_follow_accounts s
where p.id <> s.profile_id
on conflict (follower_id, following_id) do nothing;
