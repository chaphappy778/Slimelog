// apps/web/app/how-to-rate/content.ts
// T32e (2026-07-13): Structured content module for /how-to-rate. Six
// rating axes + The Scale + PARTS meta consumed by the sticky pill nav
// and TOC drawer. All copy is Design's approved mockup, em-dash-free
// per SlimeLog house rule. Do NOT rewrite this in-place; edit at the
// source doc first.

// ─── Axes ──────────────────────────────────────────────────────────────

export interface RatingAxis {
  /** URL slug and section anchor id. Deep-links resolve on hash-on-load. */
  slug: string;
  /** Two-digit ordinal for the eyebrow + hero badge ("01", "02", ...). */
  displayN: string;
  /** Display name for the section header and hero card. */
  name: string;
  /** One-line punch under the section header. */
  tagline: string;
  /** Full prose definition, 1-2 sentences. */
  definition: string;
  /** Bullet list under "What to look for". */
  whatToLookFor: string[];
  /** Copy for the LOW row of the score examples split. */
  exampleLow: string;
  /** Copy for the HIGH row of the score examples split. */
  exampleHigh: string;
  /** Optional magenta callout for gotchas at the bottom of the section. */
  note: string | null;
  /** Linear-gradient start hex for the hero card backdrop. */
  gradientFrom: string;
  /** Linear-gradient end hex for the hero card backdrop. */
  gradientTo: string;
  /** Single-color accent hex (chrome: numbers, ticks, icon, glows). */
  accentColor: string;
  /**
   * Optional multi-stop gradient used for the axis-name TEXT only.
   * When set, the section header + hero name render as gradient text
   * instead of solid `accentColor`. Used for "Overall" per Design.
   */
  accentGradient?: string;
  /** Pre-baked rgba() glow for the radial overlay on the hero card. */
  accentGlow: string;
  /** Pre-baked rgba() border color for the hero card. */
  accentBorder: string;
}

export const RATING_AXES: RatingAxis[] = [
  {
    slug: "texture",
    displayN: "01",
    name: "Texture",
    tagline: "How well it expresses its claimed base.",
    definition:
      "Texture is the foundation of every slime rating. It measures how well the slime expresses its claimed base. A butter should feel like butter, a cloud should drizzle, a thick and glossy should cascade with loud pops.",
    whatToLookFor: [
      "Does it match the advertised base type?",
      "Is it properly activated, not too sticky, not too stiff?",
      "Is the consistency even throughout?",
      "Does it hold up through a full play session?",
    ],
    exampleLow:
      "Sticky, over-activated, or nothing like the advertised texture.",
    exampleHigh:
      "Perfectly expresses its base type from first touch to last stretch.",
    note: "Rate texture against what the slime claims to be, not against your favorite base. A great cloud and a great butter feel nothing alike.",
    gradientFrom: "#0d2b1a",
    gradientTo: "#1a4d2e",
    accentColor: "#39FF14",
    accentGlow: "rgba(57,255,20,0.34)",
    accentBorder: "rgba(57,255,20,0.35)",
  },
  {
    slug: "sound",
    displayN: "02",
    name: "Sound / ASMR",
    tagline: "The clicks, crunches, and wet snaps.",
    definition:
      "Sound is one of the primary drivers of the slime market. It covers the clicks, crunches, sizzles, and wet snaps a slime makes when you poke, fold, and stretch it. For a lot of collectors, this is the whole point.",
    whatToLookFor: [
      "Does it make a satisfying sound at all?",
      "Is the sound clean and crisp, not muddy?",
      "Does the sound match the base type it claims?",
      "Is it consistent across a full play session?",
    ],
    exampleLow:
      "Silent or muddy. No satisfying pops, clicks, or crunch.",
    exampleHigh:
      "Loud, clean, crave-worthy. The kind you replay with headphones on.",
    note: "Record in a quiet room before you score. Ambient noise can mask a slime that actually sounds great.",
    gradientFrom: "#0a2540",
    gradientTo: "#0e3d5e",
    accentColor: "#00F0FF",
    accentGlow: "rgba(0,240,255,0.34)",
    accentBorder: "rgba(0,240,255,0.35)",
  },
  {
    slug: "aesthetic",
    displayN: "03",
    name: "Aesthetic",
    tagline: "Visual appeal, color story, and the drizzle.",
    definition:
      "Aesthetic is the visual story. Color, presentation, and the drizzle itself. It is how the slime looks before you ever touch it, and how it reads on camera after.",
    whatToLookFor: [
      "Is the color story intentional and cohesive?",
      "Is the drizzle clean and well placed?",
      "Do add-ins feel curated, not dumped in?",
      "Does it photograph the way it looks in person?",
    ],
    exampleLow:
      "Muddy colors, messy drizzle, or a look that fights itself.",
    exampleHigh:
      "A cohesive color story with drizzle you want to frame.",
    note: null,
    gradientFrom: "#2b072b",
    gradientTo: "#4a0e4a",
    accentColor: "#FF00E5",
    accentGlow: "rgba(255,0,229,0.34)",
    accentBorder: "rgba(255,0,229,0.38)",
  },
  {
    slug: "creativity",
    displayN: "04",
    name: "Creativity",
    tagline: "Theme, concept, and execution.",
    definition:
      "Creativity is theme, concept, and execution. It is what makes a slime feel like a made thing instead of a base with dye stirred in. The idea, and how well the maker pulled it off.",
    whatToLookFor: [
      "Is there a clear theme or concept?",
      "Does the execution deliver on the idea?",
      "Are the choices intentional, not random?",
      "Have you seen this a hundred times, or does it surprise you?",
    ],
    exampleLow: "Generic. A plain base with no idea behind it.",
    exampleHigh:
      "A clear concept, executed with intent. Something you remember.",
    note: null,
    gradientFrom: "#332305",
    gradientTo: "#4d3a10",
    accentColor: "#FFD24A",
    accentGlow: "rgba(255,210,74,0.34)",
    accentBorder: "rgba(255,210,74,0.36)",
  },
  {
    slug: "quality",
    displayN: "05",
    name: "Quality",
    tagline: "Build, finish, and how it holds up.",
    definition:
      "Quality is the overall build and finish. Was it made with care, and does it hold up through a full play session? This is the axis that separates a hobby batch from a real product.",
    whatToLookFor: [
      "Does it stay consistent after ten minutes of play?",
      "Is it free of grit, dry spots, and separation?",
      "Is the tub filled honestly?",
      "Did it arrive fresh, not months old?",
    ],
    exampleLow: "Falls apart, dries out, or arrives past its prime.",
    exampleHigh:
      "Holds its texture and finish from the first stretch to the last.",
    note: null,
    gradientFrom: "#1e0f3d",
    gradientTo: "#2f1a5c",
    accentColor: "#8B5CF6",
    accentGlow: "rgba(139,92,246,0.34)",
    accentBorder: "rgba(139,92,246,0.38)",
  },
  {
    slug: "overall",
    displayN: "06",
    name: "Overall",
    tagline: "The final verdict. Your one-number take.",
    definition:
      "Overall is the final verdict. Your one-number take on the slime as a whole. It is not an average of the other five, it is your honest gut call after actually playing with it.",
    whatToLookFor: [
      "Would you buy it again?",
      "Would you recommend it to a friend?",
      "Did it deliver on what the brand promised?",
      "How did it feel as a complete experience?",
    ],
    exampleLow: "Regret the purchase. Would not buy again.",
    exampleHigh: "An instant favorite. Already restocking.",
    note: "All six axes carry equal weight in the score, but Overall is still your own call. A slime can nail five axes and still miss the mark for you.",
    gradientFrom: "#0a2540",
    gradientTo: "#1a4d2e",
    // Cyan chrome for the "06" number badge, tick icon, glow. The axis
    // name TEXT renders as a green→cyan gradient (accentGradient below).
    accentColor: "#00F0FF",
    accentGradient: "linear-gradient(135deg, #39FF14, #00F0FF)",
    accentGlow: "rgba(57,255,20,0.30)",
    accentBorder: "rgba(0,240,255,0.35)",
  },
];

