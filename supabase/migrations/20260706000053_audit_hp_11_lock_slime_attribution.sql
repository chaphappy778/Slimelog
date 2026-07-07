-- 2026-07-06 audit high-priority #11: slimes UPDATE lets creator
-- rewrite brand_id + is_brand_official after other users have logged
-- against the row.
--
-- Problem
-- -------
-- Two UPDATE policies on public.slimes:
--
--   "Slime creator can update slime"       USING/CHECK auth.uid() = created_by
--   "Brand owners can update their
--    official slimes"                      USING/CHECK is_brand_official = true
--                                                    AND brands.owner_id = auth.uid()
--
-- Neither restricts which columns can be modified. A user who added
-- a slime to the catalog can later:
--
--   UPDATE public.slimes
--   SET brand_id = 'some-other-brand-id',
--       is_brand_official = true,
--       image_url = 'https://phishing.example/logo.png'
--   WHERE id = '<their created slime>';
--
-- That silently reattributes every log written against the row to a
-- different brand, and flips the "verified by the brand itself"
-- badge without the actual brand's consent. is_brand_official is a
-- trust signal — a user shouldn't be able to grant it to themselves.
--
-- Fix
-- ---
-- BEFORE UPDATE trigger that reverts changes to `brand_id` and
-- `is_brand_official` unless the caller is service_role. Same pattern
-- as the audit #8/#9 profiles trigger — silently revert so idempotent
-- writes from the brand dashboard (which echoes the full row) still
-- succeed but adversarial column edits are neutered.
--
-- What the brand dashboard actually sends (verified from
-- components/dashboard/SlimesSplitPanel.tsx:207-216):
--   name, base_type, description, colors, scent, retail_price,
--   is_limited, is_discontinued
--
-- None of the protected columns appear in that payload, so this
-- trigger is invisible to the legitimate flow. The brand dashboard's
-- INSERT does set brand_id + is_brand_official, but the trigger only
-- fires on UPDATE — INSERT policy still enforces "brand you own only."
--
-- Left NOT protected (deliberate):
-- --------------------------------
--   image_url    — creators legitimately want to update the picture
--                  and there's no visible attribution damage without
--                  brand_id change. Revisit if we see abuse.
--   name         — creator can fix typos. RLS policy already limits
--                  writes to created_by, so rename spam is bounded.
--   retail_price — creator adjustments are welcome.
--
-- The audit called out brand_id and is_brand_official explicitly;
-- staying scoped to those keeps the trigger uncontroversial and
-- doesn't break UX affordances users rely on.
--
-- Verification query (run after migration applies):
--   -- As authed user who created a slime:
--   UPDATE public.slimes SET brand_id = '<any other brand uuid>' WHERE id = '<owned>';
--   SELECT brand_id FROM public.slimes WHERE id = '<owned>';
--   -- expect: original brand_id (silent revert)

CREATE OR REPLACE FUNCTION public.slimes_protect_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role (admin scripts, backfills, moderation tooling) can
  -- mutate anything.
  IF current_user = 'service_role' THEN
    RETURN NEW;
  END IF;

  NEW.brand_id          := OLD.brand_id;
  NEW.is_brand_official := OLD.is_brand_official;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.slimes_protect_attribution() IS
  'Audit high-priority #11 (2026-07-06). Reverts unauthorized changes '
  'to brand_id and is_brand_official on slimes. Only service_role can '
  'bypass. Brand dashboard payload does not include either column, so '
  'the legitimate flow is unaffected.';

DROP TRIGGER IF EXISTS slimes_protect_attribution ON public.slimes;
CREATE TRIGGER slimes_protect_attribution
  BEFORE UPDATE ON public.slimes
  FOR EACH ROW
  EXECUTE FUNCTION public.slimes_protect_attribution();
