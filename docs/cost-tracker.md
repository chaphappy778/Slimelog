# SlimeLog — Cost / Scale Tracker

Living log of query patterns, third-party service costs, and workloads that
scale non-linearly with users. The goal is to spot 10x / 100x cliffs before
they hit and know exactly which switch to flip when they do.

**Categories**

- **DB Query** — cost per row or per aggregate; watch for un-indexed scans
- **Storage** — Supabase Storage (images, logos), CDN egress
- **API** — third-party APIs we call (Stripe, PostHog, resend, etc.)
- **Compute** — Vercel functions, edge middleware, background jobs
- **Model** — Anthropic API usage (drafting, moderation, image analysis)

Each entry: **current cost / behavior**, **what makes it grow**, **mitigation
if it starts to hurt**. Keep entries short. Move to "Retired" when we've
implemented mitigation and the concern is gone.

---

## Active watch items

### 2026-07-11 — Leaderboard per-brand aggregation (DB Query)

**Query:** `SELECT user_id, COUNT(*) FROM collection_logs WHERE brand_name_raw ILIKE $1 GROUP BY user_id ORDER BY count DESC LIMIT 20`. Runs once per page load per selected brand.

**Time-window variant:** adds `AND created_at >= NOW() - INTERVAL '1 month'` — same shape, slightly higher scan cost since more of the table is under `created_at` scan.

**Current cost:** trivial at our scale (~hundreds of logs total across ~30 brands). One indexed group-by returns in < 20ms.

**What makes it grow:** users × logs-per-user × brands-viewed-per-session. At ~10k users × 30 logs × 5 brand views = 1.5M group operations per session, minus caching hits. Still fine at that scale on a b-tree index. Trouble starts around 100k+ users if the index on `brand_name_raw` isn't good enough or we want windowed rankings across long periods.

**Mitigation path (order of preference):**

1. **Add composite index** on `collection_logs(brand_name_raw, user_id)` if not already present. Cheap and covers this exact query.
2. **In-memory cache per-brand for 60s** at the route handler layer. The leaderboard changes at human speed — nobody needs to see rank shifts to the second.
3. **Materialized view refreshed hourly** — `leaderboard_by_brand(brand_name_raw, user_id, count, rank)`. Only if per-request cost becomes visible.
4. **Full aggregation table with triggers** on collection_logs insert/delete. Overkill until we have many thousands of active users daily.

**Related:** T107 (biggest galaxies leaderboard). Related doc: `docs/error-tracker.md` for what to watch if the query starts erroring.

---

### 2026-07-12 — Marketplace waitlist position calc (DB Query)

**Query:** `SELECT COUNT(*) FROM marketplace_waitlist WHERE created_at <= (my_row.created_at)` plus a bare `COUNT(*)` for the community total. Runs on every POST to `/api/marketplace/waitlist` and every GET to `/api/marketplace/waitlist/position` (mount of `/marketplace`).

**Current cost:** trivial pre-launch. Table starts at zero rows; even at ~1k entries the indexed `created_at` btree scan is sub-millisecond.

**What makes it grow:** each call is O(N) over the waitlist. N doubles every time we do a growth push. Real cliff around 10k+ entries + heavy mount rate (every /marketplace visit triggers the GET) — a viral moment could turn this into a per-request table scan.

**Mitigation path (order of preference):**

1. **Cache the total** at the route-handler layer with a 60s TTL. Position is user-specific but total is not, and the total dominates when the table gets big.
2. **Materialize a position column** on the row itself, set at insert time as `SELECT COUNT(*) + 1 FROM marketplace_waitlist`. Reads are O(1) forever. Insert becomes O(N) once, then O(1) reads — better tradeoff at scale.
3. **Rank view** — materialized `marketplace_waitlist_ranked(user_id, position)` refreshed hourly or on insert via trigger. Overkill until we're past 10k entries with meaningful traffic.

**Related:** T113 (Marketplace Coming Soon page).

---

### 2026-07-13 — Discover axis-sort query (DB Query)

**Query:** `SELECT ... FROM slimes WHERE avg_<axis> IS NOT NULL AND total_ratings >= 3 ORDER BY avg_<axis> DESC, total_ratings DESC LIMIT 20`. Runs on every GET to `/discover?sort=<axis>` where axis is texture/sound/aesthetic/creativity/quality/overall.

**Current cost:** trivial pre-launch. `slimes` currently has hundreds of rows; even a full sequential scan is sub-millisecond. Six possible sort columns means six possible query plans.

**What makes it grow:** table size × sort-column selectivity. When `slimes` gets into the tens of thousands with real rating volume, an unindexed `ORDER BY avg_<axis> DESC LIMIT 20` will need to scan and heap-sort. The `avg_overall` path was the only one covered by prior planning; the five new axis columns (texture/sound/drizzle/creativity/sensory_fit) are unindexed.

