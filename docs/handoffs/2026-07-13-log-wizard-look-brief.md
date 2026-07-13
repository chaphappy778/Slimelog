# Design brief — Log wizard redesign (whole surface)

Handed off: 2026-07-13 (rev 2, supersedes the standalone slider brief)
Owner: Design
Related tickets: T32e (how-to-rate build, shipped), T-wizard (this)
Supersedes: `2026-07-13-log-wizard-slider-brief.md` — that standalone
slider brief is retired. Design should treat this document as the
single source of truth. Slider content is folded into Section 5 below.

## Screenshots

Jenn is sending screenshots of the current log wizard separately, plus
the earlier slider redesign attempt for reference. Drop them in
`docs/handoffs/_screenshots/`:

- `wizard-step-0-identity.png` — {pending}
- `wizard-step-1-details.png` — {pending}
- `wizard-step-2-ratings.png` — {pending}
- `wizard-step-3-notes.png` — {pending}
- `slider-attempt-1.png` — earlier slider mockup (see Section 8 for
  what didn't land)

Ref files:
- `apps/web/app/log/page.tsx` — the wizard, one client component,
  900+ lines
- `apps/web/components/RatingSlider.tsx` — the slider component
- `apps/web/app/how-to-rate/content.ts` — canonical axis names,
  colors, and taglines (Design must pull from here, not invent)
- `apps/web/components/how-to-rate/ScaleSection.tsx` — the five-stop
  scale bar we're matching to

## Why

`/how-to-rate` just shipped with a new visual language: gradient hero
cards per axis, per-axis accent colors, a five-stop scale bar in
red → orange → blue → teal → green, big Montserrat display type,
scattered ambient blur orbs on the wrapper. `/guide` was updated so
its rating section (Part 12) points into how-to-rate with six
color-tinted axis cards.

The log wizard is the app's most important interactive surface (every
rated slime flows through it), and it currently reads like a form from
an earlier product generation. The gap between "here's how rating
works" (educational, beautiful) and "okay, now rate one" (utilitarian,
plain) is jarring. We want the wizard to feel like the natural next
step after reading how-to-rate. Same color language, same type
language, same energy, coherent end-to-end.

Design should approach this as one flow, not a set of individual
component skins. The slider and the shell around it need to be
designed together so the rating step feels choreographed rather than
assembled.

## The wizard as it exists today (real reference)

Four steps, indexed 0..3, rendered inline in one client component.

- **Step 0 — Identity**
  - Brand search (typeahead over `BrandSearchInput`)
  - Slime name (text input)
  - Base type picker (grid of base type cards)
  - Subtype autocomplete (`SubtypeAutocomplete`)
  - Cancel button lives here
- **Step 1 — Details**
  - Color swatch grid (`COLOR_SWATCHES`, 14+ colors, multi-select)
  - Scent name (text input) + scent strength pill picker
  - Condition picker (`SLIME_CONDITION_LABELS` + descriptions)
  - Keyword tags (`KeywordTagInput`, free-text tags)
  - Purchase price
  - Photo upload (`ImageUpload`)
- **Step 2 — Ratings**
  - Header "Rate it" in cyan
  - Six `RatingSlider` instances stacked: Texture, Sound / ASMR,
    Aesthetic, Creativity, Quality, Overall
  - Overall has extra padding + a top divider
- **Step 3 — Notes**
  - Free-text notes textarea
  - Wishlist toggle, in-collection toggle
  - Privacy toggle (public / private)
  - Save button

Footer nav: Back / Next buttons (Save on last step). Save button
disabled on step 0 until a slime name is entered.

## Scope

Redesign the whole visual language of the wizard so it flows as one
coherent piece, tied into the how-to-rate palette and typography.
Everything in the numbered list below is in scope.

### 1. Step header + progress indicator

Currently a horizontal step dot row with numeric badges. Design should
propose a progress treatment that echoes the sticky pill row on
`/how-to-rate` and `/guide`: numbered pills, active pill glowing in
cyan, muted pills for future / past steps. Consider whether the header
should sticky-pin to the top of the viewport so users always know
where they are during long-scroll steps (Details is the tallest).

### 2. Step titles

Currently system font, moderate weight. Push to Montserrat black
display type per the how-to-rate hero. Two-line eyebrow + title stack:

- Eyebrow: `STEP 02` in cyan uppercase 12px, letterspacing 0.14
- Title: `Details` at 30px black, letterspacing -0.02em

