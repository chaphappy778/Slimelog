# Readiness Dashboard

Honest state of the SlimeLog app across every axis that matters, plus the target percentage each axis should hit before each launch phase.

## Why this exists

We've been rebuilding surface by surface with the Design agent, which has (correctly) pushed consumer visuals well ahead of everything else. That's a recipe for launching a beautiful app that can't monetize, or a fully-loaded app whose brand-side onboarding leaks brands out the back door.

This doc keeps every axis honest. If any single axis races more than ~25 points ahead of what its launch phase actually needs, that's a signal to redirect effort. The other direction is worse: any axis that falls more than ~15 points below its target for the *next* phase is a blocker to declare.

Update this whenever a major surface ships or a launch phase target shifts.

---

## Current honest state (2026-07-17)

Last snapshot 2026-07-14. Deltas below reflect the 2026-07-15 → 2026-07-17 run:
Phase 2 taxonomy rework, SIWA + Capacitor scaffold, all four HIGH T39 tag-flow findings (T166 H1+H3, T167 H2, T168 H4) + three T39 mediums (M1a, M2, M4) + a fourth medium closed as T173 (brand logo on feed/detail), T169 notifications feed auto-refresh, T174 hamburger brand shortcut, T175 claim wizard back nav, T172 scent-notes moderation + brand-claim domain auto-approve.

