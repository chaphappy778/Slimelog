-- 2026-07-12: T113 — Marketplace Coming Soon waitlist.
--
-- Context
-- -------
-- The full slime marketplace (buyer/seller matching, listings, escrow,
-- ratings) is a 6-12 month V2. Meanwhile, users who care can claim a
-- spot on the waitlist so we can (a) tell them the moment it's open and
-- (b) shape what we build using their answers to a few optional
-- research questions.
--
-- One row per user. The user_id UNIQUE constraint enforces that; the
-- POST endpoint upserts on conflict so users can add or update their
-- research answers after their initial "I'm in" tap.
--
-- Not in scope
-- ------------
-- Notification wiring — when the marketplace ships we'll fan out the
-- waitlist in created_at order (see T113a in the tracker).
--
-- Scale note
-- ----------
-- Position lookups scan the whole table via COUNT(*) with a
-- created_at <= filter. Fine pre-launch (thousands of rows). At 10k+
-- entries we swap in either a maintained position column set on insert
-- or a materialized rank view. See docs/cost-tracker.md.

-- ─── 1. Table ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketplace_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- One entry per user. ON DELETE CASCADE so a hard account delete
  -- removes them from the waitlist too.
  user_id uuid NOT NULL UNIQUE
    REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- What they're here for. Enum-as-CHECK to keep migration surface
  -- lean; the client + API always send one of these three values.
  intent text NOT NULL
    CHECK (intent IN ('sell', 'buy', 'both')),

  -- Optional research fields — user can skip all of these on first
  -- submission and add them later through the same POST endpoint.

  -- Which catalog brands they'd trade. Ids only, nullable, no length
  -- cap here beyond Postgres' array limits — the client caps the
  -- user-facing chip count.
  brand_ids uuid[],

  -- Buyer's typical spend band per slime.
  spend_band text
    CHECK (spend_band IS NULL OR spend_band IN ('10-25', '25-50', '50-100', '100+')),

  -- Seller's plausible monthly listing volume.
  sell_volume text
    CHECK (sell_volume IS NULL OR sell_volume IN ('1-5', '6-20', '21-50', '50+')),

  -- One-liner: the trust/feature they'd need to actually use it.
  trust_need text
    CHECK (trust_need IS NULL OR length(trust_need) <= 200),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.marketplace_waitlist IS
  'T113 (2026-07-12). Signed-in users who want to be told when the '
  'marketplace ships. UNIQUE(user_id): one entry per user; POST /api/'
  'marketplace/waitlist upserts so users can layer research answers on '
  'top of their initial intent tap.';

-- ─── 2. updated_at trigger — reuses public.set_updated_at() ─────────────────

DROP TRIGGER IF EXISTS marketplace_waitlist_updated_at ON public.marketplace_waitlist;
CREATE TRIGGER marketplace_waitlist_updated_at
  BEFORE UPDATE ON public.marketplace_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 3. Index — position calc scans by created_at ───────────────────────────

CREATE INDEX IF NOT EXISTS marketplace_waitlist_created_at_idx
  ON public.marketplace_waitlist (created_at);

-- ─── 4. RLS ─────────────────────────────────────────────────────────────────

ALTER TABLE public.marketplace_waitlist ENABLE ROW LEVEL SECURITY;

-- INSERT: authenticated users can add their own row.
CREATE POLICY "Users insert own waitlist entry"
  ON public.marketplace_waitlist FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- SELECT: own row + admins. Admins need it for the future launch
-- fan-out; individual users need it to hydrate the success state.
CREATE POLICY "Users read own waitlist entry"
  ON public.marketplace_waitlist FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- UPDATE: own row only. Lets a user come back later and add / edit
-- research answers without needing an admin loop. user_id is locked
-- to auth.uid() on both sides of the check so nobody can flip an
-- existing row to a different user.
CREATE POLICY "Users update own waitlist entry"
  ON public.marketplace_waitlist FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: admin only. Users cannot self-delete via API today — hard
-- account deletion cascades via the FK, and admins handle any manual
-- cleanup that's needed.
CREATE POLICY "Admins delete waitlist entries"
  ON public.marketplace_waitlist FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ─── 5. Column comments ─────────────────────────────────────────────────────

COMMENT ON COLUMN public.marketplace_waitlist.user_id IS
  'The signed-in user claiming the spot. UNIQUE — one entry per user.';

COMMENT ON COLUMN public.marketplace_waitlist.intent IS
  'sell | buy | both. Required. Drives which optional research fields '
  'the UI shows (spend_band for buyers, sell_volume for sellers).';

COMMENT ON COLUMN public.marketplace_waitlist.brand_ids IS
  'Optional. Catalog brand ids the user would buy or sell. Feeds '
  'brand-side launch prioritization.';

COMMENT ON COLUMN public.marketplace_waitlist.spend_band IS
  'Optional. Typical per-slime spend for buyers.';

COMMENT ON COLUMN public.marketplace_waitlist.sell_volume IS
  'Optional. Plausible monthly listing volume for sellers.';

COMMENT ON COLUMN public.marketplace_waitlist.trust_need IS
  'Optional free-text. The single feature the user would need to trust '
  'the marketplace. Capped at 200 chars; server also runs it through '
  'the shared content-moderation gate before insert.';
