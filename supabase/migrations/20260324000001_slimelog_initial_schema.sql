-- =============================================================================
-- SlimeLog — Initial Schema Migration
-- File:    20260324000001_slimelog_initial_schema.sql
-- Author:  Generated from SlimeLog Product Brief & Taxonomy v1.0
-- Purpose: Full production schema: enums, tables, indexes, RLS policies,
--          seed data for 8 founding brands and 16 slime types.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";     -- for fuzzy brand/product search


-- ===========================================================================
-- SECTION 1 — ENUMS
-- ===========================================================================

-- 16-type slime taxonomy (taxonomy v1.0, authored by Jennifer, CMO)
create type slime_type as enum (
  'butter',
  'clear',
  'cloud',
  'icee',
  'fluffy',
  'floam',
  'snow_fizz',
  'thick_and_glossy',
  'jelly',
  'beaded',
  'clay',
  'cloud_cream',
  'magnetic',
  'thermochromic',
  'avalanche',
  'slay'
);

-- Activity event types for the feed
create type activity_type as enum (
  'log_created',       -- user logged a new slime
  'rating_added',      -- user rated a slime
  'wishlist_added',    -- user added slime to wishlist
  'collection_added',  -- user moved slime to collection
  'drop_announced',    -- brand announced a drop
  'drop_live',         -- drop went live
  'drop_sold_out',     -- drop sold out
  'user_followed'      -- user followed another user
);

-- Notification categories
create type notification_type as enum (
  'drop_announced',
  'drop_live',
  'drop_sold_out',
  'new_follower',
  'friend_log',
  'friend_rating',
  'comment_on_log',
  'like_on_log'
);

-- Drop status lifecycle
create type drop_status as enum (
  'announced',
  'live',
  'sold_out',
  'restocked',
  'cancelled'
);


-- ===========================================================================
-- SECTION 2 — CORE TABLES
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 2.1  PROFILES (extends Supabase auth.users 1-to-1)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username        text not null unique,
  display_name    text,
  avatar_url      text,
  bio             text,
  is_brand        boolean not null default false,
  is_premium      boolean not null default false,
  is_verified     boolean not null default false,   -- brand verification badge
  location        text,
  website_url     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint username_length check (char_length(username) between 3 and 30),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

comment on table public.profiles is
  'One row per Supabase auth user. Extends auth.users with community profile fields.';


