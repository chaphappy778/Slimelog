// apps/web/components/guide/PricingBands.tsx
// T32 (2026-07-13): Part 8 — Pricing bands as glowing glass rows, not a
// plain table. The value column gets a green→cyan gradient treatment
// per Design's mockup.

import type { PricingBand } from "@/app/guide/content";

export default function PricingBands({ bands }: { bands: PricingBand[] }) {
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* Header row */}
      <div
        className="grid gap-3 px-4 py-3"
        style={{
          gridTemplateColumns: "1.1fr 1fr 1.4fr",
          background: "rgba(45,10,78,0.55)",
          fontFamily: "Montserrat, sans-serif",
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(245,245,245,0.65)",
        }}
      >
        <span>Size</span>
        <span>Typical price</span>
        <span>Notes</span>
      </div>

      {bands.map((band, i) => (
        <div
          key={`${band.size}-${i}`}
          className="grid gap-3 px-4 py-3.5 items-center"
          style={{
            gridTemplateColumns: "1.1fr 1fr 1.4fr",
            borderTop: "1px solid rgba(45,10,78,0.55)",
          }}
        >
          <span
            className="text-white"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              fontSize: 13.5,
            }}
          >
            {band.size}
          </span>
          <span
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 15,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {band.typicalPrice}
          </span>
          <span
            className="text-[11.5px] leading-snug"
            style={{ color: "rgba(245,245,245,0.65)" }}
          >
            {band.notes}
          </span>
        </div>
      ))}
    </div>
  );
}
