# Design brief — /brands page rebuild

Handed off: 2026-07-13
Owner: Design
Related tickets: T33a (Discover results V1, shipped)
Related briefs: `2026-07-13-discover-results-pages-brief.md`

## What we're rebuilding

The `/brands` page — the top-level discovery surface for slime shops.
Currently four stacked sections (Featured brand → Popular brands
carousel → Verified brands grid → Community brands grid) with a
filter toggle row. Functional, but visually feels like a directory
from an earlier generation, doesn't match the polish we just shipped
on `/discover` and its result surfaces.

The rebuild should bring it up to the same visual bar as the rest of
Discover.

## Ref materials

- Current page: `apps/web/app/brands/page.tsx`
- Current client component: `apps/web/components/BrandsClient.tsx`
- Related components: `FeaturedBrandCard`, `PopularBrandsCarousel`,
  `BrandCard`
- Live Discover pages for the visual language: `/discover`,
  `/discover/type/butter`, `/discover/keyword/galaxy`
- Anti-AI-art rule, palette, font stack — same as every other brief
  in this folder.

## Current data model + monetization tiers (DO NOT change without asking)

`brands` table has these key fields:

- `is_active` — soft delete gate
- `is_verified` — verification badge (admin-granted)
- `is_featured` — hero slot eligibility (admin-granted)
- `subscription_tier` — `null` / `brand_free` / `brand_pro` /
  `brand_pro_yearly` etc.
- `subscription_status` — `active` / `past_due` / `canceled` etc.
- `avg_slime_rating`, `total_slime_ratings`, `follower_count` —
  aggregates used for sort/ranking

The page currently runs FOUR parallel queries against `brands`:

1. **Featured** — `is_featured=true AND subscription_tier='brand_pro'`,
   random 1 per load.
2. **Popular** — `is_verified=true AND subscription_tier='brand_pro'`,
   ordered by `avg_slime_rating` then `follower_count`.
3. **Verified grid** — `is_verified=true` and NOT `brand_pro`.
4. **Community grid** — `is_verified=false`.

The tier system is our monetization backbone (from
`docs/monetization-plan-2026-07-07.md`): `brand_pro` shops get the
Featured + Popular slots. Free brands live in the Verified /
Community tiers. **Do not collapse or redistribute the tiers in the
redesign** — the visual layout can change, but the four categories
must remain queryable.

## Pre-monetization operational note (important)

Until we have brands actually paying for `brand_pro`, we will
**manually populate the Featured + Popular slots ourselves**. That
means an admin (Jenn / James) will:

- Flip `is_featured=true` on brands we want to showcase.
- Temporarily set `subscription_tier='brand_pro'` on brands we want
  in Popular even without payment.
- Rotate the picks periodically to keep the page fresh.

Design should NOT bake the assumption that the tier fields reflect a
real payment. The redesign should feel great in three states:

1. **Pre-monetization** — hand-picked brands in Featured / Popular
   slots, curated as marketing.
2. **Mid-monetization** — some real paying brands, some hand-picks.
3. **Post-monetization** — the tiers reflect actual paying brands.

The visual treatment should be the same across all three; only the
selection logic differs. No "SPONSORED" badge or paid-placement
indicator on the paying brands — the tier IS the visual reward, not
a label.

## Constants across the three surfaces

Same as every recent brief:

- Purple viewport-fixed background + ambient orbs.
- Cyan `.section-label` Montserrat 900 uppercase.
- Glass card treatment: `rgba(45,10,78,0.28)` bg + `1px solid rgba(45,10,78,0.7)` border + `rounded-2xl` or `rounded-3xl`.
- Green→cyan gradient for primary CTAs.
- Real photos where available (brand logos, cover shots) — no
  illustrated brand mascots, no AI illustration.
- Line SVG icons only (2px stroke).
- No em-dashes in user-facing copy.
- Bottom nav preserved (5 tabs, Log + center CTA).

## Scope

### 1. Page header

