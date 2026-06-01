// apps/web/app/how-to-rate/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";

interface RatingDimension {
  key: string;
  name: string;
  tagline: string;
  definition: string;
  whatToLookFor: string[];
  exampleLow: string;
  exampleHigh: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  isScale?: boolean; // true only for the final "The Scale" card
}

const RATING_DIMENSIONS: RatingDimension[] = [
  {
    key: "texture",
    name: "Texture",
    tagline: "How does it feel in your hands?",
    definition:
      "Texture is the foundation of every slime rating. It measures how well the slime expresses its claimed base — a butter slime should feel like butter, a cloud should drizzle, a thick and glossy should cascade with loud pops.",
    whatToLookFor: [
      "Does it match the advertised base type?",
      "Is it properly activated — not too sticky, not too stiff?",
      "Is the consistency even throughout?",
      "Does it hold up through a full play session?",
    ],
    exampleLow:
      "Sticky, over-activated, or nothing like the advertised texture.",
    exampleHigh:
      "Perfectly expresses its base type from first touch to last stretch.",
    gradientFrom: "#0d2b1a",
    gradientTo: "#1a4d2e",
    accentColor: "#39FF14",
  },
  {
    key: "sound",
    name: "Sound / ASMR",
    tagline: "The clicks, crunches, and sizzles",
    definition:
      "Sound is one of the primary drivers of the slime market. This dimension rates the quality, volume, and clarity of a slime's ASMR profile — whether that's cascading pops, a fine sizzle, a wet crunch, or a glassy click.",
    whatToLookFor: [
      "Is the sound consistent and clear?",
      "Does it match what you expect from the texture type?",
      "Volume and satisfying quality of pops or crunch",
      "Does it maintain its sound profile through a full session?",
    ],
    exampleLow:
      "Flat, silent, or inconsistent sounds that don't match the texture.",
    exampleHigh:
      "Loud, clear, deeply satisfying sounds that are the star of the experience.",
    gradientFrom: "#1a0a2e",
    gradientTo: "#2D0A4E",
    accentColor: "#CC44FF",
  },
  {
    key: "aesthetic",
    name: "Aesthetic",
    tagline: "Visual appeal and presentation",
    definition:
      "Aesthetic covers the visual dimension of the slime — the color execution, any special finishes (holographic, metallic, galaxy), how the slime looks in the container, and the overall visual presentation from unboxing through play.",
    whatToLookFor: [
      "Color accuracy to the product photos",
      "Quality of any special pigments or finishes",
      "How the slime looks during play — drizzle, stretch, movement",
      "Container presentation and unboxing visual impact",
    ],
    exampleLow:
      "Dull, muddy colors or visuals that don't match product photos.",
    exampleHigh:
      "Stunning, accurate visuals that look as good in play as in the listing.",
    gradientFrom: "#001a3a",
    gradientTo: "#003366",
    accentColor: "#00F0FF",
  },
  {
    key: "creativity",
    name: "Creativity",
    tagline: "Concept, theme, and execution",
    definition:
      "Creativity rates how original and well-executed the slime's concept is. This covers the theme, naming, color story, charm selection, scent pairing, and how cohesively all the elements come together into a single product vision.",
    whatToLookFor: [
      "Is the theme original or a fresh take on a familiar concept?",
      "Do the scent, color, and name all tell the same story?",
      "Are the charms or toppings intentional and well-chosen?",
      "Does the overall product feel considered and cohesive?",
    ],
    exampleLow:
      "Generic theme with no cohesion between scent, color, and name.",
    exampleHigh:
      "A fully realized concept where every element reinforces the theme.",
    gradientFrom: "#2a1a0a",
    gradientTo: "#4d3319",
    accentColor: "#FFB800",
  },
  {
    key: "quality",
    name: "Quality",
    tagline: "Build, finish, and lasting impression",
    definition:
      "Quality is a holistic measure of the slime's build and finish — how well it was made, how well it holds up over time, and whether it feels like a premium product worth the price. This includes activation quality, scent throw, inclusion quality, and packaging.",
    whatToLookFor: [
      "Activation quality — properly mixed, no bubbles or separation",
      "Scent accuracy and strength relative to what was advertised",
      "Quality of inclusions — premium beads, real polymer clay",
      "Packaging quality and whether the container seals properly",
    ],
    exampleLow:
      "Poorly activated, weak scent, cheap inclusions, leaking container.",
    exampleHigh:
      "Flawlessly made, premium inclusions, exactly as advertised, built to last.",
    gradientFrom: "#1a0a0a",
    gradientTo: "#3a1a1a",
    accentColor: "#FF00E5",
  },
  {
    key: "overall",
    name: "Overall",
    tagline: "Your final verdict",
    definition:
      "The Overall score is your single holistic judgment of the slime as a complete product. It is not an average of the other dimensions — it is your gut feeling after experiencing everything. Weight it toward what matters most to you in a slime.",
    whatToLookFor: [
      "Would you buy this slime again?",
      "Would you recommend it to another collector?",
      "Does the price match the experience?",
      "How does it compare to the best slimes you have tried?",
    ],
    exampleLow:
      "Would not repurchase. Significant problems outweigh any positives.",
    exampleHigh:
      "An instant grail. Excels at every dimension and stands apart from its peers.",
    gradientFrom: "#0A0A0A",
    gradientTo: "#1a0a2e",
    accentColor: "#39FF14",
  },
  {
    key: "scale",
    name: "The Scale",
    tagline: "What the numbers mean",
    definition: "",
    whatToLookFor: [],
    exampleLow: "",
    exampleHigh: "",
    gradientFrom: "#0F0018",
    gradientTo: "#1A0A2E",
    accentColor: "#00F0FF",
    isScale: true,
  },
];

