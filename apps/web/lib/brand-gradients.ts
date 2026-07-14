// apps/web/lib/brand-gradients.ts
// [T33b 2026-07-13] Brand-card gradient palette. Deterministic per
// brand id so each brand's card always renders with the same color
// signature. Palette taken from Design's `/brands` mockup —
// green→cyan / magenta→cyan / cyan→green / warm→pink / holo, etc.

const BRAND_GRADIENTS: string[] = [
  "linear-gradient(135deg, #39FF14, #00F0FF)", // green→cyan
  "linear-gradient(135deg, #CC44FF, #00F0FF)", // magenta→cyan
  "linear-gradient(135deg, #00F0FF, #CC44FF)", // cyan→magenta
  "linear-gradient(135deg, #00F0FF, #39FF14)", // cyan→green
  "linear-gradient(135deg, #39FF14, #CC44FF)", // green→magenta
  "linear-gradient(135deg, #FFAE3B, #FF3D6E)", // warm→pink
  "linear-gradient(135deg, #CC44FF, #FF3D6E, #FFAE3B)", // candy holo
  "linear-gradient(135deg, #CC44FF, #470F60)", // deep purple
];

const COVER_GRADIENTS: string[] = [
  "linear-gradient(135deg, #CC44FF, #00F0FF)",
  "linear-gradient(135deg, #00F0FF, #39FF14)",
  "linear-gradient(135deg, #FFAE3B, #FF3D6E)",
  "linear-gradient(135deg, #CC44FF, #FF3D6E, #FFAE3B)",
  "linear-gradient(135deg, #00F0FF, #CC44FF)",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Stable per-brand logo gradient. */
export function brandLogoGradient(brandId: string): string {
  return BRAND_GRADIENTS[hashString(brandId) % BRAND_GRADIENTS.length];
}

/** Stable per-brand cover-strip gradient (used on Featured + Popular). */
export function brandCoverGradient(brandId: string): string {
  return COVER_GRADIENTS[hashString(brandId + "cover") % COVER_GRADIENTS.length];
}

/** Two-letter initials from a brand name (or fallback). */
export function brandInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2 && words[0][0] && words[1][0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return (name.slice(0, 2) || "?").toUpperCase();
}