-- ---------------------------------------------------------------------------
-- 2.2  BRANDS / MAKERS
-- ---------------------------------------------------------------------------
create table public.brands (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,            -- url-safe identifier
  name            text not null,
  description     text,
  logo_url        text,
  website_url     text,
  shop_url        text,                            -- Etsy / TikTok Shop / own site
  instagram_handle text,
  tiktok_handle   text,
  owner_id        uuid references public.profiles (id) on delete set null,
  is_verified     boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.brands is
  'Brand/maker records. Seed list of 8 founding brands pre-populated.';

-- Rating aggregates — maintained by triggers (see Section 5)
alter table public.brands
  add column avg_shipping         numeric(3,2),
  add column avg_customer_service numeric(3,2),
  add column total_brand_ratings  integer not null default 0;


-- ---------------------------------------------------------------------------
-- 2.3  SLIME PRODUCTS
-- ---------------------------------------------------------------------------
create table public.slimes (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references public.brands (id) on delete restrict,
  name            text not null,
  slime_type      slime_type not null,
  description     text,
  colors          text[],                          -- e.g. ['pink', 'white']
  scent           text,
  image_url       text,
  collection_name text,                            -- themed drop/collection
  retail_price    numeric(8,2),
  is_limited      boolean not null default false,  -- limited-edition / drop-only
  is_discontinued boolean not null default false,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Computed rating averages (maintained by triggers)
  avg_texture         numeric(3,2),
  avg_scent           numeric(3,2),
  avg_sound           numeric(3,2),
  avg_drizzle         numeric(3,2),
  avg_creativity      numeric(3,2),
  avg_sensory_fit     numeric(3,2),
  avg_overall         numeric(3,2),
  total_ratings       integer not null default 0
);

comment on table public.slimes is
  'Slime product catalog. One row per distinct product. Created by users or brands.';


-- ---------------------------------------------------------------------------
-- 2.4  COLLECTION LOGS
--      The core table — every slime a user has logged (owned or wishlist).
--      Maps to "Collection tracking fields" in taxonomy §2.3.
-- ---------------------------------------------------------------------------
create table public.collection_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  slime_id        uuid references public.slimes (id) on delete set null,

  -- Allow free-form entry even when slime isn't in catalog yet
  slime_name      text not null,
  brand_id        uuid references public.brands (id) on delete set null,
  brand_name_raw  text,                            -- fallback if brand not in DB
  collection_name text,
  slime_type      slime_type not null,

  colors          text[],
  scent           text,
  cost_paid       numeric(8,2),
  purchased_from  text,                            -- platform / shop name
  purchased_at    date,

  likes           text,                            -- free text — what they loved
  dislikes        text,                            -- free text — what disappointed
  notes           text,

  -- Ownership flags (taxonomy §2.3)
  in_collection   boolean not null default true,
  in_wishlist     boolean not null default false,

  -- Slime-level ratings (taxonomy §2.2)
  rating_texture      smallint check (rating_texture between 1 and 5),
  rating_scent        smallint check (rating_scent between 1 and 5),
  rating_sound        smallint check (rating_sound between 1 and 5),
  rating_drizzle      smallint check (rating_drizzle between 1 and 5),
  rating_creativity   smallint check (rating_creativity between 1 and 5),
  rating_sensory_fit  smallint check (rating_sensory_fit between 1 and 5),
  rating_overall      smallint check (rating_overall between 1 and 5),

  is_public       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint ownership_flag_check
    check (in_collection or in_wishlist)           -- must be one or both
);

comment on table public.collection_logs is
  'Core log entry: every slime a user has tried, owns, or wants. '
  'Replaces the spreadsheet workflow described in the product brief.';


-- ---------------------------------------------------------------------------
-- 2.5  BRAND RATINGS (shipping + customer service — per brand, not per slime)
--      Taxonomy §2.2: "Shipping and customer service ratings belong to the
--      brand/seller record, not to the individual slime record."
-- ---------------------------------------------------------------------------
create table public.brand_ratings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  brand_id            uuid not null references public.brands (id) on delete cascade,
  rating_shipping         smallint check (rating_shipping between 1 and 5),
  rating_customer_service smallint check (rating_customer_service between 1 and 5),
  review_text         text,
  order_reference     text,                        -- optional order # for context
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, brand_id)                       -- one active rating per user/brand
);

comment on table public.brand_ratings is
  'Per-user, per-brand ratings for shipping and customer service. '
  'Aggregates roll up to brands.avg_shipping and brands.avg_customer_service.';


-- ---------------------------------------------------------------------------
-- 2.6  SOCIAL FOLLOWS
-- ---------------------------------------------------------------------------
create table public.follows (
  follower_id   uuid not null references public.profiles (id) on delete cascade,
  following_id  uuid not null references public.profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),

  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

comment on table public.follows is 'User-to-user follow graph.';


-- ---------------------------------------------------------------------------
-- 2.7  BRAND FOLLOWS (users following brands for drop notifications)
-- ---------------------------------------------------------------------------
create table public.brand_follows (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  brand_id    uuid not null references public.brands (id) on delete cascade,
  created_at  timestamptz not null default now(),

  primary key (user_id, brand_id)
);

comment on table public.brand_follows is 'Users following brands for drop alerts.';


