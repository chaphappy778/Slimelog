// apps/web/components/FloatingPills.tsx
// Reusable floating pill decorations extracted from LandingPage.
// Scatter atmospheric capsule shapes across hero sections.
// Usage: <FloatingPills /> or <FloatingPills density="high" area="hero" />

type PillColor = "green" | "purple" | "cyan" | "magenta";

interface PillDef {
  color: PillColor;
  width: number;
  height: number;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  rotation: number;
  opacity: number;
  blur?: boolean;
}

interface FloatingPillsProps {
  /** How many pills to show */
  density?: "low" | "medium" | "high";
  /** Which preset layout to use */
  area?: "hero" | "section" | "sidebar";
  /** Override z-index */
  zIndex?: number;
}

const GRADIENTS: Record<PillColor, string> = {
  green: "linear-gradient(180deg, #39FF14 0%, #00C853 100%)",
  purple: "linear-gradient(180deg, #7C3AED 0%, #2D0A4E 100%)",
  cyan: "linear-gradient(180deg, #00F0FF 0%, #0080AA 100%)",
  magenta: "linear-gradient(180deg, #FF00E5 0%, #8B0066 100%)",
};

// Pill layout presets
const HERO_PILLS: PillDef[] = [
  {
    color: "green",
    width: 28,
    height: 64,
    top: "4%",
    left: "3%",
    rotation: 8,
    opacity: 0.85,
  },
  {
    color: "purple",
    width: 24,
    height: 56,
    top: "3%",
    left: "30%",
    rotation: 0,
    opacity: 0.85,
  },
  {
    color: "purple",
    width: 22,
    height: 52,
    top: "2%",
    left: "58%",
    rotation: 5,
    opacity: 0.85,
  },
  {
    color: "green",
    width: 26,
    height: 60,
    top: "3%",
    right: "4%",
    rotation: -6,
    opacity: 0.85,
  },
  {
    color: "purple",
    width: 22,
    height: 50,
    bottom: "6%",
    left: "4%",
    rotation: 10,
    opacity: 0.7,
    blur: true,
  },
  {
    color: "green",
    width: 28,
    height: 65,
    bottom: "5%",
    right: "5%",
    rotation: -8,
    opacity: 0.85,
  },
];

const SECTION_PILLS: PillDef[] = [
  {
    color: "purple",
    width: 20,
    height: 46,
    top: "8%",
    left: "2%",
    rotation: 12,
    opacity: 0.5,
  },
  {
    color: "green",
    width: 18,
    height: 40,
    top: "10%",
    right: "3%",
    rotation: -10,
    opacity: 0.5,
  },
  {
    color: "cyan",
    width: 16,
    height: 36,
    bottom: "8%",
    left: "5%",
    rotation: 8,
    opacity: 0.4,
  },
  {
    color: "magenta",
    width: 18,
    height: 42,
    bottom: "6%",
    right: "4%",
    rotation: -12,
    opacity: 0.45,
  },
];

const SIDEBAR_PILLS: PillDef[] = [
  {
    color: "green",
    width: 14,
    height: 32,
    top: "15%",
    right: "2%",
    rotation: 6,
    opacity: 0.4,
  },
  {
    color: "purple",
    width: 12,
    height: 28,
    top: "40%",
    left: "1%",
    rotation: -8,
    opacity: 0.35,
  },
  {
    color: "cyan",
    width: 10,
    height: 24,
    bottom: "20%",
    right: "3%",
    rotation: 10,
    opacity: 0.3,
  },
];

const PRESETS: Record<string, PillDef[]> = {
  hero: HERO_PILLS,
  section: SECTION_PILLS,
  sidebar: SIDEBAR_PILLS,
};

function Pill({ def, zIndex }: { def: PillDef; zIndex: number }) {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top: def.top,
        bottom: def.bottom,
        left: def.left,
        right: def.right,
        width: def.width,
        height: def.height,
        borderRadius: 999,
        background: GRADIENTS[def.color],
        transform: `rotate(${def.rotation}deg)`,
        opacity: def.opacity,
        filter: def.blur ? "blur(2px)" : undefined,
        zIndex,
      }}
    />
  );
}

export default function FloatingPills({
  density = "medium",
  area = "hero",
  zIndex = 0,
}: FloatingPillsProps) {
  const allPills = PRESETS[area] ?? HERO_PILLS;

  const count =
    density === "low"
      ? Math.ceil(allPills.length * 0.4)
      : density === "high"
        ? allPills.length
        : Math.ceil(allPills.length * 0.7);

  const pills = allPills.slice(0, count);

  return (
    <>
      {pills.map((def, i) => (
        <Pill key={i} def={def} zIndex={zIndex} />
      ))}
    </>
  );
}
