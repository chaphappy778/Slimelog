# Brand Pro Strategy: The Cross-Shop Moat

**Strategic brief. Snapshot of 2026-07-23 thinking, expected to evolve.**
Owner: Jennifer + James. Captured from a real-time working conversation on 2026-07-23 while Batch 3b of the brand dashboard redesign (T137) was landing.

Purpose: give future us (or a designer, engineer, or outside advisor) the reasoning behind what Brand Pro sells, which insights to build first, and how brand-size bucketing keeps comparisons honest. This is a strategy doc, not a build spec. Scope the build tickets separately.

---

## 1. The moat: what makes SlimeLog Brand Pro sellable

Every slime shop already has a Shopify dashboard. That dashboard tells them their revenue, their conversion rate, their repeat-customer rate, their best-selling SKU. It is a solved problem and we should not try to compete with it. If Brand Pro's pitch is "see your own numbers," Shopify already gives that away for free and does it better.

What no shop has, and what no shop can build for itself, is **cross-shop trend data**. How does your Butter texture rating compare to other Butter makers? Is Butter rising or falling platform-wide this month, or just in your store? Did your last drop pull normal community engagement or half of it?

Nobody else can answer that, because answering it requires a community layer that sits across many shops at once. SlimeLog is the only place that data can exist. That is the moat, and it is the entire basis for charging a brand money.

The practical test for any proposed Pro feature: **could the brand get this number from Shopify?** If yes, it is not a Pro feature. If it requires knowing what is happening in other people's stores, it is.

### The care-action reframe

Care action market intel (what activators, softeners, and additives customers reach for) is real product intel, and it was originally scoped as a brand-facing Pro placeholder. On 2026-07-23 we reframed it.

**That is our business, not theirs.** The care action dataset from T125 (structured check-ins across a 30-product catalog) is the merchandising signal for a future SlimeLog shop and affiliate refill program. "Jenn's 45 slimes consume roughly 340 pumps of contact solution per month" is a subscription product waiting to be built. Handing that same signal to brands, for money, arms the people best positioned to build the refill business before we do.

The framing distinction, stated plainly so we do not drift back:

- **Not:** "sell care intel to the brand."
- **Instead:** "brands' customers generate care data, and that data becomes SlimeLog's own merchandising signal."

This does not kill the placeholder permanently. It demotes it from a Pro deliverable to an internal signal, and it removes it from the Batch 4 priority list. Revisit only if the SlimeLog shop path is abandoned.

---

## 2. Pro insight priority order

Ordered by unique value (can only exist here) crossed with build feasibility (query patterns we already have). This is the running order for Batch 4 Option B and beyond.

### 1. Cross-shop rating percentile within peer tier

> "You rank #3 in Butter texture among brands your size."

The clearest expression of the moat. It is a number the brand cannot get anywhere else, it is emotionally sticky, and it directly answers the question every maker actually has: am I good at this? Requires brand-size bucketing to be non-demoralizing (see §4). Reads against the six rating dimensions we already collect, sliced by base type.

### 2. Repeat-purchase proxy

> "42% of your customers logged 2 or more of your slimes. Your top 3 repeat products: Butter Bear, Cloud Nine, Peach Fizz."

Not true purchase data, and we should never call it that. It is a logging-behavior proxy, and it is honest as long as the copy says so. Same query pattern as #1: aggregate `collection_logs` by `user_id` per brand. Cheap to build once #1's aggregation shape exists. Valuable because Shopify's repeat-customer number only counts purchases made in that one store, while ours counts loyalty as expressed across the whole community.

### 3. Drop benchmarking

> "Your last drop got 47 community logs in the first week. Average for a drop this size is 22."

The most shareable metric in the set, which matters for growth: a brand posting "2x the platform average" to their story is free marketing for SlimeLog. We already compute per-drop log counts for the free Drop Performance chart, so the incremental work is the peer-tier comparison denominator, not the numerator.

### 4. Trending base types and variant demand

