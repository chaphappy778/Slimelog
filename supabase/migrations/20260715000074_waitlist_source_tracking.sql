-- 20260715000074_waitlist_source_tracking.sql
-- [Side quest 2026-07-15] Waitlist attribution capture for paid promo + giveaways.
--
-- Adds two attribution vectors to public.waitlist:
--   (1) heard_from        — self-reported picker value from the /waitlist form
--                           ("Instagram", "TikTok", "Friend or family", ...)
--   (2) utm_source /
--       utm_medium /
--       utm_campaign /
--       utm_content /
--       utm_term          — auto-captured from URL query params when present.
--                           Paid ad creatives and campaign links carry these;
--                           organic traffic and DM shares usually don't.
--
-- Both vectors are optional. When the form doesn't collect and the URL
-- doesn't carry UTMs, all six columns stay NULL — signup still succeeds.
-- The pre-existing `source` column ("landing_page" default) is kept for
-- backward compat with rows written before this migration.
--
-- The heard_from column is expected to hold one of a small enum-like set
-- managed at the frontend (see the design brief in
-- docs/handoffs/2026-07-15-waitlist-source-capture-brief.md). We deliberately
-- do NOT enforce a CHECK constraint here because the picker options will
-- evolve (adding TikTok Live, Podcast interview, giveaway partner names,
-- etc.) and we do not want option changes to require migrations. Frontend +
-- API validate the value against a shared allowlist instead.

alter table public.waitlist
  add column if not exists heard_from    text null,
  add column if not exists utm_source    text null,
  add column if not exists utm_medium    text null,
  add column if not exists utm_campaign  text null,
  add column if not exists utm_content   text null,
  add column if not exists utm_term      text null;

comment on column public.waitlist.heard_from is
  'Self-reported acquisition source from the /waitlist form picker. Values managed by frontend allowlist (Instagram, TikTok, YouTube, Friend or family, Giveaway, Search, Other, plus free text via Other). No DB-level CHECK — allowlist evolves without migration.';
comment on column public.waitlist.utm_source is
  'Auto-captured from URL utm_source query param when present. Paid ad creatives carry this; organic DMs and story shares usually do not.';
comment on column public.waitlist.utm_medium is
  'Auto-captured from URL utm_medium query param.';
comment on column public.waitlist.utm_campaign is
  'Auto-captured from URL utm_campaign query param.';
comment on column public.waitlist.utm_content is
  'Auto-captured from URL utm_content query param — usually paid ad creative variant.';
comment on column public.waitlist.utm_term is
  'Auto-captured from URL utm_term query param — usually search keyword for paid search.';

-- Index heard_from so we can slice signups by acquisition channel on the
-- admin dashboard without a full table scan. Partial index skips NULLs since
-- most pre-migration rows will not have this set.
create index if not exists waitlist_heard_from_idx
  on public.waitlist (heard_from)
  where heard_from is not null;

-- Index utm_campaign for per-campaign attribution reporting (Instagram giveaway,
-- TikTok promo, specific ad spend push, etc.).
create index if not exists waitlist_utm_campaign_idx
  on public.waitlist (utm_campaign)
  where utm_campaign is not null;
