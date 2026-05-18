-- adds drop_type, discount_code, free_shipping_threshold to drops
-- adds per-slime detail fields to drop_slimes
-- adds banner_url to brands

CREATE TYPE drop_type_enum AS ENUM ('new_drop', 'restock');

ALTER TABLE drops
  ADD COLUMN IF NOT EXISTS drop_type drop_type_enum NOT NULL DEFAULT 'new_drop',
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric;

ALTER TABLE drop_slimes
  ALTER COLUMN slime_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS base_type slime_base_type,
  ADD COLUMN IF NOT EXISTS price numeric,
  ADD COLUMN IF NOT EXISTS scent_notes text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS banner_url text;

