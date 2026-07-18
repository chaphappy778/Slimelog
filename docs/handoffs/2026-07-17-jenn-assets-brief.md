# Jenn asset brief — App Store + Play Store submission

**Purpose:** everything Jenn needs to produce before we can finish the RevenueCat + App Store Connect + Play Console setup. Refreshed 2026-07-18 to reflect the parallel iOS + Android launch decision (see T183) and three new work streams: launch badges (T184), slime recipes for /guide (T185), brand shop notes (T186).

Split into **Copy** (writing), **Graphics** (design/screenshots), and **Content** (guide expansion + badge concepts). Each item has purpose, spec, and where it lives once produced.

Most items block our path to iOS + Android submission (~1-2 months out). Badges + recipes can start now in parallel with the store submission grind.

---

## Copy

### 1. Pro subscription description (~30 words, product-side)

**Purpose:** the description Apple shows on the subscription purchase sheet and in the App Store subscription management screen. Also the description users see on `/settings/subscription`.

**Spec:**
- 30 words maximum
- Should reflect the actual Pro features live at Apple submission time
- No em-dashes, per house style

**Current features that Pro will unlock (all four TBD in build over next 1-2 months):**
1. Ad-free (once ads ship)
2. Slime aging reminders (per-log activator windows, daily "these need attention" digest)
3. Private logs (default public for free users)
4. Rating guide as a downloadable PDF

**Working placeholder** (used in ASC today):
> SlimeLog Pro unlocks premium features for serious slime collectors. Cancel anytime.

**What we'd swap in before Apple submission** (rough draft, needs Jenn's voice):
> SlimeLog Pro: ad-free experience, personalized activator reminders for your shelf, private logs, and the How to Rate a Slime guide as a downloadable PDF. Cancel anytime.

**Ask Jenn:** rewrite the "final draft" version to something punchier + on-brand. 30-word cap, keeps the 4 features, no em-dashes.

### 2. `/settings/subscription` page copy

**Purpose:** the current in-app copy sells features that don't exist yet ("unlimited logging" already free; "advanced stats" doesn't exist). Needs a rewrite matched to actual Pro feature set before Apple review. Filed as **T171**.

**Ask Jenn:** write the following for the page:
- Hero headline (~6 words): the aspirational Pro pitch
- Sub-headline (~15 words): what Pro unlocks in one sentence
- 4 bullet points (~10 words each): the 4 Pro features described benefit-first
- Monthly button label: `Go Pro — $2.99/mo`
- Annual button label: `Go Pro — $14.99/yr` (highlight the savings vs monthly)
- Small print under buttons: cancel-anytime + auto-renewal disclosure required by Apple

**Reference:** current text at https://slimelog.com/settings/subscription is what we're replacing.

### 3. App Store description (up to 4,000 chars)

**Purpose:** the long-form description on the SlimeLog App Store product page.

**Spec:**
- 4,000 character max
- Opens with the strongest pitch (first 3 lines are what users see before "more" tap)
- Community-authored + honest voice (per CLAUDE.md)
- No fabricated trust signals, no fake numbers
- Features list can be in bullets

**Sections Jenn should include:**
- Hook (~3 lines): what SlimeLog is + why it exists
- Core features (free tier): rate slimes, follow brands, browse the community
- Pro tier: the 4 Pro features + pricing
- The SlimeLog Guide (once available as a standalone $9.99 IAP)
- Community angle: slime community authority, no AI-generated content, real photos only

### 4. App Store subtitle (30 chars max)

**Purpose:** shows below the app name on the App Store product page.

**Working placeholder:**
> Your slime obsession, tracked.

**Ask Jenn:** confirm or replace. 30 char cap. Should sell the "utility + community" angle in one line.

### 5. App Store keywords (100 chars max, comma-separated)

**Purpose:** search discoverability. Not shown to users.