-- ---------------------------------------------------------------------------
-- 2.8  DROPS
-- ---------------------------------------------------------------------------
create table public.drops (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references public.brands (id) on delete cascade,
  name            text not null,
  description     text,
  drop_at         timestamptz,                     -- scheduled drop time (nullable = TBA)
  status          drop_status not null default 'announced',
  shop_url        text,                            -- direct URL to purchase
  cover_image_url text,
  announced_by    uuid references public.profiles (id) on delete set null,
  sold_out_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.drops is
  'Brand drop announcements. Drives the drop tracker and notification queue.';


-- ---------------------------------------------------------------------------
-- 2.9  DROP ↔ SLIME (which products are in a drop)
-- ---------------------------------------------------------------------------
create table public.drop_slimes (
  drop_id   uuid not null references public.drops (id) on delete cascade,
  slime_id  uuid not null references public.slimes (id) on delete cascade,
  primary key (drop_id, slime_id)
);


-- ---------------------------------------------------------------------------
-- 2.10 ACTIVITY FEED
-- ---------------------------------------------------------------------------
create table public.activity_feed (
  id              uuid primary key default gen_random_uuid(),
  actor_id        uuid not null references public.profiles (id) on delete cascade,
  activity_type   activity_type not null,

  -- Polymorphic target (at most one populated)
  log_id          uuid references public.collection_logs (id) on delete cascade,
  slime_id        uuid references public.slimes (id) on delete cascade,
  brand_id        uuid references public.brands (id) on delete cascade,
  drop_id         uuid references public.drops (id) on delete cascade,
  target_user_id  uuid references public.profiles (id) on delete cascade,

  metadata        jsonb,                           -- any extra payload
  created_at      timestamptz not null default now()
);

comment on table public.activity_feed is
  'Denormalized event stream for the social feed. '
  'Fanout to followers is handled by the notification queue.';

create index activity_feed_actor_created_idx
  on public.activity_feed (actor_id, created_at desc);

create index activity_feed_created_idx
  on public.activity_feed (created_at desc);


-- ---------------------------------------------------------------------------
-- 2.11 LIKES (on collection_log entries)
-- ---------------------------------------------------------------------------
create table public.log_likes (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  log_id   uuid not null references public.collection_logs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, log_id)
);


-- ---------------------------------------------------------------------------
-- 2.12 COMMENTS (on collection_log entries)
-- ---------------------------------------------------------------------------
create table public.log_comments (
  id          uuid primary key default gen_random_uuid(),
  log_id      uuid not null references public.collection_logs (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint comment_length check (char_length(body) between 1 and 1000)
);


-- ---------------------------------------------------------------------------
-- 2.13 NOTIFICATION QUEUE
-- ---------------------------------------------------------------------------
create table public.notifications (
  id                uuid primary key default gen_random_uuid(),
  recipient_id      uuid not null references public.profiles (id) on delete cascade,
  notification_type notification_type not null,
  actor_id          uuid references public.profiles (id) on delete set null,

  -- Polymorphic subject
  log_id    uuid references public.collection_logs (id) on delete cascade,
  drop_id   uuid references public.drops (id) on delete cascade,
  brand_id  uuid references public.brands (id) on delete cascade,

  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

comment on table public.notifications is
  'Per-user notification inbox. Includes drop alerts for followed brands.';

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, is_read, created_at desc);


-- ===========================================================================
-- SECTION 3 — INDEXES
-- ===========================================================================

-- profiles
create index profiles_username_idx on public.profiles (username);

-- brands
create index brands_slug_idx       on public.brands (slug);
create index brands_name_trgm_idx  on public.brands using gin (name gin_trgm_ops);

-- slimes
create index slimes_brand_id_idx   on public.slimes (brand_id);
create index slimes_type_idx       on public.slimes (slime_type);
create index slimes_name_trgm_idx  on public.slimes using gin (name gin_trgm_ops);
create index slimes_avg_overall_idx on public.slimes (avg_overall desc nulls last);

-- collection_logs
create index logs_user_id_idx      on public.collection_logs (user_id, created_at desc);
create index logs_slime_id_idx     on public.collection_logs (slime_id);
create index logs_brand_id_idx     on public.collection_logs (brand_id);
create index logs_type_idx         on public.collection_logs (slime_type);
create index logs_wishlist_idx     on public.collection_logs (user_id) where in_wishlist = true;
create index logs_collection_idx   on public.collection_logs (user_id) where in_collection = true;

-- brand_ratings
create index brand_ratings_brand_idx on public.brand_ratings (brand_id);

-- drops
create index drops_brand_id_idx    on public.drops (brand_id);
create index drops_status_idx      on public.drops (status);
create index drops_drop_at_idx     on public.drops (drop_at asc nulls last);

-- notifications
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);


