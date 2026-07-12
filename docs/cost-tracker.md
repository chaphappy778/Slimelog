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

## Retired / resolved

*(none yet)*
