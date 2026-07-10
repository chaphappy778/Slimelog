-- 2026-07-10: onboarding walkthrough completion timestamp (tracker #31).
--
-- Adds profiles.onboarding_completed_at. Null = user hasn't seen (or
-- hasn't dismissed) the first-login walkthrough yet. Non-null = the
-- modal will never fire for this user again.
--
-- App code (OnboardingModal) reads this on mount and skips render if
-- set. Skip/Complete both stamp it to NOW() via a small API route so a
-- half-completed onboarding still counts as "seen" and doesn't re-fire.
--
-- Not billing-adjacent — no HP-8 protection needed. Users updating their
-- own onboarding_completed_at is normal.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.onboarding_completed_at IS
  'When the user completed or dismissed the first-login onboarding '
  'walkthrough. Null = never shown / not yet dismissed. Non-null = do '
  'not fire the walkthrough again for this user.';
