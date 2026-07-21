# Readiness Dashboard

Honest state of the SlimeLog app across every axis that matters, plus the target percentage each axis should hit before each launch phase.

## Why this exists

We've been rebuilding surface by surface with the Design agent, which has (correctly) pushed consumer visuals well ahead of everything else. That's a recipe for launching a beautiful app that can't monetize, or a fully-loaded app whose brand-side onboarding leaks brands out the back door.

This doc keeps every axis honest. If any single axis races more than ~25 points ahead of what its launch phase actually needs, that's a signal to redirect effort. The other direction is worse: any axis that falls more than ~15 points below its target for the *next* phase is a blocker to declare.

Update this whenever a major surface ships or a launch phase target shifts.

---

## Current honest state (2026-07-20)

Last snapshot 2026-07-18. Deltas below reflect a single-surface production day: T125 (slime aging + shelf-state + structured care) went from "shipped end-to-end" to fully closed, and the Guide picked up two long-form chapters. Concrete wins: the full care loop is now live (Pro-gated care packages at `/collection/care`, a structured check-in modal backed by a 30-product catalog across 6 categories, tap-to-log recent-care tiles, and an aggregate Top 3 actions strip), hardened by a unique-index + `ON CONFLICT DO NOTHING` dedupe (migration `...83`) plus a client-side diff so pre-seeded selections never double-insert. `/collection/aging` and `/collection/care` both got real design passes (Montserrat 900 heroes, StatePill green/orange/red, rounded-square line-SVG care tiles, uniform cadence pills, a Physical/Handling color moved off the cyan collision to `#FFAE3B` orange, save-on-dismiss modal with a sticky nav-clearing Save footer). The Guide gained Part 6 rebuilt as a 14-section accordion from Jenn's 2650-word care PDF (with "Care by Texture Type" nesting all 19 base types) and a new Part 13 with 9 recipes plus a safety primer, both on a new `ExpandableSection` component with hash deep links. No payments, brand-side, engagement, or observability code landed today, so those axes are flat. Two error-tracker entries were filed (silently-emptied result-union payload; Postgres expression indexes vs PostgREST on_conflict).

