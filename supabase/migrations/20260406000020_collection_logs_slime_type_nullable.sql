-- Migration: 20260406000020_collection_logs_slime_type_nullable
-- Table altered: collection_logs
-- Column changed: slime_type — removed NOT NULL constraint
-- Reason: Wishlist entries do not require a slime type since the user
-- may not know the type when adding to wishlist from the feed

ALTER TABLE public.collection_logs
  ALTER COLUMN slime_type DROP NOT NULL;