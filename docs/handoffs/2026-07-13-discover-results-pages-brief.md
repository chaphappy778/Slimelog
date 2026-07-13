# Design brief — Discover result surfaces (three pages)

Handed off: 2026-07-13
Owner: Design
Related tickets: T33 (Discover V1 rework, shipped)
Related briefs: `2026-07-13-log-wizard-look-brief.md`

## What we need

Three Discover-adjacent surfaces that we just wired plumbing for but
haven't given the same visual love as the /discover home. Each is a
place a Discover user LANDS after a tap. They should feel like the
same product family, not "we ran out of steam."

1. **Search results** at `/search` (and `/search?q=<text>`) — the page
   the Discover search hero routes to.
2. **Browse by base type** at `/discover/type/<base_type>` — the page
   users land on when they tap a Type card on Discover.
3. **Trending keyword search** at `/discover/keyword/<name>` (and the
   keyword browse page at `/discover/keyword`) — where users land when
   they tap a keyword pill.

## Ref materials

- The shipped Discover V1: `apps/web/app/discover/page.tsx`
- SearchHero component: `apps/web/components/discover/SearchHero.tsx`
- The current (pre-redesign) result pages Design should replace:
  - `apps/web/app/search/page.tsx`
  - `apps/web/app/discover/type/[base_type]/page.tsx`
  - `apps/web/app/discover/keyword/[name]/page.tsx`
  - `apps/web/app/discover/keyword/page.tsx`
- Anti-AI-art rule + palette + font stack are the same as every other
  brief in this folder.

## Shared visual language across all three

- Same purple viewport-fixed background + ambient orbs as the rest of
  Discover.
- Same cyan `.section-label` Montserrat 900 header treatment.
- Same card treatment: `rgba(45,10,78,0.28)` background,
  `1px solid rgba(45,10,78,0.7)` border, `rounded-2xl` or `rounded-3xl`.
- Same primary CTA: green→cyan gradient with black text.
- Same T-minus / medal / T-32f color language.
- Bottom nav preserved (5 tabs: Feed / My Shelf / Log(+) / Discover /
  Brands). Do not drop the Log CTA.

## 1. Search results — `/search`

### Purpose

A user arrives here from the Discover search hero (routed via
`?q=<text>`), types in a search field on the results page directly,
or lands from an internal link. We show three grouped result sections:
Slime Types, Slimes, Keywords.

### Current state we already wired

- Landing on `/search?q=butter` hydrates the search input with "butter"
  and immediately shows results.
- The search hero on `/search` is the same visual as the one on
  `/discover` (imported `SearchHero`), auto-focused, with live results
  as the user types.
- URL updates to `?q=<current text>` as the user types (via
  `router.replace`), so refresh / share preserves state.
- Empty query shows a "Type a slime name, brand, base type, or
  keyword" prompt.
- No results shows a fallback with a link back to Discover.

### What Design should design

- **The result rows.** Three row types:
  - **Type row** — colored type name in its signature color, chevron
    right. Row background matches the standard card treatment.
  - **Slime row** — 44px thumbnail, slime name (Montserrat 700 white),
    brand + collection as a magenta sub-line, big cyan score readout
    on the right (Montserrat 900) + rating count small underneath.
    (This is the treatment we shipped on Discover; we want the same
    energy here.)
  - **Keyword row** — small magnifying glass or tag icon in cyan,
    keyword name, small green "N logs" count on the right.
- **Section separators.** Section-label headers ("Slime Types" /
  "Slimes" / "Keywords") between groups.
- **Empty state polish.** The "no results for X" state currently uses
  plain text; consider a small illustrated (geometric, no AI art)
  empty-state affordance.
- **Search-in-flight state.** We currently show plain "Searching..."
  text after a 300ms debounce; a small skeleton or spinner would be
  friendlier.
- **Result grouping order.** Currently Types → Slimes → Keywords. Is
  that the right order? Types are the smallest section (in-memory
  match on a fixed vocabulary), Slimes is the biggest impact,
  Keywords is often noise. Design should propose.

## 2. Browse by base type — `/discover/type/<base_type>`

### Purpose

User taps a base-type card on Discover ("Butter" → this page). They
see every public `collection_logs` entry with `base_type=butter`,
plus the type's identity treatment.