**Working list** (needs Jenn's community-know-how to sharpen):
`slime, asmr, rating, review, community, texture, butter, cloud, floam, drizzle, shelf, collection`

**Ask Jenn:** trim to fit 100 chars, prioritize search terms real collectors would type. Consider trending texture names.

### 6. What's New / release notes (for v1.0.0)

**Purpose:** the "What's New" section of the App Store product page for the launch release.

**Working template:**
> Welcome to SlimeLog. Log the slimes on your shelf, rate them across six axes, follow the brands you love, and share your finds with the community. Pro unlocks ad-free browsing, activator reminders, private logs, and the How to Rate a Slime guide.

**Ask Jenn:** 4,000 char cap, pump it up if she wants.

### 7. App Store review notes for reviewer

**Purpose:** helps Apple's reviewer understand what to look at. Never shown to users.

**Working template:**
> SlimeLog is a slime-collecting community app for hobbyists. To test:
> 1. Open the app and browse the Discover feed.
> 2. Sign up / sign in with email, Google, or Apple.
> 3. Log a slime from any brand via the Log wizard.
> 4. Rate the slime across six axes.
> 5. Tap Upgrade to Pro from Settings to test the subscription flow.
>
> Demo account (for reviewer):
> Email: `apple-review@chaphaus.com`
> Password: `[TBD]`
>
> Notes: SlimeLog Pro is an auto-renewable subscription that unlocks ad-free browsing, aging reminders, private logs, and the rating guide PDF.

**Ask Jenn:** confirm the flow narrative + create the demo account (or ask James to). Reviewer will actually log in with these credentials.

### 8. Support and marketing URLs

**Purpose:** required fields on the App Store product page.

**Working values:**
- Support URL: `https://slimelog.com/support` — needs to exist. Right now this route is not present. **Need Jenn's OK to build a lightweight FAQ/contact page + wire the support email inbox** (`support@slimelog.com`).
- Marketing URL: `https://slimelog.com` — already exists.

---

## Graphics

### 9. App icon (1024×1024, RGB PNG, no alpha channel)

**Purpose:** the master icon Apple uses. Xcode auto-generates every other size from this one.

**Spec:**
- 1024 × 1024 pixels exactly
- PNG (no transparency, no alpha channel — Apple flat-rejects transparent icons)
- RGB color space (not CMYK)
- No rounded corners, no glass effect (Apple applies both automatically)
- Fills the entire canvas — no whitespace around the mark

**Ask Jenn:** she's re-working the logo this weekend anyway. Please deliver as a 1024×1024 PNG at flat / no-transparency once the new logo lands.

### 10. Paywall screenshot for ASC subscription Review Information (REQUIRED)

**Purpose:** shows Apple's reviewer what the subscription/paywall screen looks like inside the app. Uploaded once per subscription product (twice total — Monthly + Annual, same file OK).

**Spec:**
- PNG or JPG
- Minimum: 640 × 920 iPhone
- Maximum: 500 KB file size
- Portrait orientation

**Ask Jenn:** take one screenshot of the `/settings/subscription` page (once the copy rewrite from item 2 lands) at desktop or mobile viewport. If she can't easily hit a mobile viewport, I can pull one from Chrome DevTools mobile emulation on my Mac.

### 11. App Store product page screenshots (REQUIRED)

**Purpose:** the visuals shown on the SlimeLog App Store product page.

**Spec:**
- **6.5" iPhone (required for submission):** 1290 × 2796 pixels, portrait
- **5.5" iPhone (older devices, optional but recommended):** 1242 × 2208 pixels, portrait
- **iPad 12.9" (optional, only if we target iPad):** 2048 × 2732 pixels, portrait
- Between 3 and 10 screenshots per size
- PNG or JPG
- Each up to 500 KB

**Content to feature** (Jenn's storytelling call):
- Discover feed / landing hero
- Log wizard (rating a slime)
- Slime detail with ratings visible
- The SlimeLog Guide
- Pro subscription screen (once the rewrite lands)

**Ask Jenn:** produce 4-6 screenshots at 1290 × 2796 that tell the SlimeLog story. Simulator screenshots from the iOS Simulator work if she wants clean device chrome — I can help capture those on my Mac once needed.

### 11a. Play Store product page screenshots (REQUIRED for Android launch — added 2026-07-18)

**Purpose:** the visuals shown on the SlimeLog Play Store product page. New requirement per T183 (parallel iOS + Android launch).

**Spec (Play Console's aspect ratios differ from Apple's):**
- **Phone screenshots:** minimum 320px, maximum 3840px on either side, aspect ratio between 9:16 and 16:9. Practical recommendation: 1080 × 1920 portrait, PNG or JPG, each up to 8 MB.
- **7" tablet (optional):** 1200 × 1920.
- **10" tablet (optional, only if we target tablet):** 1920 × 1200 or 2048 × 2732.
- Between **2 and 8** screenshots per format (Play's min is lower than Apple's).
- No transparency, no alpha channel — Play flat-rejects transparent PNGs.

**Content to feature:** same story as iOS screenshots (Discover feed, log wizard, slime detail, guide, Pro subscription), just re-exported at the Play aspect ratios.

**Ask Jenn:** produce 4-6 screenshots at 1080 × 1920. If she's already made the iOS 1290 × 2796 shots, cropping to 1080 × 1920 usually works — but frame content with the smaller safe area in mind so the crop doesn't clip anything important.

**Also required for Play:**
- **Feature graphic (Play Store banner):** 1024 × 500, PNG or JPG, up to 1 MB, no transparency, no text near edges (Play crops for different device widths). Big brand mark + tagline centered. Jenn's design call.
- **Play Store icon:** 512 × 512, PNG, 32-bit with alpha (opposite of Apple's flat-PNG rule). Can be derived from the same master logo as the iOS icon, just re-exported.

### 12. Promotional Image (OPTIONAL, 1024×1024)

**Purpose:** shows on the App Store product page if we promote the subscription there, or for win-back offer emails.

**Spec:**
- 1024 × 1024 pixels exactly
- 72 dpi, RGB, flattened
- No rounded corners

**Skip for launch.** Only produce if we want to run win-back offers or promote the sub on the App Store product page. File as future work.

### 12a. First 30 launch badges — designer brief (T184, added 2026-07-18)

**Purpose:** SlimeLog needs a visual badge system at launch to gamify collection, activity, and community participation. Jenn to lead the concept + reach out to a designer. James/Claude to spec and build the schema + earn logic.

**Concept:** 30 launch badges spanning four categories.

**Category A — Collection milestones (5 badges):**
1. **First Log** — logged your first slime
2. **Ten and Counting** — 10 logs
3. **Shelf Established** — 25 logs
4. **Century Club** — 100 logs
5. **Slime Sommelier** — 500 logs

**Category B — Textural explorer (8 badges, tie to base types Jenn defined in V4 guide):**
6. **Butter Believer** — first butter log
7. **Cloud Chaser** — first cloud log
8. **Floam Fluent** — first floam log
9. **Jelly Jockey** — first jelly log
10. **Glossy Goer** — first glossy log
11. **Clear Enthusiast** — first clear log
12. **Icee Initiate** — first icee log
13. **Textural Explorer** — logged in 10+ distinct base types

**Category C — Community actions (8 badges):**
14. **Brand Follower** — followed your first brand
15. **First Suggestion** — suggested a brand that got approved
16. **First Voice** — left your first comment
17. **Sharer** — shared a shelf link
18. **Streak Starter** — 7-day rating streak
19. **Streak Champion** — 30-day rating streak
20. **Drop Catcher** — logged a slime within 24 hr of its drop
21. **Popular Collector** — earned your first 10 followers

**Category D — Rare/special (9 badges):**
22. **Founding Member** — one of the first 500 signups (auto-fire on signup during launch window)
23. **Early Bird** — logged in the first 30 days
24. **Jenn's Pick** — a slime you logged got Jenn's-favorite tag
25. **Recipe Attempter** — logged a homemade slime (fires once T185 recipes ship + `is_homemade` column exists)
26. **Guide Scholar** — visited all 12 parts of the guide in one session (client-side tracker)
27. **Rating Rigor** — 20 consecutive logs rated on all 6 axes
28. **Brand Loyal** — 10+ logs of a single brand
29. **One-of-One** — logged a limited-run drop (fires when the drop's `total_tubs` was ≤50)
30. **Suggester** — 5 suggested brands got approved (community curator)

**Design spec (for the designer Jenn hires):**
- 30 unique badge visuals at **512 × 512 PNG** (transparent bg OK, we'll composite over glass cards).
- Also **256 × 256** variant for compact display (small rows, notifications, etc).
- Also **SVG source** for infinite-scale crispness.
- **Palette:** SlimeLog's signature colors — cyan `#00F0FF`, slime green `#39FF14`, magenta `#FF00E5`, violet `#2D0A4E`, gold `#FFD24A`. Rare/legendary badges lean gold + magenta.
- **Style:** matches SlimeLog's neon-glass aesthetic. No character mascots, no illustrated humans, no AI-generated visuals. Geometric shapes + gradient fills + line-SVG icons + glow effects.
- **Rarity tier visual cue:** common = cyan glow, uncommon = green glow, rare = magenta glow, legendary = gold glow + rainbow border.
- **Coherent set:** all 30 should read as belonging to one system when displayed together on a profile.

**Ask Jenn:**
1. Review + refine the 30-badge list above (rename, cut, add).
2. Draft a designer brief (Jenn can use this section as a starting point).
3. Reach out to community designers on Instagram / Twitter — the slime community has a talent pool who understand the aesthetic. Bidding on a fixed-price package ($1500-3500 typical range for a 30-badge set) rather than hourly.
4. Deliver files into `/docs/handoffs/badges/` when they land.

**Post-launch:** seasonal badges + brand-collab badges become a hook for cross-promo. Locked-in Aug 2026 planning.

### 12b. Slime recipes for The SlimeLog Guide (T185, added 2026-07-18)

**Purpose:** expand /guide to include basic slime recipes so the guide doubles as a "before you buy / before you make" resource. Adds educational depth, long-tail SEO, and a natural bridge to homemade-log support in v2.

**Ask Jenn:** write ten starter recipes matching the ten most common base types.

**Recipe list (Jenn confirms/edits):**
1. Classic Butter Slime
2. Basic Cloud Slime
3. Fluffy Floam
4. Jelly Slime
5. Glossy Slime
6. Clear Slime
7. Thick + Glossy
8. Icee / Instant Snow Slime
9. Snow Fizz
10. Magnetic Slime

**Per-recipe spec:**
- Ingredient list with typical availability note ("PVA glue, Amazon or Michaels")
- Tools needed (mixing bowl, spoon, activator)
- Step-by-step (numbered, direct voice, **no em-dashes** per house rule)
- Knead time
- Activator ratio (borax solution / contact solution / saline — safety note for borax)
- Storage tips
- "How to know it's done" tactile signal
- 2-3 line "What went wrong" mini-troubleshooting

**Legal callout at top of Part 13** (Jenn to write, Claude can draft): activator safety (borax mixing warnings, adult supervision, no eating), sourcing note that homemade is complementary to buying from real slime shops (not competitive — we still want people supporting the community).

**Visuals:** Jenn's own kitchen shots ideal. Anti-AI-art rule: real photos or geometric visuals only.

**Timing:** any time in next 4 weeks. Once Jenn delivers, Claude ships as `/guide` Part 13 in ~1-2 days.

### 13. Feature graphic / preview video (OPTIONAL)

**Purpose:** short preview video played on the App Store product page above the screenshots. Increases conversion but not required.

**Spec:**
- 15-30 sec MP4 or MOV
- No voice-over (music optional)
- App-only footage — no personal photos, no "coming soon" cards

**Skip for launch v1.** Add later if we do a Version 2 push.

---

## Batch summary — what Jenn needs to send back

| # | Item | Type | Priority |
| --- | --- | --- | --- |
| 1 | Final Pro subscription description (~30 words) | Copy | Before ASC finalize |
| 2 | `/settings/subscription` page copy (headline + bullets + button labels) | Copy | Before Apple submission |
| 3 | App Store long description (up to 4000 chars) | Copy | Before submission |
| 4 | App Store subtitle (30 char) | Copy | Before submission |
| 5 | App Store keywords (100 char) | Copy | Before submission |
| 6 | What's New for v1.0.0 | Copy | Before submission |
| 7 | Review notes + demo account credentials | Copy + Ops | Before submission |
| 8 | Support page decision (build lightweight FAQ page? OR external URL?) | Product call | Before submission |
| 9 | 1024×1024 flat PNG app icon | Graphic | Once new logo lands (this weekend) |
| 10 | Paywall screenshot (from `/settings/subscription` post-rewrite) | Graphic | Once copy rewrites land |
| 11 | 4-6 App Store product-page screenshots at 1290×2796 | Graphic | Before iOS submission |
| 11a | 4-6 Play Store product-page screenshots at 1080×1920 + 1024×500 feature graphic + 512×512 Play icon | Graphic | Before Android submission |
| 12a | 30-badge concept refinement + designer outreach (T184) | Content + Ops | Any time, ideally before Aug so designer has runway |
| 12b | 10 slime recipes (T185) — ingredients, steps, activator ratio, storage, troubleshooting | Content | Any time in next 4 weeks |

---

## Where to file completed assets

- **Copy blocks:** paste into this doc under each section, replacing the working placeholders.
- **Graphics:** save PNGs into `/docs/handoffs/apple-submission-assets/` (a new subdirectory — we can create it when the first file lands).
- **Confirmation to me:** ping James when a batch is ready and I'll fold them into ASC + the codebase in the appropriate build session.

---

## Related tracker items to file / update

- **T171** — Rewrite `/settings/subscription` page copy to match final Pro feature set. Blocked on item 2 above.
- **T170** — SlimeLog Guide as standalone $9.99 non-consumable IAP (from earlier chat).
- **#26 App Store checklist** — items (b) metadata pack, (c) privacy delta, (d) privacy nutrition label, (e) age rating, (f) support email, (g) demo account — all covered here.
- **T183** — Parallel iOS + Android launch track. Drives items 11a + the Play-side add-ons (Data Safety form, content rating questionnaire, Play Billing SKU mirroring).
- **T184** — First 30 launch badges. Item 12a is the concept refinement + designer outreach.
- **T185** — Slime recipes in /guide Part 13. Item 12b is Jenn's ten recipes.
- **T186** — Brand shop notes / user reviews. No Jenn asset requirement — design decision needed first (private-by-default V1 vs public reviews V2). Post-launch weeks 2-4.
