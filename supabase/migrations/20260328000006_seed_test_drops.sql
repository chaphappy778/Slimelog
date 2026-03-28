-- =============================================================================
-- apps/db/migrations/20260328000006_seed_test_drops.sql
-- Seed: 3 test drops with 9 slimes
-- Insert order: slimes → drops → drop_slimes
-- Idempotent via ON CONFLICT DO NOTHING
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SLIMES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO slimes (
  id,
  brand_id,
  name,
  slime_type,
  description,
  colors,
  scent,
  collection_name,
  retail_price,
  is_limited,
  is_discontinued
) VALUES

  -- Drop 1 · Peachybbbies · Sundae Funday
  (
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'Strawberry Shortcake',
    'butter',
    'A dreamy butter slime in soft pink and cream with a sweet strawberry shortcake scent',
    ARRAY['pink', 'cream'],
    'strawberry shortcake',
    'Sundae Funday',
    12.00,
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000002',
    'Mint Chip',
    'clear',
    'Crystal-clear base in cool mint and brown tones with a refreshing mint chocolate scent',
    ARRAY['mint', 'brown'],
    'mint chocolate',
    'Sundae Funday',
    13.00,
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000002',
    'Peach Melba',
    'cloud',
    'Fluffy cloud slime in warm peach and cream with a fresh peach scent',
    ARRAY['peach', 'cream'],
    'peach',
    'Sundae Funday',
    12.00,
    true,
    false
  ),

  -- Drop 2 · Pilot Slimes · Midnight Flight
  (
    'a1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000007',
    'Black Amber',
    'thick_and_glossy',
    'Intensely glossy deep ebony slime with a rich warm black amber and oud scent',
    ARRAY['black', 'amber'],
    'black amber',
    'Midnight Flight',
    14.00,
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000007',
    'Midnight Jasmine',
    'butter',
    'Velvety butter slime in deep purple and black with a heady night-blooming jasmine scent',
    ARRAY['deep purple', 'black'],
    'jasmine',
    'Midnight Flight',
    13.00,
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000007',
    'Smoked Vanilla',
    'cloud_cream',
    'Soft cloud cream in charcoal and cream swirls with a warm smoked vanilla bean scent',
    ARRAY['charcoal', 'cream'],
    'smoked vanilla',
    'Midnight Flight',
    13.00,
    true,
    false
  ),

  -- Drop 3 · Slime Sweet Pea · Garden Party
  (
    'a1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000005',
    'Lavender Honey',
    'jelly',
    'Translucent jelly slime in soft lavender and gold with a warm lavender honey scent',
    ARRAY['lavender', 'gold'],
    'lavender honey',
    'Garden Party',
    12.00,
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000008',
    'b1000000-0000-0000-0000-000000000005',
    'Rose Petal',
    'butter',
    'Silky butter slime in blush pink and rose with a fresh rose and peony scent',
    ARRAY['pink', 'rose'],
    'rose',
    'Garden Party',
    13.00,
    true,
    false
  ),
  (
    'a1000000-0000-0000-0000-000000000009',
    'b1000000-0000-0000-0000-000000000005',
    'Wildflower',
    'floam',
    'Pastel multi-color floam packed with foam beads and a fresh wildflower meadow scent',
    ARRAY['multi', 'wildflower'],
    'wildflower meadow',
    'Garden Party',
    14.00,
    true,
    false
  )

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. DROPS
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO drops (
  id,
  brand_id,
  name,
  description,
  drop_at,
  status,
  shop_url
) VALUES

  (
    'd0000001-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000002',
    'Sundae Funday',
    'A summer-themed drop featuring dessert-inspired scents and pastel colorways',
    now() + interval '2 days',
    'announced',
    'https://peachybbbies.com/drops/sundae-funday'
  ),
  (
    'd0000001-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000007',
    'Midnight Flight',
    'Dark moody colorways with deep scents — midnight jasmine, black amber, smoked vanilla',
    now(),
    'live',
    'https://pilotslimes.com/drops/midnight-flight'
  ),
  (
    'd0000001-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000005',
    'Garden Party',
    'Fresh floral scents and soft spring colors — like a walk through a blooming garden',
    now() + interval '5 days',
    'announced',
    'https://slimesweetpea.com/drops/garden-party'
  )

ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. DROP_SLIMES (pure junction — drop_id + slime_id only, no id column)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO drop_slimes (drop_id, slime_id) VALUES

  -- Sundae Funday
  ('d0000001-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001'),
  ('d0000001-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002'),
  ('d0000001-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003'),

  -- Midnight Flight
  ('d0000001-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004'),
  ('d0000001-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005'),
  ('d0000001-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006'),

  -- Garden Party
  ('d0000001-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000007'),
  ('d0000001-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000008'),
  ('d0000001-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000009')

ON CONFLICT DO NOTHING;