> "Butter is up 18% platform-wide this month. Your Butter drops outperformed the platform average 3x."

The only insight in the list that is directly actionable for a business decision (what to restock, what to make next). Weakest on build feasibility because it needs a time-series aggregation across the whole catalog rather than a single-brand slice, and it needs enough volume that a monthly delta is signal rather than noise. Sequence it after the first three.

### 5. Care market intel (deferred as a brand-facing feature)

Position as internal signal, not Pro deliverable. See the reframe in §1. The existing placeholder card on the analytics page stays for now but should not be built out toward brands.

---

## 3. What each insight replaces or augments

The brand analytics page at `/brand-dashboard/[slug]/analytics` currently splits into free surfaces backed by real data (Logs Over Time, Drop Performance, Community Ratings Breakdown, Top Slimes by Logs, Community Logging Activity) and a `ProGate` section labeled "Brand Pro Extras" holding placeholders (Community Logs Per Drop, Care Action Market Intel) plus the real Export Data block. Two more free placeholders sit above the gate (Rating Trend Over Time, Follower Growth).

Every free surface today is brand-specific: your logs, your drops, your ratings. All of it is genuinely useful and none of it is defensible, because it is the same shape of number Shopify already shows.

The insights in §2 turn the placeholders into the thing nobody else offers. Concretely:

- **Community Logs Per Drop** placeholder becomes **drop benchmarking** (§2.3). Its current copy already promises "how your drops perform against the platform average," so the placeholder is already pointed at the moat. It just needs the peer-tier denominator.
- **Care Action Market Intel** placeholder becomes deferred. Leave the card, do not build toward it.
- **Rating Trend Over Time** (currently a free placeholder) should ship free as the brand's own trend line, then gain a Pro overlay showing the peer-tier median on the same axes. Free tells you your shape, Pro tells you whether that shape is good.
- **Cross-shop percentile** and **repeat-purchase proxy** are new cards inside the Pro gate.

The general pattern worth holding onto: **free shows you your own number, Pro shows you the number next to everyone else's.** That is a clean upgrade story a brand owner understands in one sentence, and it maps exactly onto what only we can do.

---

## 4. Brand-size bucketing: starting position

### The problem

Comparing a 5k-follower maker to Momo Slimes at 1M+ followers produces a number that is both useless and demoralizing. "You rank #147 globally" tells a small brand nothing they can act on and gives them a reason to close the tab and not renew. Absolute rankings across wildly different business sizes are noise dressed as insight.

### Phase 1 (now): self-reported Instagram follower range

Brands pick their Instagram follower range in brand settings from a dropdown of tiers:

| Tier | Range |
| --- | --- |
| 1 | 0 to 1k |
| 2 | 1k to 10k |
| 3 | 10k to 50k |
| 4 | 50k to 250k |
| 5 | 250k to 1M |
| 6 | 1M+ |

Optional field, actively encouraged during brand claim and in settings.

**All cross-brand comparisons run within the brand's own tier.** A 10k-follower brand sees "you rank #3 among brands in the 1k to 10k range," never "#147 globally." Every comparison in §2 inherits this rule.

**Brands who skip the field** land in an unranked bucket and see a Pro CTA nudge instead of a ranking: "Add your Instagram size to unlock peer benchmarks." This turns the missing field into a conversion prompt rather than a dead card, and it gives brands a concrete reason to fill it in.

### Phase 2 (later): shift to internal data

Once SlimeLog's own follower counts carry enough signal, bucket on internal data instead of self-report. Proposed trigger: the average claimed brand has 100+ SlimeLog followers. Store both values, prefer internal when available, keep self-report as the fallback for thin-data brands.

**Naming warning for whoever builds this:** `brands.follower_count` already exists and already means *SlimeLog* followers, maintained by a trigger on `brand_follows`. It is not Instagram. Do not overload it, and name the new column so nobody confuses the two (`instagram_follower_tier` reads unambiguously; `follower_tier` does not).

### Why self-reporting

