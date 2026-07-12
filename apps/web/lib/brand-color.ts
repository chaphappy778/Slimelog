// apps/web/lib/brand-color.ts
//
// Deterministic brand-name -> color mapping. Same brand always resolves
// to the same hue for every user across every device, so brand identity
// carries a consistent visual token wherever we render a brand-letter
// fallback (Galaxy view hubs, leaderboard tiles, empty brand cards).
//
// Extracted from components/collection/GalaxyView.tsx (T107, 2026-07-11)
// so the leaderboard components can share the same palette without
// duplicating it.

const DEFAULT_PALETTE: readonly string[] = [
  "#39FF14",
  "#FF6B9D",
  "#00F0FF",
  "#FF00E5",
  "#FFB347",
  "#9B59B6",
  "#4ECDC4",
  "#FFE66D",
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#E91E8C",
  "#00BCD4",
  "#8BC34A",
];

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Hash a brand name to a deterministic palette color. Preserves the
 * original case-sensitive hashing from GalaxyView so users' existing
 * galaxy hubs keep the exact same hues after the extraction.
 */
export function brandColor(brand: string): string {
  return DEFAULT_PALETTE[hashString(brand) % DEFAULT_PALETTE.length];
}

export const BRAND_COLOR_PALETTE: readonly string[] = DEFAULT_PALETTE;
