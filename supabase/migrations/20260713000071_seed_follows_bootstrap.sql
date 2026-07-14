-- 20260713000071_seed_follows_bootstrap.sql
-- [T36 2026-07-13] Auto-follow seed accounts on new user signup.
--
-- Every new user is silently subscribed to a curated set of "seed"
-- profiles when their `profiles` row is created. Modeled after the
-- MySpace Tom pattern — kills the day-1 empty-feed problem and gives
-- us a broadcast channel to every new user via posts from the seed
-- accounts.
--
-- V1 seeds: `slimelog_official` (broadcast account) + `jenn_slimelogapp`
-- (founder account). Admins can add/remove seeds by INSERT/DELETE on
-- `public.seed_follow_accounts` at any time — no code redeploy.
--
-- No backfill of existing users per Jenn 2026-07-13 (only one other
-- user on the app, already follows Jenn). The one-time backfill
-- statement below is intentionally commented out; uncomment + edit
-- for future seed additions if we want them retroactive.

-- ─── Seed config table ────────────────────────────────────────────────
--
-- Small config table mapping seed profiles to a display note. Every
-- row in this table is an auto-follow target. The trigger reads this
-- table at insert time, so runtime changes take effect on the very
-- next signup — no redeploy.

create table if not exists public.seed_follow_accounts (
  profile_id  uuid primary key references public.profiles (id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now()
);

comment on table public.seed_follow_accounts is
  'Auto-follow seed accounts. Every row here is a profile that new users automatically follow on signup. Managed via SQL by admins.';

alter table public.seed_follow_accounts enable row level security;

-- Anyone (including anon) may read the seed list — the account being
-- a "seed" is not sensitive info.
drop policy if exists "seed_follow_accounts_select_all"
  on public.seed_follow_accounts;
create policy "seed_follow_accounts_select_all"
  on public.seed_follow_accounts
  for select
  to anon, authenticated
  using (true);

-- Writes gated to service role only. Admins can add / remove seeds
-- via the SQL editor or an admin-only endpoint using service_role.
drop policy if exists "seed_follow_accounts_no_writes"
  on public.seed_follow_accounts;
create policy "seed_follow_accounts_no_writes"
  on public.seed_follow_accounts
  for all
  to authenticated, anon
  using (false)
  with check (false);

-- ─── Seed the seed list ───────────────────────────────────────────────
--
-- Insert the two V1 seed accounts. Uses username lookups so this
-- migration is safe regardless of the profile IDs on any given
-- environment (dev / staging / prod). If either seed username
-- doesn't exist yet in the database, the corresponding INSERT is a
-- no-op — set it up later with a follow-up INSERT.

insert into public.seed_follow_accounts (profile_id, note)
select p.id, 'SlimeLog Official — broadcast channel'
from public.profiles p
where p.username = 'slimelog_official'
on conflict (profile_id) do nothing;

insert into public.seed_follow_accounts (profile_id, note)
select p.id, 'Jenn — founder account'
from public.profiles p
where p.username = 'jenn_slimelogapp'
on conflict (profile_id) do nothing;

-- ─── Bootstrap trigger ────────────────────────────────────────────────
--
-- Fires after every INSERT on public.profiles. Reads the seed list
-- and inserts a follow row from the new profile → each seed. Skips
-- the self-follow row (Jenn wouldn't auto-follow herself when her
-- own profile row was created).

create or replace function public.bootstrap_new_user_follows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.follows (follower_id, following_id)
  select new.id, s.profile_id
  from public.seed_follow_accounts s
  where s.profile_id <> new.id
  on conflict (follower_id, following_id) do nothing;
  return new;
end;
$$;

comment on function public.bootstrap_new_user_follows is
  'Trigger fn: auto-follow every row in seed_follow_accounts when a new profile is created. Idempotent via ON CONFLICT DO NOTHING.';

drop trigger if exists trg_bootstrap_new_user_follows on public.profiles;

create trigger trg_bootstrap_new_user_follows
  after insert on public.profiles
  for each row
  execute function public.bootstrap_new_user_follows();

-- ─── Backfill (intentionally NOT enabled) ─────────────────────────────
--
-- Uncomment to retroactively add follows for every EXISTING user to
-- every current seed. Idempotent. Left commented per Jenn's 2026-07-13
-- decision — the only other pre-launch user already follows Jenn.
--
-- insert into public.follows (follower_id, following_id)
-- select p.id, s.profile_id
-- from public.profiles p
-- cross join public.seed_follow_accounts s
-- where p.id <> s.profile_id
-- on conflict (follower_id, following_id) do nothing;
