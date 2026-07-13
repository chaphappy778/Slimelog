// apps/web/components/discover/TypeCarousel.tsx
// [Discover V1 gap-fill 2026-07-13] Photo-based type cards.
//
// v1: geometric blobs (placeholder). v2 (this pass): real texture
// photos from `/public/guide/textures/` — the same hero shots the
// guide uses on Part 1. Each base type has exactly one photo.
// Overlay: dark gradient from bottom for legibility of the type
// name / slime count that sits on top.
//
// Anti-AI-art hard rule respected: these are real user-submitted
// photos, not generated illustration.

"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

// Hero photo for each base type. Paths are served from
// `apps/web/public/guide/textures/`. When a base type is missing a
// photo (edge case: a new base_type ships before we curate a hero),
// we fall back to a gradient placeholder — Design's blob treatment
// is intentionally NOT the fallback so a missing photo reads as
// "coming soon" instead of "we forgot to update this."
const HERO_PHOTO: Partial<Record<SlimeBaseType, string>> = {
  avalanche: "/guide/textures/avalanche-bff.webp",
  beaded: "/guide/textures/beaded-rodem.webp",
  butter: "/guide/textures/butter-cats-craft.webp",
  clay: "/guide/textures/clay-palmetto.webp",
  clear: "/guide/textures/clear-slime-obsidian.png",
  cloud: "/guide/textures/cloud-sandy-bros.png",
  cloud_cream: "/guide/textures/cloud-cream-white-whale.webp",
  floam: "/guide/textures/floam-dream-glow.webp",
  fluffy: "/guide/textures/fluffy-ky.webp",
  hybrid: "/guide/textures/hybrid-bingsu-jelly-clay-ky.webp",
  icee: "/guide/textures/icee-pilot.webp",
  jelly: "/guide/textures/jelly-og-slimes.webp",
  magnetic: "/guide/textures/magnetic-crazy-aarons.webp",
  sand: "/guide/textures/sand-momo.avif",
  slay: "/guide/textures/slay-sally-sweet-pea.webp",
  snow_fizz: "/guide/textures/snow-fizz-prismatic.webp",
  sugar_scrub: "/guide/textures/sugar-scrub-macaroons.png",
  thick_and_glossy:
    "/guide/textures/thick-glossy-mythical-mushbunny.webp",
  water: "/guide/textures/water-momo.webp",
  wax_and_wax_cracking: "/guide/textures/wax-og-slimes.webp",
};

// Signature tint per type — used for the fallback gradient when we
// don't have a photo, and for the card border glow. Same palette as
// the previous blob-based version so nothing else needs to change.
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

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function TypeCarousel({ counts = {} }: TypeCarouselProps) {
  const router = useRouter();

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
        const photo = HERO_PHOTO[type] ?? null;

        return (
          <button
            key={type}
            type="button"
            onClick={() => router.push(`/discover/type/${type}`)}
            className="shrink-0 rounded-2xl overflow-hidden relative transition-all duration-150 active:scale-95 hover:scale-[1.02]"
            style={{
              width: 148,
              height: 176,
              background: "rgba(16,0,32,0.55)",
              border: `1px solid ${hexToRgba(tint, 0.4)}`,
              boxShadow: `0 0 18px ${hexToRgba(tint, 0.18)}`,
            }}
            aria-label={`Browse ${label} slimes${count > 0 ? `, ${count} logged` : ""}`}
          >
            {/* ── Photo layer or fallback tinted gradient ─────────── */}
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background: photo
                  ? undefined
                  : `radial-gradient(120% 120% at 40% 30%, ${hexToRgba(tint, 0.35)}, rgba(16,0,32,0.85))`,
              }}
            >
              {photo && (
                <Image
                  src={photo}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="148px"
                  priority={false}
                />
              )}
            </div>

            {/* ── Bottom gradient wash for legibility ──────────────
                Ensures the type name + count read cleanly regardless
                of what the photo is doing. Fades from transparent at
                the top of the meta strip to near-solid at the bottom. */}
            <div
              className="absolute inset-x-0 bottom-0"
              aria-hidden="true"
              style={{
                height: "58%",
                background:
                  "linear-gradient(0deg, rgba(6,0,14,0.94) 40%, rgba(6,0,14,0.55) 80%, transparent 100%)",
              }}
            />

            {/* ── Meta stack: name + count ─────────────────────── */}
            <div
              className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-6 text-left"
              style={{ zIndex: 2 }}
            >
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: 15,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                  textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                }}
              >
                {label}
              </div>
              <div
                className="mt-0.5 text-[11px]"
                style={{
                  color: count > 0 ? "rgba(245,245,245,0.75)" : "#7BFF7B",
                  fontWeight: count > 0 ? 600 : 800,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {count > 0
                  ? `${count} ${count === 1 ? "slime" : "slimes"}`
                  : "be the first"}
              </div>
            </div>

            {/* Subtle color halo on top edge to keep the type's
                signature color visible even when the photo dominates. */}
            <div
              className="absolute inset-x-0 top-0 pointer-events-none"
              aria-hidden="true"
              style={{
                height: 3,
                background: `linear-gradient(90deg, transparent, ${tint}, transparent)`,
                opacity: 0.7,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
