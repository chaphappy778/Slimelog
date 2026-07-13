// apps/web/components/how-to-rate/ScaleSection.tsx
// T32e (2026-07-13): The final "07 The Scale" section on /how-to-rate.
// Full-width gradient scale bar (red→amber→cyan→green) reads at a glance
// as the 1..5 continuum; each row underneath explains what one specific
// band actually means. Closes with two callouts: a magenta note on what
// a 5.0 means, and an amber warn on when to withhold a rating.

import type { ScaleBand } from "@/app/how-to-rate/content";

interface ScaleSectionProps {
  bands: ScaleBand[];
}

export default function ScaleSection({ bands }: ScaleSectionProps) {
  return (
    <section
      id="the-scale"
      className="px-4 pt-12"
      style={{ scrollMarginTop: 116 }}
    >
      {/* ── Section header ───────────────────────────────────────── */}
      <div className="mb-2">
        <div
          className="font-black"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "#00F0FF",
          }}
        >
          07
        </div>
        <h2
          className="mt-1.5 m-0 text-white"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 30,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          The Scale
        </h2>
        <p
          className="mt-2 m-0"
          style={{
            color: "rgba(245,245,245,0.65)",
            fontSize: 14.5,
            lineHeight: 1.5,
          }}
        >
          What each star actually means, one to five.
        </p>
      </div>

      {/* ── Gradient scale bar ───────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          height: 12,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, #FF3D6E 0%, #FFAE3B 38%, #00F0FF 62%, #39FF14 100%)",
          margin: "20px 0 24px",
          boxShadow: "0 0 24px rgba(57,255,20,0.18)",
        }}
      />

      {/* ── Bands ────────────────────────────────────────────────── */}
      <div>
        {bands.map((band, i) => (
          <div
            key={band.n}
            className="flex gap-3.5"
            style={{
              padding: "14px 0",
              borderTop:
                i === 0 ? undefined : "1px solid rgba(45,10,78,0.55)",
            }}
          >
            <div
              className="flex-none grid place-items-center rounded-xl font-black"
              style={{
                width: 44,
                height: 44,
                fontFamily: "Montserrat, sans-serif",
                fontSize: 17,
                color: band.accentColor,
                border: `1px solid ${band.accentColor}`,
                boxShadow: `inset 0 0 12px ${band.accentColor}22`,
              }}
            >
              {band.n}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  style={{
                    fontSize: 15,
                    letterSpacing: 2,
                    color: band.accentColor,
                  }}
                >
                  {band.stars}
                </span>
                <span
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 800,
                    fontSize: 17,
                    color: "#FFFFFF",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {band.name}
                </span>
              </div>
              <p
                style={{
                  color: "rgba(245,245,245,0.72)",
                  fontSize: 14,
                  lineHeight: 1.5,
                  margin: "6px 0 0",
                }}
              >
                {band.copy}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Callouts ─────────────────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        {/* Magenta note: what a 5.0 means. */}
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{
            background: "rgba(255,0,229,0.09)",
            border: "1px solid rgba(255,0,229,0.34)",
          }}
        >
          <div
            className="mb-1.5 text-[11.5px] font-bold uppercase"
            style={{
              color: "#FF7BEB",
              letterSpacing: "0.10em",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            What a 5.0 means
          </div>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(245,245,245,0.85)",
              margin: 0,
            }}
          >
            A 5.0 is rare. Reserve it for slime that is flawless across all
            six axes, not just your current favorite. If everything is a
            5.0, nothing is.
          </p>
        </div>

        {/* Amber warn: when to withhold a rating. Mirrors the treatment
            used by ProseSection callouts across /guide — caution icon +
            glowing dot flanking the label. */}
        <div
          className="rounded-2xl px-4 py-3.5"
          style={{
            background: "rgba(255,174,59,0.10)",
            border: "1px solid rgba(255,174,59,0.38)",
          }}
        >
          <div
            className="flex items-center gap-2 mb-1.5"
            style={{ color: "#FFAE3B" }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ width: 16, height: 16, flexShrink: 0 }}
            >
              <path d="M12 3L2 20h20L12 3z" />
              <path d="M12 10v4" />
              <path d="M12 17.5v.01" />
            </svg>
            <span
              className="text-[11.5px] uppercase"
              style={{
                fontWeight: 900,
                letterSpacing: "0.08em",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              When to withhold a rating
            </span>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#FFAE3B",
                boxShadow: "0 0 10px #FFAE3B, 0 0 4px #FFAE3B",
                flexShrink: 0,
              }}
            />
          </div>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "rgba(245,245,245,0.85)",
              margin: 0,
            }}
          >
            If a slime arrived damaged in shipping, or you have only played
            with it once, wait before you rate. Rate the slime, not the bad
            day it had in transit.
          </p>
        </div>
      </div>
    </section>
  );
}
