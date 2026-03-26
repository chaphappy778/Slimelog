-- =============================================================================
-- SlimeLog — Shipping Time Tracking
-- File:    20260326000002_shipping_time_fields.sql
-- Purpose: Adds objective shipping-time fields to collection_logs, rolling
--          averages to brands, and a trigger to maintain them.
-- Idempotent: all DDL uses IF NOT EXISTS / DO $$ guards.
-- Depends:  20260324000001_slimelog_initial_schema.sql
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SECTION 1  —  NEW COLUMNS ON collection_logs
-- ---------------------------------------------------------------------------

-- 1a. Raw date fields (nullable, user-entered)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'collection_logs'
      and column_name  = 'order_date'
  ) then
    alter table public.collection_logs
      add column order_date date;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'collection_logs'
      and column_name  = 'ship_date'
  ) then
    alter table public.collection_logs
      add column ship_date date;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'collection_logs'
      and column_name  = 'received_date'
  ) then
    alter table public.collection_logs
      add column received_date date;
  end if;
end $$;

-- 1b. Generated (computed) columns
--     Postgres GENERATED ALWAYS AS columns cannot use IF NOT EXISTS directly;
--     guard with the same pattern.
--
--     days_to_ship    = ship_date     - order_date   (business days NOT assumed;
--     days_to_receive = received_date - order_date    raw calendar days)
--
--     Result is NULL whenever either operand is NULL — correct behaviour for
--     partial data entry.

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'collection_logs'
      and column_name  = 'days_to_ship'
  ) then
    alter table public.collection_logs
      add column days_to_ship integer
        generated always as (
          case
            when ship_date is not null and order_date is not null
            then (ship_date - order_date)
            else null
          end
        ) stored;
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'collection_logs'
      and column_name  = 'days_to_receive'
  ) then
    alter table public.collection_logs
      add column days_to_receive integer
        generated always as (
          case
            when received_date is not null and order_date is not null
            then (received_date - order_date)
            else null
          end
        ) stored;
  end if;
end $$;

-- 1c. Sanity-check constraints
--     Add only if the columns now exist and the constraints don't yet.

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema     = 'public'
      and table_name       = 'collection_logs'
      and constraint_name  = 'ship_date_after_order_date'
  ) then
    alter table public.collection_logs
      add constraint ship_date_after_order_date
        check (ship_date is null or order_date is null or ship_date >= order_date);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema     = 'public'
      and table_name       = 'collection_logs'
      and constraint_name  = 'received_date_after_order_date'
  ) then
    alter table public.collection_logs
      add constraint received_date_after_order_date
        check (received_date is null or order_date is null or received_date >= order_date);
  end if;
end $$;

-- 1d. Index: brand-scoped shipping data lookup (used by the trigger aggregate)
create index if not exists logs_brand_shipping_idx
  on public.collection_logs (brand_id)
  where brand_id is not null
    and order_date is not null;


-- ---------------------------------------------------------------------------
-- SECTION 2  —  NEW COLUMNS ON brands
-- ---------------------------------------------------------------------------

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'avg_days_to_ship'
  ) then
    alter table public.brands
      add column avg_days_to_ship numeric(4,1);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'avg_days_to_receive'
  ) then
    alter table public.brands
      add column avg_days_to_receive numeric(4,1);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'brands'
      and column_name  = 'shipping_log_count'
  ) then
    alter table public.brands
      add column shipping_log_count integer not null default 0;
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- SECTION 3  —  TRIGGER FUNCTION
-- ---------------------------------------------------------------------------
-- Recalculates avg_days_to_ship, avg_days_to_receive, and shipping_log_count
-- on the brands row whenever a collection_logs row is inserted, updated, or
-- deleted and has a non-null brand_id.
--
-- Aggregate rules:
--   avg_days_to_ship    — mean of days_to_ship    where days_to_ship    IS NOT NULL
--   avg_days_to_receive — mean of days_to_receive where days_to_receive IS NOT NULL
--   shipping_log_count  — count of logs for this brand where order_date  IS NOT NULL
--                         (i.e. the user at minimum recorded that they placed an order)
--
-- Two brand IDs may need updating per call (old and new) when a user edits
-- the brand_id on an existing log.  Both are handled.

create or replace function public.refresh_brand_shipping_averages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_brand_ids uuid[];
  v_bid       uuid;
begin
  -- Collect every brand_id that needs recalculation.
  -- On UPDATE the brand_id may have changed, so include both old and new.
  v_brand_ids := array_remove(
    array[
      case when tg_op in ('INSERT', 'UPDATE') then new.brand_id else null end,
      case when tg_op in ('DELETE', 'UPDATE') then old.brand_id else null end
    ],
    null
  );

  -- Deduplicate (handles UPDATE where brand_id didn't change)
  select array_agg(distinct bid)
    into v_brand_ids
    from unnest(v_brand_ids) as bid;

  -- Recalculate for each affected brand
  foreach v_bid in array coalesce(v_brand_ids, '{}') loop
    update public.brands
    set
      avg_days_to_ship = (
        select round(avg(days_to_ship)::numeric, 1)
        from public.collection_logs
        where brand_id      = v_bid
          and days_to_ship is not null
      ),
      avg_days_to_receive = (
        select round(avg(days_to_receive)::numeric, 1)
        from public.collection_logs
        where brand_id         = v_bid
          and days_to_receive is not null
      ),
      shipping_log_count = (
        select count(*)
        from public.collection_logs
        where brand_id   = v_bid
          and order_date is not null
      )
    where id = v_bid;
  end loop;

  return coalesce(new, old);
end;
$$;

comment on function public.refresh_brand_shipping_averages() is
  'Maintains brands.avg_days_to_ship, avg_days_to_receive, shipping_log_count '
  'after any INSERT/UPDATE/DELETE on collection_logs that carries a brand_id.';


-- ---------------------------------------------------------------------------
-- SECTION 4  —  ATTACH TRIGGER
-- ---------------------------------------------------------------------------
-- Drop first so re-running the migration is safe (CREATE OR REPLACE only
-- works on functions, not triggers).

drop trigger if exists collection_logs_update_brand_shipping
  on public.collection_logs;

create trigger collection_logs_update_brand_shipping
  after insert or update or delete
  on public.collection_logs
  for each row
  execute function public.refresh_brand_shipping_averages();


-- ---------------------------------------------------------------------------
-- SECTION 5  —  BACKFILL
-- ---------------------------------------------------------------------------
-- For any existing logs that already have order_date + ship/received dates
-- (unlikely at migration time, but safe to run), force the brand aggregates
-- to reflect the current data by touching every brand that has any logs with
-- order_date set.
--
-- This runs as a single UPDATE using the same subquery logic as the trigger.

update public.brands b
set
  avg_days_to_ship = (
    select round(avg(cl.days_to_ship)::numeric, 1)
    from public.collection_logs cl
    where cl.brand_id      = b.id
      and cl.days_to_ship is not null
  ),
  avg_days_to_receive = (
    select round(avg(cl.days_to_receive)::numeric, 1)
    from public.collection_logs cl
    where cl.brand_id         = b.id
      and cl.days_to_receive is not null
  ),
  shipping_log_count = (
    select count(*)
    from public.collection_logs cl
    where cl.brand_id   = b.id
      and cl.order_date is not null
  )
where exists (
  select 1 from public.collection_logs cl
  where cl.brand_id   = b.id
    and cl.order_date is not null
);


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================