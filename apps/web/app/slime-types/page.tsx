// apps/web/app/slime-types/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";

interface SlimeType {
  slug: string;
  name: string;
  tagline: string;
  definition: string;
  note: string;
  variants: string[];
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

const SLIME_TYPES: SlimeType[] = [
  {
    slug: "clear",
    name: "Clear",
    tagline: "The gems of the slime world",
    definition:
      "Seemingly basic but full of beauty, clear slimes are the gems of the slime world. Often clear slimes are coated, which means some amount of contact solution has been incorporated into the recipe, making the slime less sticky and easier to handle.",
    note: "You will often find clear slimes as the metaphorical glue that holds many bead bombs together.",
    variants: [
      "Glossy",
      "Holographic",
      "Pearl",
      "Metallic",
      "Galaxy",
      "Thermochromic",
      "Glow in the Dark",
    ],
    gradientFrom: "#0A0A0A",
    gradientTo: "#1a1a2e",
    accentColor: "#00F0FF",
  },
  {
    slug: "water",
    name: "Water",
    tagline: "Thin, jiggly, endlessly satisfying",
    definition:
      "A white or clear glue slime that may use a thinner than regular clear glue in the base, as well as having a high ratio of water to glue. This results in a thin, jiggly slime that easily slips out of containers and hands.",
    note: "Water slimes are unique in their density and movement; the techniques used to create ASMR in other slimes do not work the same on this texture.",
    variants: ["Jiggly", "Jelly Cube", "Jelly Puff"],
    gradientFrom: "#001a3a",
    gradientTo: "#003366",
    accentColor: "#00F0FF",
  },
  {
    slug: "jelly",
    name: "Jelly",
    tagline: "Wobbly, bouncy, and endlessly fun",
    definition:
      "Usually a clear glue slime with a small amount of instant snow powder. This powder may be added dry, hydrated, or over-hydrated, producing dry, regular, and juicy jelly textures.",
    note: "White glue jellies are made using the same methods as above, but the end result is usually plush and velvet-like.",
    variants: ["Jelly Cube", "Jelly Puff", "Thiggly"],
    gradientFrom: "#0d2b1a",
    gradientTo: "#1a4d2e",
    accentColor: "#39FF14",
  },
  {
    slug: "icee",
    name: "Icee",
    tagline: "That signature sizzle and crunch",
    definition:
      "Named after the drink of the same name, icee slimes contain a higher ratio of instant snow powder than jelly slimes. A higher ratio of water is also used in making the snow, allowing the base slime to retain moisture and give the icee slime its characteristic sizzle.",
    note: "As this slime contains a moderate level of instant snow, it may cause snow residue to come out on hands and play surfaces during play.",
    variants: ["Slushee"],
    gradientFrom: "#001833",
    gradientTo: "#0033aa",
    accentColor: "#00F0FF",
  },
  {
    slug: "thick_and_glossy",
    name: "Thick & Glossy",
    tagline: "Loud pops and mirror-like shine",
    definition:
      "A white glue slime thickened with a variety of other materials, including thick opaque glues, stabilizers, and other proprietary ingredients. Known for its density, glossiness, and loud cascading pops.",
    note: "One of the best textures for loud and satisfying pops, poking, stretching, and inflating.",
    variants: ["Thicky", "Glossy"],
    gradientFrom: "#1a0a2e",
    gradientTo: "#2D0A4E",
    accentColor: "#FF00E5",
  },
  {
    slug: "slay",
    name: "Slay",
    tagline: "Soft, luscious, and wonderfully stretchy",
    definition:
      "A portmanteau of slight and clay, this texture combines the best aspects of a thick and glossy and a butter slime. It is soft, luscious, and provides wonderful stretches and pops. Term first used by The Slime Hive in 2017.",
    note: "Slays can vary in the amount of clay used, but generally clay comprises 25% or less of the total slime.",
    variants: ["Sally Butter", "Custard", "Cream Cheese", "Nougat"],
    gradientFrom: "#2a1a0a",
    gradientTo: "#4d3319",
    accentColor: "#FFB800",
  },
  {
    slug: "butter",
    name: "Butter",
    tagline: "Beginner-friendly, dense, and plush",
    definition:
      "One of the most friendly textures for slime beginners, butter slimes are dense, soft, and plush. In general, butter slimes are composed of at least 50% air dry clay.",
    note: "Many clay DIY slimes turn into butter slimes once fully mixed.",
    variants: ["Clay", "Sally Butter", "Mochi"],
    gradientFrom: "#2e2000",
    gradientTo: "#4a3500",
    accentColor: "#FFB800",
  },
  {
    slug: "cloud",
    name: "Cloud",
    tagline: "Airy drizzle and pillowy softness",
    definition:
      "The airiest and lightest of textures, this slime achieves its signature drizzle through a high ratio of instant snow powder in a white glue base. Cloud slimes are dry, quiet, and fluffy.",
    note: "Clouds require lots of stretching to incorporate the air needed to make the classic drizzle, so patience is key.",
    variants: ["Cloud Fizz", "Cloud Dough", "Mousse Fizz", "Chiffon Fizz"],
    gradientFrom: "#1a1a2e",
    gradientTo: "#2e2e4a",
    accentColor: "#00F0FF",
  },
  {
    slug: "cloud_cream",
    name: "Cloud Cream",
    tagline: "Dense, airy, and impossibly soft",
    definition:
      "Soft yet substantial, dense yet airy, cloud creams are in a lofty level of their own. This texture achieves its distinct softness and sizzle from a heavy amount of instant snow powder, with no air dry clay.",
    note: "Snowbutter slimes made with clear glue instead of white glue are often referred to as mochi.",
    variants: ["Mochi", "Putty Puff"],
    gradientFrom: "#0d1a2e",
    gradientTo: "#1a2e4a",
    accentColor: "#00F0FF",
  },
  {
    slug: "fluffy",
    name: "Fluffy",
    tagline: "Marshmallowy hand feel, pillowy stretch",
    definition:
      "A white glue slime made airy and pillowy through the addition of shaving foam. Fluffy slimes are stretchy, soft, and have a marshmallowy hand feel.",
    note: "Fluffy slime tends to deflate over time as the shaving foam breaks down — texture peaks within the first few hours of mixing.",
    variants: ["Cloud", "Cloud Cream"],
    gradientFrom: "#1a0a2e",
    gradientTo: "#330d4a",
    accentColor: "#CC44FF",
  },
  {
    slug: "floam",
    name: "Floam",
    tagline: "Crunchy, beady, endlessly satisfying",
    definition:
      "A glue-based slime loaded with foam beads, producing a crunchy, beady texture. The bead density is a defining feature.",
    note: "Floam slimes can range from lightly beaded to fully bead-saturated, dramatically changing the sound and feel.",
    variants: ["Float", "Crunchy", "Bead Bomb"],
    gradientFrom: "#0d2e1a",
    gradientTo: "#1a4a2e",
    accentColor: "#39FF14",
  },
  {
    slug: "snow_fizz",
    name: "Snow Fizz",
    tagline: "The loudest crunch in the slime world",
    definition:
      "A very thick, very crunchy texture made with plastic snow (instant snow that retains a crisper, drier structure). Known for its loud, satisfying crunch and sizzle.",
    note: "Snow Fizz is among the loudest slimes by volume — often the go-to for ASMR-focused makers.",
    variants: ["Crunchy", "Bingsu"],
    gradientFrom: "#001a2e",
    gradientTo: "#003355",
    accentColor: "#00F0FF",
  },
  {
    slug: "beaded",
    name: "Beaded",
    tagline: "Maximum crunch, maximum texture",
    definition:
      "A slime whose defining characteristic is the inclusion of bingsu or fishbowl beads, producing maximum crunch and a distinctly beady mouthfeel.",
    note: "Bead type and bead size are key rating factors — different beads produce dramatically different sounds and tactile experiences.",
    variants: ["Fishbowl Beads", "Bead Bomb", "Micro Dough"],
    gradientFrom: "#1a0a0a",
    gradientTo: "#3a1a1a",
    accentColor: "#FF00E5",
  },
  {
    slug: "clay",
    name: "Clay",
    tagline: "Smooth, soft, and endlessly moldable",
    definition:
      "A soft clay base producing smooth, soft, thick slime. Clay slimes are often the foundation for butter and slay textures.",
    note: "Pure clay slimes are less common as a finished product than as a building block for hybrid textures.",
    variants: [
      "Butter",
      "Slay",
      "Mochi",
      "Sally Butter",
      "Custard",
      "Cream Cheese",
      "Nougat",
    ],
    gradientFrom: "#2e1a00",
    gradientTo: "#4a2e00",
    accentColor: "#FFB800",
  },
  {
    slug: "avalanche",
    name: "Avalanche",
    tagline: "Watch it slowly sink and swirl",
    definition:
      "A clear base topped with a thicker slime layer that slowly sinks through the clear, creating a landscape-like visual effect.",
    note: "Avalanche is a presentation-driven texture — visual impact at the moment of unboxing or first poke is the primary appeal.",
    variants: ["Sinking Slime", "Iceberg"],
    gradientFrom: "#001a1a",
    gradientTo: "#003333",
    accentColor: "#00F0FF",
  },
  {
    slug: "magnetic",
    name: "Magnetic",
    tagline: "Iron-infused and magnet-reactive",
    definition:
      "A slime infused with iron filings that reacts to magnets. The slime visibly stretches, pulls, or absorbs a magnet placed near or on it.",
    note: "Magnetic slimes are usually clear or thick and glossy bases, since the iron must be visibly suspended.",
    variants: [],
    gradientFrom: "#0a0a0a",
    gradientTo: "#1a1a1a",
    accentColor: "#888888",
  },
  {
    slug: "wax",
    name: "Wax",
    tagline: "Smooth pull with a satisfying crack",
    definition:
      "Wax slimes are wax-based compounds with a distinctive smooth, waxy pull. Wax cracking slimes blend wax with polymer for a satisfying audible crack on stretch.",
    note: "Wax-based slimes are a relatively recent category and behave very differently from traditional PVA-based slime — they may not stretch indefinitely.",
    variants: ["Wax Cracking"],
    gradientFrom: "#1a1500",
    gradientTo: "#2e2500",
    accentColor: "#FFB800",
  },
  {
    slug: "sand",
    name: "Sand",
    tagline: "Grainy, moldable, satisfying crumble",
    definition:
      "A kinetic sand base producing a grainy, moldable texture with a satisfying crumble.",
    note: "Sand slimes blur the line between slime and kinetic sand — some collectors do not consider these true slimes.",
    variants: [],
    gradientFrom: "#2e2200",
    gradientTo: "#4a3800",
    accentColor: "#FFB800",
  },
  {
    slug: "sugar_scrub",
    name: "Sugar Scrub",
    tagline: "Gritty, scented, and crossover-worthy",
    definition:
      "A glue-based slime with sugar granules added for a gritty, exfoliating tactile feel. Often heavily scented.",
    note: "Scent is a major factor in sugar scrub appeal — these are often crossover items between slime collecting and bath/body products.",
    variants: [],
    gradientFrom: "#2e0a1a",
    gradientTo: "#4a1a2e",
    accentColor: "#FF00E5",
  },
  {
    slug: "hybrid",
    name: "Hybrid",
    tagline: "Two textures, one spectacular result",
    definition:
      "A slime that combines two or more base textures — for example, a butter-cloud or a clear-jelly-cloud combination.",
    note: "Hybrid is a catch-all category. When a slime fits cleanly into a single base, log it under that base instead.",
    variants: [],
    gradientFrom: "#1a0a2e",
    gradientTo: "#2e1a4a",
    accentColor: "#CC44FF",
  },
];

function BlobDecoration({
  variant,
  accentColor,
}: {
  variant: number;
  accentColor: string;
}) {
  if (variant === 0) {
    return (
      <svg
        viewBox="0 0 100 140"
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "70%",
          opacity: 0.15,
          color: accentColor,
          pointerEvents: "none",
        }}
      >
        <path
          d="M50,10 C70,10 85,25 85,50 C85,75 70,90 50,120 C30,90 15,75 15,50 C15,25 30,10 50,10 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (variant === 1) {
    return (
      <svg
        viewBox="0 0 120 80"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "30%",
          left: "10%",
          width: "80%",
          opacity: 0.15,
          color: accentColor,
          pointerEvents: "none",
        }}
      >
        <ellipse cx="60" cy="50" rx="50" ry="30" fill="currentColor" />
        <ellipse cx="40" cy="40" rx="30" ry="22" fill="currentColor" />
        <ellipse cx="80" cy="38" rx="25" ry="20" fill="currentColor" />
      </svg>
    );
  }
  if (variant === 2) {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "20%",
          left: "15%",
          width: "70%",
          opacity: 0.15,
          color: accentColor,
          pointerEvents: "none",
        }}
      >
        <path
          d="M50,5 C60,20 80,15 85,30 C90,45 78,55 85,70 C92,85 75,92 60,88 C45,84 40,95 25,88 C10,81 15,65 8,52 C1,39 15,28 20,15 C25,2 40,-10 50,5 Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 120 60"
      aria-hidden="true"
      style={{
        position: "absolute",
        bottom: "20%",
        left: 0,
        width: "100%",
        opacity: 0.15,
        color: accentColor,
        pointerEvents: "none",
      }}
    >
      <path
        d="M0,30 C20,10 40,50 60,30 C80,10 100,50 120,30 L120,60 L0,60 Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SlimeTypeCard({
  type,
  index,
  onTap,
}: {
  type: SlimeType;
  index: number;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`Learn about ${type.name} slime`}
      style={{
        minWidth: "85vw",
        width: "85vw",
        height: "70vh",
        scrollSnapAlign: "center",
        borderRadius: 16,
        background: `linear-gradient(135deg, ${type.gradientFrom}, ${type.gradientTo})`,
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        flexShrink: 0,
        border: "1px solid rgba(255,255,255,0.06)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
      }}
      className="active:scale-[0.97] transition-transform duration-100"
    >
      {/* Decorative blob */}
      <BlobDecoration variant={index % 4} accentColor={type.accentColor} />

      {/* Vertical type name right side */}
      <div
        style={{
          position: "absolute",
          right: 10,
          top: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
        }}
      >
        <span
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
            fontSize: 42,
            fontWeight: 900,
            fontFamily: "Montserrat, sans-serif",
            color: type.accentColor,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textShadow: `0 0 20px ${type.accentColor}60`,
          }}
        >
          {type.name}
        </span>
      </div>

      {/* Bottom gradient fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
          zIndex: 1,
        }}
      />
    </button>
  );
}

function BottomSheet({
  type,
  isVisible,
  onClose,
}: {
  type: SlimeType;
  isVisible: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
        style={{
          animation: isVisible
            ? "fadeIn 200ms ease forwards"
            : "fadeOut 250ms ease forwards",
        }}
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${type.name} slime type details`}
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          maxHeight: "78vh",
          borderRadius: "20px 20px 0 0",
          background: "#1A0A2E",
          borderTop: "1px solid rgba(57,255,20,0.2)",
          overflowY: "auto",
          transform: isVisible ? "translateY(0)" : "translateY(100%)",
          transition: isVisible
            ? "transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)"
            : "transform 250ms ease-in",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 9999,
            background: "rgba(255,255,255,0.2)",
            margin: "12px auto 0",
          }}
        />

        {/* Content */}
        <div
          style={{
            padding:
              "16px 20px calc(40px + env(safe-area-inset-bottom) + 80px)",
          }}
        >
          {/* Header */}
          <h2
            style={{
              fontSize: 28,
              fontWeight: 900,
              fontFamily: "Montserrat, sans-serif",
              color: type.accentColor,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {type.name}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              margin: "4px 0 0",
            }}
          >
            {type.tagline}
          </p>

          {/* Divider */}
          <div
            style={{
              borderTop: "1px solid rgba(45,10,78,0.8)",
              margin: "16px 0",
            }}
          />

          {/* Definition */}
          <p
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#00F0FF",
              margin: "0 0 8px",
              fontWeight: 700,
            }}
          >
            Definition
          </p>
          <p
            style={{
              fontSize: 14,
              color: "rgba(245,245,245,0.85)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {type.definition}
          </p>

          {/* Note */}
          <p
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "#00F0FF",
              margin: "20px 0 8px",
              fontWeight: 700,
            }}
          >
            Note
          </p>
          <p
            style={{
              fontSize: 14,
              color: "rgba(245,245,245,0.65)",
              lineHeight: 1.6,
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {type.note}
          </p>

          {/* Variants */}
          {type.variants.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  color: "#00F0FF",
                  margin: "20px 0 8px",
                  fontWeight: 700,
                }}
              >
                Variants &amp; Related
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {type.variants.map((v) => (
                  <span
                    key={v}
                    style={{
                      background: "rgba(45,10,78,0.6)",
                      border: "1px solid rgba(45,10,78,0.9)",
                      borderRadius: 20,
                      padding: "4px 10px",
                      fontSize: 10,
                      color: "rgba(255,255,255,0.85)",
                      fontWeight: 500,
                    }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* CTA */}
          <div style={{ marginTop: 28 }}>
            <Link
              href={`/discover/type/${type.slug}`}
              style={{
                display: "block",
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontWeight: 700,
                width: "100%",
                padding: "14px 0",
                borderRadius: 12,
                fontSize: 14,
                textAlign: "center",
                textDecoration: "none",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              See community logs
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
    </>
  );
}

export default function SlimeTypeGuidePage() {
  const [selected, setSelected] = useState<SlimeType | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  function openSheet(type: SlimeType) {
    setSelected(type);
    setSheetVisible(true);
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 300);
  }

  return (
    <PageWrapper dots>
      <PageHeader />
      <main className="pt-16 pb-24">
        {/* Page header */}
        <div className="px-4 mb-6 text-center">
          <h1
            className="text-3xl font-black tracking-tight text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Slime Type Guide
          </h1>
        </div>

        {/* Horizontal carousel */}
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          style={{
            msOverflowStyle: "none",
            scrollbarWidth: "none",
            paddingLeft: "7.5vw",
            paddingRight: "7.5vw",
            scrollSnapType: "x mandatory",
          }}
        >
          {SLIME_TYPES.map((type, i) => (
            <SlimeTypeCard
              key={type.slug}
              type={type}
              index={i}
              onTap={() => openSheet(type)}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <p
          className="px-4 mt-2 text-[11px] text-center"
          style={{ color: "rgba(245,245,245,0.3)" }}
        >
          Scroll to explore all {SLIME_TYPES.length} types
        </p>
      </main>

      {/* Bottom sheet */}
      {selected && (
        <BottomSheet
          type={selected}
          isVisible={sheetVisible}
          onClose={closeSheet}
        />
      )}
    </PageWrapper>
  );
}
