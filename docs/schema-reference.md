=============================================================================
SLIMELOG — DATABASE SCHEMA REFERENCE CARD
Migration baseline: 20260324000001_slimelog_initial_schema.sql
Additional migrations applied:
20260326000002_shipping_time_fields.sql
20260327000004_add_purchase_fields.sql
20260328000005_brand_seed_expanded.sql
Postgres via Supabase · Taxonomy v1.0 authored by Jennifer, CMO · v1.3
=============================================================================

─────────────────────────────────────────────────────────────────────────────
ENUMS (4)
─────────────────────────────────────────────────────────────────────────────

slime_type
Values: butter | clear | cloud | icee | fluffy | floam | snow_fizz |
thick_and_glossy | jelly | beaded | clay | cloud_cream |
magnetic | thermochromic | avalanche | slay
Purpose: 16-type taxonomy (Jennifer, CMO). Used on slimes and
collection_logs.

activity_type
Values: log_created | rating_added | wishlist_added | collection_added |
drop_announced | drop_live | drop_sold_out | user_followed
Purpose: Event kinds written to activity_feed.

notification_type
Values: drop_announced | drop_live | drop_sold_out | new_follower |
friend_log | friend_rating | comment_on_log | like_on_log
Purpose: Notification inbox categories.

drop_status
Values: announced | live | sold_out | restocked | cancelled
Purpose: Drop lifecycle state on the drops table.

─────────────────────────────────────────────────────────────────────────────
TABLES (13)
─────────────────────────────────────────────────────────────────────────────

profiles
PK: id (uuid) → auth.users(id)
UK: username
Purpose: 1-to-1 extension of auth.users. Community profile: username,
avatar, bio, location, website_url, is_premium, is_verified,
is_brand flags. Auto-created on signup via handle_new_user()
trigger.

brands
PK: id (uuid)
UK: slug
FK: owner_id → profiles(id)
Columns added in 20260328000005:
location text nullable — city/state e.g. "Austin, TX"
founded_year integer nullable
owner_name text nullable — e.g. "Sally", "Sarah & Trav"
bio text nullable — longer brand story
restock_schedule text nullable — e.g. "Every Friday 6pm EST"
country_code char(2) default 'US' (ISO 3166-1 alpha-2)
follower_count integer default 0, maintained by brand_follows
total_logs integer default 0, trigger-maintained
(refresh_brand_total_logs)
verification_tier text default 'community'
values: community/claimed/verified/partner
verified_at timestamptz nullable — null until claimed/verified
contact_email text nullable
Also holds: avg_shipping, avg_customer_service, total_brand_ratings
(rolling averages from brand_ratings trigger),
avg_days_to_ship, avg_days_to_receive, shipping_log_count
(rolling averages from shipping trigger, migration 000002)
Purpose: Brand/maker catalog. 12 brands seeded (b001–b012) with
deterministic UUIDs b1000000-0000-0000-0000-00000000000N.

slimes
PK: id (uuid)
FK: brand*id → brands(id)
FK: created_by → profiles(id)
COL: slime_type (slime_type enum)
Purpose: Slime product catalog. One row per distinct product. Stores
colors[], scent, collection_name, is_limited. Maintains 7
rolling avg*\* rating columns via trigger (avg_texture,
avg_scent, avg_sound, avg_drizzle, avg_creativity,
avg_sensory_fit, avg_overall) plus total_ratings.

collection_logs
PK: id (uuid)
FK: user_id → profiles(id)
FK: slime_id → slimes(id) nullable
FK: brand_id → brands(id) nullable
COL: slime_type (slime_type enum)
── Core log fields ──
slime_name text required
brand_name_raw text nullable — fallback if brand not in DB
collection_name text nullable
colors text[] nullable — e.g. ['pink', 'white']
scent text nullable
purchased_from text nullable — platform/shop name
purchased_at date nullable
likes text nullable — free text
dislikes text nullable — free text
notes text nullable
in_collection boolean default true
in_wishlist boolean default false
is_public boolean default true
── Purchase fields (migration 20260327000004) ──
purchase_price numeric nullable — what the user paid
purchase_currency text nullable — currency code, default USD
── Shipping time fields (migration 20260326000002) ──
order_date date nullable — when user placed the order
ship_date date nullable — when tracking notification received
received_date date nullable — when slime physically arrived
days_to_ship integer GENERATED STORED — ship_date - order_date
days_to_receive integer GENERATED STORED — received_date - order_date
── Slime-level ratings (1–5 each, all nullable) ──
rating_texture | rating_scent | rating_sound | rating_drizzle |
rating_creativity | rating_sensory_fit | rating_overall
Purpose: Core log entry — the spreadsheet replacement. Every slime a
user has tried, owns, or wants. Allows free-form entry before
catalog match. Drives all slime and brand shipping aggregates.

brand_ratings
PK: id (uuid)
FK: user_id → profiles(id)
FK: brand_id → brands(id)
UK: (user_id, brand_id)
COL: rating_shipping (smallint 1–5)
COL: rating_customer_service (smallint 1–5)
Purpose: Per-user, per-brand shipping and CS ratings. Separate from
slime ratings per taxonomy design note. Aggregates roll up to
brands.avg_shipping and avg_customer_service via trigger.

follows
PK: (follower_id, following_id)
FK: follower_id → profiles(id)
FK: following_id → profiles(id)
CHK: no self-follow
Purpose: User-to-user follow graph. Powers social feed fanout.

brand_follows
PK: (user_id, brand_id)
FK: user_id → profiles(id)
FK: brand_id → brands(id)
Purpose: Users following brands for drop alerts and notification fanout.

drops
PK: id (uuid)
FK: brand_id → brands(id)
FK: announced_by → profiles(id)
COL: status (drop_status enum)
COL: drop_at (timestamptz, nullable = TBA)
Purpose: Brand drop announcements. Drives drop tracker,
upcoming_drops view, and notification queue.

drop_slimes
PK: (drop_id, slime_id)
FK: drop_id → drops(id)
FK: slime_id → slimes(id)
Purpose: Junction — which slime products are included in a given drop.

activity_feed
PK: id (uuid)
FK: actor_id → profiles(id)
FK: log_id / slime_id / brand_id / drop_id / target_user_id (nullable)
COL: activity_type enum
COL: metadata (jsonb)
Purpose: Denormalized event stream. Service-role-only insert. Indexed
on (actor_id, created_at desc) for feed queries.

log_likes
PK: (user_id, log_id)
FK: user_id → profiles(id)
FK: log_id → collection_logs(id)
Purpose: Like relationships on collection log entries.

log_comments
PK: id (uuid)
FK: log_id → collection_logs(id)
FK: user_id → profiles(id)
CHK: body length 1–1000 chars
Purpose: Comments on collection log entries. RLS allows reads only on
public logs.

notifications
PK: id (uuid)
FK: recipient_id → profiles(id)
FK: actor_id / log_id / drop_id / brand_id (nullable)
COL: notification_type enum
COL: is_read (boolean)
Purpose: Per-user notification inbox. Drop alerts, follows, likes,
comments. Service-role-only insert. Indexed on
(recipient_id, is_read, created_at desc).

slime_type_reference
PK: slime_type (slime_type enum)
COL: display_name, made_with, key_characteristics,
what_to_rate, sort_order
Purpose: Static lookup seeded with all 16 types. Powers the in-app
Slime Guide and onboarding flow. Publicly readable, no client
writes.

─────────────────────────────────────────────────────────────────────────────
VIEWS (4)
─────────────────────────────────────────────────────────────────────────────

pro