-- ===========================================================================
-- SECTION 4 — UPDATED_AT TRIGGER (reusable)
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

create trigger slimes_updated_at
  before update on public.slimes
  for each row execute function public.set_updated_at();

create trigger collection_logs_updated_at
  before update on public.collection_logs
  for each row execute function public.set_updated_at();

create trigger brand_ratings_updated_at
  before update on public.brand_ratings
  for each row execute function public.set_updated_at();

create trigger drops_updated_at
  before update on public.drops
  for each row execute function public.set_updated_at();

create trigger log_comments_updated_at
  before update on public.log_comments
  for each row execute function public.set_updated_at();


-- ===========================================================================
-- SECTION 5 — RATING AGGREGATE TRIGGERS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 5.1  Slime rating averages (rolls up from collection_logs)
-- ---------------------------------------------------------------------------
create or replace function public.refresh_slime_rating_averages()
returns trigger language plpgsql security definer as $$
declare
  v_slime_id uuid;
begin
  v_slime_id := coalesce(new.slime_id, old.slime_id);
  if v_slime_id is null then
    return coalesce(new, old);
  end if;

  update public.slimes
  set
    avg_texture     = (select round(avg(rating_texture)::numeric,    2) from public.collection_logs where slime_id = v_slime_id and rating_texture    is not null),
    avg_scent       = (select round(avg(rating_scent)::numeric,      2) from public.collection_logs where slime_id = v_slime_id and rating_scent      is not null),
    avg_sound       = (select round(avg(rating_sound)::numeric,      2) from public.collection_logs where slime_id = v_slime_id and rating_sound      is not null),
    avg_drizzle     = (select round(avg(rating_drizzle)::numeric,    2) from public.collection_logs where slime_id = v_slime_id and rating_drizzle    is not null),
    avg_creativity  = (select round(avg(rating_creativity)::numeric, 2) from public.collection_logs where slime_id = v_slime_id and rating_creativity is not null),
    avg_sensory_fit = (select round(avg(rating_sensory_fit)::numeric,2) from public.collection_logs where slime_id = v_slime_id and rating_sensory_fit is not null),
    avg_overall     = (select round(avg(rating_overall)::numeric,    2) from public.collection_logs where slime_id = v_slime_id and rating_overall    is not null),
    total_ratings   = (select count(*) from public.collection_logs where slime_id = v_slime_id and rating_overall is not null)
  where id = v_slime_id;

  return coalesce(new, old);
end;
$$;

create trigger collection_logs_update_slime_averages
  after insert or update or delete on public.collection_logs
  for each row execute function public.refresh_slime_rating_averages();


-- ---------------------------------------------------------------------------
-- 5.2  Brand rating averages (rolls up from brand_ratings)
-- ---------------------------------------------------------------------------
create or replace function public.refresh_brand_rating_averages()
returns trigger language plpgsql security definer as $$
declare
  v_brand_id uuid;
begin
  v_brand_id := coalesce(new.brand_id, old.brand_id);

  update public.brands
  set
    avg_shipping         = (select round(avg(rating_shipping)::numeric,          2) from public.brand_ratings where brand_id = v_brand_id and rating_shipping          is not null),
    avg_customer_service = (select round(avg(rating_customer_service)::numeric,  2) from public.brand_ratings where brand_id = v_brand_id and rating_customer_service  is not null),
    total_brand_ratings  = (select count(*) from public.brand_ratings where brand_id = v_brand_id)
  where id = v_brand_id;

  return coalesce(new, old);