The Ratings step title in particular can go rainbow gradient to
preview the axis palette the user is about to touch. Consistent with
`/how-to-rate` Overall.

### 3. Card surfaces

Every input container should use the app's canonical card treatment:
`rgba(45,10,78,0.3)` background, `1px solid rgba(45,10,78,0.7)`
border, `rounded-2xl` or `rounded-3xl`. Currently mixed. Standardize
across the four steps.

### 4. Ratings step shell (per-axis skin)

The Ratings step is the highest-value screen. Each of the six axes
gets its own container card, tinted with that axis's accent color:

- Texture card: green tint (`#39FF14` accent, faint green inset glow)
- Sound card: cyan (`#00F0FF`)
- Aesthetic card: magenta (`#FF00E5`)
- Creativity card: gold (`#FFD24A`)
- Quality card: violet (`#8B5CF6`)
- Overall card: rainbow gradient border + slightly more visual weight
  (larger padding, bolder title, maybe a subtle rainbow inset glow)

Each card contains: axis title in accent color (Overall in gradient
text), a short one-line hint (from the axis tagline — pull from
`RATING_AXES` in `/how-to-rate/content.ts`), and the slider itself.

### 5. Rating slider (folded in from retired brief)

The slider is the centerpiece of the Ratings step. Redesign
`RatingSlider.tsx` so:

1. **Gradient fill matches the how-to-rate five-stop scale.** Values
   1..5 should visually land on the same color they land on in the
   guide. Stops:
   ```css
   linear-gradient(90deg,
     #FF3D6E 0%,
     #FF7A2E 26%,
     #00A6FF 52%,
     #00E28A 78%,
     #39FF14 100%);
   ```
2. **Star markers under the track.** Five outlined star icons sit
   under the track, each centered on its integer position (1..5). As
   the user drags, stars up to and including the current band fill in
   with the band's accent color. Half-star / three-quarter states are
   TBD by Design — the underlying step is 0.25 (see `snapTo25`), so
   the slider must be able to represent 2.25, 2.5, 2.75, etc. Design
   should propose the treatment for fractional positions.
3. **Numeric readout.** Current label + numeric readout on the right
   side of the row (e.g. "Texture   3.75") stays. Consider coloring
   the number in the band's accent so it reinforces the mapping.
4. **Handle affordance.** Current handle is a solid white circle. Match
   the how-to-rate hero language — small glowing disc with the current
   band color as its ring. Preserve tactile touch-target size for
   mobile (44px minimum).
5. **Overall variant.** Currently gets extra padding and a top
   divider. Rainbow variant is available if Design wants to distinguish
   it further, but consistency with the other five sliders is a
   perfectly valid default.
6. **Constraints on the slider:**
   - Line SVG stars only (2px stroke). No emoji stars. No AI
     illustration.
   - Snap step stays at 0.25.
   - Component must remain accessible: keyboard arrow-key stepping,
     `aria-valuenow`, `aria-valuemin/max`, associated label.

### 6. Buttons

- Primary CTA (Next / Save) — match the how-to-rate footer CTA:
  green → cyan gradient background, black text, Montserrat black,
  green glow shadow.
- Secondary (Back / Cancel) — the muted purple card treatment
  `rgba(45,10,78,0.5)` background + border, white text.

### 7. Empty states + placeholders

Any "add a photo" tile, "search for a brand" hint, "no keywords yet"
state, "no rating set" state should use the same border language and a
neon accent on the hint copy. Design should propose one treatment and
apply it consistently.

### 8. Wizard background

The wrapper already picked up the viewport-fixed purple gradient and
optional ambient orbs on `/guide` and `/how-to-rate`. Design should
confirm whether to enable `orbs` on the wizard — probably yes since
Details and Ratings are both long-scroll surfaces.

## Flow / hierarchy questions Design should answer

These aren't skin decisions, they shape the choreography. Design
should propose an answer to each, and we'll green-light or push back:

1. **Ratings step: one long scroll of six sliders, or six sub-steps?**
   Current is one long scroll. Consider whether the user would
   benefit from a per-axis sub-step (like a slideshow through the
   six axes, one per screen) that lets each axis get a fuller
   treatment before moving on. Downside: adds five extra taps.
2. **Progress pill row: four steps as-is, or fold Ratings into a
   nested progress?** If step 2 is a scroll, the outer progress row
   stays at four. If step 2 becomes six sub-steps, the outer row
   could become "Identity → Details → Rating (1/6) → Notes" or
   similar.
