# Design brief — Log wizard rating slider redesign

Handed off: 2026-07-13
Owner: Design
Related tickets: T32e (how-to-rate build, shipped), T-slider (this)
Ref components:
- `apps/web/components/RatingSlider.tsx` — the component in scope
- `apps/web/components/how-to-rate/ScaleSection.tsx` — the color language we are matching to
- `apps/web/app/how-to-rate/content.ts` — canonical scale color stops

## Why

We just shipped `/how-to-rate`, which finalized a five-band color scale for
the star ratings 1..5 (Skip / Under / Solid / Great / Elite). The final
"07 The Scale" section uses a five-stop gradient bar that maps 1:1 to
those bands:

```
1 (Skip)   → #FF3D6E  red
2 (Under)  → #FF7A2E  orange
3 (Solid)  → #00A6FF  blue
4 (Great)  → #00E28A  blue-green
5 (Elite)  → #39FF14  green
```

The log wizard's `RatingSlider` was designed before that scale existed
and currently uses a three-stop gradient (`#2D0A4E → #00F0FF → #39FF14`).
When a user reads `/how-to-rate` and then opens the log wizard, the
mental model breaks: the guide taught them a five-color scale, but the
wizard shows them a two-color one. Users will either

1. Assume the wizard fill color is meaningful and try to decode it, or
2. Assume the guide's color language does not apply here.

Both are bad. We want the wizard slider to carry the same color language
as the how-to-rate scale, so the user's rating action visually confirms
what band they just landed on.

## Scope

Redesign `RatingSlider.tsx` so that:

1. **The gradient fill matches the how-to-rate five-stop scale.** Values
   1..5 should visually land on the same color they land on in the
   guide. The exact stops:
   ```css
   linear-gradient(90deg,
     #FF3D6E 0%,
     #FF7A2E 26%,
     #00A6FF 52%,
     #00E28A 78%,
     #39FF14 100%);
   ```
2. **Star markers under the track.** Five outlined star icons sit under
   the track, each centered on its integer position (1..5). As the user
   drags, stars up to and including the current band fill in with the
   band's accent color. Between-integer values (2.25, 2.5, 2.75) show
   the star at that position half-filled or three-quarter-filled — TBD
   by Design. The current step is 0.25 (see `snapTo25`).
3. **Numeric readout stays.** The current label + numeric readout on
   the right side of the row (e.g. "Texture   3.75") is fine. We may
   want to color the number in the band's accent color so it reinforces
   the mapping.
4. **Handle affordance.** The current handle is a solid white circle.
   Match Design's mockup style — likely a small glowing disc with the
   band color as its ring. Preserve the tactile touch-target size for
   mobile.
5. **Overall variant.** When `isOverall` is true, the slider currently
   gets extra padding and a divider above. Design can push this further
   if it helps distinguish the culminating axis from the five per-axis
   sliders. The rainbow gradient we chose for Overall's `/how-to-rate`
   hero is available if Design wants a rainbow variant here too, but
   consistency with the other sliders is fine as a default.

## Constraints (non-negotiable)

- Line SVG stars only. No emoji stars. No AI-generated illustration.
  2px stroke matches the rest of the app.
- Palette limited to the app palette: cyan `#00F0FF`, slime green
  `#39FF14`, magenta `#FF00E5`, muted violet `#2D0A4E`, gold `#FFD24A`,
  plus the five scale stops listed above.
- No em-dashes in any labels or helper copy that reaches the user.
- Touch target: the whole track row should stay tappable on a 375px
  wide viewport (log wizard is mobile-first).
- Snap step stays at 0.25. Do not propose 0.1 or 0.5.
- Component must remain accessible: keyboard arrow-key stepping,
  aria-valuenow, aria-valuemin/max, and a text label associated to the
  input.

## Deliverables

1. Static PNG or HTML mockup of the redesigned slider in three states:
   idle (no value), mid-drag at 2.75, and settled at 5.
2. Same three states for the `isOverall` variant.
3. Any small spec deltas we should carry into the implementation
   (handle diameter, glow intensity, star size, tick behavior).
4. If you propose changing the numeric readout treatment (color,
   position, weight), include a before/after so we can eyeball it.

Once Design lands mockups, implementation is a straight port into
`apps/web/components/RatingSlider.tsx`. No new file, no new API. Should
be a same-session build.

## Out of scope

- The wizard shell, step chrome, or navigation.
- Any change to the underlying rating storage (still six numeric axes
  in the `ratings` schema, values 0..5 in 0.25 increments).
- The "withhold a rating" callout in the wizard (that lives in a
  separate copy pass).
- The per-axis educational blurbs on the wizard steps (those already
  point users to `/how-to-rate` and are fine).
