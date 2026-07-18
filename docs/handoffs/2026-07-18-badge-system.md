# SlimeLog Badge System — Launch Design v2

**Filed 2026-07-18 · Tracked as T184 · Redevelopment of the earlier verbally-scoped badge system**

---

## 1. Purpose

The badge system is one of SlimeLog's core retention hooks. It turns solitary collection logging into a gamified journey, gives users public signals of their standing (profile display, feed decoration on high-tier logs), gives us free growth virality (badge shares on IG + shelf screenshots), and gives brands a signal-boost mechanism ("Brand Loyal" badges implicitly promote brands the user loves).

The system must:

1. **Reward participation at every tier** — a user who logged their first slime today should earn a badge; a user with 2,000 logs should still have unearned badges chasing them.
2. **Reflect the slime community's actual vocabulary + values** — texture mastery, drop hunting, community curation matter more than raw volume.
3. **Feel earned, not gifted** — the ratio of rare/legendary to common should skew "hard-won." No participation trophies dilute the top tiers.
4. **Support post-launch expansion** — seasonal badges, brand-collab badges, admin-issued "Jenn's Pick" badges must slot in without a schema rewrite.
5. **Be visually coherent** — 100 badges from a single designer, one aesthetic system, five rarity tier treatments.
6. **Have honest earn logic** — every badge earn condition must be a real event or SQL predicate. No fake earn ("Slime Sommelier for reading this blog post"). If a badge exists, we can prove someone earned it.

---

## 2. Design principles

**Community-first vocabulary.** Jenn's V4 guide is the source of truth for texture names, brand glossary, and the SlimeLog voice. Badge names + descriptions should sound like they belong in the guide.

**Direct address, no em-dashes.** House-style rule from CLAUDE.md — badge copy uses "you" and avoids em-dashes.

**No AI-generated visuals.** Community sensitivity is real. Badge art is human-designed from a slime-community designer, or geometric SVGs Claude ships.

**Never announce a badge without earning it.** No dev-mode fake earn. The earn moment is one of the most delightful surface areas of the app; don't cheapen it.

**Every badge is a URL.** `/badges/<slug>` renders a public page with badge name, art, description, rarity tier, and (if public) recent earners. Enables sharing to IG, embedding on shelf, driving inbound signups from "@collector1234 earned Century Club on SlimeLog."

**Silent by default in the profile, loud on the earn moment.** When a badge is earned mid-session, we fire a full-screen celebration modal (photo + confetti + accent-colored glow matching rarity tier). Elsewhere, the badge sits quietly on the profile grid until the user chooses to feature it.

**Featured badges only on visible surfaces.** A user picks up to 6 featured badges shown on their profile header, on their feed cards, and on the shelf page. All earned badges live on `/users/<username>/badges` (public) for anyone who wants to see the full collection.

---

## 3. Rarity tier system

Every badge belongs to one of five rarity tiers. Visual treatment is consistent within a tier; badge art varies per-badge but the frame + glow do not.

