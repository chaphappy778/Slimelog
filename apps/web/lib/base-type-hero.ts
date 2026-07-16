// apps/web/lib/base-type-hero.ts
// [T33a 2026-07-13] Shared per-base-type hero assets. Used by both
// the Discover TypeCarousel and the /discover/type/<base_type> hero
// card so they draw from the same source. When a new base type is
// added, add its photo + tint here once and both surfaces update.
//
// Photos live in `apps/web/public/guide/textures/` — the same shots
// the Guide uses on Part 1. Photos are real user submissions
// (anti-AI-art rule).

import type { SlimeBaseType } from "@/lib/types";

/** Hero photo path per base type. Null for types we haven't curated. */
export const BASE_TYPE_HERO_PHOTO: Partial<Record<SlimeBaseType, string>> = {
  avalanche: "/guide/textures/avalanche-bff.webp",
  beaded: "/guide/textures/beaded-rodem.webp",
  butter: "/guide/textures/butter-cats-craft.webp",
  // 2026-07-16: basic added per Section 5.7. No hero photo yet (Jenn to
  // source); gradient-only fallback until then via DEFAULT_HERO_TINT.
  clear: "/guide/textures/clear-slime-obsidian.png",
  cloud: "/guide/textures/cloud-sandy-bros.png",
  // 2026-07-16: cloud_cream renamed to snowbutter per Section 5.1.
  // Reusing the same White Whale photo since it IS the same texture.
  snowbutter: "/guide/textures/cloud-cream-white-whale.webp",
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

/** Signature saturated tint per base type. */
export const BASE_TYPE_HERO_TINT: Partial<Record<SlimeBaseType, string>> = {
  butter: "#FFAE3B",
  // 2026-07-16: basic added per Section 5.7. Neutral cool-gray to signal
  // "default / starter texture" without competing with saturated bases.
  basic: "#CBD5E1",
  cloud: "#7DF6FF",
  // 2026-07-16: cloud_cream renamed to snowbutter per Section 5.1.
  snowbutter: "#E9C6FF",
  floam: "#FF00E5",
  jelly: "#39FF14",
  clear: "#00F0FF",
  thick_and_glossy: "#C4B5FD",
  icee: "#93C5FD",
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

/** Fallback cyan when a base type isn't listed. */
export const DEFAULT_HERO_TINT = "#00F0FF";
