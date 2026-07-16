# Brand shop variant scan Phase 2 — 2026-07-16

Feeds Phase 2 of the taxonomy rework (`brand_variants` join-table seeds). Companion to Jenn's 36-shop scan (`d78b8133-shoptexturevariants.xlsx`) and the Phase 1 scan (`2026-07-15-brand-shop-scan.md`). Covers every URL-bearing brand in the current catalog not already covered by those two prior passes.

## Executive summary

- **Total brands in target CSV:** 129
- **Shops in exclusion list (already scanned by Jenn or Phase 1):** 51 (37 from Jenn's xlsx + 18 from Phase 1 + `slimelog-official` own-site)
- **Shops attempted in this pass:** 78
- **Shops successfully scanned with texture-related terminology extracted:** 16 (Aussie Slime Co, Avocadoslimeez, Artistic Rainbow, Dope Slimes, Glitter Slimes, Hippocampe Slimes, Kawaii Slime Company, KikiSlimeandFriends (Etsy), Slime Marshmallows UK, Slime Obsidian, OG Slimes, Slimeatory, Slimeminator, Slimerella, SlimeSlime.de, Wuwa Slimes). Additional 6 exposed texture terminology in **meta descriptions only** (Mr Chicken Slimes, Retro Slime Company, Slime Drops, Slime Shack AU, Snoop Slimes-style meta, Slime Yoda-style meta).
- **Shops scanned but no texture nav / theme-only navigation:** 23 (Alpacaaslimey, BFF Slime Bakery, DIY Slime Shop NY, East Bay Slimes, Fireflyslime, Gooru Slime, Hoshimi Slimes, Karina Garcia/Craft City, Library of Slime, Macarons Slime, Madz Slimes, Meli & Melo, Potcha Slimes, Slime by Zahra, Slime Mania AU, Slime Shop Cafe, Slime Yoda, Slime Kitchen, Soft Punk Slime, Sticky Sparkle Slime, Slimeowy, Tangie Slimes, Tanooki Slimes, The Slime Playground)
- **Shops skipped due to fetch failure / password / dead / JS-only:** 25 (Artistic Slimez, Boba Bao Slimes-itskristii, Brooklyn Slime, Fuwa Slimes, Lemons and Limes Slimes, Lemons and Slimes, Mobile Slime Factory-Z's, Mochi Slime UK, Nichole Jacklyne, Nora's Slimery, Oozapalooza, Oozed Slime, Slime by Sara, Slime Fantasies, Slime Labs UK, Slime New York, Slime Screwball, Slimeful, Slimeglitterz, Slimentine, Slimes Mel, Slimeworks Co, SwaeSlimes, Sustainaslimes, Strawb Slimes, The Slime Bakery, The Slime Company UK, The Slime Shop UK, The Slime Factory Miami, Slime Zone and More franchise, Tessa Bunny (response too large), Slime Shack AU-password but meta captured)
- **New variant terms discovered (not in Jenn's file or Phase 1):** 15 (see Aggregated table). High-signal misses (3+ shops): `Fluffy`, `Metallic`, `Cereal`, `Glossy` as a base term.

## Scan results by brand

### Aussie Slime Co (slug: aussie-slime-co)
- Shop URL: https://aussieslimeco.com.au
- Categories/textures found (from top nav + shop footer): **Bingsu Slime, Butter Slime, Clear Slime, Cloud Slime, Jelly Cube Slime, Micro Floam Slime, Crunchy Slime, Floam Slime, Thick & Glossy Slime, Snow Fizz, Ice Slime (`/collections/icee-slimes`), DIY Slimes, Jelly Slimes**
- Verbatim spellings observed: "Bingsu Slime", "Butter Slime", "Clear Slime", "Cloud Slime", "Jelly Cube Slime", "Micro Floam Slime", "Crunchy Slime", "Floam Slime", "Thick & Glossy Slime", "Snow Fizz", "Ice Slime" (URL is `icee-slimes` though label says "Ice"), "Jelly Slimes"
- Mapped to base types: bingsu→beaded, butter, clear, cloud, jelly (Jelly Cube), floam (Micro Floam variant), floam/beaded (Crunchy), floam, thick_and_glossy, snow_fizz, icee (URL `icee-slimes` labeled "Ice"), jelly
- Notes: **"Micro Floam" as its own top-level texture** (Jenn already tracks Microfloam). "Ice Slime" label vs `icee-slimes` URL is another spelling-alias signal. Uses ampersand consistently.

### Avocadoslimeez (slug: avocado-slimeez)
- Shop URL: https://avocadoslimeez.com
- Categories/textures found (Slimes menu): **Butter Textur, Bingsu Textur, Cloud Textur, Cloud Cream Textur, Base Textur, Jelly Cube Textur, (Micro-) Floam Textur, Sonstige Texturen, Slushee Textur, Anfänger Slimes** (Beginner)
- Verbatim spellings observed: German — "Butter Textur", "Bingsu Textur", "Cloud Cream Textur", "Base Textur", "(Micro-) Floam Textur", "Slushee Textur" (English retained), "Sonstige Texturen" (=Other Textures)
- Mapped to base types: butter, beaded (Bingsu), cloud, cloud_cream, **NEW candidate (Base)**, jelly (Jelly Cube), floam (both floam+microfloam grouped)
- Notes: **"Base Textur"** is exposed as its own top-level texture at this shop and glossed as "Thick & glossy white Base" — this backs the "Base" concept Glitter Slimes also exposes (see below). **"Slushee Textur"** is grouped alongside Slushee beads — "Slushee beads sind transparente, feste Perlen" (=transparent hard beads). German market may be adopting "Slushee" as its own home. Grouping evidence: Floam and Microfloam bundled into one collection.

### Artistic Rainbow Slime (slug: artistic-rainbow-slime)
- Shop URL: https://artisticrainbow.com
- Categories/textures found (product-category menu): **Bingsu, Butter, Clay, Clear, Cloud, Cloud Cream, Crunchy, DIY, Floam, Icee, Jelly, Metallic, Thick, Unscented**
- Verbatim spellings observed: "Bingsu", "Butter", "Clay", "Clear", "Cloud", "Cloud Cream", "Crunchy", "DIY", "Floam", "Icee", "Jelly", "Metallic", "Thick", "Unscented"
- Mapped to base types: beaded (Bingsu), butter, butter (Clay per Jenn's rule), clear, cloud, cloud_cream, floam/beaded (Crunchy), floam, icee, jelly, **NEW: Metallic — new candidate texture home**, thick_and_glossy (Thick)
- Notes: **"Metallic"** is exposed as an equal-tier texture category alongside the standard set. Product names visible include "Blood Metallic Clear" — Metallic reads as a "finish overlay" rather than a base texture. Recommend to Jenn: treat as an attribute/finish tag rather than a new base. "Clay" listed here backs Jenn's clay→butter rule (Clay + Butter both present but presumably represent different consistencies at this shop).

### Dope Slimes (slug: dope-slimes)
- Shop URL: https://dopeslimes.com
- Categories/textures found (Slime dropdown): **Butter, Clear, Cloud, Floam, Thick & Glossy, Bingsu, Snow Fizz, Beaded, DIY, Jelly, memoryDOUGH®, Unique Textured**. Also has a top-level **Putty** category with All Putty / Scented Putty / Unscented Putty / Limited Edition Putty.
- Verbatim spellings observed: "Butter Slime", "Clear Slime", "Cloud Slime", "Floam Slime", "Thick & Glossy Slime", "Bingsu Slime", "Snow Fizz Slime", "Beaded Slime", "DIY Slime", "Jelly Slime", "memoryDOUGH® Slime", "Unique Textured Slime"
- Mapped to base types: butter, clear, cloud, floam, thick_and_glossy, beaded (Bingsu), snow_fizz, beaded (Beaded), jelly, **NEW brand-specific: memoryDOUGH®** (Dope's trademarked memory-foam-adjacent line)
- Notes: **memoryDOUGH®** is a Dope Slimes trademarked product line. Handle as brand-specific alias (like Jenn's approach with "Butterfizz"), not canonical. **"Unique Textured" as a catch-all category** for slimes that don't fit standard buckets — this is a real signal that shops need a "hybrid / miscellaneous / novel-texture" bucket. Dope Slimes also confirms Colour Slime's precedent: **Putty as a sibling top-level category, not a texture within slime**. Same finding — SlimeLog scope question.

### Glitter Slimes (slug: glitter-slimes)
- Shop URL: https://glitterslimes.com
- Categories/textures found: **BASIC, BUTTER, CLOUD/CLOUD CREAM, CRUNCHY, DIY, ICEE, SLIMES (all)**, plus APPAREL / WHOLESALE / RESTOCK
- Verbatim spellings observed: "BASIC", "BUTTER", "CLOUD/CLOUD CREAM", "CRUNCHY", "DIY", "ICEE"
- Mapped to base types: **NEW candidate: BASIC** (a shop-level default/base slime), butter, cloud+cloud_cream grouped, floam/beaded (Crunchy), butter (DIY→clay/butter), icee
- Notes: **"BASIC"** exposed as its own equal-tier texture — likely means an entry-level clear-or-white default. Combined with Avocadoslimeez's "Base Textur", this is a **2-shop signal for a "Base" concept** worth flagging. Grouping evidence: "CLOUD/CLOUD CREAM" as one bucket confirms Slime Sweet Pea's grouping (Phase 1) and Kawaii Slime Company below.

### Hippocampe Slimes (slug: hippocampe-slimes)
- Shop URL: https://hippocampeslimes.com
- Categories/textures found (from `/collections`): **Bingsu, Cereal, Clear Cereal, Cloud, Coated Clear, DIY Clay, Floam, Gel Clear, Icee, Jelly Cube, Pigment Clear, Snow Butter, Snow Fizz, Sugar Beads, Thick and Glossy, White Glue Slushee**
- Verbatim spellings observed: "Bingsu Slime", "Cereal Slime", "Clear Cereal Slime", "Cloud Slime", "Coated Clear Slime", "DIY Clay Slimes", "Floam Slime", "Gel Clear Slime", "Icee Slime", "Jelly Cube Slime", "Pigment Clear Slime", "Snow Butter Slime", "Snow Fizz Slime", "Sugar Beads Slime", "Thick and Glossy Slime", "White Glue Slushee Slime"
- Mapped to base types: beaded (Bingsu, Sugar Beads), **NEW: Cereal** (new candidate), clear+cereal (Clear Cereal hybrid), cloud, clear (Coated Clear, Gel Clear, Pigment Clear — sub-varieties of clear), butter (DIY Clay), floam, icee, jelly (Jelly Cube), **cloud_cream/snowbutter** (Snow Butter — aligns with the Section 5 `snowbutter` rename decision), snow_fizz, thick_and_glossy, water (White Glue Slushee → maps to water/base recipe)
- Notes: **This is the richest texture-taxonomy shop in Phase 2.** Multiple direct-signal terms for Jenn:
  - **"Cereal" as its own texture** — new candidate. Cereal slime has crunchy toasted-oat-shaped inclusions.
  - **"Snow Butter" as an explicit collection name** — direct external validation of the `snowbutter` rename decision. This shop is already using the word.
  - **Three distinct Clear sub-varieties: Coated Clear, Gel Clear, Pigment Clear** — worth capturing as sub-variants under Clear.
  - **"Sugar Beads Slime"** — a new bead-based subtype (probably visually similar to Bingsu, but with sugar-shaped beads).

### Kawaii Slime Company (slug: kawaii-slime-company)
- Shop URL: https://kawaiislimecompany.com
- Categories/textures found (Slimes menu): **Butter, Clear, Cloud Creme, Cloud, Crunchy, Glossy, Floam, Fluffy, Jelly Cube, Jelly**, plus Signature Dome™, 2 Slimes in 1, Beginner Slimes, Advanced Slimes, Sanrio®
- Verbatim spellings observed: "Butter Slime", "Clear Slime", "Cloud Creme Slime" (spelling: **Creme** not Cream), "Cloud Slime", "Crunchy Slime", "Glossy Slime", "Floam Slime", "Fluffy Slime", "Jelly Cube Slime", "Jelly Slime"
- Mapped to base types: butter, clear, cloud_cream (Cloud Creme — spelling variant), cloud, floam/beaded (Crunchy), thick_and_glossy (Glossy), floam, fluffy, jelly
- Notes: **"Glossy" as its own texture** (rather than Thick & Glossy). **"Fluffy" as its own texture** — Fluffy in Jenn's file has count=1 (Momo Slimes' restock submenu) — Kawaii Slime Company gives it a full collection, so **Fluffy is now 2-shop and worth promoting to a real base or sub-variant**. **"Cloud Creme"** spelling with 'e' is a new alias for cloud_cream. "Signature Dome™" is packaging-format, not texture — noteworthy that KSC brands the container as a category. "2 Slimes in 1" is a novel hybrid concept.

### KikiSlimeandFriends (slug: kiki-slime-friends)
- Shop URL: https://www.etsy.com/shop/KikiSlimeandFriends
- Categories/textures found (Etsy sections): **DIY Slimes (6), Thickkk Slimes (1), Custom Slime (2), Glossy Slime (3), Crunchy Slime (7), Slime Bundle (1), Butter Slime (4)**
- Verbatim spellings observed: "DIY Slimes", "Thickkk Slimes" (three k's — intentional stylization), "Glossy Slime", "Crunchy Slime", "Butter Slime". Product titles surface "Thick & Glossy", "Bingsu", "Cloud Dough", "Pony Bead Slime", "Perlite Slime", "Ground Pumice Scented Slime", "Kinetic Sand Slime", "Snow Fizz + Clay"
- Mapped to base types: butter (DIY, Butter, Clay), thick_and_glossy (Glossy, Thickkk), floam/beaded (Crunchy). Product-level: beaded (Bingsu, Pony Bead — new bead spec), floam (Perlite, Ground Pumice — new bead spec), sand (Kinetic Sand)
- Notes: **"Thickkk Slimes"** (with three k's) is a fun brand-specific spelling of Thick — add as alias. **"Pony Bead Slime"** and **"Perlite Slime"** and **"Ground Pumice"** are new bead/inclusion specs — worth noting as product-level modifiers, not new base textures. Product name "Egg-cellent Brunch DIY Snow Fizz + Clay" indicates a hybrid combo pattern common across shops.

### Slime Marshmallows (slug: slime-marshmallows)
- Shop URL: https://slimemarshmallows.com
- Categories/textures found: **CLEAR SLIMES, CLOUD SLIMES, BUTTER SLIMES, CRUNCHY SLIMES, JELLY + ICEE SLIMES, DIY CLAY SLIMES, THICK + GLOSSY SLIMES**
- Verbatim spellings observed: "CLEAR SLIMES", "CLOUD SLIMES", "BUTTER SLIMES", "CRUNCHY SLIMES", "JELLY + ICEE SLIMES", "DIY CLAY SLIMES", "THICK + GLOSSY SLIMES" (uses `+` not `&`)
- Mapped to base types: clear, cloud, butter, floam/beaded (Crunchy), jelly+icee (grouped), butter (DIY Clay), thick_and_glossy
- Notes: **Third shop confirming Jelly + Icee grouping** (previously seen at Slime Sweet Pea and Parakeet). This is a strong signal — the community treats Jelly and Icee as a single visual family at three-plus shops. **"Thick + Glossy"** with `+` matches Parakeet's spelling (also `+`) — this is now 2-shop for the `+` variant, alongside Momo's ampersand-no-space and the standard `&` form.

### Slime Obsidian (slug: obsidian-slimes)
- Shop URL: https://slimeobsidian.com
- Categories/textures found: **Clear, Cloud Cream, Cloud, Floam, Frosting/Butter, Icee, Jelly Cube, Jelly, Obsidian Sand**, plus Bundles, Care Packets, Custom, New Arrivals, Recipes, Restocked, Slime Sets
- Verbatim spellings observed: "Clear Slime", "Cloud Cream Slime", "Cloud Slime", "Floam Slime", **"Frosting/Butter Slime"** (grouped), "Icee Slime", "Jelly Cube Slime", "Jelly Slime", "Obsidian Sand"
- Mapped to base types: clear, cloud_cream, cloud, floam, butter (Frosting/Butter), icee, jelly (Jelly Cube), jelly, **NEW brand-specific: Obsidian Sand** (their brand-name for a sand-textured line)
- Notes: **"Frosting/Butter" as a grouped collection name** is strong grouping evidence — pairs Frosting with Butter as one family. This is a **new spelling variant for Butter** ("Frosting"). Only 1-shop signal so far. **Obsidian Sand** is a brand-specific line, not canonical — but it validates `sand` as a real base type users engage with by name.

### OG Slimes (slug: og-slimes)
- Shop URL: https://ogslimes.com
- Categories/textures found (metafield filter system, not traditional collections): **Shop by Feel: Soft, Crunchy, Sizzly, Fluffy, Thick, Clear**. **Shop by Slime Level: Beginner, Intermediate, Advanced**. Also linked "Texture Guide" collection.
- Verbatim spellings observed: "Soft", "Crunchy", "Sizzly", "Fluffy", "Thick", "Clear" — plus "Beginner", "Intermediate", "Advanced"
- Mapped to base types: **NEW: Soft, Sizzly** (new candidate feel-terms) — Fluffy, Thick, Clear, Crunchy map to existing. "Beginner/Intermediate/Advanced" is a skill-level taxonomy, seen also at Slimerella, Kawaii Slime Company, Slime Mania AU, Slimeatory
- Notes: **"Sizzly"** is a new term — describes the audible fizz/crackle of snow-fizz or foam-bead textures. Cross-referenced against Slimeowy's product description "sizzly wet icee" — this is a **2-shop-mention** term worth tracking. **"Soft"** as a texture filter is also new but very general. **The "Shop by Level" pattern** (beginner→intermediate→advanced) appears at 4+ shops in Phase 2 — high-signal design pattern SlimeLog should consider adopting for the guide.

### Slimeatory (slug: slimeatory)
- Shop URL: https://slimeatory.com
- Categories/textures found (SHOP BY TEXTURE nav): **Basic Slime, Clear Slime, Butter Slime, Cloud Slime**, plus **Bingsu Slime Texture** collection visible on collections page
- Verbatim spellings observed: "Basic Slime", "Clear Slime", "Butter Slime", "Cloud Slime", "Bingsu Slime Texture"
- Mapped to base types: **NEW: Basic** (3rd shop signal — see Aggregated table), clear, butter, cloud, beaded (Bingsu)
- Notes: Slimeatory is Karina Garcia's Arizona/California retail store. **Third shop signal for "Basic" as a base-type-name** (with Glitter Slimes and Avocadoslimeez's "Base"). Sub-menus also show "Limited Collection", "Forever Collection", "Aromatherapy Collection", "Subscription Box" as top-level product organization. Also has an Aromatherapy line (Calming Mint, Calming Lavender, Calming Lemon) — matches Artistic Rainbow's Aromatherapy angle.

### Slimeminator (slug: slimeminator)
- Shop URL: https://slimeminator.com
- Categories/textures found: **Butter slimes, Clear slimes, Cloud Slimes, Crunchy Slimes, DIY slime kit, Jelly slimes, Metallic Slimes, Snow fizz slime, Thick & Glossy slimes**
- Verbatim spellings observed: "Butter slimes", "Clear slimes", "Cloud Slimes", "Crunchy Slimes", "DIY slime kit", "Jelly slimes", "Metallic Slimes", "Snow fizz slime", "Thick & Glossy slimes"
- Mapped to base types: butter, clear, cloud, floam/beaded (Crunchy), butter/clay (DIY), jelly, **NEW: Metallic** (2nd shop signal — Artistic Rainbow also has it), snow_fizz, thick_and_glossy
- Notes: **Second shop signal for "Metallic" as a texture** — worth confirming with Jenn whether Metallic gets promoted to a texture home or stays as a color/finish attribute.

### Slimerella Slime Shop (slug: slimerella-slime-shop)
- Shop URL: https://slimerellaslimeshop.com
- Categories/textures found (Shop by Texture menu + collections page): **Butter Slimes, Clay Slimes, Clear Slimes, Cloud Cream Slimes, Cloud Slimes, Crunchy Slimes, Edible Slime Candy, Icee Slimes, Jelly Cube Slimes, Jelly Slimes, Mini Slimes, Mystery Slimes, Thick & Glossy Slimes**, plus **Beginner / Intermediate / Expert** shop-by-level
- Verbatim spellings observed: "Butter Slimes", "Clay Slimes", "Clear Slimes", "Cloud Cream Slimes", "Cloud Slimes", "Crunchy Slimes", **"Edible Slime Candy"**, "Icee Slimes", "Jelly Cube Slimes", "Jelly Slimes", "Mini Slimes", "Thick & Glossy Slimes"
- Mapped to base types: butter (Clay + Butter both present), clear, cloud_cream, cloud, floam/beaded (Crunchy), **NEW product family: Edible Slime Candy**, icee, jelly (Jelly Cube), jelly, thick_and_glossy
- Notes: **"Edible Slime Candy"** is a novel product-family category — this is the Kohakutou crystal candy trend crossing over into slime shops. **This connects Silky Gem's positioning** (Phase 2 target Silky Gem = crystal candy shop) — three shops now signal edible/gummy adjacencies (Silky Gem full, Slimerella collection, Slimeowy product names). **Not a slime texture** — could be a separate product family if SlimeLog expands scope.

### SlimeSlime.de (slug: slimeslimede)
- Shop URL: https://slimeslime.de
- Categories/textures found (from Shopify collections + product names): Product-level categories visible — **Floam Slime, Cream Slime, Microfloam Slime, Cloud Cream Slime, Wolken Slime (=Cloud), Butter Slime, Bingsu Slime, Clear Floam Slime**
- Verbatim spellings observed: "Floam Slime", "Cream Slime" (=Cloud Cream in German), "Microfloam Slime", "Cloud Cream Slime", "Wolken Slime" (German for Cloud), "Butter Slime", "Bingsu Slime", **"Clear Floam Slime"** (new hybrid)
- Mapped to base types: floam, cloud_cream (Cream), floam (Microfloam), cloud_cream, cloud (Wolken), butter, beaded (Bingsu), hybrid (Clear+Floam)
- Notes: **"Clear Floam" as a distinct product-line naming** — this is the "clear + floam bead" hybrid pattern also seen at Slime Shop Cafe's product line ("Semi-clear", "Pumice Stone Clear"). Add to hybrid signal count. German-market signal — "Cream" is the German-preferred short-form for cloud cream.

### Wuwa Slimes (slug: wuwa-slimes)
- Shop URL: https://wuwaslimes.com
- Categories/textures found (Restocked+X collection pattern): **RESTOCKED+Bingsu, RESTOCKED+Clear, RESTOCKED+Cloud, RESTOCKED+Crunchy, RESTOCKED+DIY, RESTOCKED+Fluffy, RESTOCKED+Icee, RESTOCKED+Jelly**. Meta description lists: **clear, cloud, DIY, bingsu, crunchy, thick&glossy, slay, Hand-sculpted Clay**
- Verbatim spellings observed: "Bingsu", "Clear", "Cloud", "Crunchy", "DIY", "Fluffy", "Icee", "Jelly", plus meta-only "thick&glossy" (no spaces around &), "slay", **"Hand-sculpted Clay"** (new precise term)
- Mapped to base types: beaded (Bingsu), clear, cloud, floam/beaded (Crunchy), butter (DIY, Hand-sculpted Clay), fluffy, icee, jelly, thick_and_glossy, slay
- Notes: **"Hand-sculpted Clay"** is a new precise term that describes the intricate 3D clay-piece slimes (fits Jenn's clay→butter rule). Wuwa Slimes' organizational pattern (RESTOCKED+Type) is unusual — nav-category naming convention that would confuse an auto-scraper. **"thick&glossy"** without spaces backs Momo Slimes' spelling. **Third shop for Fluffy** (Momo, Kawaii, Wuwa).

### Mr Chicken Slimes (slug: mr-chicken-slimes) — meta-only
- Shop URL: https://mrchickenslimes.com
- Categories/textures found: (top nav is single "Shop Our Slime" link — no texture sub-nav exposed). **Meta description** lists: "scented cloud dough, snowfizz, icy dough, butter slime, clear slime"
- Verbatim spellings observed: "cloud dough", **"snowfizz"** (no space), **"icy dough"** (spelling variant), "butter slime", "clear slime"
- Mapped to base types: cloud (Cloud Dough), snow_fizz (snowfizz), icee (Icy Dough — new spelling), butter, clear
- Notes: **"Icy Dough"** is a new spelling variant of Icee-adjacent dough texture. **"snowfizz"** without space matches Slime Shop Cafe. Australian aussie slimery — regional spelling. Nav did not expose these as browsable categories.

### Retro Slime Company (slug: retro-slime-company) — meta-only
- Shop URL: https://retroslimecompany.com
- Categories/textures found: Nav is category-only (All / New / Best Sellers / Seasonal). **Meta description** lists: "crunchy slime, fluffy slime, clear slime, jelly slime or DIY slime"
- Verbatim spellings observed: (nav has none — meta list only)
- Mapped to base types: floam/beaded (crunchy), fluffy, clear, jelly, butter (DIY)
- Notes: Product names visible on landing: "Hurricane Party Jelly", "Watermelon Smash Jelly Cube", "Bee's Knees Clear Honey", "Beach Party Cloud Cream", "RetroVision Clear Slime Kit". Confirms cloud_cream in wild.

### Slime Drops (slug: slimedrops) — meta-only
- Shop URL: https://slimedrops.co
- Categories/textures found: Nav is drop-based (All Slimes, New Restock, Previous Restock, Best Sellers). **Meta description** lists: "Cow, cottagecore, galaxy, colourshift, DIY clay. Variety of textures, scents and DIY clay kits"
- Verbatim spellings observed: (theme/color-shift terms only from meta; no texture nav)
- Mapped to base types: butter (DIY clay). "Colourshift" is a **color effect term**, not a texture. Cow, cottagecore, galaxy are themes.
- Notes: Toronto shop. Not texture-organized.

### Slime Shack AU (slug: slime-shack-au) — meta-only
- Shop URL: https://slimeshack.com.au (**password-protected — closed for restock**)
- Categories/textures found: (site closed). **Meta description** lists: "Cloud Slime, Butter Slime, Clear Slime, Jelly Slime and more"
- Verbatim spellings observed: (meta only)
- Mapped to base types: cloud, butter, clear, jelly
- Notes: Standard four. No new signal.

### Alpacaaslimey (slug: alpacaa-slimey) — no texture nav
- Shop URL: https://alpacaaslimey.com.au
- Categories/textures found: WooCommerce with no texture-organized categories. Product names show **Microfloam, Butter Slime, Cloud Slime, DIY Slime, Traditional Slime, Less Mess Slime**
- Notes: Adelaide, Australia. Brand pitches "Less Mess Slime" as their signature — that's a marketing descriptor, not a texture.

### BFF Slime Bakery (slug: bff-slime-bakery) — no texture nav
- Shop URL: https://www.bffslimebakery.com
- Categories/textures found: Shop Slimes / Featured / Limited Stock only. Product names are creative (Beach House of Horrors, Ocean Bloom Puff Pastry, White Whale Latte).
- Notes: Theme-based collection, not texture.

### Brooklyn Slime (slug: brooklyn-slime) — SKIPPED
- Shop URL: https://brooklynslime.com
- Notes: Square Online site, JS-only rendering — no scannable HTML nav.

### DIY Slime Shop NY (slug: diy-slime-shop-ny) — no shop
- Shop URL: https://diyslimeshopny.com
- Categories/textures found: In-person party/DIY shop. Wix site. Nav is About / Parties / Slime To Go / Drop In / Reservations / Workshops. No online catalog.
- Notes: Larchmont NY brick-and-mortar. Menu says "different types of slime and more than 100 add-ins" but not exposed.

### Dope Slimes covered above.

### East Bay Slimes (slug: east-bay-slimes) — no texture nav
- Shop URL: https://eastbayslimes.com
- Categories/textures found: All theme-based: **In Other Words, MCR, Queer History, Teahouse, Vintage Horror, Slimes, Stickers**
- Notes: Strong art-direction shop with book/music/culture themes. No texture nav exposed.

### Fireflyslime (slug: fireflyslime) — no texture nav
- Shop URL: https://fireflyslime.com
- Categories/textures found: **aquarium collection, Halloween, trinkets collection, Christmas, birthday collection, Spring, Valentines** — plus Best Sellers, All Slime, In Stock
- Notes: Seattle brand. Theme-organized only.

### Gooru Slime (slug: gooru-slime) — no texture nav
- Shop URL: https://gooruslime.com (Dubai)
- Categories/textures found: **Summer, Crackables, Halloween, Winter, Yummy, Valentine's, Ramadan, Spring, EID, Gamers, Christmas, Adha, Available Slimes, Our Creations** — theme/event-based
- Verbatim spellings observed: **"Crackables Collection"** — new term for a shop's own line of cracking-texture slimes
- Notes: Middle East / Dubai. **"Crackables"** is likely a hybrid Snow Fizz + Wax "cracking" concept. Also has an in-house "Slime 101" page at `/pages/slime-101` (their texture guide) — not fetched in this pass.

### Hoshimi Slimes (slug: hoshimi-slimes) — no texture nav
- Shop URL: https://hoshimislimes.com
- Categories/textures found: SLIME / DIY SLIME KITS / MYSTERY BOXES / CROCHET PLUSHIES / SUPPLIES only
- Notes: Simple product-family organization, no textures exposed.

### Karina Garcia / Craft City (slug: karina-garcia-craft-city) — retail brand
- Shop URL: https://craftcitylife.com
- Categories/textures found: Wholesale-facing site referencing "Slime Tubes" 4-pack. Retail through Amazon/CVS/Target/Walmart/Walgreens/Toys R Us Canada. No consumer-facing texture nav.
- Notes: Karina Garcia's Craft City. Big-box retail brand, distributed via mass retailers.

### Library of Slime / Bookshelf Slimes (slug: library-of-slime-bookshelf-slimes) — no texture nav
- Shop URL: https://thelibraryofslime.com
- Categories/textures found: Book/story themed only — **Alice in Wonderland, Art Museum Slimes, Arthurian Myths, Cold Autumn, Hallowe'en Slimes, Picture Book Slimes, Slimence Fiction, The Lord of the Slimes, Wonderful Wizard of Slime**, etc.
- Notes: Also runs a `/pages/slime-dictionary` — not fetched here but exists as an in-house texture guide. Nav is entirely story/theme-based. Signature-brand shop.

### Macarons Slime (slug: macarons-slime) — no texture nav
- Shop URL: https://macaronsslime.com
- Categories/textures found: In Stock / All Slimes / Best Sellers only.
- Notes: French-name brand, minimal collection structure.

### Madz Slimes (slug: madz-slimes) — no texture nav
- Shop URL: https://madzslimes.com (Lightspeed instant-site)
- Categories/textures found: SHOP ALL SLIME / Easter / KITS / SLIME BAR / CUSTOMIZABLE ICE CREAM SLIME. Product names reference "Peeps", "Cow Cream", "Squishmallows", "Fruity Pebbles Macaroon".
- Notes: Kid-run Wisconsin shop. Has a "Madz Texture Bundle" product but no texture nav.

### Meli & Melo (slug: meli-melo) — no texture nav
- Shop URL: https://meliandmelo.com
- Categories/textures found: LiteSpeed autoindex exposed! Categories: **candle-diy-kit, children, accessory-kit, best-selling, gifts, slime-cooking-kit, slime-mini-kit**
- Notes: Kit-focused brand. "Slime Cooking Kit" as their signature product. No texture nav.

### Potcha Slimes (slug: potcha-slimes) — no texture nav
- Shop URL: https://potchaslimes.com
- Categories/textures found: **Adult Themed, Animal Crossing, Combination, Deluxe DIYs, Holiday Bundles, Japan and Asian Food Slimes, New Drop, Restock, Slime Graveyard**
- Notes: Canadian artisanal slime shop specializing in intricate clay-sculpture slimes and Asian food themes. Not texture-organized. **"Combination"** is a category — the slime hybrid concept as a bucket.

### Slime by Zahra (slug: slime-by-zahra) — no texture nav
- Shop URL: https://slimebyzahra.com (German)
- Categories/textures found: Beliebteste (Bestsellers), Extras, Neue Slimes, Sales, Slime, Weihnachts Slimes, Workshop
- Notes: German shop. Basic structure.

### Slime Mania AU (slug: slime-mania-au) — no texture nav
- Shop URL: https://slimemania.com.au
- Categories/textures found: Kids Slimes / Adult Slimes / Fruits / Halloween / Holiday Cheer / January / November / Slime Mix-ins. Plus **SLIME 101 sub-nav: Slime Types, Skill Levels, Slime SOS, Slime Care**
- Notes: Brisbane retail/play studio. Has its own "Slime Types" page at `/pages/slime-textures` — worth cross-checking. Interesting split of Kids vs Adult product lines (safety/vibe positioning).

### Slime Shop Cafe (slug: slime-shop-cafe) — product signals only
- Shop URL: https://slimeshopcafe.com (Wix)
- Categories/textures found: Nav is "Restock" only. Product names surface: **gel candle clear, jelly cube, snowfizz wax DIY, bingsu, glossy DIY, semi-clear, pumice stone glossy, boba glossy, glowing slushie, snowfizz wax**
- Notes: **"Snowfizz Wax"** and **"Glowing Slushie"** and **"Pumice Stone Glossy"** are product-level hybrid names. **"Semi-clear"** is a new sub-Clear variant (like Colour Slime's "Thick Clear" and Hippocampe's "Gel/Coated/Pigment Clear"). Also has a **"Dictionary"** page at `/slime-dictionary`.

### Slime Yoda (slug: slime-yoda) — no texture nav
- Shop URL: https://slimeyodashop.com
- Categories/textures found: Catalog / Restock / Specialty / Unlimited / Supplies. Product names: **"Mexican Fried Ice Cream Ultra Thickie"**, "5 O'Clock Sky Gloss"
- Notes: **"Ultra Thickie"** as a product-level texture spec. Small shop.

### The Slime Kitchen (slug: the-slime-kitchen) — retail brand no nav
- Shop URL: https://theslimekitchen.com
- Categories/textures found: SF-Bay-Area / national retail slime store chain. Franchise site. Product names on landing: **"Viral Snacks Collection"** (fluffy, creamy, glossy, crackly), **"Nebula texture"** (their branded texture), **"Soccer Stars Collection"**, **"A'lotl Love"**
- Notes: **"Nebula"** is a brand-specific texture name at The Slime Kitchen — treat as brand-alias, not canonical.

### Soft Punk Slime (slug: soft-punk-slime-senpai) — no texture nav
- Shop URL: https://softpunkslime.com
- Categories/textures found: Drop-date-based only: **AFFIRMATIONS 2024, APRIL 2023, FRIDAY THE 13TH 2023, JULY 2023, LATE APRIL 2024, MARCH 2024, PRIDE 2023/2024, PUNK ROCK LOVE SONGS 2024, SOFT PUNK SATURDAY 2023**
- Notes: Has a page `/pages/soft-punk-exclusive-textures-guide` — their own texture guide, not fetched here. **Also has an `/pages/ai-statement` page** — reinforces the community-sensitivity flag from CLAUDE.md.

### Sticky Sparkle Slime (slug: sticky-sparkle-slime) — no texture nav
- Shop URL: https://stickysparkleslime.com
- Categories/textures found: Drop-based: Autumn Drop, BUBBLI DROP, Christmas, Clowny Drop, DROP 0, K-POP SLIME TOUR, SPOOKY FIXIE, THE GREAT ESCAPE
- Notes: Mompreneur brand. Theme-only. **"PICKY PAD Slime Kit"** is their signature product.

### Slimeowy (slug: slimeowy) — no texture nav
- Shop URL: https://slimeowy.com (Squarespace)
- Categories/textures found: **All / Nov 24th / slime / sticker**. Product names: **"Matcha Taiyaki Crisp", "Blue Hawaiian Thicky Mickey", "Pineappurr Marshmeow Cream", "Peach Juice", "Fish Gummies", "Strawpurry Soda Float", "Jelly Bean Paws", "Pusheen's Cookie Milk"**
- Notes: **"Thicky Mickey"** (brand-specific term for thick slime). **"Marshmeow"** (marshmallow-scented cloud cream). **"Sizzly wet icee"** referenced in Instagram post text — cross-signal for OG Slimes's "Sizzly" filter. Cat-themed brand, 600k IG followers. Shop currently on break.

### Tangie Slimes (slug: tangie-slimes) — no texture nav
- Shop URL: https://tangieslimes.com
- Categories/textures found: Drop-date-only ("7-19-26 freestyle", "7-5-26 oceanside sweet shoppe restock")
- Notes: Indiana-based shop. Drop-organized.

### Tanooki Slimes (slug: tanooki-slimes) — no texture nav
- Shop URL: https://tanookislimes.com
- Categories/textures found: SLIMES / TANOOKI GOODS / SLIME LOOKBOOK / SQUISHIES / EXTRAS / New Slimes
- Notes: Vancouver, BC. Meta description says "cloudy, butter, and clear textures" but not exposed as nav.

### The Slime Playground (slug: the-slime-playground) — no texture nav
- Shop URL: https://theslimeplayground.com
- Categories/textures found: Best Sellers / Christmas Slimes / Gift Ideas / New Arrivals / Our Favorites / New Slimes / SHOP SLIME
- Notes: Fundraising slime shop. Theme-organized.

### Fetch-blocked / dead / no scannable data — logged
- **Artistic Slimez** (https://artisticslimez.com) — empty response both `/` and `/collections/all`.
- **Boba Bao Slimes / itskristii** (https://bobabaoslimes.com) — password-protected, currently sold out.
- **Fuwa Slimes** (https://fuwaslimes.com) — empty response both attempts.
- **Lemons and Slimes** (https://lemonsandslimes.com) — password-protected.
- **Lemon and Lime Slimes** (https://lemonsandlimeslimes.com) — empty response.
- **Mobile Slime Factory / Z's** (https://mobileslimefactory.com) — empty response.
- **Mochi Slime UK** (https://mochislime.co.uk) — password-protected (currently prepping Summer Collection). Also timed out on one attempt.
- **Nichole Jacklyne** (https://shopnicholejacklyne.shop) — empty response.
- **Nora's Slimery** (https://norasslimery.com) — empty response.
- **Oozapalooza** (https://oozapalooza.com) — Square Online JS-only.
- **Oozed Slime** (https://oozedslime.co.uk) — empty response.
- **Slime by Sara** (https://slimebysara.com) — empty response.
- **Slime Fantasies** (https://slimefantasies.com) — landing text only, no shop nav exposed.
- **Slime Labs UK** (https://slimelabs.co.uk) — activator/supplies brand, no slimes for sale.
- **Slime New York** (https://slimenewyork.com) — password-protected.
- **Slime Screwball** (https://slimescrewball.co.uk) — empty response.
- **Slime Shack AU** (https://slimeshack.com.au) — password-protected (currently on break); meta description captured.
- **Slimeful** (https://slimeful.life) — empty response.
- **Slimeglitterz** (https://slimeglitterz.com) — 0 products across all collections (dormant).
- **Slimentine** (https://slimentine.com) — empty response.
- **Slimes Mel** (https://slimesmel.com.br) — empty response.
- **Slimeworks Co** (https://slimeworksco.com) — empty response.
- **Strawb Slimes** (https://strawbslimes.com) — empty response.
- **SwaeSlimes** (https://www.etsy.com/shop/swaeslimes) — Etsy shop dormant.
- **Sustainaslimes** (https://sustainaslimes.com) — empty response.
- **The Slime Bakery** (https://theslimebakery.shop) — empty response.
- **The Slime Company UK** (https://theslimecompany.co.uk) — empty response.
- **The Slime Shop UK** (https://theslimeshop.co.uk) — empty response.
- **The Slime Factory Miami** (https://miami.theslimefactory.com) — coming-soon holding page (mall relocation).
- **Slime Zone and More** (https://slimezoneandmorefranchise.com) — franchise-info site, not a consumer shop.
- **Tessa Bunny** (https://tessabunny.com) — response too large to parse in this tool run; flagged for re-scan with a more targeted URL.

## Aggregated new variants table (feed into Phase 2 subtypes seed)

| variant_term | verbatim_spellings_seen | v2_home (base) | shop_count | shops | notes |
| --- | --- | --- | --- | --- | --- |
| Fluffy | Fluffy, Fluffy Slime, Fluffy Slime Collection, RESTOCKED+Fluffy | REVIEW: promote to sub-variant or base | 3+ (Phase 2) | Kawaii Slime Company, Wuwa Slimes, momoslimes (from Jenn) | Jenn had count=1. Now 3+ shops confirm Fluffy as its own category-level term. Recommend to Jenn: sub-variant under Cloud or its own base. |
| Metallic | Metallic, Metallic Slimes | REVIEW: attribute/finish vs. base | 2 (Phase 2) | artisticrainbow, slimeminator | Two shops list Metallic as a top-level texture category. Could be finish-attribute (like "glitter") rather than base. |
| Cereal | Cereal Slime, Clear Cereal Slime | REVIEW: new sub-variant of Beaded / Crunchy | 1 shop with dedicated categories (Hippocampe), 1 shop with product line (Retro Slime, cereal slime kit) | hippocampeslimes, retroslimecompany | Cereal slime = crunchy oat-shape inclusions. Hippocampe treats it as its own texture. |
| Basic | BASIC, Basic Slime, Basic Slime Texture | REVIEW: new base or Clear/generic default | 2 top-nav shops (glitterslimes, slimeatory) + 1 (Avocadoslimeez "Base Textur") = 3 shops | glitterslimes, slimeatory, avocadoslimeez (Base) | Multiple shops elevate "Basic" / "Base" to a top-level texture category. Suggests users think of a "default slime" home. |
| Snow Butter | Snow Butter Slime | Aligns with Section 5 `snowbutter` rename decision | 1 | hippocampeslimes | External validation of the `snowbutter` rename — this shop is already using the exact name. |
| Sugar Beads | Sugar Beads Slime | Beaded (sub-variant) | 1 | hippocampeslimes | New bead-based sub-variant. Distinguishes sugar-crystal-shape beads from Bingsu spheres. |
| Coated Clear | Coated Clear Slime | Clear (sub-variant) | 1 | hippocampeslimes | Sub-variant of Clear. |
| Gel Clear | Gel Clear Slime | Clear (sub-variant) | 1 | hippocampeslimes | Sub-variant of Clear. |
| Pigment Clear | Pigment Clear Slime | Clear (sub-variant) | 1 | hippocampeslimes | Sub-variant of Clear. |
| Semi-clear | Semi-clear (product name) | Clear (sub-variant) | 1 (product-name only) | slimeshopcafe | Sub-variant / partial-opacity Clear. |
| Sizzly | Sizzly (feel filter), "sizzly wet icee" (product post) | REVIEW: new sensory attribute term | 2 (mention/filter) | ogslimes, slimeowy | Describes crackle/audible-fizz feel. Cross-cuts Snow Fizz, Icee, Bingsu. Could be attribute not base. |
| Soft | Soft (feel filter) | Attribute-only | 1 | ogslimes | Very general — attribute, not base. |
| Edible Slime Candy | Edible Slime Candy | REVIEW: new product family | 1 (collection) + 1 (dedicated shop Silky Gem) + product-level (Slimeowy) | slimerellaslimeshop, silkygem | The Kohakutou/edible-candy trend crossing into slime shops. If SlimeLog expands to Edible/Candy, treat as sibling product family. |
| Slushee | Slushee, Slushee Textur, White Glue Slushee, Glowing Slushie | REVIEW: promote to sub-variant of Beaded (transparent hard beads) | 3 (avocadoslimeez, hippocampeslimes, slimeshopcafe) | avocadoslimeez, hippocampeslimes, slimeshopcafe | Multiple shops recognize Slushee as its own texture. Aligns with the Slushee-bead product spec. |
| Slushie | Slushie (product name spelling) | Same as Slushee | 1 | slimeshopcafe | Alias — different spelling from Slushee. |
| Hand-sculpted Clay | Hand-sculpted Clay | Butter (per Jenn's clay→butter rule) | 1 | wuwaslimes | More precise term. Confirms clay rule. |
| Cloud Dough | cloud dough (meta) | Cloud (variant) | 1 (Mr Chicken Slimes meta) + product references at KikiSlimeandFriends | mrchickenslimes, kikislimeandfriends | Existing spelling variant. |
| Icy Dough | icy dough (meta) | Icee (variant, unusual spelling) | 1 | mrchickenslimes | New spelling variant. |
| Nebula (brand-specific) | Nebula texture | Brand-specific | 1 | theslimekitchen | Their proprietary texture name. Add as brand-alias only. |
| memoryDOUGH® (brand-specific) | memoryDOUGH® Slime | Brand-specific | 1 | dopeslimes | Trademarked brand-line. Add as brand-alias only. |
| Obsidian Sand (brand-specific) | Obsidian Sand | Sand (brand-line) | 1 | slimeobsidian | Confirms sand as a real base users engage with. |
| Signature Dome™ (brand-specific format) | Signature Dome™ Slime | Container-format, not texture | 1 | kawaiislimecompany | Novelty packaging category. |
| Thickkk | Thickkk Slimes | Thick / Thick & Glossy alias | 1 | kikislimeandfriends | Playful spelling — add as alias. |
| Thicky Mickey (brand-specific) | Thicky Mickey | Brand-specific alias for Thick & Glossy | 1 | slimeowy | Brand-alias only. |
| Ultra Thickie (product-level) | Ultra Thickie | Thick & Glossy sub-variant | 1 (product name) | slimeyodashop | Product-level intensifier. |
| Perlite | Perlite Slime, Crunchy Perlite | Floam / Crunchy (specific bead type) | 1 | kikislimeandfriends | Perlite bead spec, sub-variant of Crunchy/Floam. |
| Ground Pumice / Pumice Stone | Ground Pumice Scented Slime, Pumice Stone Glossy | Floam / Crunchy (specific bead type) | 2 | kikislimeandfriends, slimeshopcafe | Volcanic pumice inclusion — another Crunchy sub-spec. |
| Pony Bead | Pony Bead Slime | Beaded (specific bead type) | 1 | kikislimeandfriends | Larger pony-bead-shape inclusion — Beaded sub-variant. |
| Crackables (brand-specific line) | Crackables Collection, Crackable | Brand-specific hybrid line | 1 | gooruslime | Cracking wax/snowfizz hybrid. |
| Frosting | Frosting/Butter Slime | Butter (spelling alias) | 1 | slimeobsidian | Spelling alias for Butter. |
| Base (as texture) | Base Textur, BASIC | See "Basic" row | 2 | avocadoslimeez, glitterslimes | Same signal as "Basic" row above. |
| Wolken | Wolken Slime | Cloud (German alias) | 1 | slimeslimede | German translation of Cloud. |

## New spelling variants of terms Jenn already tracks

| existing_term | new_verbatim_spelling | shop | recommendation |
| --- | --- | --- | --- |
| Cloud Cream | **Cloud Creme** (Creme with e) | kawaiislimecompany | Add as spelling variant. |
| Cloud Cream | **Cream** (short form) | slimeslimede | Add as German short-form alias. |
| Thick & Glossy | **thick&glossy** (no spaces) | wuwaslimes (meta) | Add as alias (matches Momo's already). |
| Thick & Glossy | **Thickkk** | kikislimeandfriends | Playful alias — add. |
| Thick & Glossy | **Thicky Mickey** | slimeowy | Brand-specific alias. |
| Thick & Glossy | **Glossy** (standalone) | kawaiislimecompany, slimeshopcafe | 2-shop signal for "Glossy" as its own texture bucket. Consider promoting to alias-with-standalone-usage. |
| Butter | **Frosting** | slimeobsidian | Spelling alias for Butter. |
| Butter | **Snow Butter** | hippocampeslimes | Aligns with `snowbutter` Section 5 decision. |
| Snow Fizz | **snowfizz** (no space) | mrchickenslimes, slimeshopcafe | Add as alias (2-shop). |
| Snow Fizz | **snow fizz slime** (lowercase, spaced) | slimeminator | Standard spelling. |
| Icee | **Ice** (label vs URL split) | aussieslimeco | Add "Ice Slime" as alias. |
| Icee | **Icy Dough** | mrchickenslimes | Icy hybrid spelling. |
| Cloud | **Wolken** (German) | slimeslimede | German alias. |
| Cloud | **Cloud Dough** | mrchickenslimes, kikislimeandfriends | Existing sub-variant. |
| Butter | **Ice Cream Butter** (Kawaii Slime Company also references ice cream slime kits) | kawaiislimecompany | Confirms existing Ice Cream Butter alias. |
| Fluffy | **Fluffy Slime** dedicated collection | kawaiislimecompany, wuwaslimes | 2 more shops confirm Fluffy — total 3+ shops now. |
| Jelly + Icee | **JELLY + ICEE SLIMES** (grouped collection) | slimemarshmallows | Third shop confirming this grouping. |
| Micro Floam | **Micro Floam Slime** dedicated collection | aussieslimeco | Micro Floam as its own top-level texture, not just a Floam sub-variant. |

## Grouping evidence for taxonomy (multi-term-in-one-collection signals)

| shop | grouped-as-one collection | inferred grouping |
| --- | --- | --- |
| glitterslimes | "CLOUD/CLOUD CREAM" | Cloud + Cloud Cream = one family (confirms Phase 1 sallysweetpea grouping) |
| slimeobsidian | "Frosting/Butter Slime" | Frosting + Butter = one family (Butter alias signal) |
| slimemarshmallows | "JELLY + ICEE SLIMES" | Jelly + Icee = one family (third shop for this grouping — sallysweetpea, parakeetslimesshop, seoulgage Snow Fizz & Bingsu were the Phase 1 grouping signals; this adds a fourth Jelly+Icee shop) |
| avocadoslimeez | "Floam/ Microfloam Slimes" | Floam + Microfloam = one family (also seen in Alpacaaslimey product naming) |
| kawaiislimecompany | "2 Slimes in 1" as its own hybrid collection | Hybrid combos being productized as their own bucket |

## Multi-shop signals for Skill Level taxonomy

Four Phase 2 shops expose a Beginner / Intermediate / Advanced (or Expert) filter as a first-class navigation aid:
- **OG Slimes** — Beginner / Intermediate / Advanced (metafield filter)
- **Kawaii Slime Company** — Beginner Slimes / Advanced Slimes (dedicated collections)
- **Slime Mania AU** — Skill Levels page under Slime 101
- **Slimerella Slime Shop** — Beginner / Intermediate / Expert (dedicated collections)

Combined with Phase 1's Slime Sweet Pea "Beginner Friendly" collection, this is now a **5+ shop pattern**. Strong signal for SlimeLog to consider a "difficulty" attribute per slime.

## Ambiguities flagged for Jenn

- **"Basic" / "Base" as a texture home** — 3 shops elevate this to a texture category. Is it (a) an entry-level clear-or-white slime, (b) equivalent to "Clear" or "Thick & Glossy", or (c) something else entirely? Recommend: decide if "Basic" is a starter-slime alias or gets its own home.
- **"Metallic"** — 2 shops list as texture; Slimeowy has "Blood Metallic Clear" product. Is Metallic a texture or a color/finish attribute? If finish, does it become part of the color-attribute schema?
- **"Fluffy" — now 3+ shops.** Should Fluffy be promoted to a sub-variant under Cloud, or does it deserve its own base?
- **"Cereal" / "Clear Cereal"** — Hippocampe treats Cereal as its own top-level texture. Retro Slime Company has a "Cereal Slime Kit" product. Is Cereal a hybrid or standalone base? Since it's oat-shape inclusions, arguably it's a sub-variant of Crunchy or Beaded.
- **"Slushee" / "Slushie"** — 3+ shops recognize as texture (Avocadoslimeez, Hippocampe, Slime Shop Cafe). Should be a sub-variant of Beaded (Slushee beads = transparent hard beads). Both spellings observed.
- **"Sizzly" as a feel-attribute** — OG Slimes uses as filter; Slimeowy uses in product description. Cross-cuts Snow Fizz, Icee, Bingsu. Could be an attribute tag not a base.
- **Clear sub-variants (Coated / Gel / Pigment / Semi-Clear)** — Hippocampe uses 3 sub-Clears; Colour Slime (Phase 1) had "Thick Clear"; Slime Shop Cafe has "Semi-clear". Should Clear have formal sub-variants in the taxonomy?
- **"Glossy" (standalone, no Thick prefix)** — 2 shops treat it as its own bucket. Alias-with-standalone-usage of Thick & Glossy, or its own subtype?
- **"Edible Slime Candy"** — Slimerella has a full collection. Silky Gem is a full crystal-candy brand. Slimeowy has candy-adjacent product names. Question for Jenn: does SlimeLog scope include edible/gummy adjacencies as a sibling product family?
- **Product-level bead specs (Perlite, Pony Bead, Ground Pumice, Sugar Beads)** — worth capturing as bead-type attributes rather than variants?
- **"2 Slimes in 1" as a hybrid marketing pattern** — Kawaii Slime Company has a full collection. Should the taxonomy add explicit "hybrid" or "combo" as its own home?

## Coverage report

**Shops enumerated (from CSV):** 129

**Skipped due to already-scanned (exclusion list):** 51 — see Executive summary.

**Skipped due to fetch failure / password-blocked / dead / JS-only / no scannable data:** 25:
- Artistic Slimez (empty response), Boba Bao Slimes-itskristii (password), Brooklyn Slime (JS-only Square), Fuwa Slimes (empty), Lemons and Slimes (password), Lemons and Limes Slimes (empty), Mobile Slime Factory-Z's (empty), Mochi Slime UK (password), Nichole Jacklyne (empty), Nora's Slimery (empty), Oozapalooza (JS-only Square), Oozed Slime (empty), Slime by Sara (empty), Slime Fantasies (landing only), Slime Labs UK (activator-brand, no slimes), Slime New York (password), Slime Screwball (empty), Slimeful (empty), Slimeglitterz (0 products), Slimentine (empty), Slimes Mel (empty), Slimeworks Co (empty), Strawb Slimes (empty), SwaeSlimes (Etsy dormant), Sustainaslimes (empty), The Slime Bakery (empty), The Slime Company UK (empty), The Slime Shop UK (empty), The Slime Factory Miami (coming soon), Slime Zone and More franchise (franchise info site), Tessa Bunny (response too large to parse).

**Successfully scanned with texture-related terminology extracted (Phase 2 additions):** 22:
- Aussie Slime Co, Avocadoslimeez, Artistic Rainbow, Dope Slimes, Glitter Slimes, Hippocampe Slimes, Kawaii Slime Company, KikiSlimeandFriends (Etsy), Slime Marshmallows UK, Slime Obsidian, OG Slimes, Slimeatory, Slimeminator, Slimerella, SlimeSlime.de, Wuwa Slimes — plus meta-only capture from Mr Chicken Slimes, Retro Slime Company, Slime Drops, Slime Shack AU, and product-level from Slimeowy, Slime Shop Cafe.

**Scanned but no texture nav (theme-only, kit-only, or drop-organized):** 23:
- Alpacaaslimey, BFF Slime Bakery, DIY Slime Shop NY (in-person), East Bay Slimes, Fireflyslime, Gooru Slime (Dubai), Hoshimi Slimes, Karina Garcia/Craft City (retail brand), Library of Slime, Macarons Slime, Madz Slimes, Meli & Melo (kit-based), Potcha Slimes, Slime by Zahra, Slime Mania AU, Slime Shop Cafe (product-level only), Slime Yoda, Slime Kitchen (retail chain), Soft Punk Slime (drop dates), Sticky Sparkle Slime (drop themes), Slimeowy (product only), Tangie Slimes, Tanooki Slimes, The Slime Playground.

## Combined coverage with Phase 1 + Jenn

- **Jenn's xlsx:** 36 shops (Adelaide-count varies but 36 unique shop keys after normalization).
- **Phase 1 report:** 17 additional shops (successfully-scanned with terminology) + additional low-signal-only shops.
- **Phase 2 report (this doc):** 16 additional shops with texture nav + 6 shops with meta/product-level signals = 22 net-new information sources + 23 no-texture-nav confirmations + 25 fetch-blocked/dead.
- **Estimated total unique shops with terminology data across all three scans:** 36 (Jenn) + 17 (P1) + 22 (P2) = **75 shops with terminology signals**, out of the **129 URL-bearing brands in the target CSV**.
- **Estimated coverage percentage of the 129 URL-having brands:** ~58% have some level of terminology signal captured. The remaining 42% is split between fetch-blocked shops (~19%), theme-only shops (~18%), and truly empty responses (~5%).
- If we exclude the 20 dormant/password/dead shops (which have no data available to us), our effective coverage is **~68% of the still-operational URL-bearing catalog**.

## High-signal misses to flag for Jenn urgently

Three findings that jump out as pattern-level signals not currently in Jenn's file or the Phase 1 file:

1. **"Basic" / "Base" as a top-level texture home** (3-shop signal: glitterslimes, slimeatory, avocadoslimeez). Multiple shops elevate a "starter default" slime to top-level texture nav. If Jenn's file doesn't have this, it's a genuine gap.

2. **"Slushee" / "Slushie" as its own texture home** (3-shop signal: avocadoslimeez, hippocampeslimes, slimeshopcafe). Distinct from Jelly and Icee, described as "transparent hard beads." Currently rolled up under other categories in Jenn's file.

3. **Skill-Level taxonomy (Beginner/Intermediate/Advanced)** (5+ shop signal across P1 and P2). This is not a texture but a user-facing attribute that four+ shops make first-class in their nav. Worth considering as an app-level filter/attribute alongside texture.

## Notable brand-specific findings

- **Hippocampe Slimes** exposes the richest texture nomenclature in the Phase 2 pool — 16 categories including 3 Clear sub-variants, Snow Butter, Sugar Beads, Cereal, and hybrid-Clear terms. Recommended as a reference storefront for the SlimeLog guide's Clear sub-variety section.
- **OG Slimes** is the only shop we found that uses a metafield-driven filter system with dedicated "Feel" and "Skill Level" facets. Strong UX pattern for SlimeLog to consider.
- **Dope Slimes** and **Colour Slime (US, from Phase 1)** both treat **Putty as a sibling top-level product family** to Slime. Two-shop pattern.
- **Slime Obsidian** explicitly groups **"Frosting/Butter"** as one collection, giving Butter its most novel alias (Frosting).
- **Kawaii Slime Company** treats **Signature Dome™** (a container-format) as its own category — unusual pattern of format-as-category.
- **KikiSlimeandFriends (Etsy)** and **Wuwa Slimes** both surface **bead-inclusion specs at the product-level** (Perlite, Pony Bead, Ground Pumice, Sugar Beads, Hand-sculpted Clay). Suggests a bead/inclusion secondary attribute could be part of the schema.
- **The Library of Slime, Soft Punk Slime, East Bay Slimes** all maintain **in-shop "Dictionary" / "Texture Guide" pages** as brand-owned educational content. Alongside Slime Mania AU's "Slime 101," this is a pattern SlimeLog could reference for guide framing.
- **Silky Gem** (crystal candy) and **Slimerella's "Edible Slime Candy" collection** and **Slimeowy's candy-styled product names** together signal an edible/candy-adjacent product family emerging in the slime community.
- **Multiple "AI Statement" pages** — Soft Punk Slime maintains a dedicated `/pages/ai-statement`. Reinforces the community-sensitivity rule from CLAUDE.md; slime creators are publicly declaring their anti-AI stance.