### Current state we already wired

- Query: `SELECT id, slime_name, brand_name_raw, base_type, subtype_id,
  colors, image_url, rating_overall, created_at, subtype, user` from
  `collection_logs` where `base_type = X AND is_public = true`, ordered
  newest first, limited to 50.
- Renders a `TypeLogsClient` component below a back link and header.
- Discover carousel counts now match this page's counts (both are
  `collection_logs` grouped by base_type, filtered `is_public`).

### What Design should design

- **The header treatment.** Big Montserrat black type name in the
  type's signature color. Photo hero at the top of the page (same
  photo the Discover carousel card uses). "N logs in the community"
  sub-line.
- **Log cards.** Each row shows: photo (or gradient fallback), slime
  name, brand (magenta), user attribution ("logged by
  @username" with small avatar), rating pill in the type's accent
  color. Multi-line cards that scan cleanly.
- **Empty state.** When no logs yet exist for the type, show a
  seed-the-community prompt: type name, photo, "Be the first to log
  a {Butter} slime →" CTA. Do NOT show a broken "0 logs" state.
- **Filter chips.** Design should propose whether a subtype chip row
  (e.g. Bingsu / Icee subtypes of Beaded) belongs here. If yes, add.
- **Sort toggle.** Newest first is the current sort. Consider adding
  Top Rated toggle.

## 3. Trending keyword search — `/discover/keyword/<name>` + `/discover/keyword`

### Purpose

User taps a keyword pill on Discover ("galaxy" → this page). Shows
every public `collection_logs` entry tagged with that keyword.

Also: `/discover/keyword` (no param) is the keyword browse page — a
grid of every keyword in the catalog with its use count.

### Current state we already wired

- Keyword pills on Discover carry a green use_count number so users
  see the social signal before tapping.
- Discover search hero routes to `/search?q=<text>` on Enter — NOT to
  this keyword page. That's intentional; keyword pages are curated
  entries from the pill row.

### What Design should design

- **Keyword browse page** (`/discover/keyword`, no arg). Grid layout,
  each tile shows the keyword + use_count + one representative photo
  from a slime tagged with it. Big cyan section header at top:
  "Trending keywords."
- **Keyword result page** (`/discover/keyword/<name>`). Header treats
  the keyword like a page title ("#galaxy") in Montserrat black,
  cyan. Sub-line: "N logs tagged with #galaxy in the community."
  Below: a grid or list of log cards (same visual as the Base Type
  page's log cards).
- **Related keywords row.** Optional. A horizontal pill row of other
  keywords that frequently co-occur with the current one.

## Constraints (apply to all three)

- **No em-dashes** in any user-facing copy.
- **No AI-generated illustration.** Line SVG icons only (2px stroke),
  real photos where photos are appropriate.
- **No emoji in new UI.**
- **Palette locked** to the app palette: cyan `#00F0FF`, slime green
  `#39FF14`, magenta `#FF00E5`, muted violet `#2D0A4E`, gold `#FFD24A`,
  plus the five scale stops.
- **Bottom nav preserved** (5 tabs, Log + center CTA).
- **Mobile-first**, 375px viewport minimum.
- **Fonts:** Montserrat black for headings + score readouts,
  system-ui for body copy.
- **Accessibility:** every input has a visible label, every button
  has an accessible name, focus states visible.

## Deliverables

For each of the three surfaces:

1. **Header state.** Empty query / no filter applied.
2. **Populated state.** Real-looking data with a mix of result types.
3. **Empty / no-data state.** What a user sees when their search
   matches nothing (or when a base type has no community logs yet).
4. **Spec deltas.** Any padding / border radius / animation timings
   Design would like carried into implementation.

Once mockups land, implementation is a straightforward pass across
the three route files listed above under Ref Materials. No new
database schema, no server-action rewrites. Search page already has
the debounced-query pattern in place; Base Type page has the
`collection_logs` query in place; Keyword page has the tag filter in
place. Purely a visual + information-density pass.

## Explicitly out of scope

- Typeahead in the search hero (Discover V2 per the eval).
- Full personalization / "For you" bucket.
- LIVE-drop interrupt band (Discover V2).
- The Discover home page itself — that shipped in T33.