**Mitigation path (order of preference):**

1. **Add btree indexes on `(avg_texture, total_ratings DESC)` and equivalents for the other four axes**, all `WHERE avg_<axis> IS NOT NULL` to keep them narrow. Five small indexes. Cheap.
2. **Cache the top-20-by-axis result** at the route-handler layer with a 60s TTL, keyed on `axis`. Leaderboard-shaped data changes at human speed.
3. **Materialized view `top_slimes_by_axis(axis, rank, slime_id, avg)`** refreshed hourly. Overkill until table size makes option 1 insufficient.

**Related:** T32f (how-to-rate deep-link wiring). Related doc: `docs/error-tracker.md` for the migration-lag pattern if we add indexes without shipping migration first.

---

### 2026-07-13 — Discover V1 pulse feed (DB Query)

**Query:** `SELECT created_at, slimes(base_type) FROM collection_logs WHERE created_at >= now() - interval '8 days'`. Runs on every mount of `/discover`.

**Current cost:** trivial pre-launch. `collection_logs` is small; 8 days of activity is likely under a few hundred rows total during the seed period. Server-side JS aggregation into today count + 7-day sparkline + top climbing base types is O(rows).

**What makes it grow:** unbounded row count over the 8-day window. Once we hit meaningful DAU (~500+ users each logging ~1/day = 4,000 rows over 8 days), the mount-time cost stays sub-100ms but climbs into visible territory. At ~5,000 DAU logging heavily, this becomes the biggest per-mount query on the site.

**Mitigation path (order of preference):**

1. **Cache the pulse payload at the route-handler layer with a 60s TTL** — logs today ticks up on a minute cadence, not per-tap. Single most impactful lever.
2. **Materialized rollup `discover_pulse_daily(day, total_logs, base_type_counts jsonb)`** refreshed hourly by a trigger on `collection_logs`. Reads become O(8). Overkill until per-request cost becomes visible.
3. **Streaming counter (`INCR` on Redis or similar)** — rethink territory, requires infra.

**Related:** Discover V1 (Trending pulse). Related doc: `docs/error-tracker.md` for what to watch if aggregation errors.

---

### 2026-07-13 — Discover V1 per-type slime counts (DB Query)

**Query:** `SELECT base_type FROM slimes WHERE base_type IS NOT NULL`. Runs on every mount of `/discover`. Aggregated JS-side into a `Record<baseType, count>` for the `TypeCarousel` cards.

**Current cost:** trivial. `slimes` is small pre-launch (hundreds of rows); the query returns only the `base_type` column.

**What makes it grow:** unbounded row count. At 100k slimes we're pulling 100k tiny rows every mount. Not slow, but wasteful.

**Mitigation path (order of preference):**

1. **Materialized view `slimes_by_base_type(base_type, slime_count)`** refreshed on `slimes` insert/update via trigger. Reads become O(20) rows. Cheapest long-term win — sits right next to the axis-index materialized view we'd add for T32f.
2. **Cache the counts at the route-handler layer** with a 5-minute TTL. Counts don't change every second.
3. **RPC `get_slime_counts_by_base_type()`** that returns pre-aggregated pairs. Server-side aggregation drops payload size 100×.

**Related:** T33 (Discover V1 gap-fill, TypeCarousel).

---

### 2026-07-13 — Discover V1 collector enrichment (DB Query)

**Query:** `SELECT user_id, rating_overall, slimes(base_type) FROM collection_logs WHERE user_id = ANY(:popularUserIds)`. Runs on every mount of `/discover` (when there are popular users).

**Current cost:** trivial. 12 popular users × O(50) shelf logs each = ~600 rows aggregated in JS into per-user favorite base type + slime count + avg rating given. Sub-millisecond.

**What makes it grow:** linear in (popular users count) × (average shelf size). We cap popular users at 12; the shelf size is user-controlled. Power collector at 5,000+ logs alone eats the query budget. Realistic ceiling: 12 × 500 = 6,000 rows, still fine but no longer sub-millisecond.

**Mitigation path (order of preference):**

1. **Persist the aggregate on `profiles_public`** as materialized columns (`favorite_base_type`, `slime_count`, `avg_rating_given`), updated by a trigger on `collection_logs` insert/update/delete. Reads become O(1). Cheapest long-term win.
2. **Cache the enrichment at the route-handler layer** with a 5-minute TTL keyed on the popular-user-id set. Popular users churn slowly.
3. **Alternative approach: an RPC / view (`profile_shelf_stats`)** that aggregates on the server side and returns one row per user. Reduces payload size to the browser.

**Related:** Discover V1 (Popular Collectors specialty line).

---

## Retired / resolved

*(none yet)*
