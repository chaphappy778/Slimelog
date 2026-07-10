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
| 20 | Double toast on Pro upgrade | MEDIUM | READY | Two toasts fire on subscription completion. |
| 21 | Duplicate subscriptions check | MEDIUM | READY | Add check in checkout route. |
| 25 | Pro upgrade button in SlimeMenu | MEDIUM | BLOCKED | Deferred with RevenueCat. |
| 28 | Search | MEDIUM | READY | Global search across slimes, brands, users. |
| 29 | In-app notifications | MEDIUM | READY | Notification bell with feed. |
| 30 | Sharing | MEDIUM | DONE | 2026-07-10: shipped alongside #5. `<ShareButton>` component (native Web Share API on mobile, clipboard fallback on desktop) on slime detail / drop detail / brand / user profile / /profile pages. Auto-appends signed-in user's `?ref=CODE` so every share doubles as an invite link. |
| 31 | Onboarding | MEDIUM | READY | First-time user walkthrough. |
| 32 | Slime type guide pages | MEDIUM | READY | Educational content per type. |
| 34 | Profile completeness nudge | MEDIUM | READY | Prompt to add avatar, bio. |
| 44 | Brand dashboard subscription card | MEDIUM | READY | Show current tier + upgrade CTA. |
| 45 | Public profile Brands tried tile | MEDIUM | READY | Scroll-through list of brands in collection. |
| T35 | Slime of the Week/Month/Year | MEDIUM | DEFERRED | Major engagement feature. Defer post-launch but design data structures now. |
| T36 | Wizard step-1 escape behavior | MEDIUM | READY | Chat 8. Back button on /log step 0 only. Out of scope for T31. |
| T47 | Email editing during claim flow step 1 | MEDIUM | READY | Chat 9. PATCH existing pending claim instead of forcing restart on typo. |
| T51 | Standardized rejection reason dropdown | MEDIUM | READY | Chat 9. 5 standardized reasons + Other (please specify) for admin reject UX. |
| T52 | Hide consumer bottom nav on admin pages | MEDIUM | READY | Chat 9. BottomNavWrapper should detect /admin/* and return null. |
| T99 | Signup page copy polish | MEDIUM | READY | 2026-07-10. "few slime names + n46 others" microcopy needs upgrade. Feels placeholder-y. Rework during launch-prep polish sprint. |
| T100 | SlimesSplitPanel full-screen edit form | MEDIUM | READY | 2026-07-09. Currently centered modal (Option B); Option C = full-screen edit page on mobile. Post-audit polish. |
| T101 | Slime detail card load perf | MEDIUM | READY | 2026-07-09. 1.4-2.5s load time on `/slimes/[id]`. Profile via DevTools Network + Performance tabs; likely multiple round-trips. Optimize before launch. |
| T102 | Admin subscription toggle | MEDIUM | READY | 2026-07-09. Admin-only toggle to flip subscription_tier without going through Stripe — for QA + fresh account test cycles pre-launch. |
| T103 | Sync-from-Stripe admin escape hatch | MEDIUM | READY | 2026-07-09. Manual button that queries Stripe for a user/brand's current subscription state and updates the row. Backstop for webhook drift. |

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
| T2 | Discover page threshold | TECH DEBT | READY | Raise total_ratings >= 1 to >= 3 before launch. |
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