Currently a small gradient "Brands" wordmark + `N shops · X verified`
line. Design should push this to the same hero language as
`/discover/type/<base_type>` — big Montserrat 900 title, subhead
with counts and verification stat, maybe a small badge count of new
shops this week or a similar living signal.

### 2. Featured brand slot

Currently a `FeaturedBrandCard`. This is the hero slot. Design's
proposal for this card should:

- Feel premium (hand-picked and paid-for both apply).
- Show the brand's real logo prominently.
- Show a cover image / drop preview if the brand has one.
- Include: brand name, tagline / bio, verification badge, top-line
  stats (slime rating, followers), a primary "View shop" CTA.
- Be tappable to `/brands/<slug>`.

### 3. Popular brands carousel

Horizontal scroll of premium brands. Each card should show:

- Brand logo + name (Montserrat).
- Verification tier badge.
- 1–2 top stats (avg slime rating, follower count).
- Optional: the brand's most-logged slime as a mini thumbnail.

Card width should mirror the drop-card treatment on Discover (200px)
for family consistency.

### 4. Verified grid + Community grid

Currently two distinct grids. Design should propose:

- Whether these stay as two separate grids with headers, or merge
  into one grid with a small verified-badge distinction.
- Card size + info density (name, logo, verification, rating).
- Sort options (name A-Z is the current default; consider follower
  count, rating).

### 5. Filter toggle row

Currently a full filter panel (verified only / has drops / has
Instagram / etc). Design should decide:

- Which filters actually get used and should stay.
- Whether the filter UI should collapse into a Discover-style top
  bar (matches the Top Rated sort row).

### 6. Suggest a brand card

Already relocated from Discover to the bottom of `/brands` (see
`apps/web/app/brands/page.tsx`). Current card is a purple-outlined
row with a magenta plus icon + "Know a slime shop we should track?"
+ "Suggest a brand →" link that routes to `/submit-brand`. Design
can re-skin this card to match the new visual language, but keep it
on this page — it's the natural home now.

### 7. Empty / sparse states

Two states to design:

- **No Featured brand** — pre-monetization + no hand-pick, or during
  a rotation gap. Design proposes what fills the slot: a "become a
  featured shop" CTA aimed at brand owners? A large "Suggest a brand"
  card? Design's call.
- **Sparse grids** — pre-launch we have handfuls of brands per tier,
  not dozens. Grids should read intentional at low counts, not
  broken. Design proposes.

## Flow / hierarchy questions Design should answer

1. **Section order.** Current: Featured → Popular → Verified →
   Community. Should this stay, or should the new visual language
   suggest a different flow? (e.g., Featured hero → filter bar →
   scrolling merged brand list ranked by tier).

2. **Filter placement.** Inline top bar (matches Discover Top Rated
   sort row) or expandable panel below the header?

3. **Cover imagery.** Do we have cover images for brands? If not,
   propose the gradient / photo fallback treatment. Real cover
   photos would be a follow-up ask to onboarded brands.

4. **Search on this page?** Currently the search is on the global
   SearchHero at `/discover` and `/search`. Should `/brands` also
   have an inline brand-name search? Or does the global search
   handle it? Design's call.

## Constraints (non-negotiable)

- Preserve the 4-tier query structure (`is_featured` +
  `subscription_tier=brand_pro` +
  `is_verified` + `is_active`).
- No paid-placement badges. The tier IS the reward.
- Real photos only. No illustrated brand mascots.
- Bottom nav intact (5 tabs).
- Palette locked to the app palette.
- 375px mobile-first.

## Deliverables

For each key surface (header + Featured + Popular + Verified/Community
grid + filter):

1. Populated state.
2. Sparse state (pre-launch feel).
3. Empty state where applicable.
4. Spec deltas: padding, radius, glow.

Plus answers to the four flow questions above.

## Out of scope

- The `/brands/<slug>` brand detail page (separate ticket).
- The `/submit-brand` form (separate ticket).
- The `/brand-dashboard` admin surface (separate ticket).
- Any changes to the `brands` table schema.
- The Suggest a brand CTA copy (already lives on the page).
