-- Add purchase price and currency fields to collection_logs
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
ALTER TABLE collection_logs ADD COLUMN IF NOT EXISTS purchase_currency TEXT DEFAULT 'USD';