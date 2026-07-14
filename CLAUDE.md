# CLAUDE.md

You are working on **SlimeLog**, a community-authored slime rating, logging, and social-shelf app. **Read this file at the start of every session before writing code.** Also open the three living docs listed below in "Reference Docs" before any non-trivial change.

## Reference Docs — read before code

Always open the relevant one(s) before touching code:

- **`docs/SlimeLog_Tracker.md`** — Living ticket queue. Check for the item you're working on. Item IDs (T29, T110, T113, etc.) get referenced in commits and comments.
- **`docs/error-tracker.md`** — Known bug patterns + prevention rules. **Read this before writing new code**, especially anything touching auth, database queries, migrations, moderation, or server actions. Add an entry when you fix something non-trivial. Prevention patterns at the top of each entry are the most valuable reads.
- **`docs/cost-tracker.md`** — Query cost + scaling watch items. Consult when adding a new database query or aggregation. Add an entry when you add a query that will grow with users.
- **`docs/monetization-plan-2026-07-07.md`** — 8-pillar monetization strategy. Read before any revenue-related work.
- **`docs/pre-launch-audit-2026-07-06.md`** — Security + hardening audit progress.

## What this is

Mobile-first slime rating and collection app. Users log slimes, rate them across six dimensions (Texture / Sound / Aesthetic / Creativity / Quality / Overall), follow brands, share shelves, and eventually resell slimes on a peer-to-peer marketplace. Community-authored: brand catalog, slime type guide, and rating vocabulary all come from user contribution.

## What this is not

- Not an AI-art project. **Community sensitivity is real.** Vocal slime artists actively pressure creators against AI-generated assets. No character mascots, no illustrated humans, no AI-generated imagery. Real photos or human illustrator commissions only. Everything else is geometric (blur orbs, gradients, line SVG icons, ambient effects).
- Not a Product Hunt launch. Slime community isn't there. Instagram (@slimelog + Jenn's review account) is the growth engine.
- Not a custom payment processor. Marketplace uses Stripe Connect. Do not entertain custom payments infrastructure.

## Architectural conventions (do not deviate without asking)

- **Framework:** Next.js 16 App Router, TypeScript strict. `apps/web/` is the deployed app.
- **Database:** Supabase (Postgres + Auth + Storage + RLS). Migrations at `supabase/migrations/`, numbered `YYYYMMDDNNNNNN_description.sql`. Apply via `npx supabase db push`.
- **Auth:** `@supabase/ssr` on server, singleton browser client at `apps/web/lib/supabase/client.ts`. Never call `getUser()` from client code — use `useAuth()` from `AuthProvider`.
- **Payments:** Stripe on web (already live for Pro tier). Apple IAP + Google Play Billing on native via RevenueCat, which unifies entitlement state across all three stores. Stripe Connect for the future peer-to-peer marketplace. Never build custom payments.
- **Native app packaging:** Capacitor Pattern B — a thin native shell that opens `https://slimelog.com` in a hardened WebView with native plugins for IAP, push notifications, SIWA, camera, and deep links. Server components + API routes work exactly as on web. Vercel push updates the "web" side immediately with no App Store cycle. App Store re-submission only needed for native shell changes (new Capacitor plugins, IAP SKU changes, permission changes, version bumps, native code fixes). Static export (Pattern A) is NOT used — it breaks the server components we rely on.
- **State:** React 18/19 server components where possible. Client components use `useAuth()` from `components/AuthProvider.tsx` for user state — don't fire your own `getUser()`.
- **Styling:** Tailwind + inline styles for the neon accents. Signature palette: cyan `#00F0FF`, slime green `#39FF14`, magenta `#FF00E5`, muted violet `#2D0A4E`, gold `#FFD24A` (sparingly). Card surfaces: `rgba(45,10,78,0.3)` with `1px solid rgba(45,10,78,0.7)` border, `rounded-2xl` or `rounded-3xl`.
- **Fonts:** Montserrat black for headings/numbers, system-ui for body.
- **Icons:** Line SVG, 2px stroke. No emoji in code paths unless the user explicitly asks. Existing emoji stays.

## Voice + copy rules (external / user-facing)

