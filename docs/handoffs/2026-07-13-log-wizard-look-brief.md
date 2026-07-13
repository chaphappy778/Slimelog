# Design brief — Log wizard visual redesign

Handed off: 2026-07-13
Owner: Design
Related tickets: T32e (how-to-rate build, shipped), T-slider (separate
slider brief filed 2026-07-13), T-wizard-look (this)
Related briefs: `2026-07-13-log-wizard-slider-brief.md` — that brief
covers the rating-slider component specifically. This brief covers the
wizard shell around it.

## Screenshots

Jenn is sending screenshots of the current log wizard separately. Drop
them in when you receive them:

- `_screenshots/wizard-step-0-identity.png` — {pending}
- `_screenshots/wizard-step-1-details.png` — {pending}
- `_screenshots/wizard-step-2-ratings.png` — {pending}
- `_screenshots/wizard-step-3-notes.png` — {pending}
- Any additional annotations Jenn calls out

Ref file: `apps/web/app/log/page.tsx` — the wizard is a single client
component with four steps: **Identity → Details → Ratings → Notes**.

## Why

`/how-to-rate` just shipped with a new visual language: gradient hero
cards per axis, per-axis accent colors, a five-stop scale bar in
red → orange → blue → teal → green, big Montserrat display type, and
scattered ambient blur orbs on the wrapper. The log wizard is the app's
most important interactive surface (every rated slime flows through it),
and it currently reads like a form from an earlier product generation.
The gap between "here's how rating works" (educational, beautiful) and
"okay, now rate one" (utilitarian, plain) is jarring.

We want the wizard to feel like the natural next step after reading
how-to-rate. Same color language, same type language, same energy.

## Scope

Redesign the visual shell around every step of the log wizard. Concretely:

1. **Step header + progress indicator.** Currently a horizontal step
   dot row (`Identity · Details · Ratings · Notes`) with numeric badges.
   Consider a slimmer treatment that echoes the sticky pill row on
   `/how-to-rate` and `/guide`: numbered pills, active pill glowing in
   cyan, muted pills for future steps. Reads as one visual family
   across all three surfaces.
2. **Step titles.** Currently system font, moderate weight. Push to
   Montserrat black display type per the how-to-rate hero treatment.
   Two-line eyebrow + title stack (e.g. eyebrow "STEP 02" cyan
   uppercase 12px letterspacing 0.14, title "Details" 30px black
   -0.02em). Optional gradient text on the title where it makes sense
   ("Ratings" can go rainbow to preview the axis palette).
3. **Card surfaces.** All input cards (brand search, color swatches,
   base type picker, condition picker, keyword tags, notes) should use
   the app's canonical card treatment: `rgba(45,10,78,0.3)` bg,
   `1px solid rgba(45,10,78,0.7)` border, `rounded-2xl` or `rounded-3xl`.
   Currently mixed. Standardize.
4. **Rating step specifically.** This is the highest-value screen and
   will change most. The `RatingSlider` redesign is in the separate
   brief (`2026-07-13-log-wizard-slider-brief.md`) — this brief handles
   the shell around it: axis label treatment, per-axis accent glow on
   the card surrounding each slider (Texture card faintly tinted green,
   Sound card faintly cyan, Aesthetic magenta, Creativity gold, Quality
   violet, Overall rainbow border), the Overall slider getting slightly
   more visual weight per its role as the culminating axis.
5. **Buttons.** Primary CTA (Next / Save) — match the how-to-rate
   footer CTA treatment: green → cyan gradient background, black text,
   Montserrat black, glow shadow. Secondary (Back / Cancel) — the
   muted purple card treatment `rgba(45,10,78,0.5)` bg + border, white
   text.
6. **Empty states + placeholders.** Any "add a photo" tile, "search
   for a brand" hint, "no keywords yet" state should be visually
   consistent — same border language, same neon accent on the hint
   copy.
7. **Wizard background.** The wrapper already picked up the
   viewport-fixed purple gradient + optional ambient orbs on `/guide`
   and `/how-to-rate`. Design should confirm whether the log wizard
   also wants `orbs` enabled — probably yes since it's a long-scroll
   surface once you're on Ratings.

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
  Overall = rainbow gradient (see how-to-rate/content.ts for the exact
  stops).
- **Mobile-first** — target viewport is 375px wide. All CTAs must have
  a comfortable touch target (44px minimum height).
- **Fonts** — Montserrat black for headings and numeric readouts,
  system-ui for body copy.
- **Accessibility** — every input needs a visible label, every button
  needs an accessible name, focus states must be visible. If Design
  proposes a focus treatment (glow, ring), spec it here.

## Explicitly out of scope

- The `RatingSlider` component internals (separate brief).
- The wizard's step logic / validation / server-action flow — this is a
  visual pass only. If Design's proposal implies a step reorder, that
  needs to be called out and confirmed before implementation.
- The `/log/edit/[id]` page (edit flow) — that reuses the same wizard;
  changes here apply there automatically once the pass ships.
- The photo upload primitive (`ImageUpload` component) — usable as-is
  but should be re-skinned to match the new card language.
- Text copy on the steps — copy is handled separately by Jenn; Design
  should treat the current copy as placeholder for typographic weight
  and hierarchy only.

## Current state (quick reference)

- **File:** `apps/web/app/log/page.tsx` — 900+ lines, four-step wizard
  as a single client component. Everything is inline styles + Tailwind.
- **Steps:** Identity (brand search, slime name, base type, subtype),
  Details (color swatches, scent name, scent strength pill picker,
  condition picker, keywords, photo upload), Ratings (six sliders),
  Notes (free text).
- **Existing helpers:** `BrandSearchInput`, `SubtypeAutocomplete`,
  `KeywordTagInput`, `FloatingPills`, `ImageUpload`, `RatingSlider` —
  all live in `apps/web/components/`. Redesign should preserve their
  APIs; only their visual skin changes.
- **PageWrapper:** the wizard is wrapped with `<PageWrapper>` (no dots,
  no glow, no orbs today). Design should decide whether to enable
  `orbs` for the wizard.

## Deliverables

1. Static PNG or HTML mockups of all four steps in the redesigned
   visual language. Both an empty state and a filled state per step
   would be ideal but not required for steps 0-1-3.
2. **Two full mockups of the Ratings step:** one with no ratings yet,
   one with all six ratings set to a representative value (mix of
   bands, not all 5s).
3. Any spec deltas Design would like carried into implementation
   (padding, border radius, glow radius, focus ring, animation
   timing).
4. Callouts for anything Design proposes that goes beyond a skin
   change — new step order, added / removed fields, new
   micro-interactions — so we can green-light or push back before
   implementation.

Once mockups land, implementation is a single-session pass in
`apps/web/app/log/page.tsx` plus small edits to the referenced input
components. No new files, no new APIs, no server changes.