end;
$$;

create trigger brand_ratings_update_brand_averages
  after insert or update or delete on public.brand_ratings
  for each row execute function public.refresh_brand_rating_averages();


-- ===========================================================================
-- SECTION 6 — NEW USER PROFILE TRIGGER
-- (auto-creates a profiles row when auth.users gains a new user)
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===========================================================================
-- SECTION 7 — ROW LEVEL SECURITY (RLS)
-- ===========================================================================

-- Enable RLS on every user-facing table
alter table public.profiles         enable row level security;
alter table public.brands           enable row level security;
alter table public.slimes           enable row level security;
alter table public.collection_logs  enable row level security;
alter table public.brand_ratings    enable row level security;
alter table public.follows          enable row level security;
alter table public.brand_follows    enable row level security;
alter table public.drops            enable row level security;
alter table public.drop_slimes      enable row level security;
alter table public.activity_feed    enable row level security;
alter table public.log_likes        enable row level security;
alter table public.log_comments     enable row level security;
alter table public.notifications    enable row level security;

-- ---------------------------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------------------------
create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- BRANDS
-- ---------------------------------------------------------------------------
create policy "Brands are publicly readable"
  on public.brands for select
  using (true);

create policy "Authenticated users can create brands"
  on public.brands for insert
  to authenticated
  with check (true);

create policy "Brand owners can update their brand"
  on public.brands for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- SLIMES
-- ---------------------------------------------------------------------------
create policy "Slimes are publicly readable"
  on public.slimes for select
  using (true);

create policy "Authenticated users can add slimes to catalog"
  on public.slimes for insert
  to authenticated
  with check (auth.uid() = created_by);

create policy "Slime creator can update slime"
  on public.slimes for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- COLLECTION LOGS
-- ---------------------------------------------------------------------------
create policy "Public logs are readable by everyone"
  on public.collection_logs for select
  using (is_public = true or auth.uid() = user_id);

create policy "Users can create their own log entries"
  on public.collection_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own log entries"
  on public.collection_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own log entries"
  on public.collection_logs for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- BRAND RATINGS
-- ---------------------------------------------------------------------------
create policy "Brand ratings are publicly readable"
  on public.brand_ratings for select
  using (true);

create policy "Users can submit brand ratings"
  on public.brand_ratings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own brand ratings"
  on public.brand_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own brand ratings"
  on public.brand_ratings for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- FOLLOWS
-- ---------------------------------------------------------------------------
create policy "Follows are publicly readable"
  on public.follows for select
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- BRAND FOLLOWS
-- ---------------------------------------------------------------------------
create policy "Brand follows are publicly readable"
  on public.brand_follows for select
  using (true);

create policy "Users can follow brands"
  on public.brand_follows for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unfollow brands"
  on public.brand_follows for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- DROPS
-- ---------------------------------------------------------------------------
create policy "Drops are publicly readable"
  on public.drops for select
  using (true);

create policy "Brand owners can manage drops"
  on public.drops for all
  using (
    auth.uid() = announced_by
    or auth.uid() = (select owner_id from public.brands where id = brand_id)
  );

-- ---------------------------------------------------------------------------
-- DROP SLIMES
-- ---------------------------------------------------------------------------
create policy "Drop slimes are publicly readable"
  on public.drop_slimes for select
  using (true);

-- ---------------------------------------------------------------------------
-- ACTIVITY FEED
-- ---------------------------------------------------------------------------
create policy "Activity feed is publicly readable"
  on public.activity_feed for select
  using (true);

create policy "System can insert activity (service role only)"
  on public.activity_feed for insert
  to service_role
  with check (true);

