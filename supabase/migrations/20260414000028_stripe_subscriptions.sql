-- supabase/migrations/20260414000028_stripe_subscriptions.sql
-- Adds stripe_customer_id, subscription_tier, subscription_status to profiles and brands

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'pro')),
  ADD COLUMN IF NOT EXISTS subscription_status text
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', null));

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free'
    CHECK (subscription_tier IN ('free', 'brand_pro')),
  ADD COLUMN IF NOT EXISTS subscription_status text
    CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing', null));