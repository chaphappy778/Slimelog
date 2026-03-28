-- =============================================================================
-- SlimeLog — Expanded Brand Catalog
-- File:    20260329000008_brand_catalog_expanded.sql
-- Purpose: Insert 48 new community brands b013–b060.
-- UUID range: b1000000-0000-0000-0000-000000000013
--          to b1000000-0000-0000-0000-000000000060
-- Idempotent: ON CONFLICT (id) DO NOTHING on all rows.
-- Depends:  20260324000001_slimelog_initial_schema.sql
--           20260328000005_brand_seed_expanded.sql
-- Notes:
--   · All new brands use verification_tier = 'community' (not yet manually
--     verified). Founding brands b001–b012 use 'verified'.
--   · b038 "Colour Slime" (US) and b060 "Colour Slime" (AU) share a name.
--     Slugs are differentiated as 'colour-slime-us' and 'colour-slime-au'
--     to satisfy the unique constraint on brands.slug.
--   · b053 slug uses brand name "Babycat Slimes NL" → 'babycat-slimes-nl'
--     to avoid collision with any future AU/UK babycat entry.
--   · Known shipping restrictions stored in description field (no dedicated
--     column yet): Mythical Mushbunny, Good Vibes, Rosie Cheeks, Chappy,
--     Rogue Slimes, Tanooki.
--   · Count is 48 brands (b013–b060), not ~40 as originally estimated.
-- =============================================================================


insert into public.brands
  ( id, slug, name,
    website_url, shop_url,
    instagram_handle, tiktok_handle,
    location, country_code,
    restock_schedule, description,
    is_verified, is_active, verification_tier )
