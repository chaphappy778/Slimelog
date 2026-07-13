# SlimeLog Tracker — Living Document

*Single source of truth for active issues, technical debt, and action items.*

**Last Updated:** July 7, 2026  |  **Owner:** Jennifer Chapman

---

## Reference Docs (living)

Strategic and planning documents that inform work below. Refresh from these before starting a new work thread.

| Doc | Scope | Last touched |
| --- | --- | --- |
| [monetization-plan-2026-07-07.md](./monetization-plan-2026-07-07.md) | 8-pillar monetization strategy, revenue projections ($16-50M exit target), sequenced schema roadmap, realistic timelines with AI pairing. Read before starting any monetization-related work. | 2026-07-07 |
| [pre-launch-audit-2026-07-06.md](./pre-launch-audit-2026-07-06.md) | Full pre-launch security + code audit. 7 blockers ✅ shipped 2026-07-06; HP 8-14 ✅ shipped 2026-07-07; HP 15+ pending. Next up: HP 15 (input validation on /api/wishlist + /api/report). | 2026-07-07 |
| [schema-reference.md](./schema-reference.md) | Database schema reference. | see file |
| [hub-snapshot.md](./hub-snapshot.md) | Auto-generated snapshot from the StartupLenz hub. | see file |

---

## Status Legend

| Status | Meaning |
| --- | --- |
| READY | Available to work on now, no blockers |
| IN PROGRESS | In progress, has open work threads |
| BLOCKED | Waiting on external dependency |
| DONE | Shipped and verified |
| DEFERRED | Post-launch or lower priority right now |

---

## High Priority — Pre-Launch / App Store Blockers

| # | Issue | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 14 | Subscription terms display | HIGH | BLOCKED | Apple requires auto-renewal terms on purchase screen. Part of #22. |
| 22 | RevenueCat integration | HIGH | BLOCKED | Re-blocked on D&B address propagation post-May 6. iOS IAP for User Pro. |
| 23 | Capacitor packaging for iOS | HIGH | BLOCKED | Same chain as #22. |
| 26 | App Store review checklist | HIGH | IN PROGRESS | Final review pre-submission. |
| 33 | Password reset link broken | HIGH | DONE | 2026-07-10: root cause was PKCE code_verifier missing from browser storage — @supabase/ssr stores it in HTTP-only cookies accessible only server-side, but /reset-password was trying to exchange the code client-side. Fix: /forgot-password now sets redirectTo=/auth/callback?next=/reset-password?flow=recovery, /auth/callback short-circuits recovery flows by exchanging the code server-side then redirecting to the reset form with an established session. /reset-password recognizes ?flow=recovery + existing session as the ready state. |

---

## Medium Priority