| Tier | Color glow | Border | Ratio of launch set | Typical earn |
| --- | --- | --- | --- | --- |
| **Common** | soft cyan `#00F0FF` at 40% opacity | 1px cyan | ~40% of badges | Low-friction participation (first log, first follow) |
| **Uncommon** | cyan `#00F0FF` at 80% + soft glow | 1px cyan glow | ~25% of badges | Moderate effort (10 logs, 7-day streak) |
| **Rare** | slime green `#39FF14` medium glow | 1px green | ~18% of badges | Genuine accomplishment (100 logs, 30-day streak, 25 brands followed) |
| **Epic** | magenta `#FF00E5` heavy glow | 2px magenta | ~12% of badges | Real dedication (500 logs, 100 followers, 10 drop catches) |
| **Legendary** | gold `#FFD24A` intense glow + subtle rainbow border | 2px gold + rainbow underlay | ~4% of badges | Extremely rare (2500 logs, 100+ followers, super-limited drop catches) |
| **Mythic** | full rainbow border + heavy multi-color glow | rainbow gradient | ~1% of badges | One-time or manually issued (Founding Member, Jenn's Pick) |

Total launch set targets **~85-95 badges** across these tiers, with room to grow to 200+ over year 1.

---

## 4. Categories + full badge list

### A. Getting Started (5 badges, all Common)

Onboarding badges — every user should earn at least 3 in their first session.

1. **Welcome to the Community** · Common · signed up successfully
2. **First Log** · Common · logged your first slime
3. **First Rating** · Common · rated a slime on any axis
4. **First Follow** · Common · followed your first brand or collector
5. **Photo Journalist** · Common · added a photo to a log

### B. Collection milestones (10 badges)

Volume-based, cleanly tiered.

6. **Ten and Counting** · Common · 10 logs
7. **Quarter Century** · Uncommon · 25 logs
8. **Shelf Established** · Uncommon · 50 logs
9. **Century Club** · Rare · 100 logs
10. **The 250** · Rare · 250 logs
11. **The 500** · Epic · 500 logs
12. **Slime Sommelier** · Epic · 1,000 logs
13. **Curator** · Legendary · 2,500 logs
14. **Archivist** · Legendary · 5,000 logs
15. **The Vault** · Mythic · 10,000 logs

### C. Textural mastery (20 first-of-type + 5 breadth = 25 badges)

Per base type from Jenn's V4 guide. Each is a "first log in this texture" badge — Common tier, quick wins that showcase the guide's texture vocab.

16. **Butter Believer** · Common · first butter log
17. **Cloud Chaser** · Common · first cloud log
18. **Floam Fluent** · Common · first floam log
19. **Jelly Jockey** · Common · first jelly log
20. **Glossy Goer** · Common · first glossy log
21. **Clear Enthusiast** · Common · first clear log
22. **Icee Initiate** · Common · first icee log
23. **Thick-and-Glossy Talent** · Common · first thick-and-glossy log
24. **Snow-Fizz Fan** · Common · first snow-fizz log
25. **Magnetic Mover** · Common · first magnetic log
26. **DIY Dabbler** · Common · first DIY log (post T185)
27. **Butter Slime Master** · Rare · 25 butter logs
28. **Cloud Slime Master** · Rare · 25 cloud logs
29. **Floam Master** · Rare · 25 floam logs
30. **Glossy Master** · Rare · 25 glossy logs
31. **Clear Master** · Rare · 25 clear logs
32. **Jelly Master** · Rare · 25 jelly logs

**Breadth (5 badges):**

33. **Textural Explorer** · Uncommon · logged in 10 distinct base types
34. **Well-Rounded** · Rare · logged in 15 distinct base types
35. **Full Spectrum** · Epic · logged in all 20 base types
36. **Depth Collector** · Rare · 10+ logs in 5 distinct base types
37. **Cross-Texture Curator** · Epic · 25+ logs in 8 distinct base types

### D. Rating quality (8 badges)

Rewards deliberate, high-quality rating behavior — not just clicking through.

38. **All Six Axes** · Common · rated one slime on all six axes
39. **Detailed Reviewer** · Uncommon · added notes to 25 logs
40. **Photo Perfectionist** · Rare · added photos to 100 logs
41. **Streak Starter** · Uncommon · 7-day rating streak
42. **Streak Champion** · Rare · 30-day rating streak
43. **Marathoner** · Epic · 100-day rating streak
44. **Rating Rigor** · Epic · 50 consecutive logs rated on all six axes
45. **Gold Standard** · Legendary · rated a slime that Jenn admin-flags as a "gold standard review"

### E. Brand engagement (10 badges)

Rewards discovery + loyalty across brands.

46. **Brand Curious** · Common · followed your first brand
47. **Brand Explorer** · Uncommon · logged from 10 distinct brands
48. **Brand Historian** · Rare · logged from 30 distinct brands
49. **Brand Encyclopedic** · Epic · logged from 75 distinct brands
50. **Brand Loyal (Bronze)** · Uncommon · 10+ logs from a single brand
51. **Brand Loyal (Silver)** · Rare · 25+ logs from a single brand
52. **Brand Loyal (Gold)** · Epic · 50+ logs from a single brand
53. **Restock Regular** · Rare · caught 3 drops from the same brand within 24 hr of drop
54. **Verified Believer** · Uncommon · followed 10 verified brands
55. **Suggester** · Rare · 5 brand suggestions approved (community curation)

### F. Community + social (12 badges)

Signals that reward social presence + generosity.

56. **First Voice** · Common · left your first comment
57. **Conversationalist** · Uncommon · 25 comments across the community
58. **First Heart** · Common · gave your first like
59. **Liked** · Uncommon · received 10 likes on your logs
60. **Well-Liked** · Rare · received 100 likes on your logs
61. **Popular Collector** · Rare · reached 10 followers
62. **Community Figure** · Epic · reached 100 followers
63. **Local Celebrity** · Legendary · reached 500 followers
64. **Shared Shelf** · Common · shared a shelf link
65. **Referral Advocate** · Uncommon · referred 5 friends who joined
66. **Growth Engine** · Rare · referred 25 friends who joined
67. **Community Pillar** · Epic · admin-issued for outstanding participation

### G. Drop hunting (7 badges)

Rewards speed + rarity engagement with brand drops.

68. **Drop Catcher** · Uncommon · logged a slime within 24 hr of its drop
69. **Fast Fingers** · Rare · logged a slime within 1 hr of its drop
70. **Drop Regular** · Rare · logged 5 distinct drops
71. **Drop Hunter** · Epic · logged 15 distinct drops
72. **One-of-One** · Epic · logged a super-limited drop (total tubs ≤50)
73. **Unicorn Catcher** · Legendary · logged a mythic drop (total tubs ≤10)
74. **Restock King** · Legendary · logged 5 restocks within their first hour

### H. Recipe + craft (5 badges, post T185)

Ships after T185 recipes land. Bridges paid vs. homemade slime.

75. **Recipe Attempter** · Uncommon · logged your first homemade slime (`is_homemade = true`)
76. **Kitchen Chemist** · Rare · 10 homemade logs across 3 base types
77. **Home Maker** · Epic · 25 homemade logs
78. **Recipe Ranger** · Epic · homemade log in 8+ base types
79. **Master Crafter** · Legendary · homemade log rated ≥4.5 avg by ≥10 other collectors (community-validated homemade)

### I. Streaks + consistency (6 badges)

Distinct from rating streaks — these reward calendar-daily use.

80. **Daily Habit** · Uncommon · opened the app 7 days in a row
81. **Weekly Regular** · Rare · opened the app every week for 4 weeks
82. **Monthly Mainstay** · Epic · opened the app every week for 12 weeks
83. **First Anniversary** · Rare · logged in on the 1-year anniversary of your first log
44. **Weekend Warrior** · Common · logged on both Saturday and Sunday of the same week
85. **Comeback Kid** · Uncommon · returned to log after 30+ day inactivity

### J. Founding + special (10 badges, mostly Mythic + Legendary)

One-time-issue badges tied to launch history. Post-launch these become immutable historical markers.

86. **Founding Member** · Mythic · one of the first 500 signups (auto-fire during launch window)
87. **Founding Rater** · Mythic · one of the first 100 to submit a rating
88. **Founding Collector** · Mythic · one of the first 25 to reach 50 logs
89. **Early Bird** · Legendary · signed up in the first 30 days
90. **Beta Tester** · Legendary · used SlimeLog before v1.0.0 shipped
91. **Guide Scholar** · Rare · visited all 13 parts of the guide in a single session (client-side tracker)
92. **Rating Guide Reader** · Common · scrolled through all six axes on `/how-to-rate`
93. **Jenn's Pick** · Mythic · admin-issued for exceptional community contribution (Jenn selects)
94. **Trend Spotter** · Epic · logged a base type before it hit top-10 that month (backfilled monthly)
95. **First Anniversary of SlimeLog** · Mythic · used the app on 2027-08-XX (whenever v1.0 first-anniversary is)

**Total launch set: 95 badges.**

---

## 5. Rarity distribution audit

- Common: 22 (23%)
- Uncommon: 22 (23%)
- Rare: 24 (25%)
- Epic: 16 (17%)
- Legendary: 7 (7%)
- Mythic: 4 (4%)

Slightly heavier on Common + Uncommon than the "40/25/18/12/4/1" target because launch users should feel rewarded quickly. Post-launch, the Epic/Legendary tier fills out as we add more accomplishment gates.

---

## 6. Schema

Existing schema doesn't cover this. New migration required.

```sql
-- 20260718000001_badges.sql

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- 'century-club'
  name text not null,                  -- 'Century Club'
  description text not null,           -- '100 logs on SlimeLog'
  category text not null,              -- 'collection' | 'texture' | 'rating' | 'brand' | 'community' | 'drop' | 'recipe' | 'streak' | 'founding'
  rarity text not null,                -- 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'
  earn_kind text not null,             -- 'auto' | 'admin'
  earn_predicate jsonb,                -- SQL-generating spec: { type: 'log_count', threshold: 100 }
  earn_window_started_at timestamptz,  -- for founding badges: when the window opened
  earn_window_closes_at timestamptz,   -- for founding badges: when the window closes
  is_active boolean not null default true,
  is_featured_by_default boolean not null default false,
  visual_asset_url text,               -- 512x512 PNG or SVG in Supabase Storage
  visual_icon_url text,                -- 256x256 variant for small displays
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  badge_id uuid not null references badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  earned_context jsonb,                -- what triggered the earn (log_id, log_count, etc)
  is_featured boolean not null default false,
  unique (user_id, badge_id)
);

create index user_badges_user_id_idx on user_badges(user_id);
create index user_badges_badge_id_idx on user_badges(badge_id);
create index user_badges_featured_idx on user_badges(user_id) where is_featured = true;

-- RLS
alter table badges enable row level security;
alter table user_badges enable row level security;

-- Anyone can read the badge catalog
create policy "badges are public" on badges for select using (is_active = true);
-- Anyone can read anyone's badges (public profile display)
create policy "user_badges are public" on user_badges for select using (true);
-- Users can update only their own featured flag
create policy "users update own featured" on user_badges
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Only backend triggers/functions insert badges (never client)
create policy "no client inserts" on user_badges for insert with check (false);
```

**Rationale:**
- `earn_predicate` as JSONB lets us add new earn types without a schema change. Common shapes: `{ type: 'log_count', threshold: 100 }`, `{ type: 'distinct_brands', threshold: 30 }`, `{ type: 'streak_days', axis: 'rating', threshold: 30 }`, `{ type: 'first_of_type', base_type: 'butter' }`.
- `earned_context` captures which specific log triggered the earn — useful for "you earned this on your log of Angry Dinos butter" celebration copy.
- `is_featured` on the join table lets a user pick up to 6 to display. Enforced at the app layer, not DB.
- `earn_window_started_at` / `earn_window_closes_at` on the badge itself powers founding-tier badges. When the window closes, no new user can earn.

---

## 7. Earn logic infrastructure

### Where earn checks fire

**On log insert** (Supabase edge function, fires from a `after insert on collection_logs` trigger):
- Log-count badges (10, 25, 50, 100, ...)
- First-of-type texture badges
- Brand-distinct badges
- Brand-loyal badges (per-brand log count)
- Photo badges
- Drop-catch badges (join log to drops table on brand_id + time-window)
- Recipe badges (when `is_homemade = true`)

**On rating insert** (trigger on `brand_ratings`):
- All-six-axes badge
- Rating-streak badges (compare to last 7/30/100 rating dates)

**On follow insert** (trigger on `follows` + `brand_follows`):
- First-follow badges
- Brand-curious / brand-explorer badges
- Popular-collector badges (followers received)

**On comment insert** (trigger on `comments`):
- First-voice + conversationalist

**On session start** (client-side, deduped by day):
- Daily-habit streak badges

**On brand suggestion approval** (admin action):
- Suggester badge

**Nightly cron** (a Supabase edge function scheduled via pg_cron):
- Recompute streak states (in case the trigger missed one)
- Backfill trend-spotter monthly at month-end
- Recompute founding-window badges when a window closes

**Manual admin issue** (Jenn or James in the admin UI):
- Jenn's Pick
- Community Pillar
- Master Crafter (community-validation-based)

### Idempotency

Every earn function uses `INSERT ... ON CONFLICT (user_id, badge_id) DO NOTHING`. A trigger firing twice on the same log doesn't double-award.

### Retroactive earn

New badges added post-launch need a one-time backfill. Each badge's earn_predicate is the source of truth — Claude writes a backfill SQL that scans historical data and awards to matching users. The `earn_context` for backfilled awards is `{ backfilled: true, backfilled_at: '...' }`.

### Preventing dev-mode false-positives

Local + preview environments seed a `badges` catalog with `is_active = false`. No user in production is ever awarded a badge that was staged in preview.

---

## 8. Display treatment

### Earn moment

Full-screen modal fires when a badge is awarded mid-session:
- Rarity-colored glow behind the badge (matches tier)
- Badge name + description
- 3-sec confetti (multi-color for Mythic, tier-color for others)
- "Share to shelf" and "Share to IG" buttons
- Continue button dismisses

Modal is triggered by a Supabase real-time subscription on `user_badges` for the current user. Once shown, we set `seen_at` in `earned_context` so we don't re-show on refresh.

### Profile display

**Public profile header** (`/users/<username>`): shows the user's 6 featured badges as a horizontal row with rarity glow. Tapping opens the badge detail page.

**Badge collection page** (`/users/<username>/badges`): all earned badges grouped by category, with a "Not yet earned" section showing what they could chase.

**Feed cards** — a log card from a user with a Legendary or Mythic featured badge gets a small badge indicator in the top-right corner. Common/Uncommon badges don't decorate feed cards (visual noise).

### Badge detail page (`/badges/<slug>`)

Public, SEO-indexed, shareable:
- 512×512 badge visual
- Name + description + rarity tier
- Earn condition ("100 logs")
- Global earned count ("Earned by 1,247 collectors")
- Recent earners (last 10, opt-in to appear here via user setting default true)
- CTA if the viewer hasn't earned it and is signed in: shows their progress ("You have 47 logs")

### Featured badge picker

`/settings/profile → Featured badges` — grid of earned badges with checkboxes. User picks up to 6. Auto-featured badges (`is_featured_by_default = true`) are set on earn but the user can uncheck.

---

## 9. Post-launch expansion room

Locked-in expansion paths that DON'T require schema changes:

- **Seasonal badges**: Halloween Slime (log a Halloween-themed slime), Valentine's Slime, Slime Christmas. Set earn_window on the badge; retire automatically after window closes.
- **Brand-collab badges**: Aloe Nightmares Superfan (log 5 from Aloe Nightmares). Any partner brand can co-brand a badge. Runs via admin issue with predicate.
- **Event badges**: SlimeLog Meetup Attendee (issued at IRL meetups by admin action).
- **Milestone extension**: 10K logs, 25K logs, 100K logs. Adds without schema change.
- **Rating-quality badges (v2)**: reviewer-of-the-month, best-argued rating (Jenn's Pick variant with a public reasoning-post requirement).

### Never do:

- **Purchase-locked badges.** Never gate a badge behind Pro or a marketplace purchase. Kills community trust.
- **Time-limited earn windows on tier-specific effort badges.** "500 logs by August" pressures burnout. Founding badges are the only time-locked category.
- **Grade / leaderboard-based competitive badges.** ("Top 100 collectors this month.") Feels good short-term, drives status anxiety long-term. Rare/Legendary tiers are earn-based, not rank-based.

---

## 10. Cost tracker note

**Query hotspots:**

- **Trigger fan-out** on log insert. A single log can fire 5-8 badge checks (count-based, first-of-type, brand-distinct, brand-loyal, drop-catch, photo). Combine into a single function called from the trigger with a switch statement, not 5 separate triggers.
- **Log-count aggregation** for milestone badges is O(1) if we cache count on `profiles.log_count` (backfilled once, incremented in trigger). Don't count from scratch each time.
- **Distinct-brand count** for exploration badges — same approach, maintain a `profiles.distinct_brand_count` maintained by trigger.
- **Drop-catch predicate** — needs an index on `collection_logs.brand_id + logged_at` and the drops table needs an index on `brand_id + released_at`. Filed as followup.

**Streak recomputation** runs nightly via pg_cron. Cheap at launch (thousands of users) but grows as we scale. Cost-tracker entry at build time.

---

## 11. Timeline

| Phase | Work | Time | Blocker |
| --- | --- | --- | --- |
| Concept lock | Jenn reviews + refines this 95-badge list | 2-3 hr | Jenn |
| Designer outreach | Hire slime-community designer | 1-2 weeks | Jenn |
| Design delivery | 95 badges × 512 + 256 + SVG variants | 4-6 weeks | Designer |
| Schema + trigger scaffold | Migration + earn function scaffold | 3-4 days | Claude, in parallel with design |
| Earn logic per category | Category-by-category earn function implementation | 2-3 weeks | Claude, after schema lands |
| Display treatment | Modal + profile grid + badge detail pages | 1-2 weeks | Claude |
| QA + backfill | Verify earn logic across all 95, run backfills | 1 week | Claude + Jenn |

**Realistic ship: ~2 months from Jenn's concept lock. Fits inside a "launch v1.1" release window post-iOS submission.**

---

## 12. Related tracker items

- **T184** — this doc IS T184's design deliverable. Move T184 to IN PROGRESS once Jenn signs off on the concept list.
- **T185** — recipes; ships before badge category H is meaningful.
- **T187** — brand analytics; badges may include brand-side analog ("Brand Signed 10 Slimes This Month") in v2.

---

## 13. Open questions for Jenn

1. Are the 95 badge names on-brand or do any need renaming?
2. Are there community-vocabulary badges we're missing (e.g., specific brand-slang, drop-culture terms)?
3. Should "Jenn's Pick" require public reasoning (a note from Jenn attached to the earn) or be silent?
4. Should featured-badge count be 6, or higher (10)? Fewer = more meaningful, more = more display real estate.
5. Any brands we want to line up NOW for future brand-collab badges? Aloe Nightmares? Peachybbies? Something else?
6. What's the budget cap for the designer? The 95-badge count assumes $1,500-3,500 (a 30-badge quote is typically $1,000-1,800; scaling to 95 pushes toward $2,500-5,000 depending on complexity).

Once these six are answered, Claude can produce the designer RFP.