values

  -- ── UNITED STATES ─────────────────────────────────────────────────────────

  -- b013 — Potcha Slimes  (CA — artisan clay sculpture, Asian-owned since 2018)
  (
    'b1000000-0000-0000-0000-000000000013'::uuid,
    'potcha-slimes', 'Potcha Slimes',
    'https://potchaslimes.com', null,
    'potchaslimes', null,
    null, 'US',
    null, 'Artisan clay sculpture slimes. Asian-owned, founded 2018.',
    true, true, 'community'
  ),

  -- b014 — Tanooki Slimes  (Vancouver BC, Canada — cloud, butter, clear)
  -- NOTE: listed under US brands in brief but location is Vancouver BC.
  -- country_code set to CA to match actual location.
  (
    'b1000000-0000-0000-0000-000000000014'::uuid,
    'tanooki-slimes', 'Tanooki Slimes',
    'https://tanookislimes.com', null,
    null, null,
    'Vancouver, BC', 'CA',
    null, 'Specialises in cloud, butter, and clear slimes. Ships Canada/US.',
    true, true, 'community'
  ),

  -- b015 — Palmetto Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000015'::uuid,
    'palmetto-slimes', 'Palmetto Slimes',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b016 — Dream Glow Slimes  (US — scented, anxiety relief focus)
  (
    'b1000000-0000-0000-0000-000000000016'::uuid,
    'dream-glow-slimes', 'Dream Glow Slimes',
    'https://dreamglowslime.com', null,
    null, null,
    null, 'US',
    null, 'Scented slimes with an anxiety-relief and wellness focus.',
    true, true, 'community'
  ),

  -- b017 — Slime Shady  (US)
  (
    'b1000000-0000-0000-0000-000000000017'::uuid,
    'slime-shady', 'Slime Shady',
    'https://slimeshadystore.com', null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b018 — Corn With Slime  (US — @cornwithslime)
  (
    'b1000000-0000-0000-0000-000000000018'::uuid,
    'corn-with-slime', 'Corn With Slime',
    'https://cornwithslime.com', null,
    'cornwithslime', null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b019 — Parakeet Slimes  (US — creator: Marisa Gannon, therapeutic focus)
  (
    'b1000000-0000-0000-0000-000000000019'::uuid,
    'parakeet-slimes', 'Parakeet Slimes',
    'https://parakeetslimesshop.com', null,
    null, null,
    null, 'US',
    null, 'Created by Marisa Gannon. Therapeutic and sensory-focused slimes.',
    true, true, 'community'
  ),

  -- b020 — Sparkle Nanny Slime  (US — custom artisan slimes)
  (
    'b1000000-0000-0000-0000-000000000020'::uuid,
    'sparkle-nanny-slime', 'Sparkle Nanny Slime',
    'https://sparklenannyslimeco.com', null,
    null, null,
    null, 'US',
    null, 'Custom artisan slimes.',
    true, true, 'community'
  ),

  -- b021 — Tangie Slimes  (US — Indiana, food-themed)
  (
    'b1000000-0000-0000-0000-000000000021'::uuid,
    'tangie-slimes', 'Tangie Slimes',
    'https://tangieslimes.com', null,
    null, null,
    'Indiana', 'US',
    null, 'Indiana-based. Known for food-themed slimes.',
    true, true, 'community'
  ),

  -- b022 — Bleu Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000022'::uuid,
    'bleu-slimes', 'Bleu Slimes',
    'https://bleuslimes.com', null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b023 — Slister Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000023'::uuid,
    'slister-slimes', 'Slister Slimes',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b024 — Lime Slimes Co  (US)
  (
    'b1000000-0000-0000-0000-000000000024'::uuid,
    'lime-slimes-co', 'Lime Slimes Co',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b025 — Mythical Mushbunny Slimes  (US — no international shipping)
  (
    'b1000000-0000-0000-0000-000000000025'::uuid,
    'mythical-mushbunny-slimes', 'Mythical Mushbunny Slimes',
    null, null,
    null, null,
    null, 'US',
    null, 'Domestic US shipping only. No international orders.',
    true, true, 'community'
  ),

  -- b026 — Blushing BB Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000026'::uuid,
    'blushing-bb-slimes', 'Blushing BB Slimes',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b027 — Sliimey Honey  (US)
  (
    'b1000000-0000-0000-0000-000000000027'::uuid,
    'sliimey-honey', 'Sliimey Honey',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b028 — Slime Community  (US)
  (
    'b1000000-0000-0000-0000-000000000028'::uuid,
    'slime-community', 'Slime Community',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b029 — Pixiegloop  (US)
  (
    'b1000000-0000-0000-0000-000000000029'::uuid,
    'pixiegloop', 'Pixiegloop',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b030 — Pink Sugar Slimey  (US)
  (
    'b1000000-0000-0000-0000-000000000030'::uuid,
    'pink-sugar-slimey', 'Pink Sugar Slimey',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b031 — Prismatic Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000031'::uuid,
    'prismatic-slimes', 'Prismatic Slimes',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b032 — Los Angeles Slime Company  (US)
  (
    'b1000000-0000-0000-0000-000000000032'::uuid,
    'los-angeles-slime-company', 'Los Angeles Slime Company',
    null, null,
    null, null,
    'Los Angeles, CA', 'US',
    null, null,
    true, true, 'community'
  ),

  -- b033 — The Slime Labs  (US)
  (
    'b1000000-0000-0000-0000-000000000033'::uuid,
    'the-slime-labs', 'The Slime Labs',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b034 — Snoop Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000034'::uuid,
    'snoop-slimes', 'Snoop Slimes',
    'https://snoopslimes.co', null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b035 — Sloomoo Slime  (US — physical retail + online)
  (
    'b1000000-0000-0000-0000-000000000035'::uuid,
    'sloomoo-slime', 'Sloomoo Slime',
    null, null,
    null, null,
    null, 'US',
    null, 'Physical retail locations and online store.',
    true, true, 'community'
  ),

  -- b036 — East Bay Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000036'::uuid,
    'east-bay-slimes', 'East Bay Slimes',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b037 — The Chaos Shop  (US)
  (
    'b1000000-0000-0000-0000-000000000037'::uuid,
    'the-chaos-shop', 'The Chaos Shop',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b038 — Colour Slime  (US)
  -- Slug differentiated from b060 AU entry: 'colour-slime-us'
  (
    'b1000000-0000-0000-0000-000000000038'::uuid,
    'colour-slime-us', 'Colour Slime',
    'https://colourslime.com', null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b039 — Good Vibes Slimes  (US — no international shipping)
  (
    'b1000000-0000-0000-0000-000000000039'::uuid,
    'good-vibes-slimes', 'Good Vibes Slimes',
    null, null,
    null, null,
    null, 'US',
    null, 'Domestic US shipping only. No international orders.',
    true, true, 'community'
  ),

  -- b040 — Flying Monkey Slimes  (US)
  (
    'b1000000-0000-0000-0000-000000000040'::uuid,
    'flying-monkey-slimes', 'Flying Monkey Slimes',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b041 — Rodem Slime Shop  (US)
  (
    'b1000000-0000-0000-0000-000000000041'::uuid,
    'rodem-slime-shop', 'Rodem Slime Shop',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b042 — Cat's Craft  (US)
  (
    'b1000000-0000-0000-0000-000000000042'::uuid,
    'cats-craft', 'Cat''s Craft',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- b043 — Slime by Kataleya  (US)
  (
    'b1000000-0000-0000-0000-000000000043'::uuid,
    'slime-by-kataleya', 'Slime by Kataleya',
    null, null,
    null, null,
    null, 'US',
    null, null,
    true, true, 'community'
  ),

  -- ── SOUTH KOREA ───────────────────────────────────────────────────────────

  -- b044 — Seoul Gage  (KR — Korean slime marketplace/hub, global shipping)
  (
    'b1000000-0000-0000-0000-000000000044'::uuid,
    'seoul-gage', 'Seoul Gage',
    'https://seoulgage.com', null,
    null, null,
    'Seoul', 'KR',
    null, 'Korean slime marketplace and community hub. Ships globally.',
    true, true, 'community'
  ),

  -- ── CANADA ────────────────────────────────────────────────────────────────

  -- b045 — Rogue Slimes  (CA — ships Canada/US only)
  (
    'b1000000-0000-0000-0000-000000000045'::uuid,
    'rogue-slimes', 'Rogue Slimes',
    null, null,
    null, null,
    null, 'CA',
    null, 'Ships Canada and US only.',
    true, true, 'community'
  ),

  -- b046 — Squeezy Magic Slime  (CA)
  (
    'b1000000-0000-0000-0000-000000000046'::uuid,
    'squeezy-magic-slime', 'Squeezy Magic Slime',
    null, null,
    null, null,
    null, 'CA',
    null, null,
    true, true, 'community'
  ),

  -- ── UNITED KINGDOM ────────────────────────────────────────────────────────

  -- b047 — LK Slime  (GB)
  (
    'b1000000-0000-0000-0000-000000000047'::uuid,
    'lk-slime', 'LK Slime',
    null, null,
    null, null,
    null, 'GB',
    null, null,
    true, true, 'community'
  ),

  -- b048 — Emma Bee Slimes  (GB)
  (
    'b1000000-0000-0000-0000-000000000048'::uuid,
    'emma-bee-slimes', 'Emma Bee Slimes',
    null, null,
    null, null,
    null, 'GB',
    null, null,
    true, true, 'community'
  ),

  -- b049 — Slimer Climber  (GB)
  (
    'b1000000-0000-0000-0000-000000000049'::uuid,
    'slimer-climber', 'Slimer Climber',
    null, null,
    null, null,
    null, 'GB',
    null, null,
    true, true, 'community'
  ),

  -- b050 — The Slime Atelier Co  (GB)
  (
    'b1000000-0000-0000-0000-000000000050'::uuid,
    'the-slime-atelier-co', 'The Slime Atelier Co',
    null, null,
    null, null,
    null, 'GB',
    null, null,
    true, true, 'community'
  ),

  -- b051 — Rosie Cheeks Slime Shop  (GB — ships UK only)
  (
    'b1000000-0000-0000-0000-000000000051'::uuid,
    'rosie-cheeks-slime-shop', 'Rosie Cheeks Slime Shop',
    null, null,
    null, null,
    null, 'GB',
    null, 'Ships UK only.',
    true, true, 'community'
  ),

  -- ── OTHER INTERNATIONAL ───────────────────────────────────────────────────

  -- b052 — Chappy Slimes  (NZ — paused US shipping)
  (
    'b1000000-0000-0000-0000-000000000052'::uuid,
    'chappy-slimes', 'Chappy Slimes',
    null, null,
    null, null,
    null, 'NZ',
    null, 'Based in New Zealand. US shipping currently paused.',
    true, true, 'community'
  ),

  -- b053 — Babycat Slimes NL  (NL — Netherlands)
  (
    'b1000000-0000-0000-0000-000000000053'::uuid,
    'babycat-slimes-nl', 'Babycat Slimes NL',
    null, null,
    null, null,
    null, 'NL',
    null, null,
    true, true, 'community'
  ),

  -- b054 — Slime Aficionados  (HU — Hungary)
  (
    'b1000000-0000-0000-0000-000000000054'::uuid,
    'slime-aficionados', 'Slime Aficionados',
    null, null,
    null, null,
    null, 'HU',
    null, null,
    true, true, 'community'
  ),

  -- b055 — GT Creation Slime  (IT — Italy)
  (
    'b1000000-0000-0000-0000-000000000055'::uuid,
    'gt-creation-slime', 'GT Creation Slime',
    null, null,
    null, null,
    null, 'IT',
    null, null,
    true, true, 'community'
  ),

  -- b056 — Mush Slime  (ZA — South Africa)
  (
    'b1000000-0000-0000-0000-000000000056'::uuid,
    'mush-slime', 'Mush Slime',
    null, null,
    null, null,
    null, 'ZA',
    null, null,
    true, true, 'community'
  ),

  -- b057 — Chia Slime Shop  (PL — Poland)
  (
    'b1000000-0000-0000-0000-000000000057'::uuid,
    'chia-slime-shop', 'Chia Slime Shop',
    null, null,
    null, null,
    null, 'PL',
    null, null,
    true, true, 'community'
  ),

  -- b058 — Slime Banshee  (IE — Ireland)
  (
    'b1000000-0000-0000-0000-000000000058'::uuid,
    'slime-banshee', 'Slime Banshee',
    null, null,
    null, null,
    null, 'IE',
    null, null,
    true, true, 'community'
  ),

  -- b059 — On Cloud Slime  (AU — Australia)
  (
    'b1000000-0000-0000-0000-000000000059'::uuid,
    'on-cloud-slime', 'On Cloud Slime',
    null, null,
    null, null,
    null, 'AU',
    null, null,
    true, true, 'community'
  ),

  -- b060 — Colour Slime  (AU — Australia)
  -- Slug differentiated from b038 US entry: 'colour-slime-au'
  (
    'b1000000-0000-0000-0000-000000000060'::uuid,
    'colour-slime-au', 'Colour Slime',
    null, null,
    null, null,
    null, 'AU',
    null, null,
    true, true, 'community'
  )

on conflict (id) do nothing;


-- =============================================================================
-- END OF MIGRATION
-- =============================================================================