3. **Photo upload placement.** Currently on Details (step 1). Should
   it move to step 0 (Identity) so the user identifies + photographs
   in one pass? Or stay where it is so photography is optional?
4. **Purchase price + wishlist / privacy toggles.** These live on the
   Notes step today. Do they belong on their own step called "Meta,"
   or are they fine buried at the end? Design's call.
5. **Sticky primary CTA.** Currently the Next / Save button is at the
   bottom of the scroll. Should it sticky-pin on mobile so it's
   always reachable? Especially matters on Ratings if we stick with
   the long-scroll variant.
6. **How does the user know they're on the last axis?** In the
   current implementation the Overall slider looks slightly different
   from the other five (extra padding, top divider). Is that enough,
   or should there be an explicit "Almost done" affordance so users
   understand Overall is the final gate?

## Constraints (non-negotiable)

- **No em-dashes** in any user-facing copy or labels. Applies to step
  titles, button labels, hint text, error messages, everything.
- **No AI-generated illustration.** Line SVG icons only (2px stroke).
  No character mascots, no illustrated humans. Real photos in the
  add-photo tile flow, geometric SVG everywhere else.
- **No emoji in new UI.** Existing emoji in copy stays (some scent /
  keyword labels use emoji), but no new decorative emoji.
- **Palette locked to the app palette:** cyan `#00F0FF`, slime green
  `#39FF14`, magenta `#FF00E5`, muted violet `#2D0A4E`, gold `#FFD24A`,
  plus the five scale stops (`#FF3D6E`, `#FF7A2E`, `#00A6FF`,
  `#00E28A`, `#39FF14`).
- **Per-axis colors on the Ratings step must match `/how-to-rate` exactly.**
  Texture = green `#39FF14`, Sound = cyan `#00F0FF`, Aesthetic = magenta
  `#FF00E5`, Creativity = gold `#FFD24A`, Quality = violet `#8B5CF6`,
  Overall = rainbow gradient (see how-to-rate/content.ts for exact stops).
- **Mobile-first** — target viewport is 375px wide. All CTAs must have
  a comfortable touch target (44px minimum height).
- **Fonts** — Montserrat black for headings and numeric readouts,
  system-ui for body copy.
- **Accessibility** — every input needs a visible label, every button
  needs an accessible name, focus states must be visible. If Design
  proposes a focus treatment (glow, ring), spec it here.

## Prior slider attempt — what didn't land

Design's first slider mockup shipped 2026-07-13 and Jenn wasn't a fan.
When Jenn attaches that mockup and specifics, we'll list here what
missed so Design doesn't repeat those choices. Empty for now.

## Explicitly out of scope

- The wizard's step logic, validation, or server-action flow — this is
  a visual + flow-hierarchy pass only. Any proposal that would
  restructure step ordering needs to be called out in the Flow
  questions above so we can green-light or push back before
  implementation.
- The `/log/edit/[id]` page (edit flow) — that reuses the same wizard;
  changes here apply there automatically once the pass ships.
- The photo upload primitive (`ImageUpload` component) internals —
  usable as-is but its wrapper card should match the new language.
- Text copy on the steps — copy is handled separately by Jenn; Design
  should treat current copy as placeholder for typographic weight and
  hierarchy only. Where new copy is needed (e.g. an "Almost done"
  affordance), Design should propose placeholder copy and Jenn will
  edit.

## Deliverables

1. Static PNG or HTML mockups of all four steps in the redesigned
   visual language. Both an empty state and a filled state per step
   would be ideal but not required for steps 0, 1, and 3.
2. **Ratings step mockups (highest priority):**
   - Empty state (no ratings set)
   - Fully filled state with mixed bands (not all 5s)
   - The Overall slider in its distinct treatment
   - Whichever slider treatment Design lands on for fractional
     positions (2.5, 2.75, etc.)
3. Answers to the six flow / hierarchy questions above, embedded in
   the mockup deck or noted separately.
4. Any spec deltas Design would like carried into implementation
   (padding, border radius, glow radius, focus ring, animation
   timing).
5. Callouts for anything that goes beyond a skin change — new step
   order, added / removed fields, new micro-interactions — so we can
   green-light or push back before implementation.

Once mockups land, implementation is a single-session pass in
`apps/web/app/log/page.tsx` plus small edits to `RatingSlider.tsx` and
the referenced input components. No new files, no new APIs, no server
changes.