| Axis | Now | Δ | What's counted | What's missing |
| --- | ---: | ---: | --- | --- |
| Consumer visual polish | 84% | +2 | Prior list + brand logo now renders on feed cards + slime detail + OG image (T173, T39-M2), T39-M4 base_type OG fix, wizard scroll reset, brand autocomplete prefix-first, guide cleanup, basic hero photo | Slime detail page (T138), drop detail page (T139), settings pages (T141), first-touch routes (T140), brand claim page redesign (T176) |
| First-touch / auth routes | 68% | +8 | Prior list + Sign in with Apple button (T142), Supabase Apple provider live, waitlist attribution capture (T151) with heard_from + UTM columns | First-touch route visual audit (T140), user onboarding refresh (T136), `/settings/subscription` copy rewrite (T171) |
| Brand-side surfaces | 55% | +15 | Prior list + brand-owner notification on new log (T167 — biggest brand-side win, brands now hear when their brand is tagged), brand-claim domain auto-approve (T39-M1a, 3-5 days → instant), brand-owner hamburger shortcut (T174 — brand ownership reads as a peer identity), variant-suggestions admin queue + approval flow (T158 Commit B) | Brand dashboard visual redesign (T137), banner + logo upload UI (T133), tubs_available editor (T134), brand onboarding checklist (T135), brand notification center (T122), reply-to-log (T123), brand announcements (T124), brand ownership drop/reassign admin tool |
| Monetization | 30% | +5 | Prior list + Apple Developer capability (IAP) enabled on App ID, ASC subscription group (SlimeLog Pro) created, RC/Apple full setup handoff doc written (2026-07-17), Jenn asset brief filed for all pending Pro copy + graphics | Pro Monthly + Annual products NOT yet created in ASC (waiting on Jenn's copy), no `.p8` uploaded to RC, RC iOS SDK not wired, subscription terms display (item #14), in-feed advertising DEFERRED, `/settings/subscription` copy still overpromises (T171) |
| Engagement | 25% | +5 | Prior list + notifications feed auto-refresh + manual Refresh button (T169), brand_log_received notification type live | Comments (T120), reactions (T127), likes (T33d deferred), wishlist notifications (T128), most-liked sort |
| Notifications infrastructure | 60% | +15 | Prior list + 3 of 10 enum types firing today (brand_suggestion_approved/rejected already there, brand_log_received added T167, variant_suggestion_approved/rejected added T158 Commit B-admin), notifications feed auto-poll every 30s while tab visible + manual refresh, Page Visibility API pause when backgrounded | Push notifications for drops (T121), brand-side notification center (T122), realtime push (T29a), remaining unused enum types wired up (T29b) |
| Marketplace | 0% | — | Nothing built | Stripe Connect integration, listing flow, buyer/seller messaging, shipping label integration, dispute handling |
| Utility features | 5% | — | No change | Aging / activator reminders (T125 — flagship utility), batch tracking (T131), compare mode (T132), search on personal collection_logs (T161) |
| Growth / virality | 88% | +23 | Prior list + all four HIGH T39 tag-flow audit findings shipped: post-log share CTA (T166-H1), rich reshare caption with @handle + rating + UTM (T166-H3), brand-owner notification on tagged log (T167-H2), sessionStorage log-wizard draft persistence (T168-H4). Plus M1a auto-approve for brand claims, M2 brand logo on OG. Reshare loop is fully plumbed end-to-end. | Share-to-social deep link (T40 — auto-download + IG/TikTok deep link), video reviews (T41 gated on data), Momo-tier brand outreach (T160), pagination on feed for growing waitlist (T177) |
| Content / guide | 92% | +2 | Prior list + Basic base type entry + Jenn-shot Basic hero photo, snowbutter naming + variants + Cloud Cream aliases, White Whale brand link restored, SlimeLog Official credited on Basic entry | Ongoing brand + slime catalog growth (community-driven, never "done"), Guide Part 1 art-direction pass (T32a) |
| Moderation + trust | 72% | +2 | Prior list + scent_notes moderation gate added (T172), variant-suggestion moderation gate (T158) | Report / flag system for logs, brand disputes over ratings, safe-response templates for brands |
| Observability | 38% | +3 | Prior list + admin System Reminders section (SIWA rotation, extensible for cert / API renewals) | No Sentry or equivalent, no analytics platform (Posthog / Amplitude), no dashboards, no alerting |
| Performance + cost hardening | 55% | — | No change on the axis | Btree indexes on axis-sort columns (T32f flagged), materialized views for popular aggregates, load test, T177 pagination replaces the current .limit(100) stopgap |
| Native app packaging | 40% | +40 | HUGE jump — Capacitor scaffolded end-to-end (Pattern B remote-load shell), iOS simulator loads slimelog.com in-app, StatusBar + SplashScreen + App plugins configured, iPhone 17 Pro simulator green. Dev environment fully paved (Xcode 26.6, macOS Sequoia, CocoaPods, brew). RC/Apple prerequisite chain documented + Phase 1-2 executed. | RevenueCat SDK wiring (Phase 8 of RC/Apple doc), app icon + splash logo (waiting on Jenn's logo rework), code signing setup + provisioning, Push Notifications plugin + APNs cert, Camera plugin, Universal Links config, TestFlight upload, Capacitor 8 → 9 upgrade (T163) |
| Search | 15% | — | No change on the axis | Global search extension for personal collection_logs (T161), typeahead, faceted filters, relevance ranking. Item #28 still READY, not built |

---

## Launch phase targets

Read a column as: "before we do this launch, each axis should be at LEAST this %." Blank cells mean "no additional gain needed for this phase over the previous."

| Axis | Now | IG soft launch | Public web launch | iOS App Store | Marketplace launch |
| --- | ---: | ---: | ---: | ---: | ---: |
| Consumer visual polish | 84% | 95% | 100% | 100% | 100% |
| First-touch / auth routes | 68% | 95% | 100% | 100% | 100% |
| Brand-side surfaces | 55% | 60% | 80% | 90% | 100% |
| Monetization | 30% | 30% | 50% | 90% | 100% |
| Engagement | 25% | 40% | 70% | 90% | 100% |
| Notifications infrastructure | 60% | 60% | 80% | 95% | 100% |
| Marketplace | 0% | 0% | 0% | 30% | 100% |
| Utility features | 5% | 30% | 70% | 90% | 100% |
| Growth / virality | 88% | 90% | 100% | 100% | 100% |
| Content / guide | 92% | 95% | 100% | 100% | 100% |
| Moderation + trust | 72% | 90% | 95% | 100% | 100% |
| Observability | 38% | 60% | 75% | 90% | 100% |
| Performance + cost hardening | 55% | 70% | 85% | 95% | 100% |
| Native app packaging | 40% | 0% | 20% | 100% | 100% |
| Search | 15% | 70% | 90% | 95% | 100% |

### Gap to IG soft launch (largest to smallest)

Big shift from 2026-07-14: **Growth/virality and Brand-side both essentially caught their IG-launch targets** (they're the biggest change in this snapshot). Native app packaging leapfrogged past its IG-launch bar entirely — that budget rolls forward to iOS App Store. Focus for the IG runway now cleanly narrows to:

1. **Search: 15 → 70 (+55).** Unchanged. Item #28 is READY but not built. This is now the single biggest IG-launch gap by a wide margin. Global search is table-stakes when users hear about slimes on IG and land wanting to look them up.
2. **First-touch routes: 68 → 95 (+27).** Reduced by 8 from SIWA + waitlist attribution. T140 audit is still a hard blocker; the whole growth loop starts on these pages.
3. **Utility features: 5 → 30 (+25).** Unchanged. At least a basic version of T125 aging reminders. This is the utility hook that makes Jenn talk about the app to other collectors.
4. **Observability: 38 → 60 (+22).** Slightly reduced. Wire up Sentry + basic analytics before we point IG at the door.
5. **Moderation + trust: 72 → 90 (+18).** Slightly reduced. Report/flag on logs and a basic dispute path for brands.
6. **Perf + cost: 55 → 70 (+15).** Unchanged. Btree indexes for T32f axis sort + a smoke load test. T177 pagination replaces the .limit(100) stopgap.
7. **Engagement: 25 → 40 (+15).** Slightly reduced. Reactions (T127) OR comments (T120), not necessarily both.
8. **Consumer visual: 84 → 95 (+11).** Slightly reduced. T138 slime detail + T139 drop detail redesigns.
9. **Brand-side: 55 → 60 (+5).** MASSIVELY reduced from +20. T133 banner upload or T134 tubs_available editor either one closes this.
10. **Content: 92 → 95 (+3).** Small polish pass.
11. **Growth / virality: 88 → 90 (+2).** MASSIVELY reduced from +25. Basically at target.
12. **Notifications: 60 → 60 (0).** MET target. T121 drop push notifications rolls to public-web launch instead.
13. **Monetization: 30 → 30 (0).** MET target for IG launch. The Pro tier stays behind the paywall until iOS App Store.

---

## Balance rules (drift alarms)

- **Consumer visual should not exceed brand-side by more than 25 points.** We're at 84 vs 55 (29-point gap, down from 42 on 2026-07-14). Still slightly over the alarm but much healthier. T39 brand-side wins pulled this back. Next brand-side move (T133 banner upload OR T134 tubs_available editor) closes the gap entirely.
- **Monetization should not fall more than 40 points behind consumer visual.** We're at 30 vs 84 (54-point gap, down from 57). Improvement from ASC groundwork. Real closure comes only when RC SDK ships in Capacitor (Phase 8 of the RC/Apple guide).
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
