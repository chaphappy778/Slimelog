# Brand shop variant scan — 2026-07-15

Feeds Phase 3 of the taxonomy rework (`brand_variants` join table seeds). Companion to Jenn's 36-shop scan at `d78b8133-shoptexturevariants.xlsx`.

## Executive summary

- Total brand slugs enumerated from `slimelog.com/brands`: **51** visible on landing page (site reports 266 total; Show all 255 link is client-JS only so remaining ~215 slugs not enumerable in this pass).
- Shops already scanned by Jenn (skipped after fuzzy-match against her exclusion list): **17** (babycat-slimes-nl, bleu-slimes, chappy-slimes, emma-bee-slimes, glimmer-goo-slime, gt-creation-slime, mythical-mushbunny-slimes, on-cloud-slime, pink-sugar-slimey, prismatic-slimes, slime-aficionados, slime-banshee, slime-community, slimer-climber, sliimey-honey, sloomoo-slime, the-chaos-shop).
- Brands with NO shop URL and NO website URL (only IG/nothing) → skipped: **17** (archie-slime, berry-cherry-slimery, bowtique-slimes, butter-babe-slimes, ceces-slime-shop, align-slimes, palmetto-slimes, rodem-slime-shop, colour-slime-au, slister-slimes, lime-slimes-co, blushing-bb-slimes, pixiegloop, los-angeles-slime-company, good-vibes-slimes, flying-monkey-slimes, cats-craft, slime-by-kataleya, rogue-slimes, squeezy-magic-slime, lk-slime, rosie-cheeks-slime-shop, mush-slime, chia-slime-shop, anathema-slime — Anathema only had @IG handle).
- Brands where the shop URL was dead/unreachable/JS-only: **4** (Piggy Slimes — domain expired for sale on GoDaddy; Holly Laing — JS-only rendering; White Whale — no texture categories exposed; The Slime Atelier — empty fetch response).
- Shops successfully scanned with texture-related terminology extracted: **9** (Peachybbies, Momo Slimes, Sandy Slimes, Slime Sweet Pea, Parakeet Slimes, Colour Slime US, SeoulGAGE, AfterDark Slimes-via-Etsy-reviews, Snoop Slimes-meta-only).
- Shops scanned but yielding no texture terminology (theme-only or brand-only nav): **6** (Pilot Slimes, KY Slime, Slime Shady, Corn With Slime, Snoop Slimes categories, Sparkle Nanny Slime).
- **New variant terms discovered (not in Jenn's file, evidence-backed): 12** (see Aggregated table).
- **New spelling variants of existing terms: 3** (Thick&Glossy, Thick + Glossy, Semi-floam).

## Scan results by brand

### Peachybbies (slug: peachybbbies)
- Shop URL: https://peachybbies.com
- Also: instagram.com/peachybbies, tiktok.com/@peachyslime
- Categories/textures found (from `/collections`): above5, Accessories, Beginner, Bestsellers, Bundle Builder, Bundles, **Clay Kits**, **DIY Kits**, Featured Bundles, Gift Ready, New this Week, Recent Slime DROPS, Refill & Tools, Restock, Slime, Slime Bundles, Slimes, Supplies
- Verbatim spellings observed: "Clay Kits", "DIY Kits"
- Mapped to base types: butter/DIY Clay (Clay Kits, DIY Kits — per Jenn's "clay → butter" rule)
- Notes: Peachybbies organizes primarily by drop / theme / bundle logic, not by texture. No dedicated per-texture collection navigation. Product names visible on landing (Moondrop Jelly, Honeycube Squish Jelly Cube, De-Stress Dough, Alien Axolotl Jelly, Pear Sorbet, Souffle Pancakes DIY Kit) reference jelly, dough, and DIY vocabulary that's already in Jenn's list.

### Momo Slimes (slug: momo-slimes)
- Shop URL: https://momoslimes.com
- Categories/textures found (from `/collections` restock submenu): **Thick&Glossy**, **Semi-floam**, **Fluffy**, **Crunchy**, **Clear**, D.I.Y (non-texture), What's New (non-texture)
- Verbatim spellings observed: "Thick&Glossy" (no spaces, ampersand), "Semi-floam" (lowercase, hyphenated), "Fluffy", "Crunchy", "Clear"
- Mapped to base types: thick_and_glossy (Thick&Glossy), floam (Semi-floam — new sub-variant), fluffy (Fluffy), floam or beaded (Crunchy — per Jenn's map "Crunchy → Floam (current)" and count=13), clear (Clear)
- Notes: **"Semi-floam" is a new sub-variant term** (implies partial float / less-than-full floam). "Thick&Glossy" is a spelling variant (no spaces + & instead of "and"). Momo runs a hybrid semi-floam that community may know by that exact label — worth tracking as an alias.

### Pilot Slimes (slug: pilot-slimes)
- Shop URL: https://pilotslime.com
- Categories/textures found: All Slime, Bundles, Flight log, Gift Cards & Merchandise, Home page
- Verbatim spellings observed: (none — no texture navigation)
- Mapped to base types: N/A
- Notes: Pilot organizes by product line ("Flight log") and bundle. No exposed texture categories on landing/collections page.

### Holly Laing Slimes (slug: holly-laing-slimes)
- Shop URL: https://hollylaing.com
- Categories/textures found: **fetch blocked — JavaScript-only rendering**
- Notes: Podos-hosted site requires JS. Cannot extract without headless browser (rule set forbids that).

### Sandy Slimes (slug: sandy-slimes)
- Shop URL: https://sandyslimes.com
- Categories/textures found (from `/collections`): Animal Friends Restock, Best Sellers Restock, Black Friday, Charms & Extras, Cozy Comfort Restock, **DIY Clay Kits**, Easter Restock, Fall O Scream Restock, Fall Things, Fiesta Restock, Halloween Slimes, Hand Crafted Soaps, Happy Harvest Restock, Holiday Slimes, Home for the Holidays Restock, In Bloom, Jewelry & Gifts, Lost in Space Restock, Magic of the Season Restock, No Theme Restock, Redemption Items, Resolutions Restock, Rodeo Restock, **Sandy Dough**, Shop All, Shop All Slimes, Shop New Drop, Sip & Slime Restock, Slime Supplies
- Verbatim spellings observed: "DIY Clay Kits", "Sandy Dough"
- Mapped to base types: butter (DIY Clay Kits, Sandy Dough — dough maps to butter per Jenn's row `Dough | Butter`)
- Notes: Sandy organizes almost exclusively by seasonal drop/theme collections. "Sandy Dough" is a brand-specific product line (their dough sub-brand). Only one shop uses this term.

### White Whale Slimes (slug: white-whale-slimes)
- Shop URL: https://www.whitewhaleslime.com
- Categories/textures found (from `/slime` page): BEST SELLER, COASTAL CORE, LIMITED EDITION, RESTOCK, TREAT SHOP, WELLNESS
- Verbatim spellings observed: (none — thematic categories only)
- Mapped to base types: N/A
- Notes: Squarespace shop, categorized by mood/theme not texture. Product names show heavy use of nougat, cream, milk, butter, meringue, softserve, custard, honeycrisp — the "TREAT SHOP" category is where their food-textured slimes cluster but not exposed as texture nav. Would need per-product review to extract texture data.

### Slime Sweet Pea (slug: slime-sweet-pea)
- Shop URL: https://sallysweetpea.com
- Categories/textures found (from `/collections`): Beginner Friendly, Bestsellers, **Butter / Clay / Slay**, **Clear Slime**, **Cloud / Cloud Creme / Cloud Dough**, **DIY Clay**, Fried Collection, Holiday Bundle Deal, New Slimes, Restock Slimes, SALE ITEMS, Slime supplies, **Snow Fizz**, **Thick & Glossy**
- Verbatim spellings observed: "Butter / Clay / Slay" (as one collection groups all three), "Cloud / Cloud Creme / Cloud Dough" (grouped), "DIY Clay", "Snow Fizz", "Thick & Glossy", "Clear Slime"
- Mapped to base types: butter+slay (Butter/Clay/Slay collection groups them), cloud+cloud_cream (Cloud/Cloud Creme/Cloud Dough), clear (Clear Slime), butter (DIY Clay), snow_fizz (Snow Fizz), thick_and_glossy (Thick & Glossy)
- Notes: Slime Sweet Pea's collection design is **strong grouping evidence for taxonomy**: they explicitly bundle Butter+Clay+Slay into one collection (backing Jenn's decision to collapse clay into butter and slay being adjacent), and bundle Cloud+Cloud Creme+Cloud Dough as one collection (backing the cloud family). Also has a "Fried Collection" — theme, not texture. Product mentions from recent logs: SPF 50 (labeled Clay), Sandcastle (labeled Clay).

### Piggy Slimes (slug: piggy-slimes)
- Shop URL: https://piggysslime.com — **DEAD** (domain expired, listed for $195 on GoDaddy via ExpiredDomains.com)
- Categories/textures found: N/A
- Notes: Their SlimeLog page shows @piggysslime on Instagram is still around, but the .com domain is dead. Recommend flagging this brand as "shop offline, IG-only" in the catalog.

### AfterDark Slimes (slug: afterdark-slimes)
- Shop URL: https://www.etsy.com/shop/afterdarkslimes
- Categories/textures found: **shop is dormant — 0 items listed**, but review history reveals product-line texture tags used on old listings
- Verbatim spellings observed (from reviews of past products): **"Butterfizz Slime"**, **"Block Bead Slime"**, "DIY Clay Slime", "Cloud Slime"
- Mapped to base types: hybrid (Butterfizz — already in Jenn's file), beaded (Block Bead — new variant), butter (DIY Clay), cloud (Cloud)
- Notes: Etsy shop last active Oct 2022 (may be effectively defunct). "Block Bead" is a **new variant** — likely refers to larger cube/block-shaped beads mixed into slime, distinct from standard round Bingsu. Only 1-shop signal so far.

### Colour Slime (US) (slug: colour-slime-us)
- Shop URL: https://colourslime.com
- Categories/textures found (from `/collections`): **Air Dry Clay**, **Butter Slime**, **Thick Clear Slime**, **Cloud Putty**, **Cloud Slime**, D.I.Y, Most Popular, New Arrivals, **Putty**, **Sensory Putty**, Slime, Slime Add-Ins, Slime Glue, **Snow Fizz Slime**, **Snow Putty**, **Watery Slime**, **White Glue Slime**
- Verbatim spellings observed: "Air Dry Clay", "Butter Slime", "Thick Clear Slime", "Cloud Putty", "Cloud Slime", "Putty", "Sensory Putty", "Snow Fizz Slime", "Snow Putty", "Watery Slime", "White Glue Slime"
- Mapped to base types: butter (Air Dry Clay — per clay rule; Butter Slime), clear+thick_and_glossy (Thick Clear Slime — hybrid), **putty (unclear — likely its own top-level category if we're expanding beyond slime)**, sensory-putty (unclear — putty variant), cloud (Cloud Slime), snow_fizz (Snow Fizz Slime), water (Watery Slime)
- Notes: **Colour Slime treats "Putty" as a top-level sibling category to Slime**, not a sub-type. They have Cloud Putty, Sensory Putty, and Snow Putty as putty sub-types. This is significant — if SlimeLog wants to eventually cover putty as a first-class product type, this shop's taxonomy is a real precedent. "Thick Clear" as a distinct combo is new. "Watery Slime" is a natural spelling for the `water` base type.

### KY Slimes (slug: ky-slimes)
- Shop URL: https://kyslime.com
- Categories/textures found: E-GIFT CARDS, FEATURED SLIMES, NEW RELEASE, PICK 3 OR 4 MINI BUNDLE BAR, SLIME CARE
- Verbatim spellings observed: (none — no texture navigation)
- Notes: Product mentions in reviews reference realistic-food slimes (specializes in "scented realistic food slimes"). Meta description reads "specializing in scented realistic food slimes and DIY kits" — themed, not textured.

### Slime Shady (slug: slime-shady)
- Shop URL: https://slimeshadystore.com
- Categories/textures found: ALL SLIMES, BEST SELLERS, NEW COLLECTION
- Verbatim spellings observed: (none in nav)
- Notes: Meta description references "Fluffy slime, Butter Slimes, Cloud Slime" — all already in Jenn's file with high counts. Nav is not texture-organized.

### Corn With Slime (slug: corn-with-slime)
- Shop URL: https://cornwithslime.com
- Categories/textures found: All Slimes, New Slimes, Gift Cards
- Verbatim spellings observed: (none — no texture navigation)
- Notes: Meta description mentions "unique textures and scents" without listing them.

### Parakeet Slimes (slug: parakeet-slimes)
- Shop URL: https://parakeetslimesshop.com
- Categories/textures found (from `/collections`): HARRY POTTER COLLECTION, **Clear**, **Crunchy Slime**, **DIY Clay Slime**, **Jelly + Icee Slime**, **Thick + Glossy Slime**, **Butter Slime**, sale available slimes, Bestsellers, **Milk**, Fall + Halloween, SHOP ALL, sale slimes, Unscented Slimes, NEW ARRIVALS, Therapeutic Slime, **CLAY-DOH'S**, WE MADE TOO MUCH SALE, **ICE CREAM SLIME**, HOLOGRAPHIC, UPSLIME DOWN COLLECTION
- Verbatim spellings observed: "Clear", "Crunchy Slime", "DIY Clay Slime", "Jelly + Icee Slime" (single collection groups Jelly with Icee), "Thick + Glossy Slime" (uses `+` instead of `&`), "Butter Slime", "Milk", "CLAY-DOH'S" (capitalized with apostrophe-S), "ICE CREAM SLIME"
- Mapped to base types: clear (Clear), floam/beaded (Crunchy — matching Jenn's Crunchy mapping), butter (DIY Clay Slime), jelly+icee (Jelly + Icee grouping), thick_and_glossy (Thick + Glossy), butter (Butter Slime), **cloud_cream or new (Milk — 1-shop only)**, butter (CLAY-DOH'S — clay+dough hybrid), butter (ICE CREAM SLIME — per Jenn's existing "Ice Cream Butter" evidence)
- Notes: **Three new terms from this shop**: (a) **"Milk"** as a standalone category — probably a milky cloud-cream-adjacent texture, but only 1-shop evidence right now; (b) **"CLAY-DOH'S"** — a brand-specific portmanteau of clay + play-doh, likely maps to butter/DIY Clay; (c) **"Ice Cream Slime"** as a top-level category (Jenn had `Ice Cream Butter` as a Butter spelling — Parakeet uses it as its own category). Parakeet also confirms the Jelly+Icee grouping we saw at Slime Sweet Pea (indirect signal via Cloud/Creme/Dough grouping). "Thick + Glossy" spelling with `+` is a new verbatim alias.

### Sparkle Nanny Slime (slug: sparkle-nanny-slime)
- Shop URL: https://sparklenannyslimeco.com
- Categories/textures found: Bundles, Curiosities & Oddities Slime Lab Customs, Gift Cards, New Slime, Overstock Sale!!!, Personalized/Customized Slime, Slime, Stress balls
- Verbatim spellings observed: (none in nav)
- Notes: Has a linked "My slime texture guide" page they maintain themselves at `/pages/slime-texture-guide` — didn't fetch it in this pass but flagged as a future signal. Review body text mentions "Wg jelly" (white glue jelly), "Sugar Coated Cryptid", "Milk Teeth" — all product names, not category signals.

### Snoop Slimes (slug: snoop-slimes)
- Shop URL: https://snoopslimes.co
- Categories/textures found (from `/collections`): RESTOCK SLIMES, BEST SELLERS, Shop Subscription Boxes, Merch, New Website Featured, In Stock Slimes, New Restock Slimes, Best Sellers, Eligible for Discount, Make A Wish Collab
- Verbatim spellings observed: (none in nav)
- Notes: Meta description explicitly reads "Fluffy slime. Cloud slime. Butter Slime. Bingsu Slime. DIY slime kits" — all already in Jenn's file with high counts. Confirms Bingsu/Butter/Cloud/Fluffy remain the dominant vocab for a general-audience shop.

### Colour Slime (AU) (slug: colour-slime-au) — SKIPPED
- Shop URL: none listed on SlimeLog brand page
- Notes: SlimeLog has this Australian brand but no shop_url attached. Different entity from `colour-slime-us` (which does have colourslime.com).

### Seoul Gage (slug: seoul-gage)
- Shop URL: https://seoulgage.com
- Categories/textures found (from `/collections` and `BY TEXTURES` submenu): **Clay**, **Clear**, **Crunchy**, **Foam Ball**, **Snow Fizz & Bingsu**, **Texture-Focused**, plus a **iGLUE & KOREAN CLAY** supply category
- Verbatim spellings observed: "Clay", "Clear", "Crunchy", "Foam Ball" (space, not "Foamball"), "Snow Fizz & Bingsu" (grouped), "Texture-Focused" (hyphenated), "iGLUE & KOREAN CLAY"
- Mapped to base types: butter (Clay, Korean Clay — per Jenn's clay rule), clear (Clear), floam/beaded (Crunchy), floam (Foam Ball — synonym for foam beads), snow_fizz+beaded (Snow Fizz & Bingsu grouped)
- Notes: **SeoulGAGE is a Korean-market curator storefront** — they aggregate multiple Korean creator sub-brands (332, ABOUTTIME, BBIYA, GINA, HO.C, MAGMA, MOA, MONGLEFACTORY, ONI, PAINKILLER, PASTELLO, SG Slime, SINGIBAKERY, SLRK, SWAMPYLAND, WAAK, YOM, YYOUNG). These are 18 Korean creator brands **not currently on slimelog.com/brands** — could feed the brand catalog. **"Foam Ball" as a texture is new**, though it likely aliases Jenn's "Foam Beads". **"Korean Clay" is explicitly called out** — per Jenn's decision this maps to `butter`. "Snow Fizz & Bingsu" grouping is more grouping evidence for taxonomy: this shop treats them as a single texture bucket.

### The Slime Atelier Co (slug: the-slime-atelier-co)
- Shop URL: https://theslimeatelier.com
- Categories/textures found: **fetch returned empty response** (2 attempts)
- Notes: Site likely blocking WebFetch. Retry with a different tool later.

## Aggregated new variants table (feed into Section 4 of taxonomy plan)

| variant_term | verbatim_spellings_seen | v2_home | shop_count | shops | notes |
| --- | --- | --- | --- | --- | --- |
| Semi-floam | Semi-floam, semi-floam | Floam (sub-variant) | 1 | momoslimes | Momo's exact category name. Implies "partial floam" — a lighter density than standard floam. Worth tracking as a Floam sub-alias. |
| Milk | Milk | REVIEW: new term (candidate cloud_cream sub or its own home) | 1 | parakeetslimesshop | Parakeet has a full "Milk" category. Product name reference at Sparkle Nanny ("Milk Teeth") but that's a product, not category. Only 1-shop signal so far — hold off adding to canonical list. |
| Ice Cream Slime | ICE CREAM SLIME, Ice Cream Slime | Butter (per Jenn's existing "Ice Cream Butter" mapping) | 1 | parakeetslimesshop | Parakeet uses this as top-level category. Aligns with Jenn's `Butter` observations already showing "Ice Cream Butter" as a spelling variant of Butter. |
| CLAY-DOH'S | CLAY-DOH'S | Butter (clay/dough hybrid) | 1 | parakeetslimesshop | Brand-specific portmanteau. Maps to Butter. Should NOT go in canonical list — treat as brand-specific alias. |
| Putty | Putty | REVIEW: possible new top-level product category | 1 | colourslime.com | Colour Slime treats Putty as a **sibling to Slime**, not a texture within slime. If SlimeLog eventually adds putty coverage this becomes a whole product family. |
| Cloud Putty | Cloud Putty | REVIEW: Putty sub-variant (see above) | 1 | colourslime.com | Only meaningful if Putty becomes its own category. |
| Sensory Putty | Sensory Putty | REVIEW: Putty sub-variant | 1 | colourslime.com | Same. Silicone-based sensory putty, distinct chemistry from PVA slime. |
| Snow Putty | Snow Putty | REVIEW: Putty sub-variant | 1 | colourslime.com | Same. |
| Watery Slime | Watery Slime | Water (existing base type) | 1 | colourslime.com | Straight spelling variant of "Water" — add as alias. |
| Thick Clear (Thick Clear Slime) | Thick Clear Slime | REVIEW: hybrid combo (Clear + Thick & Glossy) | 1 | colourslime.com | Distinct enough that Colour Slime lists it separately from both Clear and Thick & Glossy. Candidate for Hybrid. |
| Foam Ball | Foam Ball | Floam (or Bingsu / Beaded — same as Jenn's "Foam Beads") | 1 | seoulgage | SeoulGAGE's category label. Almost certainly an alias for existing "Foam Beads" (Jenn count=2). Add as spelling variant. |
| Block Bead | Block Bead Slime | Bingsu / Beaded (sub-variant) | 1 | etsy afterdarkslimes | AfterDark product line for slime with larger cube/block-shaped beads (as opposed to spherical Bingsu). Add as Bingsu sub-alias. |
| Sandy Dough | Sandy Dough | Butter (per Jenn's Dough → Butter) OR Sand (if sand-textured) | 1 | sandyslimes | Brand-specific product line at Sandy Slimes. Ambiguous whether it's a dough with sand-texture or standard dough. Do not add to canonical list — brand-specific. |
| Korean Clay (iGLUE & KOREAN CLAY) | KOREAN CLAY | Butter (per Jenn's explicit clay → butter rule) | 1 | seoulgage | Explicit callout that Korean clay is one of SeoulGAGE's supply lines. Confirms Jenn's clay-rule already covers this. |
| White Glue Slime | White Glue Slime | REVIEW: technique/base, not a texture | 1 | colourslime.com | This is base-recipe classification, not a finished texture. Probably NOT a variant — omit from canonical list. |

## New spelling variants of terms Jenn already has

| existing_term | new_verbatim_spelling | shop | recommendation |
| --- | --- | --- | --- |
| Thick & Glossy | **Thick&Glossy** (no spaces, single word style) | momoslimes | Add as alias |
| Thick & Glossy | **Thick + Glossy Slime** (plus sign) | parakeetslimesshop | Add as alias |
| Floam | **Semi-floam** | momoslimes | Add as sub-variant or alias |
| Foam Beads | **Foam Ball** | seoulgage | Add as alias |
| Butterfizz | Butterfizz Slime | etsy afterdarkslimes | Confirms Jenn's single-shop signal (now 2 shops for Butterfizz) |
| Water | Watery Slime | colourslime.com | Add as alias |
| Bingsu / Beaded | Block Bead | etsy afterdarkslimes | Add as sub-alias |

## Grouping evidence for taxonomy (multi-term-in-one-collection signals)

These shops explicitly bundle multiple texture terms into a single navigation category, which is evidence for how the community thinks about texture families:

| shop | grouped-as-one collection | inferred grouping |
| --- | --- | --- |
| sallysweetpea | "Butter / Clay / Slay" | Butter + Clay + Slay ≈ one family (backs Jenn's clay→butter merge decision) |
| sallysweetpea | "Cloud / Cloud Creme / Cloud Dough" | Cloud + Cloud Cream + Cloud Dough = one family (backs the cloud family in the taxonomy) |
| parakeetslimesshop | "Jelly + Icee Slime" | Jelly + Icee treated as one bucket at Parakeet — worth noting for guide vocabulary decisions |
| seoulgage | "Snow Fizz & Bingsu" | Snow Fizz + Bingsu treated as one bucket at SeoulGAGE — arguably these ARE two different bases but often visually similar |

## Ambiguities flagged for Jenn

- **"Milk" as a texture** — Parakeet has an entire collection. Is this a cloud-cream/milky-cloud variant, or its own thing? Also seen as sub-terminology at Sparkle Nanny ("Milk Teeth" product name only, not category) and White Whale ("LONDON FOG MILK", "MAGIC MUSHROOM MILK", "HONEYDROP OYSTER MILK" — product names only). Since only Parakeet uses "Milk" as a category, defer to Jenn on whether to (a) add as new sub-home under cloud_cream, or (b) fold into existing.
- **"Putty" family (Putty / Cloud Putty / Sensory Putty / Snow Putty)** — Colour Slime treats these as separate top-level product family, not slime-with-texture. If SlimeLog scope is expanding to include putty (silicone sensory putty) as a product type, this shop's naming is a good precedent. Currently 1-shop signal.
- **"Ice Cream Slime" vs "Ice Cream Butter"** — Jenn already tracks "Ice Cream Butter" as a Butter spelling variant. Parakeet uses "Ice Cream Slime" as its own top-level category (not "Ice Cream Butter"). Question: should Ice Cream be its own alias/family, or always assumed to be Butter?
- **"CLAY-DOH'S"** — brand-specific coinage at Parakeet. Recommend brand-specific alias only, not canonical.
- **"Thick Clear Slime" as a hybrid** — Colour Slime lists this as a distinct category from both "Thick & Glossy" and "Clear Slime". Should it map to `hybrid` or become its own home?
- **"Sandy Dough"** — brand-specific product line at Sandy Slimes. Cannot resolve without a product-page look at whether it has sand grit or is standard dough.

## Coverage gap

**Brands enumerated but skipped due to no shop URL (only IG or nothing on their SlimeLog brand page):**
- archie-slime, berry-cherry-slimery, bowtique-slimes, butter-babe-slimes, ceces-slime-shop, align-slimes, palmetto-slimes, rodem-slime-shop, colour-slime-au, slister-slimes, lime-slimes-co, blushing-bb-slimes, pixiegloop, los-angeles-slime-company, good-vibes-slimes, flying-monkey-slimes, cats-craft, slime-by-kataleya, rogue-slimes, squeezy-magic-slime, lk-slime, rosie-cheeks-slime-shop, mush-slime, chia-slime-shop, anathema-slime (IG-only)

**Brands enumerated but skipped due to fetch failure or dead shop:**
- piggy-slimes (piggysslime.com is expired, for sale on GoDaddy)
- holly-laing-slimes (hollylaing.com is JS-only)
- the-slime-atelier-co (theslimeatelier.com returns empty)

**Brands enumerated but shop scanned yielded no texture nav (theme-only navigation):**
- white-whale-slimes, pilot-slimes, ky-slimes, slime-shady, corn-with-slime, snoop-slimes, sparkle-nanny-slime, peachybbies (partial — clay kits only)

**Brands NOT yet enumerated** — SlimeLog reports 266 brands total; the `/brands` landing page shows ~51 slugs visible; the "Show all 255" button requires client-JS. Remaining ~215 brand slugs are not accessible via WebFetch in a single pass — that requires either scraping the API endpoint (server-side pagination) or headless browser. **Recommend Phase 2**: get access to the brand listing via API or DB dump, then re-run this scanner against the remaining catalog.

**Additional signal: SeoulGAGE aggregates 18 Korean creator brands** (332, ABOUTTIME, BBIYA, GINA, HO.C, MAGMA, MOA, MONGLEFACTORY, ONI, PAINKILLER, PASTELLO, SG Slime, SINGIBAKERY, SLRK, SWAMPYLAND, WAAK, YOM, YYOUNG) that are **not currently in SlimeLog's brand catalog**. These are legitimate Korean makers with real product lines. Worth adding to the brands table as `verified=false, source_url=seoulgage.com/collections/<slug>-slime`.
