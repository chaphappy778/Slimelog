// apps/web/app/guide/content.ts
// T32 (2026-07-13): The SlimeLog Guide — structured content module.
// Source of truth for all 12 parts of the guide. Copy is Jenn's V4.1
// approved draft (see docs/slime_guide_v41_extracted.txt). Do NOT rewrite
// this file for length or clarity — this is Jenn's voice.
//
// Base texture slugs match `SlimeBaseType` in @/lib/types where possible,
// so "See N logs" CTAs can route to /discover/type/[slug]. Two edge cases:
// - `wax_and_wax_cracking` is the enum value even though V4.1 titles the
//   texture "Wax & Wax Cracking". Slug preserved so /discover/type routes.
// - `magnetic` and `sand` have no photo — gradient fallback applies.

import type { SlimeBaseType } from "@/lib/types";

// ─── Part 1: Base Textures ────────────────────────────────────────────

export interface GuideTexture {
  /** Matches SlimeBaseType where possible. Used for /discover/type/[slug]. */
  slug: SlimeBaseType;
  name: string;
  tagline: string;
  definition: string;
  note: string;
  variantsAndRelated: string[];
  example: {
    slimeName: string;
    brandName: string;
    /** Present when we know the catalog slug; component falls back to
     * plain text if the linked brand row doesn't exist yet. */
    brandSlug: string | null;
    /** Real photo path under /public/guide/textures/, or null for
     * gradient-only fallback (sand, magnetic). */
    imagePath: string | null;
  };
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

export const TEXTURES: GuideTexture[] = [
  {
    slug: "clear",
    name: "Clear",
    tagline: "The gems of the slime world",
    definition:
      "Clear slime is exactly what it sounds like: a transparent base that puts everything suspended inside it on full display. Many clear slimes are coated, meaning a bit of contact solution has been worked into the recipe to cut stickiness and make the slime easier to handle straight from the jar.",
    note: "Clear is also the workhorse of the bead world. Open up most bead bombs, and you will find a clear base quietly holding all those beads together.",
    variantsAndRelated: [
      "Glossy",
      "Holographic",
      "Pearl",
      "Metallic",
      "Galaxy",
      "Thermochromic",
      "Glow-in-the-Dark",
    ],
    example: {
      slimeName: "Ultraviolet",
      brandName: "Slime Obsidian",
      brandSlug: "obsidian-slimes",
      imagePath: "/guide/textures/clear-slime-obsidian.png",
    },
    gradientFrom: "#0A0A0A",
    gradientTo: "#1a1a2e",
    accentColor: "#00F0FF",
  },
  {
    slug: "water",
    name: "Water",
    tagline: "Thin, wobbly, endlessly satisfying",
    definition:
      "Water slimes push the water-to-glue ratio about as far as it can go. Built on white or clear glue (sometimes a thinner glue than standard clear), they carry so much water that the result is a thin, wobbly slime that will happily escape both its container and your hands.",
    note: "Because water slime moves and sits so differently from every other texture, the usual ASMR techniques fall flat here. It has its own sounds and its own play style.",
    variantsAndRelated: ["Jiggly", "Jelly Cube", "Jelly Puff"],
    example: {
      slimeName: "Fairy Water",
      brandName: "Momo",
      brandSlug: "momo-slimes",
      imagePath: "/guide/textures/water-momo.webp",
    },
    gradientFrom: "#001a3a",
    gradientTo: "#003366",
    accentColor: "#00F0FF",
  },
  {
    slug: "jelly",
    name: "Jelly",
    tagline: "Wobbly, bouncy, and endlessly fun",
    definition:
      "Jelly starts with a clear glue base and a small dose of instant snow powder. Depending on whether that powder goes in dry, hydrated, or over-hydrated, you end up with dry, standard, or juicy jelly.",
    note: "Swap in white glue using the same method, and you get a white-glue jelly that usually lands plush and velvety rather than juicy.",
    variantsAndRelated: ["Jelly Cube", "Jelly Puff", "Thiggly"],
    example: {
      slimeName: "Jellyfish Jelly",
      brandName: "Slime OG",
      brandSlug: "og-slimes",
      imagePath: "/guide/textures/jelly-og-slimes.webp",
    },
    gradientFrom: "#0d2b1a",
    gradientTo: "#1a4d2e",
    accentColor: "#39FF14",
  },
  {
    slug: "icee",
    name: "Icee",
    tagline: "That signature sizzle and crunch",
    definition:
      "Icee slimes take the jelly formula and turn up the instant snow. The snow itself is mixed with a higher water content, which keeps the base moist and gives Icee its signature sizzle. The name comes from the frozen drink, and the texture lives up to it.",
    note: "With this much instant snow in the mix, expect a little snow residue on your hands and play surface. It comes with the territory.",
    variantsAndRelated: ["Slushee"],
    example: {
      slimeName: "Teddy Bear Stuffing",
      brandName: "Pilot",
      brandSlug: "pilot-slimes",
      imagePath: "/guide/textures/icee-pilot.webp",
    },
    gradientFrom: "#001833",
    gradientTo: "#0033aa",
    accentColor: "#00F0FF",
  },
  {
    slug: "thick_and_glossy",
    name: "Thick & Glossy",
    tagline: "Loud pops and mirror-like shine",
    definition:
      "A white glue base bulked up with thickeners, including heavy, opaque glues, stabilizers, and each shop's own secret ingredients. The result is dense, shiny, and famous for loud cascading pops.",
    note: "If big, satisfying pops are your thing, this is the texture to reach for. Thick and glossy also shines for poking, stretching, and inflating.",
    variantsAndRelated: ["Thicky", "Glossy"],
    example: {
      slimeName: "Laundry Day",
      brandName: "Mythical Mushbunny",
      brandSlug: "mythical-mushbunny-slimes",
      imagePath: "/guide/textures/thick-glossy-mythical-mushbunny.webp",
    },
    gradientFrom: "#1a0a2e",
    gradientTo: "#2D0A4E",
    accentColor: "#FF00E5",
  },
  {
    slug: "slay",
    name: "Slay",
    tagline: "Soft, luscious, and wonderfully stretchy",
    definition:
      "The name blends 'slight' and 'clay', and the texture blends a thick, glossy texture with a buttery slime. Slays are soft and luscious, with wonderful stretches and pops. Credit for the term goes to The Slime Hive, who coined it in 2017.",
    note: "Clay content varies from slay to slay, but clay generally makes up a quarter or less of the finished slime.",
    variantsAndRelated: ["Sally Butter", "Custard", "Cream Cheese", "Nougat"],
    example: {
      slimeName: "Whale Season",
      brandName: "Sally Sweet Pea",
      brandSlug: "slime-sweet-pea",
      imagePath: "/guide/textures/slay-sally-sweet-pea.webp",
    },
    gradientFrom: "#2a1a0a",
    gradientTo: "#4d3319",
    accentColor: "#FFB800",
  },
  {
    slug: "butter",
    name: "Butter",
    tagline: "Beginner-friendly, dense, and plush",
    definition:
      "Dense, soft, and plush, butter is one of the most forgiving textures for anyone new to slime. A true butter slime is at least half air-dry clay.",
    note: "A fun one for DIY kit fans: plenty of clay-based DIY slimes turn into butter slimes once everything is fully mixed in.",
    variantsAndRelated: ["Sally Butter", "Mochi"],
    example: {
      slimeName: "Mooshake",
      brandName: "Cats Craft",
      brandSlug: "cats-craft",
      imagePath: "/guide/textures/butter-cats-craft.webp",
    },
    gradientFrom: "#2e2000",
    gradientTo: "#4a3500",
    accentColor: "#FFB800",
  },
  {
    slug: "cloud",
    name: "Cloud",
    tagline: "Airy drizzle and pillowy softness",
    definition:
      "The lightest texture in the lineup. Cloud slime gets its famous drizzle from a heavy dose of instant snow powder worked into white glue, giving it a dry, quiet, fluffy feel.",
    note: "That classic drizzle does not happen on its own. Clouds need plenty of stretching to work in the air, so give yours some warm-up time.",
    variantsAndRelated: ["Cloud Fizz", "Cloud Dough", "Mousse Fizz", "Chiffon Fizz"],
    example: {
      slimeName: "Beary Best Friends",
      brandName: "Sandy Bros",
      brandSlug: "sandy-bros",
      imagePath: "/guide/textures/cloud-sandy-bros.png",
    },
    gradientFrom: "#1a1a2e",
    gradientTo: "#2e2e4a",
    accentColor: "#00F0FF",
  },
  {
    slug: "cloud_cream",
    name: "Cloud Cream",
    tagline: "Dense, airy, and impossibly soft",
    definition:
      "Cloud creams fall into a category of their own: soft yet substantial, dense yet airy. The texture comes from loading in a generous helping of instant snow, skipping air dry clay entirely.",
    note: "A naming tip: snowbutter built on clear glue rather than white usually goes by mochi.",
    variantsAndRelated: ["Mochi", "Putty Puff"],
    example: {
      slimeName: "White Whale",
      brandName: "White Whale",
      // 2026-07-13 slug audit: no catalog entry yet — plain text render.
      brandSlug: null,
      imagePath: "/guide/textures/cloud-cream-white-whale.webp",
    },
    gradientFrom: "#0d1a2e",
    gradientTo: "#1a2e4a",
    accentColor: "#00F0FF",
  },
  {
    slug: "fluffy",
    name: "Fluffy",
    tagline: "Marshmallowy hand feel, pillowy stretch",
    definition:
      "Fluffy slime gets its pillowy, airy body from shaving foam folded into a white glue base. Expect plenty of stretch and a marshmallow-soft hand feel.",
    note: "Fluffy is at its best in the first few hours after mixing. Shaving foam gradually loses its structure, so the texture slowly deflates over time.",
    variantsAndRelated: ["Cloud", "Cloud Cream"],
    example: {
      slimeName: "KY Fluffy",
      brandName: "KY",
      brandSlug: "ky-slimes",
      imagePath: "/guide/textures/fluffy-ky.webp",
    },
    gradientFrom: "#1a0a2e",
    gradientTo: "#330d4a",
    accentColor: "#CC44FF",
  },
  {
    slug: "floam",
    name: "Floam",
    tagline: "Crunchy, beady, endlessly satisfying",
    definition:
      "Floam is a glue base packed with foam beads for a crunchy, beady texture. How densely those beads are packed is the defining trait.",
    note: "Bead density changes everything. A lightly beaded floam and a fully saturated one sound and feel like two completely different slimes.",
    variantsAndRelated: ["Float", "Crunchy", "Bead Bomb"],
    example: {
      slimeName: "Party In The USA",
      brandName: "Dream Glow",
      brandSlug: "dream-glow-slimes",
      imagePath: "/guide/textures/floam-dream-glow.webp",
    },
    gradientFrom: "#0d2e1a",
    gradientTo: "#1a4a2e",
    accentColor: "#39FF14",
  },
  {
    slug: "snow_fizz",
    name: "Snow Fizz",
    tagline: "The loudest crunch in the slime world",
    definition:
      "Extremely thick and extremely crunchy, snow fizz is made with plastic snow, an instant snow that retains a crisper, drier structure. The payoff is a loud, satisfying crunch and sizzle.",
    note: "Decibel for decibel, snow fizz is one of the loudest textures out there, which makes it a favorite of ASMR-focused makers.",
    variantsAndRelated: ["Crunchy", "Bingsu"],
    example: {
      slimeName: "Prismatic Snow Fizz",
      brandName: "Prismatic",
      brandSlug: "prismatic-slimes",
      imagePath: "/guide/textures/snow-fizz-prismatic.webp",
    },
    gradientFrom: "#001a2e",
    gradientTo: "#003355",
    accentColor: "#00F0FF",
  },
  {
    slug: "beaded",
    name: "Beaded",
    tagline: "Maximum crunch, maximum texture",
    definition:
      "Beaded slime is defined by its bingsu or fishbowl beads, which deliver maximum crunch and an unmistakably beady feel.",
    note: "When rating a beaded slime, pay close attention to bead type and bead size. Each bead brings its own sound and its own feel to the experience.",
    variantsAndRelated: ["Crunch Bomb", "Fishbowl Beads", "Bead Bomb", "Micro Dough"],
    example: {
      slimeName: "Crunch Bomb",
      brandName: "Rodem",
      brandSlug: "rodem-slime-shop",
      imagePath: "/guide/textures/beaded-rodem.webp",
    },
    gradientFrom: "#1a0a0a",
    gradientTo: "#3a1a1a",
    accentColor: "#FF00E5",
  },
  // 2026-07-16: 'clay' base type entry removed per taxonomy rework Phase 1.
  // Clay is not a real base type — it was a redundant alias for Butter (both
  // are clay-heavy at the ingredient level per Jenn's V4.1 guide). Japanese
  // Clay + Korean Clay land as butter variants in Phase 2. See migration
  // 20260716000075_remove_clay_base_type.sql +
  // docs/handoffs/2026-07-15-taxonomy-rework-plan.md Section 11.2.
  {
    slug: "avalanche",
    name: "Avalanche",
    tagline: "Watch it slowly sink and swirl",
    definition:
      "An avalanche starts with a clear base, with thicker slime layered on top. Over time, the top layer drifts down into the clear, carving out a slow-motion landscape.",
    note: "This one is all about the visual. The moment of unboxing, or that first poke, is where avalanche earns its keep.",
    variantsAndRelated: ["Sinking Slime", "Iceberg"],
    example: {
      slimeName: "BFF Avalanche",
      brandName: "BFF Slime Bakery",
      // 2026-07-13: bff-slime-bakery approved via brand-suggestion flow;
      // if the seed migration exists in this env, link renders. If not,
      // fallback to plain text. Kept slug in case it's already live.
      brandSlug: "bff-slime-bakery",
      imagePath: "/guide/textures/avalanche-bff.webp",
    },
    gradientFrom: "#001a1a",
    gradientTo: "#003333",
    accentColor: "#00F0FF",
  },
  {
    slug: "magnetic",
    name: "Magnetic",
    tagline: "Iron-infused and magnet-reactive",
    definition:
      "Magnetic slime carries iron filings and reacts when a magnet comes near, visibly stretching toward it, pulling on it, or swallowing it whole.",
    note: "Most magnetic slimes are built on clear or thick, glossy bases so that the suspended iron stays visible.",
    variantsAndRelated: [],
    example: {
      slimeName: "Thinking Putty",
      brandName: "Crazy Aaron's",
      // 2026-07-13 slug audit: no catalog entry yet — plain text render.
      brandSlug: null,
      imagePath: "/guide/textures/magnetic-crazy-aarons.webp",
    },
    gradientFrom: "#0a0a0a",
    gradientTo: "#1a1a1a",
    accentColor: "#888888",
  },
  {
    slug: "wax_and_wax_cracking",
    name: "Wax & Wax Cracking",
    tagline: "Smooth pull with a satisfying crack",
    definition:
      "Wax slimes replace the usual glue with a wax compound that has a smooth, distinctive pull. Wax cracking slimes blend polymer into the wax, producing a satisfying audible crack when stretched.",
    note: "Wax is a newer arrival in the slime world and plays by different rules than traditional PVA-based slime. Do not expect it to stretch forever.",
    variantsAndRelated: ["Wax Cracking"],
    example: {
      slimeName: "OG Wax",
      brandName: "OG Slimes",
      brandSlug: "og-slimes",
      imagePath: "/guide/textures/wax-og-slimes.webp",
    },
    gradientFrom: "#1a1500",
    gradientTo: "#2e2500",
    accentColor: "#FFB800",
  },
  {
    slug: "sand",
    name: "Sand",
    tagline: "Grainy, moldable, satisfying crumble",
    definition:
      "Built on a kinetic sand base, sand slimes are grainy, moldable, and crumble most satisfyingly.",
    note: "Sand slimes sit right on the border between slime and kinetic sand, and some collectors draw the line before this category.",
    variantsAndRelated: [],
    example: {
      slimeName: "Asteroid Dust",
      brandName: "Momo",
      brandSlug: "momo-slimes",
      // 2026-07-13: sand slime photo added.
      imagePath: "/guide/textures/sand-momo.avif",
    },
    gradientFrom: "#2e2200",
    gradientTo: "#4a3800",
    accentColor: "#FFB800",
  },
  {
    slug: "sugar_scrub",
    name: "Sugar Scrub",
    tagline: "Gritty, scented, and crossover-worthy",
    definition:
      "Sugar scrub slimes mix sugar granules into a glue base for a gritty, exfoliating feel, and they tend to arrive heavily scented.",
    note: "Scent does a lot of the work in this category. Sugar scrubs often cross over between slime collecting and bath and body products.",
    variantsAndRelated: [],
    example: {
      slimeName: "Macaroons",
      brandName: "Macaroons Slime",
      // 2026-07-13 slug audit: no catalog entry yet — plain text render.
      brandSlug: null,
      imagePath: "/guide/textures/sugar-scrub-macaroons.png",
    },
    gradientFrom: "#2e0a1a",
    gradientTo: "#4a1a2e",
    accentColor: "#FF00E5",
  },
  {
    slug: "hybrid",
    name: "Hybrid",
    tagline: "Two textures, one spectacular result",
    definition:
      "Hybrid covers any slime composed of two or more base textures. Think butter-cloud, or a clear base crossed with jelly and cloud.",
    note: "Treat hybrid as the catch-all. If a slime fits cleanly into one base texture, give it that base's label instead.",
    variantsAndRelated: [],
    example: {
      slimeName: "Bingsu Jelly Clay",
      brandName: "KY",
      brandSlug: "ky-slimes",
      imagePath: "/guide/textures/hybrid-bingsu-jelly-clay-ky.webp",
    },
    gradientFrom: "#1a0a2e",
    gradientTo: "#2e1a4a",
    accentColor: "#CC44FF",
  },
];

// ─── Glossary entries (Parts 2, 4, 10, 11) ─────────────────────────────

export interface GlossaryEntry {
  term: string;
  /** Small tag/category shown under the term. Optional. */
  tag: string | null;
  definition: string;
}

/** Part Two: Add-ins & Inclusions. */
export const ADD_INS: GlossaryEntry[] = [
  {
    term: "Foam Beads",
    tag: "beads",
    definition:
      "Lightweight polystyrene beads (sometimes called 'styrofoam beads') in various sizes. Produce a soft crunch and are the defining ingredient of floam slimes.",
  },
  {
    term: "Fishbowl Beads",
    tag: "beads",
    definition:
      "Small, transparent, hollow plastic beads shaped like miniature half-spheres or domes. Suspended in clear slime, they produce a loud, glassy crunch.",
  },
  {
    term: "Bingsu Beads",
    tag: "beads",
    definition:
      "Thin, shaved-ice-like translucent strips. Named after the Korean shaved ice dessert. Produce a fine, delicate crunch distinct from fishbowl beads.",
  },
  {
    term: "Slushie Beads",
    tag: "beads",
    definition:
      "Soft, jelly-like translucent beads with a yielding squish. Often used to evoke icy or drink-themed slimes.",
  },
  {
    term: "Micro Beads",
    tag: "beads",
    definition:
      "Very small beads (sub-millimeter) that produce a fine, dense, sand-like texture in slime. Common in micro dough variants.",
  },
  {
    term: "Bead Bombs",
    tag: "style",
    definition:
      "Not a bead type but a slime style, a slime with maximum bead loading, often combining multiple bead types in a single product. The 'bomb' refers to the dense, layered concentration.",
  },
  {
    term: "Charms",
    tag: "toppings",
    definition:
      "Small plastic or resin decorative pieces, often food-themed (donuts, fruit, pastries) or character-themed. Charms are typically placed on top of the slime rather than mixed in, and are removable.",
  },
  {
    term: "Sprinkles or FIMO",
    tag: "toppings",
    definition:
      "Tiny shaped polymer clay pieces, usually mimicking baking sprinkles, fruit slices, or confetti. Mixed in or scattered on top.",
  },
  {
    term: "Sequins",
    tag: "toppings",
    definition:
      "Flat, often metallic or iridescent plastic discs. Provide visual sparkle without adding much textural feedback.",
  },
  {
    term: "Glitter",
    tag: "toppings",
    definition:
      "Fine reflective particles mixed throughout the slime body. The defining ingredient of glitter and galaxy slimes. Sizes range from ultra-fine to chunky.",
  },
  {
    term: "Foil",
    tag: "toppings",
    definition:
      "Thin metallic flakes that catch light and add reflective shine. Often used in galaxy and metallic slimes.",
  },
  {
    term: "Instant Snow Powder",
    tag: "powders",
    definition:
      "Sodium polyacrylate powder that absorbs water and expands. The defining ingredient of jelly, icee, cloud, cloud cream, and snow fizz textures. Ratio of powder to water dramatically changes the resulting feel.",
  },
  {
    term: "Plastic Snow",
    tag: "powders",
    definition:
      "A drier, crisper variant of instant snow that retains structure even when fully hydrated. Produces the signature loud crunch of snow fizz slimes.",
  },
  {
    term: "Pigment",
    tag: "powders",
    definition:
      "Color additive, either liquid or powder. Distinct from glitter or holographic pigment, which add visual effects beyond color.",
  },
  {
    term: "Holographic Pigment",
    tag: "powders",
    definition:
      "Reflective pigment that shifts color and shimmer based on viewing angle and light source. Defining ingredient of holographic slimes.",
  },
  {
    term: "Pearl Pigment",
    tag: "powders",
    definition:
      "Soft, pearlescent pigment that adds a milky shimmer rather than a sharp reflective shift.",
  },
  {
    term: "Metallic Pigment",
    tag: "powders",
    definition:
      "Pigment that produces a chrome-like or metallic finish. Common in metallic slimes.",
  },
  {
    term: "Thermochromic Pigment",
    tag: "powders",
    definition:
      "Heat-reactive pigment that changes color with body heat or warm water. Speed and contrast of the color change are key rating factors.",
  },
  {
    term: "Glow Pigment",
    tag: "powders",
    definition:
      "Phosphorescent pigment that charges in bright light and glows in the dark. Charge time and glow duration vary by pigment quality.",
  },
  {
    term: "Air Dry Clay",
    tag: "structural",
    definition:
      "Soft, lightweight clay (such as Daiso or Model Magic) mixed into a glue-based slime to produce butter, slay, and clay textures. The defining structural ingredient of butter slimes.",
  },
  {
    term: "Shaving Foam",
    tag: "structural",
    definition:
      "Pressurized shaving cream added to white glue slime to produce fluffy slime. Adds volume and softness but breaks down over time.",
  },
  {
    term: "Lotion",
    tag: "structural",
    definition:
      "Used to soften and add stretch, especially in butter, custard, and cream cheese textures. Also affects scent profile.",
  },
  {
    term: "Iron Filings",
    tag: "structural",
    definition:
      "Magnetic metal particles suspended in slime to create magnetic slime.",
  },
  {
    term: "Sugar Granules",
    tag: "structural",
    definition:
      "Used in sugar scrub slime for a gritty, exfoliating texture.",
  },
  {
    term: "Wax",
    tag: "structural",
    definition:
      "Used as a base or additive in wax, wax-coated clay toppers, and wax-cracking slimes.",
  },
  {
    term: "Borax Solution",
    tag: "activator",
    definition:
      "Borax dissolved in warm water. Strong activator, easy to over-activate, producing stiff, rubbery slime.",
  },
  {
    term: "Contact Lens Solution",
    tag: "activator",
    definition:
      "Multipurpose contact solution containing boric acid and sodium borate. The most common at-home activator. Brand and formula matter, not all contact solutions activate slime.",
  },
  {
    term: "Liquid Starch",
    tag: "activator",
    definition:
      "A milder activator that produces softer, stretchier slime. Less common in commercial slime but popular in DIY recipes.",
  },
  {
    term: "Boric Acid",
    tag: "activator",
    definition:
      "Pure boric acid in powder or solution form. Used by makers for precise control over activation.",
  },
];

/** Part Four: Scents. */
export const SCENTS: GlossaryEntry[] = [
  {
    term: "Bakery & Dessert",
    tag: "family",
    definition:
      "The dominant slime scent category. Includes vanilla, frosting, cake, cookies, brownies, donuts, cinnamon rolls, and other dessert-themed scents. Often paired with butter and cloud cream textures.",
  },
  {
    term: "Fruity",
    tag: "family",
    definition:
      "Fresh fruit and fruit candy scents (strawberry, watermelon, peach, citrus, berry blends, tropical mixes) are common in jelly, clear, and Icee textures.",
  },
  {
    term: "Floral",
    tag: "family",
    definition:
      "Rose, lavender, jasmine, cherry blossom, and other flower-derived scents. Often used in pastel and spring-themed drops.",
  },
  {
    term: "Beverage",
    tag: "family",
    definition:
      "Drink-inspired scents (coffee, tea, boba, lemonade, cola, smoothies). Often paired with icee, slushee, and water textures.",
  },
  {
    term: "Candy",
    tag: "family",
    definition:
      "Sour candy, gummy candy, bubblegum, cotton candy, hard candy, often more synthetic and sweet than the fruity category.",
  },
  {
    term: "Seasonal & Themed",
    tag: "family",
    definition:
      "Scents tied to a specific season or holiday (pumpkin spice, peppermint, gingerbread, hot chocolate, apple cider, beach/sunscreen, evergreen). Drives much of the seasonal drop calendar.",
  },
  {
    term: "Spa & Clean",
    tag: "family",
    definition:
      "Cucumber, eucalyptus, sea salt, fresh linen, soap. More common in sugar scrub slimes and minimalist or 'clean' aesthetic shops.",
  },
  {
    term: "Unscented",
    tag: "family",
    definition:
      "Many collectors prefer unscented slime, citing scent fatigue, sensory sensitivity, or scent migration over time. Often listed explicitly as a product variant.",
  },
  {
    term: "Light",
    tag: "strength",
    definition: "Subtle, only noticeable when the slime is held close.",
  },
  {
    term: "Medium",
    tag: "strength",
    definition: "Noticeable from arm's length, dominant during play.",
  },
  {
    term: "Strong",
    tag: "strength",
    definition: "Fills the room when the container is opened.",
  },
  {
    term: "Heavy / Loaded",
    tag: "strength",
    definition:
      "Often advertised as 'heavily scented', saturated and persistent.",
  },
];

/** Part Ten: Color, Theme & Aesthetic Vocabulary. */
export const AESTHETIC_VOCAB: GlossaryEntry[] = [
  {
    term: "Pastels",
    tag: "color",
    definition:
      "Soft, low-saturation colors (mint, lavender, peach, baby blue, butter yellow). Common in spring, Easter, and kawaii drops.",
  },
  {
    term: "Neons",
    tag: "color",
    definition:
      "High-saturation, often fluorescent colors. Common in summer, candy, and toy-themed drops.",
  },
  {
    term: "Jewel Tones",
    tag: "color",
    definition:
      "Saturated, deep colors (emerald, sapphire, ruby, amethyst). Common in fall, holiday, and luxe-themed drops.",
  },
  {
    term: "Earthy / Naturals",
    tag: "color",
    definition:
      "Muted browns, creams, sages, and warm neutrals. Common in coffee, baked goods, and minimalist drops.",
  },
  {
    term: "Black & White",
    tag: "color",
    definition:
      "Monochrome palettes, often paired for contrast. Common in spooky, modern, and goth-themed drops.",
  },
  {
    term: "Iridescent",
    tag: "color",
    definition:
      "Shifting color treatments using holographic, pearl, or duo-chrome pigments, applied as a surface treatment rather than a base color.",
  },
  {
    term: "Kawaii",
    tag: "aesthetic",
    definition:
      "Cute, soft, often pastel-driven, frequently featuring food themes, animal charms, and rounded shapes.",
  },
  {
    term: "Dessert / Bakery",
    tag: "aesthetic",
    definition:
      "Inspired by baked goods, candy, ice cream, and confections and often paired with bakery scents and food-shaped charms.",
  },
  {
    term: "Spa / Clean",
    tag: "aesthetic",
    definition:
      "Minimalist, often white-and-blue palettes, calm scents, and uncluttered presentation.",
  },
  {
    term: "Dark / Spooky / Halloween",
    tag: "aesthetic",
    definition:
      "Black, deep purple, blood red, or moody palettes. Seasonal but with year-round shop variants.",
  },
  {
    term: "Nature / Botanical",
    tag: "aesthetic",
    definition:
      "Greens, florals, earth tones, often featuring leaf, flower, or animal charms.",
  },
  {
    term: "Holiday / Seasonal",
    tag: "aesthetic",
    definition:
      "Tied to specific holidays (Christmas, Valentine's Day, Halloween, Easter, Lunar New Year). A major drop calendar driver.",
  },
  {
    term: "Anime / Character",
    tag: "aesthetic",
    definition:
      "Inspired by anime, video games, or specific characters. Often involves licensed-style charm work.",
  },
  {
    term: "Galaxy",
    tag: "effect",
    definition:
      "Multiple deep colors marbled together with glitter or holographic pigment for a starfield effect.",
  },
  {
    term: "Ombre / Gradient",
    tag: "effect",
    definition:
      "Smooth color transition across the slime body or container.",
  },
  {
    term: "Layered",
    tag: "effect",
    definition:
      "Distinct color sections stacked or placed side by side in the container.",
  },
  {
    term: "Marbled / Swirled",
    tag: "effect",
    definition:
      "Two or more colors mixed without fully blending, creating ribbon or wave patterns.",
  },
  {
    term: "Speckled",
    tag: "effect",
    definition:
      "Solid base with small contrasting flecks, often achieved with sprinkles or pigment dots.",
  },
];

/** Part Eleven: Sound & ASMR Vocabulary. */
export const SOUND_VOCAB: GlossaryEntry[] = [
  {
    term: "Drizzle",
    tag: "foundation",
    definition:
      "The soft, ribboning sound of slime falling in a thin stream.",
  },
  {
    term: "Sizzle",
    tag: "foundation",
    definition:
      "Fine crackling or hissing as small air pockets release, most associated with icee and cloud cream.",
  },
  {
    term: "Pop",
    tag: "foundation",
    definition:
      "Audible bubble burst when air pockets in thick slime collapse.",
  },
  {
    term: "Crunch",
    tag: "crunch",
    definition:
      "A general term for the sound of bead- or snow-loaded slime being squished or stretched.",
  },
  {
    term: "Wet Crunch",
    tag: "crunch",
    definition:
      "Crunch with audible moisture, often from beaded slimes with heavy clear-glue saturation.",
  },
  {
    term: "Dry Crunch",
    tag: "crunch",
    definition:
      "Crisp, papery crunch typical of snow fizz and bingsu-loaded slimes.",
  },
  {
    term: "Glassy Crunch",
    tag: "crunch",
    definition:
      "Sharp, high-pitched crunch from fishbowl bead slimes.",
  },
  {
    term: "Squish",
    tag: "soft",
    definition:
      "Soft, yielding compression sound from butter, slay, and cloud cream textures.",
  },
  {
    term: "Squelch",
    tag: "soft",
    definition:
      "Wetter version of squish, often from cloud creams and high-moisture slimes.",
  },
  {
    term: "Slosh",
    tag: "soft",
    definition:
      "Liquid-wave sound of water and jiggly slimes when moved in a container.",
  },
  {
    term: "Click / Clicky",
    tag: "movement",
    definition:
      "Repetitive small popping sounds during stretching, a classic of thick & glossy.",
  },
  {
    term: "Cascade",
    tag: "movement",
    definition:
      "The continuous rolling pop as thick slime is poked, with air bubbles collapsing in sequence.",
  },
  {
    term: "Slap",
    tag: "movement",
    definition:
      "Solid, dense impact sound when a thick slime hits a surface.",
  },
  {
    term: "Crack",
    tag: "movement",
    definition:
      "Sharp audible split. The defining sound of wax-cracking slimes.",
  },
  {
    term: "Layered Sounds",
    tag: "hybrid",
    definition:
      "Slimes with multiple texture types (e.g., a beaded butter) produce composite sound profiles that combine elements of each base.",
  },
  {
    term: "Inflation Sound",
    tag: "hybrid",
    definition:
      "The soft hiss and stretch of inflating slime, followed by the burst.",
  },
];

// ─── Part 3: Containers & Packaging ────────────────────────────────────

export interface ContainerEntry {
  name: string;
  description: string;
}

export const CONTAINER_TYPES: ContainerEntry[] = [
  {
    name: "Plastic Deli Container",
    description:
      "Round or square plastic container with a tight-fitting lid. The industry workhorse, durable, airtight, and stackable. Common sizes: 4oz, 6oz, 8oz, 16oz, 32oz.",
  },
  {
    name: "PET Jar",
    description:
      "Clear plastic jar, often with a screw-on lid. Showcases the slime through the container wall and is preferred for visual products like clear, jelly, and avalanche slimes.",
  },
  {
    name: "Glass Jar",
    description:
      "Higher-end packaging used by some boutique shops. Heavier and breakable but offers a premium presentation. Less common due to shipping risk.",
  },
  {
    name: "Squeeze Tube",
    description:
      "Soft plastic tube with a flip-cap or screw lid. Used for runnier textures like water and jiggly slimes that pour rather than scoop.",
  },
  {
    name: "Themed Containers",
    description:
      "Custom-shaped containers designed around a slime theme (bear-shaped, fruit-shaped, or character-shaped vessels). A signature element of premium and themed drops.",
  },
];

export const CONTAINER_SIZES: ContainerEntry[] = [
  {
    name: "4oz",
    description: "Sample or mini size. Common for new shop trials or limited drops.",
  },
  {
    name: "6oz",
    description: "Most common standard size in the U.S. slime market.",
  },
  {
    name: "8oz",
    description: "Larger standard, sometimes called 'full size' depending on the shop.",
  },
  {
    name: "16oz",
    description: "Pint-size, a value or premium offering.",
  },
  {
    name: "32oz",
    description: "Quart-size, bulk or hero product, often used for restock specials.",
  },
];

export const PACKAGING_ADDONS: ContainerEntry[] = [
  {
    name: "Lid Stickers",
    description:
      "Branded or themed stickers applied to the container lid. A primary branding surface and often a collectible element in their own right.",
  },
  {
    name: "Charm Bags",
    description:
      "Small bags of charms or toppings packaged separately from the slime, allowing the buyer to add them at first opening.",
  },
  {
    name: "Scent Boosters",
    description:
      "Separately packaged scent additives (usually a small vial or sachet) that the buyer adds to the slime to refresh or customize the scent.",
  },
  {
    name: "Activator Vials",
    description:
      "Small bottles of activator included with the slime to maintain or restore consistency over time.",
  },
  {
    name: "Inserts & Cards",
    description:
      "Care instruction cards, thank-you notes, and themed paper inserts, significant contributors to the unboxing experience.",
  },
];

// ─── Part 5: Brand Glossary ────────────────────────────────────────────

export interface BrandGlossaryEntry {
  /** Category header. Not a real brand. */
  category?: false;
  name: string;
  /** Optional catalog slug. If present, tile links to /brands/[slug]. */
  slug: string | null;
  oneLiner: string;
  /** Small tag pill above the term (e.g. "product", "drops", "care"). */
  section: string;
}

/**
 * V4.1's Part Five is an industry-terminology glossary, not a shop
 * directory. Each entry describes a piece of slime-industry vocabulary
 * shops and collectors use. The `slug` column stays null for
 * terminology entries and is only populated later when actual brand-name
 * tiles get added.
 */
export const BRAND_GLOSSARY: BrandGlossaryEntry[] = [
  {
    name: "Drizzle",
    slug: null,
    section: "product",
    oneLiner:
      "The thin, ribbon-like stream of slime that falls from a stretch, particularly defining for cloud, cloud cream, and thick & glossy textures. A primary rating dimension.",
  },
  {
    name: "Sizzle",
    slug: null,
    section: "product",
    oneLiner:
      "The fine crackling or hissing sound produced by certain slimes (especially icee and cloud cream) as air pockets release.",
  },
  {
    name: "Pop",
    slug: null,
    section: "product",
    oneLiner:
      "The audible bubble-burst sound made by thick slimes when poked or stretched. Loud, cascading pops are a signature of thick & glossy slimes.",
  },
  {
    name: "Inflate / Inflation",
    slug: null,
    section: "product",
    oneLiner:
      "Blowing air into slime, typically thick & glossy or slithery, to create a balloon-like bubble. A common ASMR play technique.",
  },
  {
    name: "Stretch",
    slug: null,
    section: "product",
    oneLiner:
      "How far a slime extends without breaking. A core texture quality across nearly all base textures.",
  },
  {
    name: "Hold",
    slug: null,
    section: "product",
    oneLiner:
      "Whether a slime maintains its shape or sags. Butter, slay, and thick & glossy slimes are valued for strong hold.",
  },
  {
    name: "Coating",
    slug: null,
    section: "product",
    oneLiner:
      "Contact solution worked into a slime to reduce stickiness. 'Well-coated' is a positive descriptor; 'over-coated' indicates a stiff or rubbery feel.",
  },
  {
    name: "Activation",
    slug: null,
    section: "product",
    oneLiner:
      "The chemical process of cross-linking PVA glue with a borate solution to form slime. 'Under-activated' means sticky; 'over-activated' means stiff and tearing.",
  },
  {
    name: "Cure / Curing",
    slug: null,
    section: "product",
    oneLiner:
      "The resting period after a slime is mixed during which it stabilizes. Shops often cure slimes for hours or days before packaging.",
  },
  {
    name: "ASMR",
    slug: null,
    section: "product",
    oneLiner:
      "Autonomous Sensory Meridian Response, the relaxing or tingling sensation triggered by certain sounds and tactile experiences. A core driver of the slime market.",
  },
  {
    name: "Drop",
    slug: null,
    section: "sales",
    oneLiner:
      "A scheduled product release. Many slime shops operate on a drop model rather than always-in-stock inventory, new products going live at a fixed date and time, often selling out within minutes.",
  },
  {
    name: "Restock",
    slug: null,
    section: "sales",
    oneLiner:
      "Replenishment of a previous product. Distinct from a drop in that the items aren't new releases.",
  },
  {
    name: "Sellout",
    slug: null,
    section: "sales",
    oneLiner:
      "When a drop's inventory is fully purchased. Fast sellouts (under five minutes) are a marker of shop demand and hype.",
  },
  {
    name: "Cart Jacking",
    slug: null,
    section: "sales",
    oneLiner:
      "When a shopper loses an item from their cart because another shopper checks out first. Common during high-demand drops with low inventory.",
  },
  {
    name: "Waitlist",
    slug: null,
    section: "sales",
    oneLiner:
      "A list of buyers notified when a sold-out item or shop opens for the next drop.",
  },
  {
    name: "Mystery Box",
    slug: null,
    section: "sales",
    oneLiner:
      "A surprise selection of slimes assembled by the shop and often offered at a discount per ounce in exchange for the buyer not choosing specific items.",
  },
  {
    name: "Grail",
    slug: null,
    section: "sales",
    oneLiner:
      "A highly sought-after, often retired or hard-to-find slime. Borrowed from sneaker and collectible community vocabulary.",
  },
  {
    name: "Dupe",
    slug: null,
    section: "sales",
    oneLiner:
      "A slime designed to imitate another shop's signature product. Can be a neutral term or critical depending on context.",
  },
  {
    name: "Slime Maker / Slimer",
    slug: null,
    section: "makers",
    oneLiner:
      "A person who makes slime. 'Slimer' is also used for active hobbyists who regularly play with slime without selling it.",
  },
  {
    name: "Shop / Slime Shop",
    slug: null,
    section: "makers",
    oneLiner:
      "A business that sells slime, typically a small-batch, often single-maker operation. Distinct from mass-market slime brands.",
  },
  {
    name: "Indie Shop",
    slug: null,
    section: "makers",
    oneLiner:
      "An independent slime shop, usually maker-owned and small-batch, the dominant business model in the slime-collecting community.",
  },
  {
    name: "Big Three / Major Shops",
    slug: null,
    section: "makers",
    oneLiner:
      "Informal community shorthand for the largest and most influential slime shops. Membership in this group shifts over time and varies by who you ask.",
  },
  {
    name: "Artisan / Boutique",
    slug: null,
    section: "makers",
    oneLiner:
      "Higher-end positioning, often associated with premium pricing, themed collections, and high-effort packaging.",
  },
  {
    name: "Drop Day",
    slug: null,
    section: "makers",
    oneLiner:
      "The specific day of the week or month a shop opens for orders. Often a recurring schedule (e.g., every Friday at 7 pm EST).",
  },
  {
    name: "Preorder",
    slug: null,
    section: "makers",
    oneLiner:
      "An order placed before the slime is made. Allows a shop to gauge demand and produce to order. Usually has a longer fulfillment window.",
  },
  {
    name: "Bubbles",
    slug: null,
    section: "care",
    oneLiner:
      "Air pockets trapped in slime. Working out bubbles, by stretching and folding, is part of standard slime care.",
  },
  {
    name: "Sticky",
    slug: null,
    section: "care",
    oneLiner:
      "Slime that adheres to hands or surfaces. Often resolved by adding activator or letting the slime cure further.",
  },
  {
    name: "Rubbery / Stiff",
    slug: null,
    section: "care",
    oneLiner:
      "Over-activated slime that doesn't stretch smoothly. Generally not recoverable, though lotion or fresh glue can sometimes soften it.",
  },
  {
    name: "Watery / Separated",
    slug: null,
    section: "care",
    oneLiner:
      "Slime that has released water or activator over time, leaving a layer of liquid in the container. Usually fixable by mixing thoroughly.",
  },
  {
    name: "Dried Out",
    slug: null,
    section: "care",
    oneLiner:
      "Slime exposed to air for too long, losing moisture and flexibility. Sometimes recoverable with lotion or warm water; often terminal.",
  },
  {
    name: "Deflated",
    slug: null,
    section: "care",
    oneLiner:
      "Loss of volume in a fluffy or cloud slime as the air structure breaks down. Usually irreversible.",
  },
  {
    name: "Refresh",
    slug: null,
    section: "care",
    oneLiner:
      "Returning a tired slime to its original feel, typically by adding activator, lotion, scent booster, or fresh foam/snow components.",
  },
  {
    name: "Slime Tok",
    slug: null,
    section: "community",
    oneLiner:
      "Slime content on TikTok, a major distribution channel for the community and a primary discovery mechanism for new collectors.",
  },
  {
    name: "Slime Hive",
    slug: null,
    section: "community",
    oneLiner:
      "A long-standing slime community originally credited with naming several texture categories, including slay (2017).",
  },
  {
    name: "PR / PR Package",
    slug: null,
    section: "community",
    oneLiner:
      "Free product sent by a shop to a creator or influencer in exchange for content. A standard part of the slime marketing landscape.",
  },
  {
    name: "Unboxing",
    slug: null,
    section: "community",
    oneLiner:
      "Video or photo content showing the opening of a slime order. A foundational content format for the community and a key driver of shop reputation.",
  },
  {
    name: "Review",
    slug: null,
    section: "community",
    oneLiner:
      "Structured evaluation of a slime, texture, scent, drizzle, packaging, value. SlimeLog formalizes this into a structured rating.",
  },
  {
    name: "Restock Alert",
    slug: null,
    section: "community",
    oneLiner:
      "Notification (push, email, or social post) that a sold-out slime or shop is back in stock or about to open for a drop.",
  },
  {
    name: "Slime ASMRtist",
    slug: null,
    section: "community",
    oneLiner:
      "A creator whose primary content focus is ASMR-driven slime play. Distinct from a slime maker, though many overlap.",
  },
];

// ─── Prose sections (Parts 6, 7, 9, 12) ────────────────────────────────

export interface ProseCallout {
  tone: "info" | "warn" | "note";
  heading: string;
  body: string;
}

export interface ProseSubsection {
  heading: string;
  paragraphs: string[];
  callouts?: ProseCallout[];
}

export interface ProseSection {
  intro: string[];
  subsections: ProseSubsection[];
}

/** Part Six: Care, Storage & Maintenance. */
export const CARE_STORAGE: ProseSection = {
  intro: [
    "Slime is a living material. Even a perfectly mixed batch will change over time, and how it ages depends largely on how it is stored and handled. This section covers the conditions that preserve a slime, the techniques that revive a tired one, and the issues collectors are most likely to encounter.",
  ],
  subsections: [
    {
      heading: "Storage Conditions",
      paragraphs: [
        "Sealed storage. Keep slime in its original airtight container with the lid fully closed when not in use. PET jars and plastic deli containers both seal effectively. Open-air storage is the leading cause of dried slime.",
        "Temperature. Room temperature, roughly 65 to 75 degrees Fahrenheit, is ideal. Cold storage can stiffen slime and cause condensation when re-warmed. Warm storage accelerates scent loss and can cause clear slimes to yellow.",
        "Light. Direct sunlight will fade pigments, accelerate scent breakdown, and degrade clear bases. Store slimes away from windows and out of direct light.",
        "Humidity. High-humidity environments may make slime wetter or stickier over time. Air-conditioned or climate-controlled spaces preserve slime best.",
      ],
    },
    {
      heading: "Lifespan Expectations",
      paragraphs: [
        "A well-stored slime typically maintains its core texture for one to three months and remains playable for six months or longer with periodic refresh. Specific texture types have different lifespans:",
        "Floam, Snow Fizz, and Beaded textures have the longest lifespan. Bead-based bodies hold up well over time.",
        "Butter, Slay, and clay-based textures last several months with light maintenance.",
        "Cloud, Cloud Cream, and Fluffy textures have a shorter peak window. Airy textures break down faster.",
        "Wax and Wax Cracking is a relatively new category. Long-term lifespan is still being established.",
      ],
    },
    {
      heading: "Refresh Techniques",
      paragraphs: [
        "Adding activator. For slime that has become wet, sticky, or watery, a small amount of activator (contact solution or borax solution) kneaded back into the slime will firm it up. Add in small increments to avoid over-activation.",
        "Adding lotion. For slime that has become stiff or rubbery, unscented lotion can soften and restore stretch. Adding lotion will affect the original scent.",
        "Adding glue. For slime that has dried significantly or become crumbly, a small addition of fresh glue can sometimes restore it. This works best for clay and butter-based textures.",
        "Adding foam or snow. Fluffy and cloud slimes that have deflated may be partially refreshed by adding fresh shaving foam or rehydrated snow powder. Results are mixed; the original peak texture cannot usually be fully restored.",
        "Scent boosters. Faded scent can be refreshed with a small amount of fragrance oil or a packaged scent booster. Mix in fully to avoid pockets of concentrated scent.",
      ],
      callouts: [
        {
          tone: "info",
          heading: "Activator balance",
          body: "Sticky means under-activated, rubbery means over-activated. Add activator one drop at a time. You can always add more, you can never take it back.",
        },
      ],
    },
    {
      heading: "Common Condition Issues",
      paragraphs: [
        "Sweating. Liquid pooling on the surface or sides of the container. Usually caused by temperature changes or over-activation. Mix the liquid back in or drain off and re-activate.",
        "Color bleeding. Pigment migrating between layers in multi-color slimes. Usually permanent.",
        "Yellowing. Clear slimes turning yellow with age, light exposure, or heat. Cosmetic only and does not affect texture.",
        "Crumbling. Loss of cohesion, often from drying out or over-activation. Sometimes recoverable with lotion or fresh glue.",
        "Bead sinking. In bead-loaded slimes, beads settling toward the bottom of the container. Mix thoroughly to redistribute.",
      ],
    },
  ],
};

/** Part Seven: Safety & Allergies. */
export const SAFETY: ProseSection = {
  intro: [
    "Slime is generally safe for most users when handled properly, but several ingredients can cause sensitivity or reactions. Shops and collectors should be aware of common concerns, and shop policies should make allergens and recommended age ranges clear at the point of sale.",
  ],
  subsections: [
    {
      heading: "Borate Sensitivity",
      paragraphs: [
        "The activators used to make slime (borax, contact solution, boric acid) all contain borate compounds. Most users tolerate these without issue, but borates can cause skin irritation in sensitive individuals, particularly with prolonged or repeated contact. Symptoms include redness, dryness, or rash on the hands.",
        "Properly activated slime is significantly less reactive than the raw activator. Sticky, under-activated slime contains more free activator and is more likely to cause irritation.",
      ],
    },
    {
      heading: "Glue and Fragrance Allergies",
      paragraphs: [
        "PVA glue is the standard slime base and is generally well tolerated. Some users may have sensitivities to specific glue formulations or to additives in proprietary blends.",
        "Heavily scented slimes can trigger reactions in users with fragrance sensitivities, including headaches, respiratory irritation, or skin reactions. Unscented options are widely available and should be considered for users with known fragrance sensitivities.",
      ],
    },
    {
      heading: "Latex Considerations",
      paragraphs: [
        "Some slime ingredients, particularly certain types of foam and clay, may contain latex or be processed with latex-containing materials. Users with latex allergies should confirm with the maker before purchase.",
      ],
    },
    {
      heading: "Age Recommendations",
      paragraphs: [
        "Slime is generally recommended for users ages 5 and up due to small parts (charms, beads) and the risk of ingestion. Younger children should be supervised. Slime is not a food product and should never be eaten, regardless of how realistic its scent or appearance.",
      ],
      callouts: [
        {
          tone: "warn",
          heading: "Kid safety",
          body: "Not for under-3s or anyone who mouths objects. Wash hands after play. Stop use if skin gets red or irritated.",
        },
      ],
    },
    {
      heading: "Eye, Skin, and Pet Safety",
      paragraphs: [
        "Eye contact. Slime that contacts the eyes can cause significant irritation. Rinse thoroughly with water and seek medical attention if irritation persists.",
        "Pet safety. Slime is not safe for pets. Boric acid and borax are toxic to dogs, cats, and other animals. Store slime out of reach.",
        "Surface care. Slime can stain or damage some surfaces, particularly fabrics, carpets, and unfinished wood. Play on a hard, smooth, washable surface. For slime stuck on fabric, vinegar or rubbing alcohol can break down the polymer; consult fabric care instructions before treatment.",
      ],
    },
  ],
};

/** Part Nine: Shipping & Handling. */
export const SHIPPING: ProseSection = {
  intro: [
    "Slime is sensitive to temperature extremes. Shipping introduces several conditions that can degrade or destroy a product before it reaches the buyer, so shop policies and seasonal considerations are an important part of the buying experience.",
  ],
  subsections: [
    {
      heading: "Temperature Risks",
      paragraphs: [
        "Heat. Slime exposed to high temperatures (above 85 degrees Fahrenheit) can melt, separate, or become runny. Wax and butter slimes are particularly vulnerable. Color bleeding is also more likely in heat.",
        "Cold. Slime exposed to freezing temperatures can stiffen, crack, or develop permanent texture damage. Clear slimes may cloud. Water-based slimes can separate and may not fully recover.",
      ],
    },
    {
      heading: "Shipping Add-ons",
      paragraphs: [
        "Heat pack. A small, reusable warming pack included with cold-weather shipments. Buyers usually need to opt in and may pay an additional fee.",
        "Ice pack. A small, reusable cooling pack included with warm-weather shipments. Less common than heat packs since cold packs can themselves cause condensation issues.",
        "Insulation. Foam liners, bubble mailers, or insulated boxes used to buffer the contents from ambient temperature.",
      ],
    },
    {
      heading: "Seasonal Holds",
      paragraphs: [
        "Many shops implement summer holds (typically June through August), during which shipping is paused or delayed during heat waves. Some shops will ship without holds at the buyer's risk; others will not ship at all when forecasts exceed a threshold. Holds are typically announced at checkout.",
      ],
    },
    {
      heading: "Damage and Replacement Policy",
      paragraphs: [
        "Shop policies vary on shipping damage. Standard practices include a photo-required claim window (usually within 24 to 48 hours of delivery), replacement, refund, or store credit for confirmed shipping damage, and no coverage for damage caused by the buyer choosing to skip a heat or ice pack.",
      ],
    },
    {
      heading: "International Shipping",
      paragraphs: [
        "International orders may face customs delays during which slime can be held in non-climate-controlled facilities. Buyers in extreme climates should weigh this risk and confirm whether the shop offers climate protection on international routes.",
      ],
    },
  ],
};

// [T32d 2026-07-13] `RATING_FRAMEWORK` retired. Part 12 of the guide now
// indexes the six axes defined in `apps/web/app/how-to-rate/content.ts`
// instead of duplicating a competing 9-dimension / 10-point prose block.
// The full rating breakdown lives on /how-to-rate — the guide points to
// it so there's a single source of truth for the rating model.

// ─── Part 8: Pricing, Sizing & Value ───────────────────────────────────

export interface PricingBand {
  size: string;
  typicalPrice: string;
  notes: string;
}

export const PRICING_BANDS: PricingBand[] = [
  {
    size: "Sample · 4oz",
    typicalPrice: "$8–12",
    notes: "New shop trials, drop teasers, limited runs.",
  },
  {
    size: "Standard · 6oz",
    typicalPrice: "$12–18",
    notes: "The most common U.S. size. Best value per ounce.",
  },
  {
    size: "Full · 8oz",
    typicalPrice: "$16–24",
    notes: "A larger standard offering, sometimes called 'full size'.",
  },
  {
    size: "Pint · 16oz",
    typicalPrice: "$28–45",
    notes: "Value or premium offering. Ships heavier.",
  },
  {
    size: "Quart · 32oz",
    typicalPrice: "$50–90",
    notes: "Bulk or hero product, often restock specials.",
  },
];

export const PRICING_DRIVERS: string[] = [
  "Container size. Smaller containers typically have higher per-ounce pricing due to fixed packaging and shipping costs.",
  "Ingredients. Premium ingredients (specialty pigments, imported clays, designer charms, artisan fragrance oils) raise pricing.",
  "Charms and add-ins. Heavy charm loadouts, multiple bead types, or scent boosters increase product cost.",
  "Packaging. Themed containers, custom labels, branded inserts, and high-effort presentation contribute to premium pricing.",
  "Shop reputation. Established shops with high demand can command premium prices independent of ingredient cost.",
  "Limited drops. Limited-edition or grail-tier items may carry significant markup, particularly on resale.",
];

export const VALUE_INDICATORS: string[] = [
  "Slime-to-charm ratio (charms add to price but reduce playable slime volume).",
  "Container fill level (some shops fill above the listed weight, others at or below).",
  "Inclusion quality (premium beads and real polymer clay sprinkles versus generic equivalents).",
  "Refresh kit inclusion (activator vials and scent boosters add ongoing value).",
  "Whether shipping is included or charged separately.",
];

export const PRICING_RESALE_NOTE =
  "A secondary resale market exists for sold-out and grail slimes, primarily through Instagram, Mercari, and Depop. Resale prices can run several times the original retail price. SlimeLog reviews focus on retail purchases and do not validate resale pricing.";

// ─── Part meta (used by nav + TOC) ─────────────────────────────────────

export interface GuidePart {
  n: number;
  id: string;
  slug: string;
  shortTitle: string;
  fullTitle: string;
  tagline: string;
}

export const PARTS: GuidePart[] = [
  {
    n: 1,
    id: "part-1",
    slug: "base-textures",
    shortTitle: "Base Textures",
    fullTitle: "Base Textures",
    tagline: "The foundation of every slime. Tap a card for the full definition, notes, and community logs.",
  },
  {
    n: 2,
    id: "part-2",
    slug: "add-ins",
    shortTitle: "Add-ins",
    fullTitle: "Add-ins & Inclusions",
    tagline: "The extras mixed in for texture, sound, visual interest, and theme.",
  },
  {
    n: 3,
    id: "part-3",
    slug: "containers",
    shortTitle: "Containers",
    fullTitle: "Containers & Packaging",
    tagline: "The container is part of the product. Storage, freshness, presentation, unboxing.",
  },
  {
    n: 4,
    id: "part-4",
    slug: "scents",
    shortTitle: "Scents",
    fullTitle: "Scents",
    tagline: "Scent families, strengths, and how they age.",
  },
  {
    n: 5,
    id: "part-5",
    slug: "brand-glossary",
    shortTitle: "Brand Glossary",
    fullTitle: "Brand Glossary",
    tagline: "Slime industry vocabulary. Product, sales, makers, care, community.",
  },
  {
    n: 6,
    id: "part-6",
    slug: "care-storage",
    shortTitle: "Care",
    fullTitle: "Care, Storage & Maintenance",
    tagline: "Slime is a living material. Keep it alive.",
  },
  {
    n: 7,
    id: "part-7",
    slug: "safety",
    shortTitle: "Safety",
    fullTitle: "Safety & Allergies",
    tagline: "Safety first. Read before you make or gift.",
  },
  {
    n: 8,
    id: "part-8",
    slug: "pricing",
    shortTitle: "Pricing",
    fullTitle: "Pricing, Sizing & Value",
    tagline: "Typical size and price bands, and what earns a premium.",
  },
  {
    n: 9,
    id: "part-9",
    slug: "shipping",
    shortTitle: "Shipping",
    fullTitle: "Shipping & Handling",
    tagline: "Slime is temperature-sensitive. Handle with care.",
  },
  {
    n: 10,
    id: "part-10",
    slug: "aesthetic",
    shortTitle: "Aesthetic",
    fullTitle: "Color, Theme & Aesthetic Vocabulary",
    tagline: "The look language collectors use.",
  },
  {
    n: 11,
    id: "part-11",
    slug: "sound",
    shortTitle: "Sound",
    fullTitle: "Sound & ASMR Vocabulary",
    tagline: "The sounds a slime makes, and what to call them.",
  },
  {
    n: 12,
    id: "part-12",
    slug: "rating",
    shortTitle: "Rating",
    fullTitle: "The SlimeLog Rating Framework",
    tagline: "How every log gets scored. Full breakdown at /how-to-rate.",
  },
];