// ─── The Scale ────────────────────────────────────────────────────────

export interface ScaleBand {
  /** 1..5 */
  n: number;
  /** Rendered star row, e.g. "★★★☆☆". */
  stars: string;
  /** Band name (Skip, Under, Solid, Great, Elite). */
  name: string;
  /** Short prose describing what that band actually looks like. */
  copy: string;
  /** Accent color for the number badge + stars. */
  accentColor: string;
}

export const SCALE_BANDS: ScaleBand[] = [
  {
    n: 1,
    stars: "★☆☆☆☆",
    name: "Skip",
    copy: "Broken, wrong, or so off from what it claimed you would not touch it again.",
    accentColor: "#FF3D6E",
  },
  {
    n: 2,
    stars: "★★☆☆☆",
    name: "Under",
    copy: "It works, but something is off. Rushed, cheap, or misses on multiple axes.",
    accentColor: "#FFAE3B",
  },
  {
    n: 3,
    stars: "★★★☆☆",
    name: "Solid",
    copy: "Good. Delivered on what the brand promised. A safe reorder.",
    accentColor: "#00F0FF",
  },
  {
    n: 4,
    stars: "★★★★☆",
    name: "Great",
    copy: "Better than expected across most axes. You would recommend it.",
    accentColor: "#7BFF7B",
  },
  {
    n: 5,
    stars: "★★★★★",
    name: "Elite",
    copy: "Genuinely rare. Flawless across all six axes. A slime you talk about.",
    accentColor: "#39FF14",
  },
];

// ─── Part meta (used by nav + TOC) ─────────────────────────────────────

export interface HowToRatePart {
  /** DOM id and hash fragment. Matches axis.slug for the six axes, plus
   *  "the-scale" for the final section. */
  id: string;
  /** 1..7 ordinal for the pill row and TOC list. */
  n: number;
  /** Compact label for the pill row (must fit inline). */
  shortTitle: string;
  /** Full label for the TOC drawer (has more room). */
  fullTitle: string;
}

export const PARTS: HowToRatePart[] = [
  { id: "texture", n: 1, shortTitle: "Texture", fullTitle: "Texture" },
  { id: "sound", n: 2, shortTitle: "Sound", fullTitle: "Sound / ASMR" },
  { id: "aesthetic", n: 3, shortTitle: "Aesthetic", fullTitle: "Aesthetic" },
  {
    id: "creativity",
    n: 4,
    shortTitle: "Creativity",
    fullTitle: "Creativity",
  },
  { id: "quality", n: 5, shortTitle: "Quality", fullTitle: "Quality" },
  { id: "overall", n: 6, shortTitle: "Overall", fullTitle: "Overall" },
  {
    id: "the-scale",
    n: 7,
    shortTitle: "The Scale",
    fullTitle: "The Scale",
  },
];