-- ---------------------------------------------------------------------------
-- LOG LIKES
-- ---------------------------------------------------------------------------
create policy "Likes are publicly readable"
  on public.log_likes for select
  using (true);

create policy "Users can like public logs"
  on public.log_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unlike"
  on public.log_likes for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- LOG COMMENTS
-- ---------------------------------------------------------------------------
create policy "Comments on public logs are readable"
  on public.log_comments for select
  using (
    exists (
      select 1 from public.collection_logs cl
      where cl.id = log_id and (cl.is_public = true or cl.user_id = auth.uid())
    )
  );

create policy "Authenticated users can comment"
  on public.log_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can edit their own comments"
  on public.log_comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.log_comments for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------
create policy "Users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = recipient_id);

create policy "System inserts notifications (service role only)"
  on public.notifications for insert
  to service_role
  with check (true);

create policy "Users can mark notifications read"
  on public.notifications for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);


-- ===========================================================================
-- SECTION 8 — SEED DATA
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 8.1  Slime type reference table
--      (denormalized reference — useful for guide/onboarding UI)
-- ---------------------------------------------------------------------------
create table public.slime_type_reference (
  slime_type          slime_type primary key,
  display_name        text not null,
  made_with           text not null,
  key_characteristics text not null,
  what_to_rate        text not null,
  sort_order          smallint not null
);

comment on table public.slime_type_reference is
  'Human-readable guide data for each slime type. Powers the in-app Slime Guide.';

alter table public.slime_type_reference enable row level security;

create policy "Slime type reference is publicly readable"
  on public.slime_type_reference for select
  using (true);

insert into public.slime_type_reference
  (slime_type,          display_name,       made_with,                        key_characteristics,                      what_to_rate,                   sort_order)
values
  ('butter',            'Butter',           'Soft clay added',                'Smooth, spreadable, non-sticky',         'Texture, spreadability',                1),
  ('clear',             'Clear',            'Clear glue base',                'Transparent, glossy, stretchy',          'Clarity, stretch, bubble pops',         2),
  ('cloud',             'Cloud',            'Instant snow added',             'Light, airy, drizzle effect',            'Drizzle, fluffiness, snow texture',      3),
  ('icee',              'Icee',             'Wet slushy formula',             'Wet, soft, slushy feel',                 'Wet texture, slush factor',             4),
  ('fluffy',            'Fluffy',           'Shaving foam added',             'Light, airy, pillowy',                   'Fluffiness, stretch',                   5),
  ('floam',             'Floam',            'Foam beads added',               'Crunchy, textured, beady',               'Crunch, bead density',                  6),
  ('snow_fizz',         'Snow Fizz',        'Plastic snow added',             'Very thick, very crunchy',               'Crunch intensity, thickness',           7),
  ('thick_and_glossy',  'Thick & Glossy',   'Dense glue base',                'Dense, shiny, bubble pops',              'Gloss, bubble pop quality',             8),
  ('jelly',             'Jelly',            'Clear glue + snow/beads',        'Clear-ish, slightly textured',           'Jelly feel, bead mix',                  9),
  ('beaded',            'Beaded',           'Bingsu/fishbowl beads',          'Maximum crunch, beady',                  'Crunch, bead type/size',               10),
  ('clay',              'Clay',             'Soft clay base',                 'Smooth, soft, thick',                    'Smoothness, thickness',                11),
  ('cloud_cream',       'Cloud Cream',      'Cloud + butter/clay mix',        'Slightly denser, soft',                  'Density, softness blend',              12),
  ('magnetic',          'Magnetic',         'Iron filings added',             'Reacts to magnets',                      'Magnetic response',                    13),
  ('thermochromic',     'Thermochromic',    'Color-change pigment',           'Changes color with heat',                'Color transition speed',               14),
  ('avalanche',         'Avalanche',        'Clear base + thick topper',      'Slow sinking landscape effect',          'Sinking effect, visual',               15),
  ('slay',              'Slay',             'Basic slime + clay',             'Thick, stretchy blend',                  'Stretch, thickness balance',           16);