| # | Issue | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 4 | Push notifications | MEDIUM | READY | Drop alerts. Infrastructure not started. |
| 5 | Referral program | MEDIUM | DONE | 2026-07-10: shipped as combined feature with #30. Mig 62 (schema + code gen + backfill) + mig 63 (activation trigger + milestone rewards). ?ref= capture at signup + cookie fallback for OAuth. /invite dashboard + /i/[code] short-link. Milestones 5/25/100 → +1/+6/+12 Pro months, additive. Root-cause bug: /auth/confirm route was the actual email signup path, not /auth/callback — earlier fixes were on the wrong route. Also caught unrelated bug: /welcome page overwriting marketing_consent for email signups. |
| 16 | Data export (GDPR) | MEDIUM | DONE | 2026-07-10: /api/account/data-export returns a JSON download containing every row of user-owned data across profiles, collection_logs, brand_ratings, follows (both directions), brand_follows, comments, likes, comment_likes, notifications, activity_feed, slimes_created, brands_owned, brand_claims. Auth via session — never accepts a user_id from the request. Wrapped with _meta block (schema version + timestamp) for future export upgrade compatibility. Button in Settings → Privacy & Data. |
| 17 | Marketing consent flag | MEDIUM | DONE | 2026-07-10: mig 61 adds profiles.marketing_consent + marketing_consented_at (default false, GDPR opt-in). Captured on /signup + /welcome + /settings toggle. Brevo sync via syncContactMarketingConsent(). Enforcement comment in lib/brevo.ts requires all marketing routes to filter marketing_consent = true. |
| 19 | In-feed advertising | MEDIUM | DEFERRED | Free tier only. Defer post-launch. |
| 20 | Double toast on Pro upgrade | MEDIUM | DONE | 2026-07-10: root cause was the upgrade-toast useEffect re-running on remount (React 18/19 strict mode double-invoke in dev, potential remount edge cases in prod). Fix: ref-guarded fire in /settings/profile so the toast can only ever surface once per page-load regardless of remount cycles. |
| 21 | Duplicate subscriptions check | MEDIUM | DONE | 2026-07-10: /api/stripe/checkout now queries Stripe directly when the DB says "not active" — catches the case where subscription_status has drifted stale (e.g., HP-8 webhook update silently dropped). If Stripe shows a live active/trialing sub for the customer, we route to billing portal instead of creating a duplicate + reconcile the DB row using the found subscription's status + item.current_period_end. |
| 25 | Pro upgrade button in SlimeMenu | MEDIUM | BLOCKED | Deferred with RevenueCat. |
| 28 | Search | MEDIUM | READY | Global search across slimes, brands, users. |
| 29 | In-app notifications | MEDIUM | DONE | 2026-07-12: shipped notification bell + /notifications feed reading from `public.notifications`. New routes: `GET /api/notifications` (RLS-scoped, polymorphic joins on actor/brand/drop/log, `?before` cursor + `?unread=true` filter), `POST /api/notifications/mark-read` (`{ ids }` or `{ all: true }`, recipient-locked), `GET /api/notifications/unread-count` (bell polling). Components: `components/notifications/NotificationBell.tsx` (line-SVG bell + magenta badge, hidden signed-out + on `/notifications`, polls every 60s + on window focus), `components/notifications/NotificationsFeed.tsx` (paginated list, mark-all-read, geometric empty state, skeleton loading), `components/notifications/NotificationRow.tsx` (renders all 10 enum types with icon + copy + link, graceful fallbacks when a joined relation is null, unread rows get a cyan left-border accent). Bell mounts in `PageHeader.tsx` between profile avatar and hamburger. `formatRelativeTime` extracted from `/brands/[slug]/page.tsx` into `lib/format-time.ts`. Only 2 of the 10 enum types actually get INSERT'd today (`brand_suggestion_approved` + `brand_suggestion_rejected` from admin approve/reject routes) — the remaining 8 are future-ready (T29b). Realtime push deferred (T29a). |
| 30 | Sharing | MEDIUM | DONE | 2026-07-10: shipped alongside #5. `<ShareButton>` component (native Web Share API on mobile, clipboard fallback on desktop) on slime detail / drop detail / brand / user profile / /profile pages. Auto-appends signed-in user's `?ref=CODE` so every share doubles as an invite link. |
| 31 | Onboarding | MEDIUM | DONE | 2026-07-10: 4-screen full-screen modal on first login (Welcome / Log your first slime / Rate what matters / Invite friends). Gated by profiles.onboarding_completed_at (mig 64). OnboardingGate mounts on / (feed) and only renders for users with null completion timestamp. Skip and Complete both stamp completion via /api/account/onboarding-complete. Step position persisted to localStorage (survives refresh). All visuals geometric — no AI art per community sensitivity. Referral code + milestone ladder on screen 4 wires into the referral system. |
| 32 | Slime type guide pages | MEDIUM | DONE | 2026-07-13. Shipped **The SlimeLog Guide** at `/guide` — the full 12-part community reference per Jenn's V4.1 approved copy in `docs/slime_guide_v41_extracted.txt`. Server-rendered so the whole guide is in HTML for SEO. New route `apps/web/app/guide/page.tsx` renders all 12 parts + `content.ts` module holds the structured data (all 20 textures + add-ins + containers + scents + brand glossary + care + safety + pricing + shipping + aesthetic vocab + sound vocab + rating framework). Old `/slime-types` route replaced with a `redirect("/guide")` so bookmarks and inbound links transparently forward. SlimeMenu "Learn" section link updated to `/guide` labeled "The SlimeLog Guide". New components under `apps/web/components/guide/`: `GuideNav` (sticky pill row with scroll-spy + hamburger TOC drawer), `TextureExplorer` (client — 2-col gradient tile grid + bottom sheet, handles hash-on-load for `/guide#texture-butter`), `GlossaryList` (parts 2/4/10/11 term/tag/definition rows), `ProseSection` (parts 6/7/9/12 reading-column with tone-tinted callouts), `BrandGlossary` (part 5 grouped by product/sales/makers/care/community), `PricingBands` (part 8 glowing glass rows with green→cyan gradient value column). Deep-linkable anchors: `/guide#part-6` scrolls to Part Six, `/guide#texture-butter` scrolls to butter card AND opens its detail sheet on load. Log counts for Part One CTAs computed server-side via a single `collection_logs.base_type` aggregate — swap to RPC/matview when volume warrants (docs/cost-tracker.md). Real photos live in `apps/web/public/guide/textures/` and are keyed to specific example brands per texture (sand + magnetic ship gradient-only for now — sand has no photo, magnetic keeps `crazy-aarons`). Anti-AI-art hard rule respected — real photos + geometric decorations only. |
| 34 | Profile completeness nudge | MEDIUM | READY | Prompt to add avatar, bio. |
| 44 | Brand dashboard subscription card | MEDIUM | READY | Show current tier + upgrade CTA. |
| 45 | Public profile Brands tried tile | MEDIUM | READY | Scroll-through list of brands in collection. |
| 47 | User-submitted brand additions | MEDIUM | READY | 2026-07-10. Users need a way to submit a slime brand that doesn't exist in the catalog. Likely a "Suggest a brand" button/CTA on /brands (the discovery list) that opens a small form: brand name, website/socials, why it should be added. Submissions go to a pending queue for admin review before appearing publicly (avoids spam / duplicate brand pollution). Ties into brand claims flow — once approved, the original brand submitter could be tagged as the discovery source. |
| T35 | Slime of the Week/Month/Year | MEDIUM | DEFERRED | Major engagement feature. Defer post-launch but design data structures now. |
| T36 | Wizard step-1 escape behavior | MEDIUM | WON'T DO | 2026-07-11: decided against adding a back button on /log step 0. Users navigate away via the nav menu. |
| T47 | Email editing during claim flow step 1 | MEDIUM | DONE | Verified 2026-07-11: ClaimBrandForm.tsx line 125 passes claim_id when present, submit route (line 160-208) PATCHes the existing row via .update().eq("id", claim_id) instead of inserting. Ships user back through step 1 with the corrected email without losing the claim. |
| T51 | Standardized rejection reason dropdown | MEDIUM | DONE | Verified 2026-07-11: ClaimReviewActions.tsx uses RejectionReasonCode from lib/types.ts with 5 standardized codes (documentation_insufficient, email_unverified, role_unconfirmed, suspected_fraud, different_owner_indicated) + "other" (which requires >=10 char free-text context). |
| T52 | Hide consumer bottom nav on admin pages | MEDIUM | DONE | Verified 2026-07-11: BottomNavWrapper already short-circuits for `/admin` and `/admin/*` (line 35). Was implemented in bundle C. |
| T99 | Signup page copy polish | MEDIUM | DONE | 2026-07-11: killed the placeholder pill row ("Butter · Cloud · Icee · Clear · Slay · +46 more"). Replaced the subhead "Track, rate, and discover slimes you'll love" with the SlimeLog tagline "Rate it. Log it. Love it." — magenta accent, semibold, same visual slot. Tighter and on-brand. |
| T100 | SlimesSplitPanel full-screen edit form | MEDIUM | READY | 2026-07-09. Currently centered modal (Option B); Option C = full-screen edit page on mobile. Post-audit polish. |
| T101 | Slime detail card load perf | MEDIUM | DONE (server-side) | 2026-07-10: (a) wrapped fetchLog in React `cache()` so generateMetadata + page body share one query result instead of two. (b) Parallelized the follow-up fan-out (owner + brand + likes count + user-like + log_tags) into a single Promise.all instead of a 5-step serial waterfall. DevTools also revealed client-side duplication (see T104). |
| T104 | Client-side auth.getUser duplication | MEDIUM | DONE | 2026-07-10: shipped `<AuthProvider>` context in components/AuthProvider.tsx that fetches user + profile once on mount and syncs via onAuthStateChange. Refactored components: ShareButton, OnboardingGate, OnboardingModal, SlimeMenu, ClientComments. Refactored pages: /settings, /settings/profile, /invite, /welcome. Profile payload includes: id, username, avatar_url, display_name, role, referral_code, onboarding_completed_at, subscription_tier, is_premium, marketing_consent — future consumers add columns here rather than fanning out new queries. /invite still fetches referral_activations + pro_credit_months separately because those change while the user is on the page. /settings/profile keeps its heavy per-page profile fetch (social handles + form fields not in AuthProvider). |
| T105 | Inline app header (drop fixed dark bar) | MEDIUM | DEFERRED | 2026-07-11. Design mockup for feed rework shows an inline wordmark + notification bell at top of scroll content, no fixed PageHeader. Would kill the black `#0A0A0A` bar that feels utility-glued-on top of the neon-purple content. Needs: relocate hamburger contents (Invite Friends, Settings, admin link, sign out) to a redesigned /profile page acting as a "You" hub, or add a Profile bottom nav tab. Big scope — touches every page. Deferred until feed rework batches 2 + 3 land. Option A (restyle current bar transparent) is the short-term fix. |
| T106 | Founder badge for first 500 users | MEDIUM | READY | 2026-07-11. CommunityStatsHero ribbon currently hard-wires "You're one of the first 500 users ✦" while total users < 500 (pre-launch). Before we cross 500 we need: (a) profiles.is_founder boolean column, (b) backfill for existing users by created_at rank, (c) signup path sets it when current count < 500, (d) AuthProvider surfaces the flag, (e) ribbon reads from that flag so the badge sticks with the original 500 permanently. Follow-up = actual visible badge on the profile card. |
| T107 | Biggest galaxies leaderboard | MEDIUM | MOSTLY DONE | 2026-07-11. Rank users by log count per brand ("Top collectors of Cloud Nine"). Ships as: (a) new `/leaderboard` page with brand selector + ranked list of top N users, (b) "Top collectors" strip on `/brands/[slug]` showing the top 5 for that brand, (c) pill link on `/collection` (My Shelf) leading to `/leaderboard`, (d) later — earned badges on `/users/[username]` for "Top 5 Cloud Nine collector ✦" or similar. Data is a single aggregate query per brand: SELECT user_id, COUNT(*) FROM collection_logs WHERE brand_name_raw = X GROUP BY user_id ORDER BY count DESC. No schema changes needed. Design brief handed off to Claude Design 2026-07-11. |
| T110 | Community brand suggestion pipeline | HIGH | DONE | 2026-07-11. Users can suggest slime shops not yet in the catalog; admin approves → brand joins the catalog → submitter gets an in-app notification. Ships as: (a) `brand_suggestions` table + RLS, (b) `POST /api/brand-suggestions` submission endpoint with rate limit (1 per user per day + duplicate name/slug check), (c) `/submit-brand` dedicated form page, (d) entry from Discover page ("Know a brand we should track?"), (e) log-wizard "Not seeing your brand? Submit it →" fallback when BrandSearchInput returns zero matches, (f) `/admin/brand-suggestions` queue with approve/reject/duplicate actions, (g) approve creates a `brands` row and fires a `brand_suggestion_approved` notification, (h) new `notification_type` enum values + rendering. Push notifications are out of scope (T… TBD) — in-app inbox only for now. |
| T113 | Marketplace Coming Soon page + waitlist | HIGH | DONE | 2026-07-12. Shipped `/marketplace` — auth-gated waitlist page. Signed-out users bounce to `/login?next=/marketplace`; signed-in users see the hero + intent picker (sell / buy / both) + one-tap "Join the waitlist" CTA. After joining, the page flips to the success state: gradient position number "#{n}", "tell your slime friends" share CTA (Web Share API + clipboard fallback, appends `?ref=CODE` for referral credit), and an expandable "help us build this right" panel with 4 auto-saving research questions (brand multi-select from top 12 catalog brands, buyer spend band, seller monthly volume, 200-char trust-need free text). Returning users hydrate straight into the success state with prior answers pre-filled. Migration `20260712000068_marketplace_waitlist.sql` — `marketplace_waitlist` table with UNIQUE(user_id), intent CHECK enum, optional research columns, created_at index for position calc, RLS (INSERT/SELECT/UPDATE own row + admin SELECT/DELETE), `set_updated_at` trigger. Routes: `POST /api/marketplace/waitlist` (upserts on user_id conflict so users can layer research answers on top of intent, admin-client position + total, moderation gate on trust_need), `GET /api/marketplace/waitlist/position` (hydration lookup). Entry point: subtle magenta "Marketplace coming soon" pill above "My Stuff" in `SlimeMenu.tsx`, signed-in-only. Types added to `lib/types.ts`. Anti-AI-art: line SVG icons only, ambient gradient orbs, no mascots. |
| T113a | Marketplace launch trigger | MEDIUM | READY | 2026-07-12. When the marketplace ships, iterate `marketplace_waitlist` ordered by `created_at asc` and email the queue in position order. First N sellers get a launch tier bump (waived listing fee for the first month, or similar) as a thanks for being early — details TBD when we scope the marketplace itself. Uses `profiles.marketing_consent` as the send gate (T#17 hook) since the marketplace announcement is transactional-adjacent but the follow-on drip is marketing. Needs Brevo template + admin-triggered batch job. |
| T114 | Slime condition field on logs | LOW | DONE | 2026-07-12. Added `condition` enum column to collection_logs (sealed / new / like_new / used / well_loved). Migration 20260712000067. Wired into log wizard AND edit wizard as an optional pill picker sitting directly below scent strength (pill pickers grouped visually). Chip renders on SlimeDetailCard next to scent strength when set. Each pill has a hover title with a plain-English description. Serves two purposes: personal shelf tracking (users can note dried-out or sealed slimes) and future marketplace listing schema (T113 → full marketplace). |
| T115 | Rename user-facing "Subtype" → "Variant" | LOW | DONE | 2026-07-12. Jenn's guide V4 uses "Variants & Related" as the community's vocabulary for the styles that layer on top of a base texture (e.g. Glossy / Holographic on top of Clear). Renamed the user-facing label in log wizard + log edit wizard + SubtypeAutocomplete fallback placeholder. DB column stays `subtype_id` — internal-only rename would be cost with no user benefit. Component filename (`SubtypeAutocomplete.tsx`) also unchanged. |
| T112 | Brand Scout badges on profile | LOW | BACKLOG | 2026-07-11. Surface a Brand Scout badge on `/users/[username]` when a user has approved brand suggestions. Data already tracked via `profiles.approved_brand_suggestions_count` (migration 0066, T110 follow-up). Tiers: ✧ Brand Scout at 1+ approved, ✦ Brand Scout at 5+, ✧✦ Head Scout at 15+. Small pill or icon on the profile card. Waits for the profile redesign. |
| T111a | Retroactive moderation scan of existing user-generated content | LOW | BACKLOG | 2026-07-12. T111 covers new writes only. Existing rows in `profiles.username / bio / location`, `collection_logs.slime_name / brand_name_raw / collection_name / notes`, `tags.name`, `comments.body`, `brand_suggestions.name / note`, and `reports.reason` were written before the gate existed. Build a one-shot script (or nightly job) that runs `moderateText` over each row and files failing rows into an admin remediation queue — do NOT auto-null user data. Punted from T111 launch scope. |
| T29a | Realtime notification push (Supabase Realtime subscription in NotificationBell) | LOW | DEFERRED | 2026-07-12. NotificationBell currently polls `/api/notifications/unread-count` every 60s + on window focus. Follow-up = subscribe to `postgres_changes` on `public.notifications` filtered by `recipient_id = auth.uid()`, drop the interval, keep the focus refetch as a belt-and-suspenders reconciliation. Requires enabling Realtime on the table + confirming RLS-aware channel behavior. Not needed pre-launch — 60s cadence is fine for the drop-alert use case. |
| T29b | Wire remaining upstream notification inserts | MEDIUM | READY | 2026-07-12. The notification reader (T29) renders 10 enum types but only 2 are actually INSERT'd today: `brand_suggestion_approved` + `brand_suggestion_rejected` (from `/api/admin/brand-suggestions/[id]/{approve,reject}`). The other 8 — `drop_announced`, `drop_live`, `drop_sold_out`, `new_follower`, `friend_log`, `friend_rating`, `comment_on_log`, `like_on_log` — need writers. Likely a mix of triggers (drops, follows, likes, comments) and existing route hooks. Sequence: (a) follows/likes/comments are cheap-and-obvious triggers on their tables, (b) drop_* triggers on `drops` status transitions, (c) friend_log + friend_rating trigger on `collection_logs` with a follower fanout. Also needs a notification-preferences UI so users can mute categories. |
| T111 | Content moderation for user-generated names + submissions | MEDIUM | IN PROGRESS | 2026-07-12. Server-side moderation gate now shared across every user-authored text entry point. `lib/moderation.ts` exposes `moderateText(input, field)` returning `{ ok, cleaned }` or `{ ok: false, reason, message }` (see file for the field list). Wired into: (a) `lib/profile-actions.ts` — username / bio / location on both settings + onboarding paths + live availability check, (b) `POST /api/brand-suggestions` — brand name + note, (c) `lib/slime-actions.ts` — slime name / collection name / brand-name-raw / notes / each keyword on both create + edit, (d) `POST /api/report` — reason, (e) NEW `POST /api/comments` — comment body (CommentSection.tsx refactored to call this route instead of writing directly through the anon client). Profanity check uses `obscenity` (RegExpMatcher + English dataset + recommended transformers) — handles leet / spacing / mixed case. Reserved-username list is baked in (admin, official, slimelog, jennifer, etc.). Admin-authored fields (admin_notes on brand_suggestions + brand_claims) are exempt by design. Retroactive scan of existing rows deferred to T111a. Follow-up to T110. Requires `npm install` for the new `obscenity` dep. |
| T109 | Custom champion titles as brand feature | LOW | BACKLOG | 2026-07-11. On `/leaderboard`, the #1 collector of a brand gets a "champion" badge. V1 auto-generates the title as "The {brand} Champion". Later, we let claimed brands set their own custom title as a paid perk (part of brand PRO tier) — e.g. Cloud Nine picks "The Butter Queen" instead of "The Cloud Nine Champion". Add a `brands.champion_title text` column when we build this, guarded by tier check. Fun / low-stakes. Depends on brand claim flow being live. |
| T108 | Brand logos in GalaxyView hubs | MEDIUM | DONE | 2026-07-11. Each brand hub in `/collection` Galaxy view now renders the real brand logo when `brands.logo_url` is set, falling back to the deterministic color puck when it isn't. Impl: per-brand `.ilike()` lookup against brands table on mount, async Image loading with `crossOrigin=anonymous`, circular-clipped `object-fit: cover` drawImage inside the hub circle. Color puck stays as an underlay so transparent PNGs read clean and hub sizing stays identical whether the image loaded or not. Progressive: as brands claim their profile and upload logos, existing users' galaxies get richer without any code change. Legend copy updated to "Hub grows with brand depth · logo when brand joins". |
| T102 | Admin subscription toggle | MEDIUM | DONE | 2026-07-11: /admin/subscriptions page + /api/admin/subscriptions/set-tier route. Admin can flip a user's or brand's subscription_tier + subscription_status directly (bypasses Stripe entirely). Coerces to null status when tier=free. Warning banner reminds this bypasses Stripe. |
| T103 | Sync-from-Stripe admin escape hatch | MEDIUM | DONE | 2026-07-11: /api/admin/subscriptions/sync-from-stripe route + button on /admin/subscriptions. Queries stripe.subscriptions.list for the row's stripe_customer_id, picks the most authoritative sub (active > trialing > past_due > canceled etc), and overwrites subscription_tier + status + period_end + cancel_at_period_end. If Stripe reports no subs, downgrades to free/null. Uses admin client so bypasses HP-8 protect trigger. |

---

## Post-Launch Nice-to-Have

| # | Issue | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| 8 | Badge system | POST-LAUNCH | DEFERRED | Untappd-style achievements. Pairs with T35. |
| 9 | Fullscreen canvas fix | POST-LAUNCH | DEFERRED | SpiralView/GalaxyView black canvas on fullscreen. |
| 10 | Comment replies | POST-LAUNCH | DEFERRED | V2 feature. |
| 18 | Ad consent toggle | POST-LAUNCH | DEFERRED | Opt-out toggle when ads added. |
| 36 | Open home feed to logged-out users | POST-LAUNCH | DEFERRED | Fast-follow #35. |
| T28 | Brand page expanded sections | POST-LAUNCH | DEFERRED | Past drops, favorites, all drops. |
| T49 | Bottom nav: Log → Brand for verified owners | POST-LAUNCH | DEFERRED | Chat 9. Multi-brand-owner question needs design conversation. |
| T54 | Under Review intermediate claim state | POST-LAUNCH | DEFERRED | Chat 9. For multi-admin scenarios. Adds new enum value + reviewing_by field. |

---

## Technical Debt

| # | Issue | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| T2 | Discover page threshold | TECH DEBT | DONE | Verified 2026-07-11: /discover top-rated slimes query already uses `.gte("total_ratings", 3)` (page.tsx line 41). No other discover subpage filters by rating count. |
| T3 | Brand association for legacy logs | TECH DEBT | DEFERRED | No brand_id FK on pre-BrandSearchInput logs. |
| T4 | Recharts width/height warnings | TECH DEBT | DEFERRED | width(-1)/height(-1) in dev console. |
| T7 | Admin reports RLS | TECH DEBT | READY | Allows all auth users to read reports. |
| T8 | Spiral and Galaxy drag/zoom | TECH DEBT | DEFERRED | Not functioning correctly. |
| T9 | brands RLS always true | TECH DEBT | READY | Tighten now that brand claiming (#3) is shipped — owner_id is the gate. |
| T14 | Vercel env var env separation | TECH DEBT | DEFERRED | Separate live from test. Post-launch. |
| T16 | Canonical domain audit (apex vs www) | TECH DEBT | DEFERRED | robots.ts and sitemap.ts use apex. |
| T17 | Brevo attribute prefixing | TECH DEBT | DEFERRED | Filed during chat 7. |
| T18 | Public route rate limiting | TECH DEBT | DEFERRED | Defer post-launch. |
| T19 | Migration sequence collision | TECH DEBT | READY | 20260420000030 vs 20260423000030. Plus chat 9 noted handoff doc lists wrong filenames vs disk. |
| T20 | BottomNavWrapper hydration flash | TECH DEBT | DEFERRED | Acknowledged. |
| T21 | activity_feed trigger fires on private logs | TECH DEBT | DEFERRED | Privacy edge case. |
| T22 | Feed-detail state sync | TECH DEBT | DEFERRED | Likes/comments sync between feed cards and detail overlay. |
| T23 | FollowBrandButton Following state | TECH DEBT | DEFERRED | Visual issue on touch devices. |
| T24 | PageHeader uses <img> not next/image | TECH DEBT | DEFERRED | Defer. |
| T25 | PageHeader profile button avatar | TECH DEBT | DEFERRED | Could show actual user avatar. |
| T26 | Brand page empty state polish | TECH DEBT | DEFERRED | Post-launch. |
| T27 | Public/private toggle UI for log creation | TECH DEBT | READY | Required to verify privacy bug fix from #35. |
| T32 | Optimize robots.txt for LLM crawlers | TECH DEBT | DEFERRED | GPTBot, Google-Extended, ClaudeBot, etc. |
| T33 | Add JSON-LD structured data | TECH DEBT | DEFERRED | Schema.org Review/Person/Organization/Event. |
| T34 | Audit sitemap caching | TECH DEBT | DEFERRED | Add revalidate or force-static post-launch. |
| T37 | Address consistency audit post-May 6 | TECH DEBT | READY | After CT finalization, audit all vendor accounts have Glastonbury address. |
| T38 | DBA filing decision | TECH DEBT | DEFERRED | SlimeLog DBA decision deferred to pre-launch. |
| T39 | Migration filename audit (chat 9) | TECH DEBT | READY | Handoff doc migration table lists names that don't match disk. Reconcile pre-launch. |
| T40 | /admin/waitlist refactor to createAdminClient | TECH DEBT | READY | Chat 9. Use the centralized service-role factory introduced in #3. |
| T41 | Resend client consolidation | TECH DEBT | READY | Chat 9. Move inline new Resend(...) calls to lib/email.ts. |
| T43 | Resend code path simplification | TECH DEBT | READY | Chat 9. /api/brand-claims/submit resend should re-fetch claim, not re-validate all fields. |
| T46 | Brand website_url scrub pre-launch | TECH DEBT | READY | Chat 9. Audit brands table to maximize domain-match coverage during claim verification. |
| T50 | Terminal/chat-UI auto-link rendering artifacts (DOCUMENTED) | TECH DEBT | DOCUMENTED | Chat 9. [process.env.X.Y](http://...) patterns in cat output are display-only, not real corruption. Verify with od -c or trust tsc. |
| T53 | Admin landing page | TECH DEBT | DEFERRED | Chat 9. /admin back button currently 404s. Resolves when /admin/page.tsx exists. |
| T55 | Standardized rejection reason dropdown (alias for T51) | TECH DEBT | READY | Same item as T51 — relabeled for consistency. |

---

## Non-Code Action Items

| # | Item | Priority | Status | Notes |
| --- | --- | --- | --- | --- |
| A1 | DMCA agent registration | MEDIUM | READY | copyright.gov/dmca-directory — $6, ~10 min. Use Glastonbury address post-May 6. |
| A2 | Rotate all API keys before go-live | MEDIUM | READY | Supabase, Resend, Stripe, Brevo. |
| A3 | Leaked Password Protection | LOW | BLOCKED | Requires Supabase Pro plan. |
| A6 | Prevent duplicate subscriptions | MEDIUM | READY | See #21. |
| A9 | Supabase ownership transfer | MEDIUM | IN PROGRESS | support@chaphaus.com as Owner. |
| A10 | Google OAuth project transfer | MEDIUM | BLOCKED | After A9. |
| A11 | GitHub org creation | MEDIUM | BLOCKED | After A10. |
| A12 | Vercel reconnection | MEDIUM | BLOCKED | After A11. |
| A13 | Resend account transfer | MEDIUM | BLOCKED | After A11. |
| A14 | Instagram @SlimeLogApp admin | LOW | READY | Add support@slimelog.com as admin. |
| A15 | DMCA agent renewal | POST-LAUNCH | DEFERRED | April 2029 (3-year cycle). |
| A16 | Apple Developer enrollment | HIGH | BLOCKED | Blocked on D&B address propagation post-May 6 CT SOS finalization. |
| A17 | Address propagation across vendor accounts | HIGH | IN PROGRESS | Stripe + Bluevine done. Pending: D&B, IRS Form 8822-B, Brevo, Resend, Supabase, Vercel, chaphaus.com. |
| A18 | CT Change of Agent finalization | HIGH | IN PROGRESS | Filed at CT SOS, est. completion May 6, 2026. Required before A17. |

---

## Completed — Recent (Preserved for History)

*Items shipped, kept here as institutional memory.*

| # | Issue | Closed In | Status | Notes |
| --- | --- | --- | --- | --- |
| #3 | Brand claiming flow | Chat 9 (May 4) | DONE | 3 batches, 17 new files, migration 33. End-to-end: claim form + email verification + document upload + admin queue + per-claim review with inline document preview + approve/reject + auto-rejection cascade. |
| T11 | Comment relative time | Chat 9 (May 4) | DONE | Already rendering '29d ago' format correctly. |
| T42 | PageHeader BACK_BUTTON_ROUTES additions | Chat 9 (May 4) | DONE | Added /^\/brands\/[^/]+\/claim$/ and /^\/brand-verification$/. |
| T44 | tsconfig.tsbuildinfo to .gitignore | Chat 9 (May 4) | DONE | Added .gitignore entry, git rm --cached tracked copy. |
| T45 | Removed temporary inline back button hacks | Chat 9 (May 4) | DONE | Bundle A. brand-verification + brands/[slug]/claim now use PageHeader's back button. |
| T48 | Brand page Follow → Manage Brand for verified owner | Chat 9 (May 4) | DONE | Folded into Batch 3 of #3. Conditional on brand.owner_id === user.id. |
| #2 | Email infrastructure (Brevo) | Chat 8 (May 1) | DONE | Welcome email working end-to-end. |
| T30 | SlimeDetailCard log creator surfacing | Chat 8 (May 2) | DONE | Owner avatar + @username row at top of overlay. |
| T31 | Full review page back button + scroll restoration | Chat 8 (May 2) | DONE | sessionStorage nav stack, height-aware scroll restoration. |
| #35 | Public profile access (logged-out browsing) | Chat 7 (Apr 28) | DONE | 10 batches, 28 files, 4 hotfixes. |
| A8 | Stripe live real-card test | Chat 7 (Apr 27) | DONE | Real $2.99 purchase end-to-end. |
| A4 | Stripe live mode setup | Chat 6 (Apr 23) | DONE | Products, webhook, customer portal, branding. |
| A5 | Stripe portal branding | Chat 6 (Apr 23) | DONE | ChapHaus business name, SlimeLog logo. |
| A7 | ChapHaus website launch | Chat 6 (Apr 23) | DONE | Live at chaphaus.com. |
| #24 | COPPA age gate UX fix | Chat 6 (Apr 23) | DONE | Under-13 redirect + COPPA data deletion. |
| #47 | Age verification DOB picker UX | Chat 6 (Apr 23) | DONE | Month/Day/Year dropdowns. |
| T13 | SlimeMenu module-level supabase client | Chat 6 (Apr 23) | DONE | Hoisted createBrowserClient. |

---

## Priority Heatmap — What to Tackle Next

### Pre-Launch Critical Path (in dependency order)

| # | Issue | Priority | Status | Why now |
| --- | --- | --- | --- | --- |
| A18 | CT Change of Agent finalization | CRITICAL | IN PROGRESS | May 6 estimated completion. Unblocks A17 address propagation. |
| A17 | Address propagation | CRITICAL | IN PROGRESS | After A18. Pending: D&B (Apple bottleneck), IRS, Brevo, Resend, Supabase, Vercel, chaphaus.com. |
| A16 | Apple Developer enrollment | CRITICAL | BLOCKED | Blocked on D&B address propagation (~2-4 weeks post-May 6). |
| #22 | RevenueCat integration | HIGH | BLOCKED | After A16. Required for App Store Pro tier. |
| #14 | Subscription terms display | HIGH | BLOCKED | Part of #22. |
| #23 | Capacitor packaging | HIGH | BLOCKED | After A16. |
| #26 | App Store review checklist | HIGH | IN PROGRESS | Final pre-submission audit. |
| T46 | Brand website_url scrub | HIGH | READY | Chat 9. Maximize domain-match coverage for brand claim verification before launch. Manual data work. |
| T9 | brands RLS tightening | HIGH | READY | Now that #3 is shipped, owner_id is the gate. Tighten the always-true RLS. |

### UX Quick Wins (small, ship anytime)

| # | Issue | Priority | Status | Effort |
| --- | --- | --- | --- | --- |
| T2 | Discover page threshold raise | LOW | READY | Tiny. Single SQL change. Write inline, apply directly. |
| #20 | Double toast on Pro upgrade fix | MEDIUM | READY | Small. Toast deduplication. Stripe-adjacent — careful smoke test. |
| #21 | Duplicate subscription guard | MEDIUM | READY | Small. Early return in checkout route. Stripe-adjacent. |
| T36 | Wizard step-1 escape behavior | MEDIUM | READY | Small. Back button on /log step 0 only. |
| T47 | Email editing during claim step 1 | MEDIUM | READY | Small. PATCH existing pending claim. Brand claiming polish. |
| T51 | Standardized rejection dropdown | MEDIUM | READY | Small. Replace free-text with 5 standardized reasons + Other. |
| T52 | Hide bottom nav on admin pages | MEDIUM | READY | Tiny. BottomNavWrapper detects /admin/*. |

### Recommended Next Action (post chat 9)

With #3 closed, the path forward divides into two streams:

1. While A18/A16 chain blocks Apple, knock down small items: T2 (single SQL), T36 (small UI), T9 (RLS tightening), T46 (manual data scrub).
2. Brand claiming polish bundle once we decide it's worth it: T47 + T51 + T52 + T53. All small, all related, ship as one batch.
3. Bundle B Stripe safety fixes (#20 + #21) — ship cautiously since Stripe is live.

---

## How This Tracker Works

This is the living source of truth for SlimeLog development. It is updated at the end of every master chat session. It pairs with the Master Development Handoff Document — the handoff is institutional memory; this is the to-do list.

### Update Rules

- APPEND ONLY for closed items — move to Completed section, do not delete.
- Status updates encouraged: READY → IN PROGRESS → DONE / BLOCKED / DEFERRED.
- New items append to the appropriate priority section.
- Items rarely change priority bucket — update Priority column rather than moving rows.
- Tracker numbering shared with handoff doc — `#` for product, `T` for tech debt, `A` for non-code.

### Status Definitions

- **READY** — Available to work on now. No blockers.
- **IN PROGRESS** — Active work threads exist.
- **BLOCKED** — Waiting on something external.
- **DONE** — Shipped and verified in production.
- **DEFERRED** — Not urgent. Post-launch or lower priority.

### Pairing with Handoff Doc

The handoff doc captures session-by-session changes. This tracker captures forward-looking work. Both append-only. Both versioned per master chat.

---

*SlimeLog — Rate it. Log it. Love it.*

*CONFIDENTIAL — For Development Use Only*
