# Readiness Dashboard

Honest state of the SlimeLog app across every axis that matters, plus the target percentage each axis should hit before each launch phase.

## Why this exists

We've been rebuilding surface by surface with the Design agent, which has (correctly) pushed consumer visuals well ahead of everything else. That's a recipe for launching a beautiful app that can't monetize, or a fully-loaded app whose brand-side onboarding leaks brands out the back door.

This doc keeps every axis honest. If any single axis races more than ~25 points ahead of what its launch phase actually needs, that's a signal to redirect effort. The other direction is worse: any axis that falls more than ~15 points below its target for the *next* phase is a blocker to declare.

Update this whenever a major surface ships or a launch phase target shifts.

---

## Current honest state (2026-07-14)

| Axis | Current % | What's counted | What's missing |
| --- | --- | --- | --- |
| Consumer visual polish | 82% | Discover, log wizard (create + edit), brands index, brand detail, search, base-type / keyword pages, follower + following lists, social stats on profile, Guide, how-to-rate | Slime detail page (T138), drop detail page (T139), settings pages (T141), first-touch routes (T140) |
| First-touch / auth routes | 60% | Signup, login, welcome, password reset (T33 fixed), waitlist works | First-touch route visual audit (T140), user onboarding refresh (T136) |
| Brand-side surfaces | 40% | Brand dashboard exists, drops split panel exists, claim + suggestion flow exists | Brand dashboard visual redesign (T137), banner + logo upload UI (T133), tubs_available editor (T134), brand onboarding checklist (T135), brand notification center (T122), reply-to-log (T123), brand announcements (T124) |
| Monetization | 25% | Referrals live (item #5), Pro tier schema present, brand-pro tier schema present, ShareButton wired to referral links | RevenueCat integration BLOCKED (item #22) on D&B chain, subscription terms display BLOCKED (item #14), in-feed advertising DEFERRED (item #19), no live payments flow, brand-pro subscriptions not billable yet |
| Engagement | 20% | Follows work, notifications table present | Comments (T120), reactions (T127), likes (T33d deferred), wishlist notifications (T128), most-liked sort |
| Notifications infrastructure | 45% | In-app bell + feed shipped (item #29), 2 of 10 enum types firing today | Push notifications for drops (T121), brand-side notification center (T122), realtime push (T29a), 8 unused enum types wired up (T29b) |
| Marketplace | 0% | Nothing built | Stripe Connect integration, listing flow, buyer/seller messaging, shipping label integration, dispute handling |
| Utility features | 5% | Guide is a reference utility but nothing operational | Aging / activator reminders (T125 — the flagship utility play), batch tracking (T131), compare mode (T132), search (item #28 READY, not built) |
| Growth / virality | 65% | Referrals + milestone rewards (item #5), auto-follow seed accounts (T36), ShareButton with `?ref=` (item #30), tag-flow flywheel already producing signups (13 to 42 in a month) | Tag flow audit (T39), share-to-social deep link (T40), video reviews (T41 gated on data), centralized cross-post feature |
| Content / guide | 90% | Full Guide at /guide, how-to-rate deep dive, rating framework, community-authored brand catalog, Featured Shops strip | Ongoing brand + slime catalog growth (community-driven, never "done"), Guide Part 1 art-direction pass (T32a) |
| Moderation + trust | 70% | lib/moderation.ts covers usernames + notes + comments + suggestions + brand bios, obscenity + custom regex, whitelist path, admin exemption | Report / flag system for logs, brand disputes over ratings, safe-response templates for brands |
| Observability | 35% | console.warn / console.error on all Supabase queries per house rule, cost tracker doc, error tracker doc | No Sentry or equivalent, no analytics platform (Posthog / Amplitude), no dashboards, no alerting |
| Performance + cost hardening | 55% | Cost tracker doc listing scaling watch items, defensive fallbacks for migration lag, RLS-audit in progress (pre-launch audit doc) | Btree indexes on the axis-sort columns (T32f flagged), materialized views for popular aggregates when volume warrants, load test |
| Native app packaging | 0% | Nothing native yet | Capacitor packaging (item #23 BLOCKED on RevenueCat chain), iOS build, Android build, IAP wiring, push certificate setup |
| Search | 15% | Basic search page exists but no ranking, no scoping, no typeahead | Global search across slimes / brands / users (item #28), typeahead, faceted filters, relevance ranking |

---

## Launch phase targets

Read a column as: "before we do this launch, each axis should be at LEAST this %." Blank cells mean "no additional gain needed for this phase over the previous."

| Axis | Now | IG soft launch | Public web launch | iOS App Store | Marketplace launch |
| --- | ---: | ---: | ---: | ---: | ---: |
| Consumer visual polish | 82% | 95% | 100% | 100% | 100% |
| First-touch / auth routes | 60% | 95% | 100% | 100% | 100% |
| Brand-side surfaces | 40% | 60% | 80% | 90% | 100% |
| Monetization | 25% | 30% | 50% | 90% | 100% |
| Engagement | 20% | 40% | 70% | 90% | 100% |
| Notifications infrastructure | 45% | 60% | 80% | 95% | 100% |
| Marketplace | 0% | 0% | 0% | 30% | 100% |
| Utility features | 5% | 30% | 70% | 90% | 100% |
| Growth / virality | 65% | 90% | 100% | 100% | 100% |
| Content / guide | 90% | 95% | 100% | 100% | 100% |
| Moderation + trust | 70% | 90% | 95% | 100% | 100% |
| Observability | 35% | 60% | 75% | 90% | 100% |
| Performance + cost hardening | 55% | 70% | 85% | 95% | 100% |
| Native app packaging | 0% | 0% | 20% | 100% | 100% |
| Search | 15% | 70% | 90% | 95% | 100% |

### Gap to IG soft launch (largest to smallest)

1. Search: 15 → 70 (+55). Item #28 is READY but not built. Global search is table-stakes when users hear about slimes on IG and land wanting to look them up.
2. First-touch routes: 60 → 95 (+35). T140 audit is a hard blocker; the whole growth loop starts on these pages.
3. Utility features: 5 → 30 (+25). At least a basic version of T125 aging reminders. This is the utility hook that makes Jenn talk about the app to other collectors.
4. Growth / virality: 65 → 90 (+25). T39 tag-flow audit + T40 share-to-social deep link.
5. Engagement: 20 → 40 (+20). Reactions (T127) OR comments (T120), not necessarily both.
6. Moderation + trust: 70 → 90 (+20). Report/flag on logs and a basic dispute path for brands.
7. Brand-side: 40 → 60 (+20). T133 banner upload + T134 tubs_available editor at minimum, so brands who join can actually merchandise.
8. Notifications: 45 → 60 (+15). T121 drop push notifications so followers hear about drops.
9. Observability: 35 → 60 (+25). Wire up Sentry + basic analytics before we point IG at the door.
10. Consumer visual: 82 → 95 (+13). T138 slime detail + T139 drop detail redesigns.
11. Perf + cost: 55 → 70 (+15). Btree indexes for T32f axis sort + a smoke load test.
12. Content: 90 → 95 (+5). Small polish pass.

---

## Balance rules (drift alarms)

- **Consumer visual should not exceed brand-side by more than 25 points.** We're at 82 vs 40 right now, a 42-point gap. This is the biggest current imbalance. If brand-side stays at 40 while we polish the last 18 points of consumer visual, we launch a shiny app that brands quit within a week.
- **Monetization should not fall more than 40 points behind consumer visual.** We're at 25 vs 82 right now, a 57-point gap. Most of this is legitimate (RevenueCat blocked, marketplace is a post-launch play) but referrals + brand-pro billing should not slip further.
- **Growth should stay at least 20 points ahead of engagement.** Growth is currently 65, engagement is 20 — a 45-point lead. That's fine because IG-tag-flow is doing the work. But once we push public web launch, this inverts: engagement has to catch up or growth becomes a leaky bucket.
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
