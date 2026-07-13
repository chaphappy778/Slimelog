// apps/web/components/discover/TypeCarousel.tsx
// [Discover V1 gap-fill 2026-07-13] Full rewrite to match Design's
// mockup. Tighter cards, radial-gradient tinted photo area, saturated
// colored blob with glow, two-line meta below (name + slime count).
//
// Per-type signature colors live in this file — Design proposed a full
// 16-type color system as V2, so for now we ship a hand-tuned map for
// the hero types (butter / cloud / floam / jelly / clear / thick /
// icee / clay + a few) and fall back to a muted-cyan default. The
// hero-tint colors are more saturated than `SLIME_BASE_TYPE_COLORS`
// (which is used elsewhere in the app as an accent tone) so we keep
// them local instead of overwriting the global palette.
//
// Anti-AI-art hard rule respected: geometric blob (radial-gradient) +
// line SVG only. No character mascots, no illustration.

"use client";

import { useRouter } from "next/navigation";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

// Signature blob color per type. Saturated hex — used as the blob
// solid + as the radial-gradient tint alpha behind it. Types not
// listed here fall through to `DEFAULT_TINT`.
const HERO_TINTS: Partial<Record<SlimeBaseType, string>> = {
  butter: "#FFAE3B",
  cloud: "#7DF6FF",
  cloud_cream: "#E9C6FF",
  floam: "#FF00E5",
  jelly: "#39FF14",
  clear: "#00F0FF",
  thick_and_glossy: "#C4B5FD",
  icee: "#93C5FD",
  clay: "#FDE68A",
  hybrid: "#CC44FF",
  slay: "#FF7BEB",
  fluffy: "#F9A8D4",
  beaded: "#FDA4AF",
  snow_fizz: "#BAE6FD",
  sugar_scrub: "#FED7AA",
  water: "#7DD3FC",
  avalanche: "#E2E8F0",
  sand: "#D4A96A",
  wax_and_wax_cracking: "#FCD34D",
  magnetic: "#A0AEC0",
};

const DEFAULT_TINT = "#00F0FF";

const SLIME_TYPES = Object.keys(SLIME_BASE_TYPE_LABELS) as SlimeBaseType[];

interface TypeCarouselProps {
  /**
   * Slime count per base_type, computed server-side in
   * `apps/web/app/discover/page.tsx`. Missing keys render as `0`.
   */
  counts?: Partial<Record<SlimeBaseType, number>>;
}

export default function TypeCarousel({ counts = {} }: TypeCarouselProps) {
  const router = useRouter();

  // Convert hex + alpha to `rgba()` for the radial-gradient background.
  // Small helper avoids adding a color-lib dep.
  function hexToRgba(hex: string, alpha: number): string {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-none px-4"
      style={
        {
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        } as React.CSSProperties
      }
    >
      {SLIME_TYPES.map((type) => {
        const label = SLIME_BASE_TYPE_LABELS[type];
        const tint = HERO_TINTS[type] ?? DEFAULT_TINT;
        const count = counts[type] ?? 0;

        return (
          <button
            key={type}
            type="button"
            onClick={() => router.push(`/discover/type/${type}`)}
            className="shrink-0 rounded-2xl overflow-hidden transition-all duration-150 active:scale-95 hover:scale-[1.02]"
            style={{
              width: 148,
              background: "rgba(16,0,32,0.55)",
              border: `1px solid ${hexToRgba(tint, 0.32)}`,
            }}
            aria-label={`Browse ${label} slimes${count > 0 ? `, ${count} logged` : ""}`}
          >
            {/* ── Photo area: radial gradient + centered blob ────── */}
            <div
              className="w-full relative overflow-hidden"
              style={{
                height: 100,
                background: `radial-gradient(120% 120% at 40% 30%, ${hexToRgba(tint, 0.32)}, rgba(16,0,32,0.2))`,
              }}
              aria-hidden="true"
            >
              {/* Organic blob — solid tint with heavy blur glow. Sized
                  to feel weighty inside the photo area, positioned
                  slightly off-center for visual dynamism. */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 62,
                  height: 46,
                  borderRadius:
                    "60% 40% 55% 45% / 60% 55% 45% 40%",
                  background: tint,
                  filter: "blur(0.5px)",
                  boxShadow: `0 0 28px ${hexToRgba(tint, 0.7)}, 0 0 12px ${hexToRgba(tint, 0.85)}`,
                  opacity: 0.94,
                }}
              />
            </div>

            {/* ── Meta strip: name + slime count ───────────────────── */}
            <div
              className="px-3 py-2.5"
              style={{ background: "rgba(16,0,32,0.75)" }}
            >
              <div
                className="text-left"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 13.5,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                }}
              >
                {label}
              </div>
              <div
                className="text-left mt-0.5 text-[10.5px]"
                style={{
                  color:
                    count > 0
                      ? "rgba(245,245,245,0.55)"
                      : "#7BFF7B",
                  fontWeight: count > 0 ? 500 : 700,
                }}
              >
                {count > 0
                  ? `${count} ${count === 1 ? "slime" : "slimes"}`
                  : "be the first"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