-- ---------------------------------------------------------------------------
-- 8.2  Founding brands seed list (8 brands from product brief §1.6)
-- ---------------------------------------------------------------------------
insert into public.brands
  (id,                                    slug,               name,               is_verified, is_active)
values
  ('b1000000-0000-0000-0000-000000000001', 'momo-slimes',      'Momo Slimes',      true,  true),
  ('b1000000-0000-0000-0000-000000000002', 'peachybbbies',     'Peachybbbies',     true,  true),
  ('b1000000-0000-0000-0000-000000000003', 'ky-slimes',        'Ky Slimes',        true,  true),
  ('b1000000-0000-0000-0000-000000000004', 'dope-slimes',      'Dope Slimes',      true,  true),
  ('b1000000-0000-0000-0000-000000000005', 'slime-sweet-pea',  'Slime Sweet Pea',  true,  true),
  ('b1000000-0000-0000-0000-000000000006', 'obsidian-slimes',  'Obsidian Slimes',  true,  true),
  ('b1000000-0000-0000-0000-000000000007', 'pilot-slimes',     'Pilot Slimes',     true,  true),
  ('b1000000-0000-0000-0000-000000000008', 'sandy-bros',       'Sandy Bros',       true,  true);

comment on table public.brands is
  'Brand/maker records. '
  '8 founding brands pre-seeded from product brief §1.6 (Jennifer, CMO). '
  'Expand before beta — Jennifer is authoritative source on community-respected brands.';


-- ===========================================================================
-- SECTION 9 — HELPER VIEWS
-- ===========================================================================

-- Follower/following counts per user
create or replace view public.profile_follow_counts as
  select
    p.id,
    p.username,
    (select count(*) from public.follows f where f.following_id = p.id) as follower_count,
    (select count(*) from public.follows f where f.follower_id  = p.id) as following_count,
    (select count(*) from public.brand_follows bf where bf.user_id = p.id) as brand_follow_count
  from public.profiles p;

-- Collection summary per user
create or replace view public.user_collection_summary as
  select
    user_id,
    count(*) filter (where in_collection = true)  as total_in_collection,
    count(*) filter (where in_wishlist   = true)  as total_in_wishlist,
    count(*) filter (where rating_overall is not null) as total_rated,
    round(avg(rating_overall), 2)                 as avg_overall_given,
    count(distinct brand_id)                      as distinct_brands_tried,
    count(distinct slime_type::text)              as distinct_types_tried
  from public.collection_logs
  group by user_id;

-- Top-rated slimes (public leaderboard)
create or replace view public.top_rated_slimes as
  select
    s.id,
    s.name,
    s.slime_type,
    b.name as brand_name,
    b.slug as brand_slug,
    s.avg_overall,
    s.avg_texture,
    s.avg_scent,
    s.avg_sound,
    s.avg_drizzle,
    s.avg_creativity,
    s.total_ratings,
    s.image_url
  from public.slimes s
  join public.brands b on b.id = s.brand_id
  where s.total_ratings >= 3            -- minimum sample for credibility
  order by s.avg_overall desc nulls last, s.total_ratings desc;

-- Upcoming and live drops (feed driver)
create or replace view public.upcoming_drops as
  select
    d.id,
    d.name,
    d.description,
    d.drop_at,
    d.status,
    d.shop_url,
    d.cover_image_url,
    b.id   as brand_id,
    b.name as brand_name,
    b.slug as brand_slug,
    b.logo_url,
    (select count(*) from public.brand_follows bf where bf.brand_id = b.id) as follower_count
  from public.drops d
  join public.brands b on b.id = d.brand_id
  where d.status in ('announced', 'live')
  order by d.drop_at asc nulls last;


-- ===========================================================================
-- END OF MIGRATION
-- ===========================================================================
