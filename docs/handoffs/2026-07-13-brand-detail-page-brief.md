# Design brief — /brands/&lt;slug&gt; brand detail page review

Handed off: 2026-07-13
Owner: Design
Related tickets: T35 (Brands index rebuild, shipped)
Related briefs:
- `2026-07-13-brands-page-brief.md` — the index page we just shipped
- `2026-07-13-discover-results-pages-brief.md` — Discover result surfaces
- `2026-07-13-log-wizard-look-brief.md` — Wizard visual redesign

## What we need

An eval + redesign proposal for the individual brand detail page at
`/brands/<slug>`. The brands index page (`/brands`) just shipped in
T35 with the Discover-family visual bar; now we need the destination
users land on when they tap a brand card to feel like it belongs to
the same product. Right now it doesn't — it's functional but reads
like a directory listing next to how-to-rate / Discover / the log
wizard.

You have full permission to propose visual reordering, consolidation,
or surface additions. Copy stays as-is except where you flag a
specific ask.

## Ref materials

**Current page implementation:**
- Server component: `apps/web/app/brands/[slug]/page.tsx` (~920 lines)
- Sub-components live in `apps/web/app/brands/[slug]/components/`:
  - `BannerLightbox.tsx` — banner tap-to-expand
  - `DropCard.tsx` — an upcoming-drop tile
- Shared components used on the page:
  - `FollowBrandButton`
  - `ShareButton`
  - `ClaimBrandButton` (owner claim flow — see below)
  - `TopCollectorsStrip` — discovery-loop back to `/leaderboard`
- Sub-routes: `/brands/<slug>/catalog` (slime catalog view),
  `/brands/<slug>/claim` (claim owner flow)

**Live surfaces to match:**
- `/brands` (index) — just shipped, use as the visual home for the family
- `/discover` — Discover home
- `/discover/type/<base_type>` — 186px photo hero + log cards
- `/how-to-rate` — six-axis deep dive
- Rules: anti-AI-art, palette, font stack, bottom nav — same as always

**Data model reference:**
- `Brand` interface: `apps/web/lib/types.ts` (search for `interface Brand`)
- Notable fields: `logo_url`, `banner_url` (added in the drops
  overhaul), `bio`, `description`, `location`,
  `restock_schedule`, `follower_count`, `total_logs`,
  `avg_slime_rating`, `total_slime_ratings`, `is_verified`,
  `is_featured`, `verification_tier`, `subscription_tier`,
  `subscription_status`, `owner_id`, `owner_name`

## What's on the page today (top → bottom)

1. **Hero banner** — 200px full-width photo from `banner_url`, tappable
   to open a lightbox (`BannerLightbox` component). Falls back to a
   gradient placeholder when the brand has no banner. Overlapping logo
   (60px, offset with `-mt-12`) sits at the bottom of the banner.

2. **Header block** — vertically stacked:
   - Brand name + verified star glyph (currently a 5-point star in
     cyan, not the green-circle check we now use everywhere else)
   - Share button (top-right)
   - Bio prose (`brand.bio`)
   - **Stats pills row** — three side-by-side pills for Rating / Logs
     / Followers. Each pill has an SVG glyph, a big colored number,
     and a tiny uppercase label. The treatment is boxy and reads
     older than the rest of the app.
   - **Social links row** — icon-only circles for website / shop /
     Instagram / TikTok, each in the brand's signature color
   - **Follow button** (`FollowBrandButton`) — outline pill when not
     followed, filled when followed
   - **Claim brand button** (`ClaimBrandButton`) — only shown for
     unclaimed brands where the user could plausibly claim ownership
     (email domain match). Routes to `/brands/<slug>/claim`
   - **"View Slime Catalog" pill** — routes to
     `/brands/<slug>/catalog`, a list of slimes attributable to
     this brand

3. **Upcoming Drops** — vertically stacked list of `DropCard` tiles
   (cover image, drop name, T-minus, slime list). Missing the T-minus
   pill treatment we shipped on Discover.

4. **Top Collectors strip** (`TopCollectorsStrip`) — closes the
   discovery loop from brand → leaderboard. Shows the top N
   collectors who log this brand's slimes.

5. **Community logs** — recent public `collection_logs` filtered by
   `brand_id`. Renders as a list of log cards.

## Where we know the page is weak (Design should verify + propose)

- **Verified badge is a 5-point star in cyan.** Everywhere else in the
  app we now use a green circle with a white check inside (see
  `/brands` cards, `/discover` collector cards, log wizard). This page
  is the odd one out.