- **No em-dashes** in copy that reaches users. Use commas, periods, parentheses, or restructure. Applies to marketing pages, emails, blog posts, in-app copy, notifications, admin action results the user might see.
- **"You" not "the user."** Direct address.
- **Slime-flavored where fun, direct where not.** Don't over-flourish; Jenn's V4 guide draft tightened the "gems of the slime world" style into direct sentences. Match that energy.
- **No fabricated trust signals.** Never invent testimonials, founder interviews, or activities the project hasn't done.
- **User-visible terminology decisions:**
  - **"Variant" not "Subtype"** (matches Jenn's guide vocabulary). DB column `subtype_id` stays.
  - **"logs" not "tubs"** in community totals (leaderboard, marketplace, etc.).
  - **"My Shelf" not "Collection"** in the bottom nav and hamburger.
  - **"The SlimeLog Guide"** at `/guide` (formerly `/slime-types`).

## Database rules

- **`brands.name` is the column.** Not `brands.name_raw` — that column doesn't exist on `brands`. `brand_name_raw` lives on `collection_logs` as a free-text fallback. This confusion has hit multiple times; always cross-check `20260324000001_slimelog_initial_schema.sql` when writing a query against `brands`.
- **Migrations ship first, then code that references new columns.** When that's not possible, add a defensive fallback in the code so the endpoint tolerates the missing column. See `docs/error-tracker.md` for the "migration-lag" pattern.
- **All Supabase queries destructure `{ data, error }`** and log on error via `console.warn` or `console.error`. Never silently swallow errors — the `BrandSearchInput` and `AuthProvider` bugs both stemmed from silent-failing queries.
- **INSERT / UPDATE go through the anon-key client** (ssr) so RLS runs. Use the admin client (`createAdminClient()`) only when RLS would hide required data (cross-user aggregates, admin actions, etc.).

## Server action rules

- **Return a result union for validation failures.** Next.js strips thrown Error messages in production ("The specific message is omitted..."). Server actions that need to surface friendly copy MUST return `{ ok: true, ... } | { ok: false, error: string }` instead of throwing. Only throw for unexpected runtime errors the user shouldn't see anyway.
- **Client fetches with user input need race protection.** Add a request-id counter and drop stale responses. See `BrandSearchInput.tsx` for the pattern.
- **AuthProvider releases the UI on session, hydrates profile in background.** Never gate the whole app on a slow profile query. See `components/AuthProvider.tsx`.

## Moderation

- **All user-authored text runs through `lib/moderation.ts`.** Usernames, brand suggestion names/notes, slime names, collection names, notes, comments, report reasons, brand bios, etc.
- **`obscenity` + custom regex patterns.** English dataset omits some obvious words for false-positive reasons (e.g. `cock`); custom patterns fill in the compound forms.
- **False positives → `PROFANITY_WHITELIST`.** Don't disable the matcher wholesale.
- **Admin-authored text is exempt.** Admins are trusted.

## File organization

- `apps/web/app/` — Next.js App Router routes. Server components are the default.
- `apps/web/components/` — shared components. Feature folders for large surfaces (`marketplace/`, `notifications/`, `collection/`, `leaderboard/`, etc.).
- `apps/web/lib/` — shared utilities. `supabase/`, `moderation.ts`, `types.ts`, action files.
- `apps/web/app/api/` — API route handlers. Prefer server actions for internal use; API routes for external calls (webhooks) or when the browser needs a fetch for polling/hydration.

## Common gotchas (short — details in error-tracker)

1. **Migration lag on live endpoints.** When a fresh column is referenced, either ship migration first or fall back to a legacy column set. Silent 500 → client stays on the wrong state.
2. **Server actions strip Error messages in prod.** Use result unions, not throws, for user-facing validation.
3. **Global providers gating on the slowest thing.** AuthProvider fixed. Watch for other "gate the whole app on one query" patterns.
4. **`brand.name_raw` doesn't exist.** Use `brand.name` on the brands table. `brand_name_raw` is on `collection_logs`.

## Things that should make you stop and ask

- Any request to add a custom payment processor. Push back — Stripe Connect.
- Any request to add AI-generated visuals to the app UI. Push back — community sensitivity.
- Schema changes to existing columns (renames, type changes) that would orphan data. Propose an additive migration + backfill instead.
- Anything that would log or transmit API keys.
- Marketing content that references features not yet built.
- Product Hunt launches — the slime community isn't there.

## Working style

- Use skills when they match — `docx`, `pptx`, `pdf`, `xlsx` skills are set up.
- Delegate big builds to subagents with explicit READ FIRST lists. See recent T110 / T113 / T29 handoffs for the pattern.
- After implementing a component, verify by running `npm run type-check` from `apps/web/`. All builds should end with a clean pass.
- If migration + code both change, ship the migration first. Include `npx supabase db push` in the deploy instructions.
- Update the tracker (`docs/SlimeLog_Tracker.md`) when items land or new items surface.
- When you fix something non-trivial, add an `error-tracker.md` entry with the prevention pattern.

## Don't

- Don't reference `brand.name_raw`.
- Don't throw plain `Error` from server actions for validation.
- Don't add AI-generated illustrations.
- Don't include em-dashes in user-facing copy.
- Don't ship code that references a fresh column without the migration also going out.
- Don't gate the whole app on the slowest query in a global provider.
- Don't fabricate testimonials or activity numbers.
- Don't commit `.env`, `data/*.db`, or `__pycache__/`.

## Current phase

Pre-launch. See `docs/SlimeLog_Tracker.md` for active items; `docs/pre-launch-audit-2026-07-06.md` for remaining hardening. Instagram-led growth via @slimelog and Jenn's review account.