const SCALE_TIERS: { score: string; desc: string }[] = [
  { score: "5", desc: "Perfect. The best of its kind." },
  { score: "4 – 4.75", desc: "Strong. Recommended with minor reservations." },
  { score: "3 – 3.75", desc: "Solid. Meets expectations, nothing more." },
  { score: "Below 3", desc: "Significant issues. Not recommended." },
];

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "#00F0FF",
  marginTop: 0,
  marginBottom: 8,
  fontWeight: 700,
};

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

function RatingDimensionCard({
  dimension,
  index,
  onTap,
}: {
  dimension: RatingDimension;
  index: number;
  onTap: () => void;
}) {
  const baseStyle: React.CSSProperties = {
    minWidth: "85vw",
    width: "85vw",
    height: "70vh",
    scrollSnapAlign: "center",
    borderRadius: 16,
    background: `linear-gradient(135deg, ${dimension.gradientFrom}, ${dimension.gradientTo})`,
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    border: "1px solid rgba(255,255,255,0.06)",
    padding: 0,
    display: "flex",
    flexDirection: "column",
  };

  // Scale card — renders the tier breakdown directly, no bottom sheet, not tappable
  if (dimension.isScale) {
    return (
      <div style={{ ...baseStyle, cursor: "default" }}>
        <BlobDecoration
          variant={index % 4}
          accentColor={dimension.accentColor}
        />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            padding: "28px 24px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 900,
                fontFamily: "Montserrat, sans-serif",
                color: dimension.accentColor,
                margin: 0,
                lineHeight: 1.1,
                textShadow: `0 0 20px ${dimension.accentColor}60`,
              }}
            >
              {dimension.name}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.6)",
                margin: "6px 0 0",
              }}
            >
              {dimension.tagline}
            </p>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            {SCALE_TIERS.map((tier, i) => (
              <div
                key={tier.score}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "16px 0",
                  borderTop: i === 0 ? "none" : "1px solid rgba(0,240,255,0.2)",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: dimension.accentColor,
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {tier.score}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(245,245,245,0.7)",
                    lineHeight: 1.4,
                  }}
                >
                  {tier.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Standard dimension card
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label={`Learn about the ${dimension.name} rating dimension`}
      style={{ ...baseStyle, cursor: "pointer" }}
      className="active:scale-[0.97] transition-transform duration-100"
    >
      {/* Decorative blob */}
      <BlobDecoration variant={index % 4} accentColor={dimension.accentColor} />

      {/* Vertical dimension name right side */}
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
            color: dimension.accentColor,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            textShadow: `0 0 20px ${dimension.accentColor}60`,
          }}
        >
          {dimension.name}
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

function RatingSheet({
  dimension,
  isVisible,
  onClose,
}: {
  dimension: RatingDimension;
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
        aria-label={`${dimension.name} rating dimension details`}
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
              color: dimension.accentColor,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {dimension.name}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.6)",
              margin: "4px 0 0",
            }}
          >
            {dimension.tagline}
          </p>

          {/* Divider */}
          <div
            style={{
              borderTop: "1px solid rgba(45,10,78,0.8)",
              margin: "16px 0",
            }}
          />

          {/* About */}
          <p style={sectionLabelStyle}>About</p>
          <p
            style={{
              fontSize: 14,
              color: "rgba(245,245,245,0.85)",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {dimension.definition}
          </p>

          {/* What to Look For */}
          <p style={{ ...sectionLabelStyle, marginTop: 20 }}>
            What to Look For
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dimension.whatToLookFor.map((item) => (
              <div
                key={item}
                style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 6 }}
                >
                  <circle cx="4" cy="4" r="2" fill="#39FF14" />
                </svg>
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(245,245,245,0.8)",
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
          </div>

          {/* Score Examples */}
          <p style={{ ...sectionLabelStyle, marginTop: 20 }}>Score Examples</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Low */}
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#CC44FF",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Low
              </span>
              <div
                style={{
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                  margin: "6px 0 8px",
                }}
              >
                <div
                  style={{
                    width: "20%",
                    height: "100%",
                    background: "#2D0A4E",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(245,245,245,0.6)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {dimension.exampleLow}
              </p>
            </div>

            {/* High */}
            <div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#39FF14",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                High
              </span>
              <div
                style={{
                  height: 30,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                  margin: "6px 0 8px",
                }}
              >
                <div
                  style={{
                    width: "90%",
                    height: "100%",
                    background: "#39FF14",
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(245,245,245,0.6)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {dimension.exampleHigh}
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: 28 }}>
            <Link
              href="/log"
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
              Start Rating
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

export default function HowToRatePage() {
  const [selected, setSelected] = useState<RatingDimension | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  function openSheet(dimension: RatingDimension) {
    if (dimension.isScale) return;
    setSelected(dimension);
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
            How to Rate a Slime
          </h1>
          <p className="text-sm text-slime-muted text-center mt-1">
            Learn what each dimension means and how to score it.
          </p>
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
          {RATING_DIMENSIONS.map((dimension, i) => (
            <RatingDimensionCard
              key={dimension.key}
              dimension={dimension}
              index={i}
              onTap={() => openSheet(dimension)}
            />
          ))}
        </div>

        {/* Scroll hint */}
        <p
          className="px-4 mt-2 text-[11px] text-center"
          style={{ color: "rgba(245,245,245,0.3)" }}
        >
          Tap any card to learn more
        </p>
      </main>

      {/* Bottom sheet — never rendered for the scale card */}
      {selected && !selected.isScale && (
        <RatingSheet
          dimension={selected}
          isVisible={sheetVisible}
          onClose={closeSheet}
        />
      )}
    </PageWrapper>
  );
}