- **Stats pills read old.** Boxy rounded-xl with tiny uppercase labels
  under big colored numbers. Doesn't match the how-to-rate hero-card
  language or the Discover pulse/leaderboard treatment.
- **Header block has too much crammed into it** — logo overlap + name
  + share + bio + stats + socials + follow + claim + catalog pill.
  Eight distinct things fighting for attention.
- **Upcoming Drops don't use the T-minus pill treatment.** We shipped
  the LIVE / T-3d / T-1w pill on `/discover` drop cards. The brand
  page should match.
- **Community logs section might need the log-card treatment we shipped
  on `/discover/type/<base_type>`** (172px cover photo, cyan rating
  pill top-right, name/brand/avatar footer). Design should check
  `TypeLogsClient` in `apps/web/components/discover/TypeLogsClient.tsx`
  and decide whether to reuse it here.

## Flow / hierarchy questions Design should answer

1. **Hero treatment.** Big banner photo + overlapping logo IS a nice
   pattern. Does it stay at 200px, does it get bigger, does the logo
   size change? Any change to the fallback gradient when no
   `banner_url`?

2. **Verified badge unification.** Green-circle-check everywhere or a
   different treatment for the brand detail page? If different, why?

3. **Stats treatment.** Design's `/brands` mockup used inline
   stats (star + rating + count, person icon + followers, chat icon
   + logs) — should this page mirror that inline treatment or does
   the detail page warrant something more prominent (maybe axis-style
   score cards similar to how-to-rate)?

4. **Header block density.** Consolidate into fewer sections? Move
   Follow / Claim / Catalog pill into a sticky action row? Split
   socials into a separate strip?

5. **Section order.** Is Banner → Header → Drops → Top Collectors →
   Community Logs the right flow? Should Community Logs come before
   Drops (drops are curated / rare, logs are ongoing)?

6. **Empty states.** How does this page read for a brand with no
   banner, no bio, no drops, no logs? Should Design mock this state
   explicitly?

7. **Owner state.** When the current user IS the brand owner (i.e.
   `brand.owner_id === auth.uid()`), should the page render
   differently? An "Edit brand" affordance? A dashboard link (we
   already have `/brand-dashboard/<slug>` for this)?

## Constants (non-negotiable)

Same as every recent brief:
- Purple viewport-fixed background + ambient orbs.
- Cyan `.section-label` Montserrat 900 uppercase.
- Glass card treatment: `rgba(45,10,78,0.28)` bg +
  `1px solid rgba(45,10,78,0.7)` border + `rounded-2xl` / `3xl`.
- Green→cyan gradient for primary CTAs.
- Real photos where available (banner, logo, drop covers, log
  photos) — no illustrated brand mascots.
- Line SVG icons only (2px stroke). No new emoji in UI.
- No em-dashes in user-facing copy.
- Bottom nav preserved (5 tabs, Log + center CTA).
- Mobile-first, 375px viewport minimum.

## Deliverables

For each of the key surfaces on the page:

1. **Populated state** — a well-populated brand: banner, bio, high
   ratings, active drops, active community, top collectors, verified.
2. **Sparse state** — an early-community brand: no banner, minimal
   bio, no drops, a handful of logs.
3. **Empty state** — a newly added brand with basically nothing.
4. **Owner state** — the user IS the brand owner (edit affordances).

Plus:
5. Answers to the seven flow / hierarchy questions above.
6. Spec deltas (padding, radius, glow) for anything that differs from
   what we've shipped elsewhere.
7. Callouts for anything beyond a visual pass — new fields, new
   sections, new interactions — so we can green-light before we
   implement.

## Explicitly out of scope

- The `/brands` index page — we just shipped it (T35).
- The `/brands/<slug>/catalog` sub-route (separate surface, separate
  ticket if it needs a redesign).
- The `/brands/<slug>/claim` form flow (form UX, not visual).
- The `/brand-dashboard/<slug>` admin surface — separate ticket.
- Any change to the `brands` table schema.
- The `TopCollectorsStrip` component internals — usable as-is, just
  re-skin the section header + spacing around it if needed.
- The Follow / Share / Claim button internals — usable as-is, may be
  re-arranged.

## Context on monetization tiers

Same as the `/brands` index brief. `subscription_tier = brand_pro` is
what gates Featured + Popular slots on the index. On the detail page
we don't currently badge tier status anywhere. Design should decide
whether a brand-pro shop deserves a subtle visual treatment on their
own detail page (a signature color, a small badge, a
brand-controlled cover art slot) — but no "SPONSORED" label. The
tier IS the visual reward, not a label.
