SlimeLog — Database Schema Reference Card
Migration: 20260324000001_slimelog_initial_schema.sql · Postgres via Supabase · v1.0 · March 2026
ENUMS
ENUM NAME
VALUES · PURPOSE
slime_type
16-type taxonomy (Jennifer, CMO). Used as enum column on slimes and collection_logs.
butter | clear | cloud | icee | fluffy | floam | snow_fizz | thick_and_glossy | jelly | beaded | clay | cloud_cream | magnetic | thermochromic | avalanche | slay
activity_type
Event kinds written to activity_feed.
log_created | rating_added | wishlist_added | collection_added | drop_announced | drop_live | drop_sold_out | user_followed
notification_type
Notification inbox categories.
drop_announced | drop_live | drop_sold_out | new_follower | friend_log | friend_rating | comment_on_log | like_on_log
drop_status
Drop lifecycle state on the drops table.
announced | live | sold_out | restocked | cancelled

TABLES (13)
TABLE
PK / FK / KEY COLUMNS
PURPOSE
profiles
PK: id (uuid) → auth.users(id)
UK: username
1-to-1 extension of auth.users. Community profile: username, avatar, bio, premium/verified flags. Auto-created on signup via trigger.
brands
PK: id (uuid)
UK: slug
FK: owner*id → profiles(id)
Brand/maker catalog. Holds shop URLs, social handles, verification badge, and rolling avg_shipping / avg_customer_service aggregates. 8 founding brands seeded.
slimes
PK: id (uuid)
FK: brand_id → brands(id)
FK: created_by → profiles(id)
COL: slime_type (slime_type enum)
Slime product catalog. One row per distinct product. Stores colors[], scent, collection_name, is_limited. Maintains 7 rolling avg*\* rating columns via trigger.
collection_logs
PK: id (uuid)
FK: user_id → profiles(id)
FK: slime_id → slimes(id) (nullable)
FK: brand_id → brands(id) (nullable)
COL: slime_type (slime_type enum)
COL: rating_texture/scent/sound/
drizzle/creativity/sensory_fit/
overall (smallint 1-5 each)
Core log entry — the spreadsheet replacement. Tracks every slime a user has tried, owns, or wants. Allows free-form entry (brand_name_raw) before catalog match. Drives all slime rating aggregates.
brand_ratings
PK: id (uuid)
FK: user_id → profiles(id)
FK: brand_id → brands(id)
UK: (user_id, brand_id)
COL: rating_shipping (1-5)
COL: rating_customer_service (1-5)
Per-user, per-brand shipping and CS ratings. Separate from slime ratings per taxonomy design note. Aggregates roll up to brands.avg_shipping and avg_customer_service via trigger.
follows
PK: (follower_id, following_id)
FK: follower_id → profiles(id)
FK: following_id → profiles(id)
CHK: no self-follow
User-to-user follow graph. Powers the social feed fanout and follower counts view.
brand_follows
PK: (user_id, brand_id)
FK: user_id → profiles(id)
FK: brand_id → brands(id)
Users following brands. Source of truth for drop notification fanout.
drops
PK: id (uuid)
FK: brand_id → brands(id)
FK: announced_by → profiles(id)
COL: status (drop_status enum)
COL: drop_at (timestamptz, nullable=TBA)
Brand drop announcements. Drives drop tracker, upcoming_drops view, and notification queue. Brand owners manage via RLS policy.
drop_slimes
PK: (drop_id, slime_id)
FK: drop_id → drops(id)
FK: slime_id → slimes(id)
Junction: which slime products are included in a given drop.
activity_feed
PK: id (uuid)
FK: actor_id → profiles(id)
FK: log_id / slime_id / brand_id / drop_id / target_user_id (nullable)
COL: activity_type enum
COL: metadata (jsonb)
Denormalized event stream. One row per social action. Service-role-only insert. Indexed on (actor_id, created_at desc) for feed queries.
log_likes
PK: (user_id, log_id)
FK: user_id → profiles(id)
FK: log_id → collection_logs(id)
Like relationships on collection log entries.
log_comments
PK: id (uuid)
FK: log_id → collection_logs(id)
FK: user_id → profiles(id)
CHK: body length 1–1000 chars
Comments on collection log entries. RLS allows reads only on public logs.
notifications
PK: id (uuid)
FK: recipient_id → profiles(id)
FK: actor_id / log_id / drop_id / brand_id (nullable)
COL: notification_type enum
COL: is_read (bool)
Per-user notification inbox. Drop alerts, follows, likes, comments. Service-role-only insert. Indexed on (recipient_id, is_read, created_at desc).
slime_type_reference
PK: slime_type (slime_type enum)
COL: display_name, made_with,
key_characteristics,
what_to_rate, sort_order
Static lookup seeded with all 16 types. Powers the in-app Slime Guide / onboarding flow. Publicly readable, no writes from clients.

VIEWS (4)
VIEW NAME
PURPOSE
profile*follow_counts
follower_count, following_count, brand_follow_count per user. Join-free convenience for profile UI.
user_collection_summary
total_in_collection, total_in_wishlist, total_rated, avg_overall_given, distinct_brands_tried, distinct_types_tried per user. Drives profile stats widget.
top_rated_slimes
Leaderboard: slimes with ≥3 ratings ordered by avg_overall desc. Includes brand name, all avg*\* columns. Powers discovery/explore feed.
upcoming_drops
All drops with status IN (announced, live), ordered by drop_at asc. Includes brand logo, follower_count. Drives the drop tracker screen.

FUNCTIONS & TRIGGERS
NAME
WHAT IT DOES
set*updated_at()
BEFORE UPDATE trigger function. Sets updated_at = now() on profiles, brands, slimes, collection_logs, brand_ratings, drops, log_comments.
refresh_slime_rating_averages()
AFTER INSERT/UPDATE/DELETE on collection_logs. Recomputes all 7 avg*\* columns and total*ratings on the affected slimes row. SECURITY DEFINER.
refresh_brand_rating_averages()
AFTER INSERT/UPDATE/DELETE on brand_ratings. Recomputes avg_shipping, avg_customer_service, total_brand_ratings on the affected brands row. SECURITY DEFINER.
handle_new_user()
AFTER INSERT on auth.users. Auto-inserts a profiles row using raw_user_meta_data (username, full_name, avatar_url). Fallback username = "user*" + first 8 chars of UUID. SECURITY DEFINER.

KEY DESIGN DECISIONS
DECISION
RATIONALE
Shipping/CS ratings on brand_ratings, not collection_logs
Taxonomy §2.2 design note: brand-level experience is independent of individual slime quality. Surface as separate brand-level averages in UI.
collection_logs allows free-form entry (brand_name_raw, slime_name)
Zero-friction logging — user can record a haul immediately before the brand or product exists in the catalog. Link to catalog records later.
Rating aggregates stored as columns, maintained by triggers
Avoids expensive GROUP BY on every leaderboard/detail page query. Trade-off: trigger overhead on writes, which is acceptable at slime-community scale.
activity_feed is service-role insert only
Feed events are written by server-side functions (Edge Functions / webhooks), never directly by clients. Prevents feed spam and manipulation.
8 founding brand UUIDs are deterministic (b1000000-...)
Safe to reference in future migrations, fixtures, and seed scripts without a lookup query. Expand brand list per Jennifer before beta launch.

SlimeLog Schema Reference Card · Migration 20260324000001 · Taxonomy v1.0 authored by Jennifer, CMO · Confidential