- **No scraping.** The Instagram API is rate-limited and access-gated, and third-party scraping for competitor tracking is legally gray at best. Not a foundation to build a paid feature on.
- **Consent.** The brand chooses to be compared, and chooses the bucket. That matters for a community that is already wary of platforms extracting from creators.
- **Immediate.** Useful segmentation on day one, with zero dependency on our own network reaching critical mass.

The obvious cost is that self-report is gameable. A brand could under-report to look better within a smaller tier. Accept that for now: the ranking is private to the brand owner (§6), so gaming it only fools yourself, and Phase 2 replaces the input with data we control.

---

## 5. Design implications

- **Brand settings** needs a new "Instagram follower range" dropdown. Sits naturally alongside the existing `instagram_handle` field. Copy should make it clear it is used for peer comparison, not shown publicly (pending the §8 open question).
- **Schema** needs a size-tier column on `brands` (additive migration, nullable, no backfill required since null means unranked). Cross-brand queries filter by it.
- **Cost tracking.** Every insight in §2 is a cross-brand aggregate, which is the query shape most likely to get expensive as the catalog grows. Add a `docs/cost-tracker.md` entry when Option B is scoped, and expect to need a materialized or nightly-refreshed rollup rather than live aggregation.
- **Pro CTAs** need copy written for tiered comparison, not absolute ranking. "See how you stack up against brands your size" beats "See your global ranking," and it is also the honest description of what we compute.
- **Language sweep.** Any "you rank #X" phrasing anywhere in the app converts to "you rank #X among brands your size." The qualifier is not a caveat to be minimized, it is what makes the number trustworthy, so it belongs in the sentence rather than in a footnote.

---

## 6. What we are not doing

- **Not scraping Instagram** or any external platform for follower counts. Self-report in Phase 1, our own data in Phase 2.
- **Not comparing brands publicly.** Rankings are private to the brand owner. No public leaderboard of brands.
- **Not building sentiment analysis on comments.** Needs real NLP, carries real per-call cost, and would be a weak version of a thing we are not set up to do well. Deferred.
- **Not showing percentiles publicly.** "This brand is bottom-quartile" is not a message we want on a public brand profile, and publishing it would make the entire feature adversarial for exactly the small brands we most want claiming pages.

---

## 7. Related tracker items

- **T137** brand dashboard visual redesign. In progress via Batches 1 through 5. The analytics page this brief targets is the surface being redesigned.
- **T160** Momo-tier brand outreach. Strategic pairing: the brands most worth recruiting are also the ones for whom tier-6 comparison data is thinnest at launch. Sequence expectations accordingly.
- **T178** AdMob native feed ads and FeedAdSlot. Parallel monetization track, unrelated build, listed so the revenue picture stays whole.
- **T125** slime aging and structured care actions. Source of the care-action dataset reframed in §1 as our merchandising signal.
- **New ticket to file:** "Cross-shop trend data, Brand Pro build" once Option B is scoped for real. Next free ID is T196. Should carry the §2 priority order, the §4 bucketing schema, and a cost-tracker entry.

---

## 8. Open questions

1. **What is the minimum data volume for a meaningful cross-brand comparison?** Working rule of thumb: 5 or more brands per tier, each with 20 or more logs. Below that, suppress the card and show the "not enough peers yet" state rather than a ranking out of three. Needs a real answer before launch, because the wrong threshold ships confident nonsense.
2. **Public or private follower range?** Private to the brand owner and used only for bucketing is the safe default and the current assumption. Public would let community members see brand scale, which some brands may prefer and others will resent.
3. **Do we celebrate tier changes?** When a brand grows from the 10k to 50k tier into 50k to 250k, is that a milestone we surface ("your peer group changed")? It is a nice moment, but it also silently resets their ranking, which could read as a demotion if we do not frame it carefully.
4. **What happens to a brand's history when its tier changes?** Do past benchmarks get recomputed against the new peer group, or stay pinned to the tier they were measured in? Pinning is more honest, recomputing is simpler. Not urgent until we have trend history worth preserving.
