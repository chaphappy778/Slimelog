-- Adds subscription_current_period_end + subscription_cancel_at_period_end to profiles and brands
-- Powers the "Renews Apr 16, 2027" / "Ends Apr 16, 2027" display on the subscription card

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false;