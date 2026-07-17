# Jenn asset brief — RevenueCat + App Store submission

**Purpose:** everything Jenn needs to produce before we can finish the RevenueCat + App Store Connect setup we paused on 2026-07-17.

Split into **Copy** (writing) and **Graphics** (design/screenshots). Each item has purpose, spec, and where it lives once produced.

Everything here blocks our path to iOS App Store submission (~1-2 months out). Nothing is urgent-urgent, but batching production now saves rework later.

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

### 12. Promotional Image (OPTIONAL, 1024×1024)

**Purpose:** shows on the App Store product page if we promote the subscription there, or for win-back offer emails.

**Spec:**
- 1024 × 1024 pixels exactly
- 72 dpi, RGB, flattened
- No rounded corners

**Skip for launch.** Only produce if we want to run win-back offers or promote the sub on the App Store product page. File as future work.

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
| 11 | 4-6 App Store product-page screenshots at 1290×2796 | Graphic | Before submission |

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