| Axis | Now | Δ | What's counted | What's missing |
| --- | ---: | ---: | --- | --- |
| Consumer visual polish | 86% | +2 | 2026-07-18 list + `/collection/aging` and `/collection/care` design passes (Montserrat 900 heroes, StatePill state colors, rounded-square line-SVG care tiles, uniform cadence pills, Handling color off the cyan collision, sticky Save footer) | Slime detail page (T138), drop detail page (T139), settings pages (T141), first-touch routes (T140), brand claim page redesign (T176), T188 Parts 2/3/5 (slime-detail congestion, log-wizard pill overload, slime-detail Pro care CTA polish) |
| First-touch / auth routes | 68% | — | No change today (see 2026-07-18 row) | First-touch route visual audit (T140), user onboarding refresh (T136), `/settings/subscription` copy rewrite (done) |
| Brand-side surfaces | 55% | — | No change today (see 2026-07-18 row) | Brand dashboard redesign (T137), banner + logo upload (T133), tubs_available editor (T134), brand onboarding checklist (T135), notification center (T122) |
| Monetization | 65% | — | No change today (see 2026-07-18 row). The Pro-gated care packages add a new Pro reason-to-subscribe, but no payment/ad plumbing shipped, so the axis is flat | RC iOS SDK not wired, FeedAdSlot component (T178), subscription terms display (item #14), Marketing URL in ASC v1.0 |
| Engagement | 25% | — | No change today (see 2026-07-18 row) | Comments (T120), reactions (T127), likes (T33d deferred), wishlist notifications (T128) |
| Notifications infrastructure | 60% | — | No change today (see 2026-07-18 row). T125's care dedupe reuses the existing bell/in-app path, no new enum types | Push notifications for drops (T121), brand-side notification center (T122), realtime push (T29a) |
| Marketplace | 0% | — | Nothing built | Stripe Connect integration, listing flow, buyer/seller messaging, shipping labels, disputes |
| Utility features | 48% | +13 | **T125 fully closed 2026-07-20.** 2026-07-18 aging + shelf-state scaffold + Pro-gated care packages (`/collection/care`) + structured check-in modal (30-product catalog, 6 categories, single-tap default) + tap-to-log recent-care tiles + aggregate Top 3 actions strip + care-plan notes + check-in dedupe (unique index + `ON CONFLICT DO NOTHING` + client-side diff). The whole care loop works end-to-end for a real user | Batch tracking (T131), compare mode (T132), personal collection search (T161), historical aging graph + extended-life leaderboard (V2, needs check-in history table) |
| Growth / virality | 88% | — | No change today (see 2026-07-18 row) | Share-to-social deep link (T40), video reviews (T41), Momo-tier outreach (T160), feed pagination (T177) |
| Content / guide | 95% | +3 | 2026-07-18 list + Guide Part 6 rebuilt as a 14-section care/storage accordion from Jenn's 2650-word PDF ("Care by Texture Type" nests all 19 base types) + new Part 13 with 9 recipes and a safety/activator primer, on a new `ExpandableSection` component with hash-on-load deep links. T185 DONE, T189 folded in | Ongoing brand + slime catalog growth (community-driven), Guide Part 1 art-direction pass (T32a) |
| Moderation + trust | 72% | — | No change today (see 2026-07-18 row) | Report / flag system for logs, brand disputes over ratings, safe-response templates |
| Observability | 38% | — | No change today (see 2026-07-18 row) | No Sentry or equivalent, no analytics platform, no dashboards, no alerting |
| Performance + cost hardening | 55% | — | No change today (see 2026-07-18 row). The care dedupe index is additive and bounded, no new unbounded aggregates | Btree indexes on axis-sort columns (T32f), materialized views for popular aggregates, load test, T177 pagination |
| Native app packaging | 55% | — | No change today (see 2026-07-18 row) | RC SDK wiring, app icon + splash, code signing, Push plugin + APNs, Camera plugin, Universal Links, TestFlight, Capacitor 8→9 (T163), AdMob plugin + FeedAdSlot (T178), Android scaffold |
| Search | 80% | — | No change today (see 2026-07-18 row) | Post-launch faceted filters (rating range, brand filter), personal collection search (T161) |

---

## Snapshot (2026-07-18)

Last snapshot 2026-07-17. Deltas below reflect the 2026-07-18 setup marathon: Google Play Console verified (ChapHaus LLC organization account, EXEMPT from 12-tester rule), AdMob account fully set up and approved (Payments + iOS app registered + Feed Native ad unit created + app-ads.txt shipped to slimelog.com), App Store Connect walkthrough (App Info + Pricing + App Privacy nutrition label published + SlimeLog Pro subscription group with both Monthly and Annual products, levels set Annual=1 Monthly=2, group localization done), Jenn's anchor pricing strategy adopted ($4.99/$29.99 base with $2.99/$19.99 intro offers), Stripe prices updated ($4.99 monthly created, $29.99 annual, two intro coupons), five tracker items filed (T183 parallel iOS+Android, T184 badge system in progress with 95-badge internal doc + designer brief docx, T185 slime recipes for Guide Part 13, T186 brand shop notes, T187 brand Pro analytics gate), Jenn's asset brief refreshed to v2 (adds Android screenshot specs + badge concept + recipes). T181 (Google Play dev account) shipped DONE, T179 (app-ads.txt) shipped DONE. Not much production code, but the entire external-dependency chain for iOS + Android launch was cleared.

| Axis | Now | Δ | What's counted | What's missing |
| --- | ---: | ---: | --- | --- |
| Consumer visual polish | 84% | +2 | Prior list + brand logo now renders on feed cards + slime detail + OG image (T173, T39-M2), T39-M4 base_type OG fix, wizard scroll reset, brand autocomplete prefix-first, guide cleanup, basic hero photo | Slime detail page (T138), drop detail page (T139), settings pages (T141), first-touch routes (T140), brand claim page redesign (T176) |
| First-touch / auth routes | 68% | +8 | Prior list + Sign in with Apple button (T142), Supabase Apple provider live, waitlist attribution capture (T151) with heard_from + UTM columns | First-touch route visual audit (T140), user onboarding refresh (T136), `/settings/subscription` copy rewrite (T171) |
| Brand-side surfaces | 55% | +15 | Prior list + brand-owner notification on new log (T167 — biggest brand-side win, brands now hear when their brand is tagged), brand-claim domain auto-approve (T39-M1a, 3-5 days → instant), brand-owner hamburger shortcut (T174 — brand ownership reads as a peer identity), variant-suggestions admin queue + approval flow (T158 Commit B) | Brand dashboard visual redesign (T137), banner + logo upload UI (T133), tubs_available editor (T134), brand onboarding checklist (T135), brand notification center (T122), reply-to-log (T123), brand announcements (T124), brand ownership drop/reassign admin tool |
| Monetization | 65% | +35 | Prior list + AdMob account fully approved (iOS app registered + Feed Native ad unit created + app-ads.txt live at slimelog.com), ASC subscription products **both created** at correct anchor prices ($4.99 monthly + $29.99 annual base, levels set Annual=1 Monthly=2, group localization set), App Privacy nutrition label published, Stripe prices updated end-to-end (new $4.99 monthly price grandfathering old $2.99, $29.99 annual, `SLIMELOG_PRO_MONTHLY_INTRO` + `SLIMELOG_PRO_ANNUAL_INTRO` coupons for Jenn's anchor-pricing strategy), **T171 SHIPPED 2026-07-19**: intro coupons wired into Checkout Session server-side, `/settings/subscription` copy rewrite with intro pricing + renewal disclosure, live-verified end-to-end through Stripe hosted checkout (Monthly shows $2.99/mo with $4.99 renewal in View details, Annual shows $19.99 with "Then $29.99 per year starting next year"). T180 obsoleted since anchor pricing is already live. | RC iOS SDK not wired, subscription terms display (item #14), Marketing URL in ASC v1.0 needs `https://slimelog.com` for AdMob crawler trail. Full closure to 90% only comes when RC SDK ships in Capacitor (iOS-native purchase path) + FeedAdSlot component renders live ads. |
| Engagement | 25% | +5 | Prior list + notifications feed auto-refresh + manual Refresh button (T169), brand_log_received notification type live | Comments (T120), reactions (T127), likes (T33d deferred), wishlist notifications (T128), most-liked sort |
| Notifications infrastructure | 60% | +15 | Prior list + 3 of 10 enum types firing today (brand_suggestion_approved/rejected already there, brand_log_received added T167, variant_suggestion_approved/rejected added T158 Commit B-admin), notifications feed auto-poll every 30s while tab visible + manual refresh, Page Visibility API pause when backgrounded | Push notifications for drops (T121), brand-side notification center (T122), realtime push (T29a), remaining unused enum types wired up (T29b) |
| Marketplace | 0% | — | Nothing built | Stripe Connect integration, listing flow, buyer/seller messaging, shipping label integration, dispute handling |
| Utility features | 35% | +30 | **T125 shipped end-to-end 2026-07-20** — the flagship utility play. Aging reminders scaffold + shelf-state tracking (on_shelf / for_sale / archived) both live. Nightly cron computes state, in-app notification fires to bell, `/collection/aging` shows 3-section view (Overdue / Warning / Fresh) with inline actions (Mark checked / Snooze / Archive / Turn off). Community insights strip on slime detail with Pro-gated brand+type median. Home feed hero card ties users into the aging view. Log wizard gains shelf-state chip. Settings toggle wired. Feed card renders For Sale + Archived pills. **Well past 30% IG target.** | Batch tracking (T131), compare mode (T132), search on personal collection_logs (T161), historical aging graph + extended-life leaderboard (V2 backlog, post-launch — needs check-in history table) |
| Growth / virality | 88% | +23 | Prior list + all four HIGH T39 tag-flow audit findings shipped: post-log share CTA (T166-H1), rich reshare caption with @handle + rating + UTM (T166-H3), brand-owner notification on tagged log (T167-H2), sessionStorage log-wizard draft persistence (T168-H4). Plus M1a auto-approve for brand claims, M2 brand logo on OG. Reshare loop is fully plumbed end-to-end. | Share-to-social deep link (T40 — auto-download + IG/TikTok deep link), video reviews (T41 gated on data), Momo-tier brand outreach (T160), pagination on feed for growing waitlist (T177) |
| Content / guide | 92% | +2 | Prior list + Basic base type entry + Jenn-shot Basic hero photo, snowbutter naming + variants + Cloud Cream aliases, White Whale brand link restored, SlimeLog Official credited on Basic entry | Ongoing brand + slime catalog growth (community-driven, never "done"), Guide Part 1 art-direction pass (T32a) |
| Moderation + trust | 72% | +2 | Prior list + scent_notes moderation gate added (T172), variant-suggestion moderation gate (T158) | Report / flag system for logs, brand disputes over ratings, safe-response templates for brands |
| Observability | 38% | +3 | Prior list + admin System Reminders section (SIWA rotation, extensible for cert / API renewals) | No Sentry or equivalent, no analytics platform (Posthog / Amplitude), no dashboards, no alerting |
| Performance + cost hardening | 55% | — | No change on the axis | Btree indexes on axis-sort columns (T32f flagged), materialized views for popular aggregates, load test, T177 pagination replaces the current .limit(100) stopgap |
| Native app packaging | 55% | +15 | Prior list + **Google Play Console developer account verified** (ChapHaus LLC as organization = EXEMPT from Play's 12-tester rule per Nov 2023 policy, unlocks Android launch on same timeline as iOS), parallel iOS+Android track decision (T183), refreshed AdMob setup doc with 2026 UI (Phases 1-4 done for iOS, 5-8 blocked on RC + Capacitor plugin work) | Same as before: RC SDK wiring, app icon + splash logo (Jenn's logo rework), code signing + provisioning, Push Notifications plugin + APNs cert, Camera plugin, Universal Links, TestFlight upload, Capacitor 8→9 upgrade (T163), AdMob Capacitor plugin (@capacitor-community/admob v8) install + Info.plist wiring, FeedAdSlot component (T178), UMP consent SDK, Android scaffold (`npx cap add android`), Android AdMob app registration |
| Search | 80% | +65 | Item #28 Phase A + B + C all shipped 2026-07-18. Phase A: Brand + Collector sections on /search. Phase B: relevance ranking (scoreMatch: 100 exact / 50 prefix / 10 substring) + graceful per-section degradation. Phase C: typeahead dropdown on Discover SearchHero (fires at 2+ chars, 250ms debounce, top 3 slimes + 3 brands + 2 collectors, direct-navigation on entity click, "See all" row falls back to /search?q=X); base-type filter chips on /search (in-memory, "All" + per-type chips, shows only when 2+ distinct types present in results). Search axis now well past IG launch target | Phase C+ (post-launch, small): rating-range filter, brand filter dropdown on /search. T161 (personal /collection search) still a separate ticket |

---

## Launch phase targets

Read a column as: "before we do this launch, each axis should be at LEAST this %." Blank cells mean "no additional gain needed for this phase over the previous."

| Axis | Now | IG soft launch | Public web launch | iOS App Store | Marketplace launch |
| --- | ---: | ---: | ---: | ---: | ---: |
| Consumer visual polish | 86% | 95% | 100% | 100% | 100% |
| First-touch / auth routes | 68% | 95% | 100% | 100% | 100% |
| Brand-side surfaces | 55% | 60% | 80% | 90% | 100% |
| Monetization | 65% | 30% | 50% | 90% | 100% |
| Engagement | 25% | 40% | 70% | 90% | 100% |
| Notifications infrastructure | 60% | 60% | 80% | 95% | 100% |
| Marketplace | 0% | 0% | 0% | 30% | 100% |
| Utility features | 48% | 30% | 70% | 90% | 100% |
| Growth / virality | 88% | 90% | 100% | 100% | 100% |
| Content / guide | 95% | 95% | 100% | 100% | 100% |
| Moderation + trust | 72% | 90% | 95% | 100% | 100% |
| Observability | 38% | 60% | 75% | 90% | 100% |
| Performance + cost hardening | 55% | 70% | 85% | 95% | 100% |
| Native app packaging | 55% | 0% | 20% | 100% | 100% |
| Search | 80% | 70% | 90% | 95% | 100% |

### Gap to IG soft launch (largest to smallest)

Big shift from 2026-07-14: **Growth/virality and Brand-side both essentially caught their IG-launch targets** (they're the biggest change in this snapshot). Native app packaging leapfrogged past its IG-launch bar entirely — that budget rolls forward to iOS App Store. Focus for the IG runway now cleanly narrows to:

1. **Search: 80 → 70 (0).** WELL PAST target. Item #28 Phases A + B + C all shipped 2026-07-18. Brand + Collector sections, relevance ranking, graceful degradation, typeahead dropdown on Discover, base-type filter chips on /search. Someone searching "aloe nightmares" or their own `@handle` gets ranked results; someone typing on Discover sees direct-nav shortcuts; someone browsing /search can narrow to a specific base type. Only the second-tier faceted filters (rating range, brand filter) roll to post-launch — those are polish, not IG-launch blockers.
2. **First-touch routes: 68 → 95 (+27).** Reduced by 8 from SIWA + waitlist attribution. T140 audit is still a hard blocker; the whole growth loop starts on these pages.
3. **Utility features: 48 → 30 (0).** WELL PAST target. **T125 fully closed 2026-07-20** — the flagship "make Jenn talk about the app" hook. Aging reminders + shelf-state tracking + Pro-gated care packages + structured check-in modal (30-product catalog) + tap-to-log care tiles + check-in dedupe + community insights + cron + settings + slime detail integration all live. The full care loop works end-to-end. V2 (aging history graph, extended-life leaderboard) rolls to post-launch.
4. **Observability: 38 → 60 (+22).** Slightly reduced. Wire up Sentry + basic analytics before we point IG at the door.
5. **Moderation + trust: 72 → 90 (+18).** Slightly reduced. Report/flag on logs and a basic dispute path for brands.
6. **Perf + cost: 55 → 70 (+15).** Unchanged. Btree indexes for T32f axis sort + a smoke load test. T177 pagination replaces the .limit(100) stopgap.
7. **Engagement: 25 → 40 (+15).** Slightly reduced. Reactions (T127) OR comments (T120), not necessarily both.
8. **Consumer visual: 86 → 95 (+9).** T138 slime detail + T139 drop detail redesigns, plus T188 Parts 2/3/5 (slime-detail congestion, log-wizard pill overload, Pro care CTA polish).
9. **Brand-side: 55 → 60 (+5).** MASSIVELY reduced from +20. T133 banner upload or T134 tubs_available editor either one closes this.
10. **Content: 95 → 95 (0).** MET target. Guide Part 6 rebuilt as a 14-section care accordion + new Part 13 recipes shipped 2026-07-20 (T185 DONE, T189 folded in). Only Guide Part 1 art-direction (T32a) remains as polish.
11. **Growth / virality: 88 → 90 (+2).** MASSIVELY reduced from +25. Basically at target.
12. **Notifications: 60 → 60 (0).** MET target. T121 drop push notifications rolls to public-web launch instead.
13. **Monetization: 65 → 30 (0).** WELL PAST target. Bump from 55 → 65 with T171 shipping today: intro coupon flow verified end-to-end through Stripe hosted checkout, `/settings/subscription` copy rewritten to lead with actual Pro features + intro pricing framing + renewal disclosure. Real closure to 90% now only comes when RC SDK ships in Capacitor + FeedAdSlot component renders live ads.

---

## Balance rules (drift alarms)

- **Consumer visual should not exceed brand-side by more than 25 points.** We're at 84 vs 55 (29-point gap, down from 42 on 2026-07-14). Still slightly over the alarm but much healthier. T39 brand-side wins pulled this back. Next brand-side move (T133 banner upload OR T134 tubs_available editor) closes the gap entirely.
- **Monetization should not fall more than 40 points behind consumer visual.** We're at 65 vs 84 (19-point gap, down from 54 two days ago). Anchor pricing shipped end-to-end (T171). RC SDK + FeedAdSlot component are the two remaining pieces for full closure at iOS App Store phase.
- **Growth should stay at least 20 points ahead of engagement.** Growth 88 vs engagement 25 — 63-point lead, growing since we shipped T166-T168. The tag flywheel is now doing the work AND the code is honoring it. But public-web-launch flips this: engagement (comments, reactions, likes) must catch up or growth becomes a leaky bucket. Comments (T120) or reactions (T127) are the highest-leverage next engagement move.
- **Search cannot be more than 30 points behind consumer visual at any public launch.** Right now search is 15 vs consumer visual 82 (a 67-point gap). A public visitor who types a slime name and sees a broken search page will not come back.
- **Observability cannot ever lag more than 40 points behind whatever's driving revenue.** Once monetization crosses 50%, observability must be at 60+ or we won't know when payments break.
- **Marketplace target stays at 0% until iOS App Store launch is behind us.** No custom payments per CLAUDE.md. Stripe Connect only. Do not accelerate this axis to fill idle time.
- **First-touch routes must always meet the target for the CURRENT phase, not the next.** These are the pages a stranger sees first; being 20 points behind here is death.

---

## Notes on grading

Percentages are honest estimates, not measured. Grade each axis as "if the target user tried to use this axis end-to-end today, what fraction of what they'd expect works cleanly." A 50% doesn't mean "half the tickets are done", it means "half the flow works."

Review cadence: after every material design or feature drop. Update the "Now" column when a ticket ships that moves the number by more than 3 points. Update targets when the launch plan shifts.

## Related docs

- `docs/SlimeLog_Tracker.md` — Ticket queue (source of the specific work behind these percentages)
- `docs/pre-launch-audit-2026-07-06.md` — Security + hardening progress (feeds the moderation, observability, perf axes)
- `docs/monetization-plan-2026-07-07.md` — 8-pillar monetization strategy (feeds the monetization axis)
- `docs/cost-tracker.md` — Query cost + scaling items (feeds the perf axis)
- `docs/error-tracker.md` — Known bug patterns + prevention rules (feeds the observability axis)
