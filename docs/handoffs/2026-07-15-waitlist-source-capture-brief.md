# Design brief — Waitlist attribution capture

**Date:** 2026-07-15
**Ticket:** side quest (paid promo + giveaway attribution)
**Priority:** ship before paid ads run
**Target file:** `apps/web/app/waitlist/page.tsx`

## Why we're doing this

We're about to run paid promo + giveaways to grow the waitlist beyond the
current 42 signups. Without attribution capture, we won't know which channel
converts. Backend is already wired: new columns on `public.waitlist`
(heard_from, utm_source, utm_medium, utm_campaign, utm_content, utm_term) and
the POST endpoint accepts them (migration `20260715000074`, code shipped
2026-07-15). What's missing is the UI to ask.

## What to add

**One new question on the /waitlist page: "How did you hear about us?"**

Presented as a picker with these 7 options (in this order, the ordering is
data-driven from where we expect the largest volume to come from):

1. Instagram
2. TikTok
3. YouTube
4. Friend or family
5. Giveaway
6. Search
7. Other (with a small free-text input that appears inline when Other is
   selected — max 74 chars)

Everything is **optional**. Signup must complete even if the user skips the
question. Do NOT block the Join Waitlist button on this field being set.

## Constraints — preserve everything about the current page

- Same page URL (`/waitlist`), same route, no new pages.
- Same visual language: dark radial gradient background, floating pills,
  background dots, SlimeLog wordmark, glass card, green→cyan gradient
  primary button. Do not redesign the shell, just extend it with the new
  question card.
- Same fonts (Montserrat), same signature palette (cyan `#00F0FF`,
  green `#39FF14`, magenta `#FF00E5`, muted violet `#2D0A4E`).
- Same copy for the hero ("Be First In Line") + subtitle + form.
- Same email field, same marketing consent checkbox, same age/privacy
  footer copy, same links to Terms + Privacy.
- Same success + duplicate states.
- Mobile-first — the whole thing has to feel right on a 6.1" phone
  screen. The page is what people land on from Instagram taps, which
  is 90%+ mobile.
- No em-dashes in any copy (SlimeLog house rule per CLAUDE.md).

## Placement question — choose one

Two viable placements, Design picks based on visual balance and vertical
rhythm on mobile:

**Option A — after the email input, before marketing consent.** Reads
naturally as "here's my email, here's how I found you, and yes send me
updates". Vertical order:

  Email input
  → How did you hear about us? (chip picker)
  → Marketing consent checkbox
  → Join Waitlist button

**Option B — after the marketing consent checkbox, before the button.**
Positions the attribution question as a small optional sidecar rather
than a primary form field. Vertical order:

  Email input
  → Marketing consent checkbox
  → How did you hear about us? (chip picker, visually softer)
  → Join Waitlist button

Design recommendation welcome. I lean Option A because it keeps the button
close to the marketing consent it authorizes (Apple/Google Play both look
for the consent + button relationship on submission flows).

## Visual treatment for the picker

Chip-row style matching the existing SlimeLog aesthetic elsewhere in the
app (see `apps/web/components/discover/TypeLogsClient.tsx` for the sort
chip pattern):

- 7 chips in a wrapping row, chip label = option name
- Unselected: muted purple card treatment
  (`rgba(45,10,78,0.35)` background, `1px solid rgba(255,255,255,0.15)`
  border, off-white text 70% opacity)
- Selected: cyan glow
  (`background: rgba(0,240,255,0.12)`, border `1px solid #00F0FF`,
  text `#00F0FF`, subtle 0 0 12px cyan shadow)
- Tap target minimum 44px tall for iOS thumb-reach compliance
- Single-select behavior — tapping a new chip deselects the previous
- Small header above the row: "How did you hear about us?" in the same
  muted uppercase Montserrat 800 label style used elsewhere on the page
  (see the marketing consent label styling)
- Subtitle below the header, optional and small: "Helps us focus where
  we show up" or similar — Design's call on copy, keep under 8 words

When user picks "Other" the chip stays selected AND an inline text input
appears below the chip row:

- Same input styling as the email field
- Placeholder: "Where did you hear about us?"
- Max length 74 characters (client-side enforced; server hard-caps at 80
  including the `other:` prefix)
- Optional — no validation error if left blank

## What to submit

The Design agent should deliver a single updated `WaitlistPage` component
in the same file structure as the current `apps/web/app/waitlist/page.tsx`.
Preserve every helper (`FloatingPill`, `Wordmark`, `BackgroundDots`,
`WaitlistForm`) and add a new small `HeardFromPicker` inline component or
extract it — either is fine, whichever reads cleaner.

Do NOT change the POST payload shape beyond adding the new field.
Existing API accepts:

```json
{
  "email": "user@example.com",
  "marketing_consent": true,
  "heard_from": "instagram" | "tiktok" | "youtube" | "friend_or_family" | "giveaway" | "search" | "other" | "other:<free text>"
}
```

Everything else is optional (utm_*) and comes from URL params in step 2 below.

## Bonus (small addition, but shipped in same PR)

Auto-capture UTM query params from the page URL and pass them through to
the API. When someone clicks a paid ad or a tagged giveaway link like:

  `https://slimelog.com/waitlist?utm_source=instagram_ads&utm_campaign=slime_giveaway_summer&utm_content=creative_a`

...the form should read those params from the URL on mount and include
them in the POST payload alongside the user's self-reported heard_from
answer. Both vectors get stored — self-report for organic, UTMs for paid.
The user should NOT see the UTMs — capture happens silently via
`useSearchParams` on the client component.

Params to capture: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`utm_term`. Each is optional and passes through as-is (server-side clamps
to 200 chars).

## Success + duplicate states

Unchanged. Preserve the existing copy and the follow-@SlimeLogApp CTA.

## Deliverable

Updated `apps/web/app/waitlist/page.tsx`. Also drop mockup images (mobile
6.7" iPhone frame) into `outputs/waitlist-source-capture/` so I can review
before pushing.

## Related backend files (do NOT modify — already shipped)

- `supabase/migrations/20260715000074_waitlist_source_tracking.sql`
- `apps/web/app/api/waitlist/route.ts` (accepts new fields, normalizes them)
- `apps/web/lib/brevo.ts` (propagates HEARD_FROM to Brevo for segmentation)

## Brevo dashboard follow-up (Jennifer)

Before we push, add a new contact attribute in Brevo:
- Name: `HEARD_FROM`
- Type: TEXT

Path: Contacts > Contacts > Settings > Contact attributes > +Add.

If we forget this step, signups still work — the sync just skips the attribute
on Brevo's side (Brevo silently drops unknown attributes). But we lose the
segmentation utility, which is the whole point of capturing this data.
