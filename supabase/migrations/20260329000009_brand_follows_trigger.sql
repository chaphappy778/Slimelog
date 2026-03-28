-- supabase/migrations/20260329000009_brand_follows_trigger.sql
-- 1. RLS policies for brand_follows
-- 2. Trigger function + trigger to maintain brands.follower_count
-- 3. Back-fill to sync follower_count from existing data
-- Fully idempotent — safe to re-run.

-- ─── Section 1: Enable RLS & Policies ────────────────────────────────────────

alter table public.brand_follows enable row level security;

do $$ begin
  create policy "Users can follow brands"
    on public.brand_follows for insert
    to authenticated
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can unfollow brands"
    on public.brand_follows for delete
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can read own follows"
    on public.brand_follows for select
    to authenticated
    using (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ─── Section 2: Trigger Function & Trigger ───────────────────────────────────

create or replace function public.refresh_brand_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.brands
    set follower_count = follower_count + 1
    where id = NEW.brand_id;

  elsif (TG_OP = 'DELETE') then
    update public.brands
    set follower_count = greatest(follower_count - 1, 0)
    where id = OLD.brand_id;
  end if;

  return null; -- result is ignored for AFTER triggers
end;
$$;

drop trigger if exists trg_brand_follows_follower_count on public.brand_follows;

create trigger trg_brand_follows_follower_count
after insert or delete on public.brand_follows
for each row
execute function public.refresh_brand_follower_count();

-- ─── Section 3: Back-fill ─────────────────────────────────────────────────────

update public.brands b
set follower_count = (
  select count(*)::integer
  from public.brand_follows bf
  where bf.brand_id = b.id
);