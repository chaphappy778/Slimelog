# SlimeLog Monetization Plan

**Decision doc — living reference.**  Owner: Jennifer + James.  Drafted 2026-07-07 during scoping conversation between James and Claude while pre-launch audit blockers were being closed.

Purpose: capture the monetization strategy, revenue projections, sequenced schema roadmap, and realistic build timelines so future sessions can pick up where we left off without re-deriving the analysis.

---

## Revenue projections

### Ads + subs only (safe base case)

Assumptions calibrated against hobby-app benchmarks:

| Assumption | Base value | Notes |
| --- | --- | --- |
| DAU/MAU ratio | 12% | Untappd runs ~10%. Slime's burst engagement pattern (new drop days, review posting) plausibly nudges this above beer-community norms. |
| Sub conversion rate | 3% | Hobby-app realistic for a soft PRO tier. Even Untappd runs sub 3%. |
| eCPM (native feed) | $6 | Mobile eCPMs have compressed since 2023. $4-8 is realistic 2026 range for a niche US-heavy app. |
| Ad impressions per DAU per day | 20 | 1 ad every 6-10 organic posts, moderate scroll depth. |
| PRO monthly price | $4.99 | Existing Stripe price. |

**Y1 bootstrap — 500 DAU, ~3k MAU**
- Ads: 500 × 20 × $6/1000 × 30 = **~$1,800/mo**
- Subs: 3% × 3,000 × $4.99 = **~$450/mo**
- Total: **~$2,250/mo (~$27k/yr)**

**Y2 growing — 5,000 DAU, ~40k MAU**
- Ads: 5,000 × 20 × $6/1000 × 30 = **~$18,000/mo**
- Subs: 3% × 40,000 × $4.99 = **~$6,000/mo**
- Total: **~$24,000/mo (~$290k/yr)**

**Y3 real product — 25,000 DAU, ~200k MAU**
- Ads: 25,000 × 25 × $10/1000 × 30 = **~$187,500/mo**
- Subs: 3% × 200,000 × $4.99 = **~$30,000/mo**
- Total: **~$217,500/mo (~$2.6M/yr)**

### Full stack (with the 8-pillar plan below live)

Same Y3 traffic (25k DAU / ~200k MAU):

| Revenue stream | Monthly |
| --- | --- |
| Ads (feed native) | $187k |
| User PRO subscriptions | $30k |
| Ad-removal tier | $9k |
| Affiliate on purchase logs | $60-100k |
| Brand marketplace fee (Stripe Connect drops) | $30-60k |
| Brand PRO tier (expanded) | $20-40k |
| Sponsored slots + newsletter | $8-15k |
| Trend data reports for brands | $5-10k |

**Total range: $350-450k/mo, or ~$4.2-5.4M/yr.**

### Exit valuation

Consumer/community app exit multiples:

- 3-4x ARR for hobby apps with modest retention (Untappd sold to Next Glass at roughly this range in 2016)
- 5-7x ARR for strong retention + genuine two-sided brand relationships (SlimeLog would sit here given the marketplace mechanics)
- 8-12x ARR to a strategic acquirer (TikTok Shop, Etsy, Newell Brands / Elmer's parent) buying for slime community lock-in

At $4-5M ARR: **$16-25M standalone, $30-50M to a strategic**.

---

## The 8 monetization pillars

Ranked by revenue potential × fit with SlimeLog's existing product:

### 1. Affiliate commissions on purchase logs (biggest single lever)

The killer feature is already there: users log slimes they bought. Every log entry with a `purchased_from` field is a purchase intent signal currently monetizing at zero.

**Move:** when a user logs a slime, if they haven't bought it, offer a "Buy from [brand]" CTA that links out via SlimeLog's affiliate ID. If they have bought it and logged `purchased_from`, credit the seller retroactively via reconciliation.

**Math at 5k DAU:** 40k MAU × 30% active buyers × 1.5 slimes/mo × $20 avg × 30% attribution × 10% commission ≈ **$11k/mo**. Scales linearly with DAU.

### 2. Brand marketplace / take rate on direct drops

`drops` already in schema. Add Stripe Connect so brands sell directly through SlimeLog and platform takes 3-8%.

**Math:** at 50 brands × 4 drops/mo × $500 avg GMV × 5% = **$5k/mo** early. Y3 with 200 brands doing $1M+ GMV/mo = **$50-80k/mo**.

### 3. Sponsored drops / promoted slots (direct-sold, not programmatic)

"Featured Drop of the Week" at $100-500 per placement. Higher yield than programmatic because no ad network split. **$1-10k/mo depending on scale.**

### 4. Brand PRO tier expansion

Current brand_pro likely covers dashboard + drops. Expand to: verified badge (schema already has), analytics on who's logging their slimes, DMs to loggers, featured placement, priority in drop notifications. Charge $29-99/mo tiered. **$5-40k/mo at scale.**

### 5. Ad-removal PRO tier

"Remove ads for $2.99/mo" converts 8-15% of engaged DAU — outperforms feature-based PRO for casual apps. Free money once ads are live. **$2-10k/mo.**

### 6. Direct brand sponsorships / newsletter takeovers

Weekly newsletter placements sold direct to brands at $200-500. **$1-3k/mo.**

### 7. Anonymized trend reports for brands

"SlimeLog Insights" monthly PDF at $99-299/mo per brand subscriber. Report generation mostly automated after build. **$4-10k/mo.**

### 8. Creator tips + brand-creator deals

Enable trusted reviewers (Jen's IG audience is the pipeline) to accept tips and brand deals through SlimeLog with 10-20% platform take. Y2+ feature. Turns creators into distribution engine. **$5-20k/mo at scale.**

---

## Sequenced rollout

| Phase | Content | When |
| --- | --- | --- |
| **1** | Ads (feed native, AdMob or AppLovin) + basic user PRO + ad-removal tier | Ships with mobile app launch |
| **2** | Affiliate on purchase logs + expanded brand PRO tier | 2-4 months after Phase 1 launch |
| **3** | Marketplace via Stripe Connect + sponsored slots + newsletter sponsorships | Y2 |
| **4** | Creator tips program + trend data reports for brands | Y2-Y3 |

RevenueCat handles subscription infra across iOS + Android + web (unified receipts, entitlements, churn analytics). Ad network SDK (AdMob) is separate. Don't conflate the two.

---

## Schema roadmap by phase

### Phase 1 — Ad-removal tier

Extend tier taxonomy. Either expand `profiles.subscription_tier` CHECK from `('free', 'pro')` to `('free', 'ad_free', 'pro')` where `pro` implies `ad_free`, or (cleaner) create a features table:

```
profile_tier_features (reference)
  tier text  |  feature_key text  |  enabled bool
  'free'     |  'ad_free'         |  false
  'ad_free'  |  'ad_free'         |  true
  'pro'      |  'ad_free'         |  true
  'pro'      |  'private_logs'    |  true
```

Every gated feature checks this table. Adding a tier becomes a data change, not a migration. **~1 day pure code.**

### Phase 2 — Affiliate on purchase logs

**New tables:**

- `affiliate_networks` (reference): id, name, base_url_pattern, default_commission_bps
- `brand_affiliate_links` (brand_id, network_id, affiliate_id, custom_commission_bps, is_active)
- `affiliate_clicks` (user_id NULL for anon, brand_id, slime_id, brand_affiliate_link_id, destination_url, referrer, session_id, ip_hash, created_at)
- `affiliate_conversions` (click_id, external_order_id, amount_cents, commission_cents, confirmed_at, raw_report jsonb)

**Additions:**

- `slimes.buy_url_template text` — template like `https://shop.example.com/{{slug}}?ref={{aff_id}}`
- `collection_logs.attributed_click_id uuid FK NULL` — link a purchase log back to the click that led to it

**RLS:** clicks + conversions are service_role only. Brands see aggregates, never individual clicks.

**Pure code: ~1.5-2 weeks.** Click tracking + link generation + admin reconciliation UI.

### Phase 2 — Brand PRO tier expansion

**Extend** `brands.subscription_tier` CHECK to `('free', 'brand_pro', 'brand_studio', 'brand_enterprise')`. Same features-table pattern as user tiers.

**New:**

- `brand_analytics_daily` (brand_id, day, logs_count, wishlist_adds, avg_rating, unique_users, click_throughs) — nightly rollup job
- `brand_message_threads` (brand_id, user_id, first/last_message_at, unread counts, UNIQUE (brand_id, user_id))
- `brand_messages` (thread_id, sender_type, sender_id, body, created_at, read_at)

**Business rule:** brand can only initiate a DM to a user who's logged one of the brand's slimes. Enforced via a check function.

**Pure code: ~2 weeks.**

### Phase 3 — Marketplace via Stripe Connect

Biggest architectural lift. Requires Stripe Connect Express accounts for brands.

**New:**

- `brand_stripe_connect_accounts` (brand_id PK, stripe_account_id, onboarding_complete, charges_enabled, payouts_enabled, requirements_json)
- `drop_orders` (drop_id, user_id, quantity, unit_price_cents, subtotal_cents, platform_fee_cents, brand_payout_cents, stripe_payment_intent_id, stripe_transfer_id, status, shipping_address_id, timestamps)
- `drop_order_events` — state transition audit log
- `shipping_addresses` — user address book if handling physical goods

**Additions to `drops`:** price_cents, currency, inventory_count, per_user_limit, checkout_mode ('external_redirect' | 'stripe_connect'), starts_at, ends_at, stripe_price_id.

**Additions to `brands`:** marketplace_fee_bps int default 500 (5% platform fee, negotiable per brand).

**RLS:** users see their own orders; brands see orders for their drops; platform admin sees all.

**Pure code: ~2-3 weeks.** Plus 1-2 week external gate on Stripe Connect platform approval.

### Phase 3 — Sponsored slots

**New:**

- `placement_slots` (reference): slot_type PK, base_price_cents, weekly_capacity, min_dau_gate
- `promoted_placements` (brand_id, slot_type, drop_id, slime_id, starts_at, ends_at, amount_paid_cents, stripe_payment_intent_id, status)
- `placement_impressions` + `placement_clicks` with daily rollup materialized views

**Pure code: ~2 weeks.**

### Phase 3 — Newsletter sponsorships

`newsletter_sponsorships` (brand_id, edition_at date, placement_type, amount_paid_cents, stripe_payment_intent_id, status). Brevo handles sends; this tracks who paid for what. **~3 days pure code.**

### Phase 4 — Creator tips + brand-creator deals

**Additions to `profiles`:** `creator_tier text default 'none' CHECK IN ('none','verified','partner')`. Protected by the same trigger we built for billing columns (see migration 20260706000050 pattern).

**New:**

- `creator_stripe_connect_accounts` (same shape as brand accounts)
- `creator_tips` (from_user_id, to_user_id, amount_cents, platform_fee_cents, creator_payout_cents, stripe_payment_intent_id, stripe_transfer_id, message, is_anonymous, status)
- `brand_creator_deals` (brand_id, creator_id, log_id, amount_cents, platform_fee_cents, creator_payout_cents, **disclosure_text NOT NULL** for FTC compliance, status)
- `creator_payouts` — batched monthly payout ledger

**Compliance:** every logged slime from a paid deal renders a "sponsored" badge driven by disclosure_text on the deal. FTC required.

**Pure code: ~1.5-2 weeks.** Plus 1-2 week external gate on legal review of disclosure UX.

### Phase 4 — Anonymized trend reports

- `brand_report_subscriptions` (brand_id, tier, started_at, canceled_at, stripe_subscription_id)
- `brand_report_deliveries` (brand_id, period_month, storage_url, delivered_at, opened_at)
- Materialized views for report source data: `trends_daily_texture`, `trends_weekly_scent`, `trends_monthly_price_bands`, `brand_competitor_share_of_logs`

Report generation: scheduled job queries views → renders PDF → uploads to Storage → emails signed URL.

**Pure code: ~2 weeks.** Report content design is 80% of the work, not schema.

---

## Cross-cutting infra (build once, reuse everywhere)

**Stripe Connect infrastructure.** Needed for marketplace (Phase 3), sponsored placements (Phase 3), tips (Phase 4), brand-creator deals (Phase 4). Build connect account onboarding + payout ledger once. **~2 weeks** by itself, pays for Phase 3 + 4.

**Immutable dollar-flow ledger.** Every money table (`drop_orders`, `creator_tips`, `affiliate_conversions`, etc.) gets a shared `event_log` pattern logging state transitions. Not optional at revenue scale — reconciliation, refunds, disputes, eventual accounting audit all depend on it.

---

## Realistic timelines with AI pairing

Adjusted from a traditional-solo-dev calibration (4-6 months) to account for the sustained shipping pace we've established:

| Milestone | Pure code | External gates | Realistic all-in |
| --- | --- | --- | --- |
| Phase 1 alone | ~1 day | App Store review (3-7 days) | **1-2 weeks** |
| Phase 1 + 2 (ads + affiliate + brand PRO expansion) | ~3-4 weeks | Affiliate program approvals (Etsy 1-2wks, TikTok Shop 2-4wks in parallel) | **4-6 weeks** |
| + Phase 3 (marketplace, sponsored, newsletter) | +5-6 weeks | Stripe Connect platform approval (1-2 wks), real testing on money flows | **+6-8 weeks on top** |
| + Phase 4 (creator program + trend reports) | +3-4 weeks | FTC/legal review of creator disclosures (1-2 wks) | **+4-6 weeks on top** |

**All four pillars end-to-end: ~3 months realistic**, not the 4-6 I originally estimated, but also not 2 weeks. External gates (Stripe Connect approval, affiliate program approvals, App Store review) are the hard floor, and none of them shrink with AI pairing.

**Where "a couple weeks" is genuinely true:** narrow-scope Phase 1 + start of Phase 2 (ads + basic affiliate links without conversion tracking) ships in 2-3 weeks and probably doubles revenue at launch vs. subs-only.

---

## Key open decisions (revisit before starting Phase 2)

- **Ad network choice:** AdMob (default, best global fill) vs. AppLovin MAX (higher eCPM in some markets) vs. Meta Audience Network. Recommend AdMob for launch, MAX consideration once we have 20k+ MAU.
- **Affiliate approach:** direct brand affiliate deals (higher %) vs. hub through Etsy/TikTok Shop (easier onboarding, lower %). Start with both — direct for the top 20 brands, network for the long tail.
- **RevenueCat vs. Stripe-only for mobile:** RevenueCat unifies iOS/Android/web receipts and gives churn analytics for free; worth the fee once mobile apps ship.
- **Marketplace scope:** does SlimeLog handle fulfillment tracking, or just checkout + payout? Recommend "just checkout + payout" for Phase 3 launch, add fulfillment later if brands request.

---

## Cross-references

- Pre-launch audit (blockers 1-7 shipped 2026-07-06, high-priority items 8-14 shipped 2026-07-07, HP 15+ pending): `docs/pre-launch-audit-2026-07-06.md`
- Schema reference: `docs/schema-reference.md`
- Living tracker (issue queue): `docs/SlimeLog_Tracker.md`

---

## Change log

- **2026-07-07** — Doc created during scoping conversation with Claude. Revenue projections, pillar plan, schema roadmap, timelines all landed in v1.
