// apps/web/components/RatingSlider.tsx
// [T-wizard 2026-07-13] Full rebuild per Design's log-wizard pack.
// - Track uses the how-to-rate five-stop scale: red → orange → blue →
//   teal → green. Values 1..5 land on the same color they land on in
//   the guide.
// - Five outlined line-SVG stars sit under the track, each centered
//   on its integer position. Stars fill via SVG clip-path so 3.75
//   shows three full stars + one three-quarter-filled star (partial
//   fill, "clip" style — Design's default).
// - Handle is a white disc with a band-colored double-glow. 44px
//   tactile touch target (larger than the visible disc).
// - Numeric readout on the right of the label row is band-colored so
//   it visually reinforces the mapping.
// - Overall variant renders the label in rainbow text.
// - Accessible: hidden native <input type="range"> drives the value
//   with arrow-key stepping + aria-valuenow. Overlay is decorative.

"use client";

const SCALE_GRADIENT =
  "linear-gradient(90deg, #FF3D6E 0%, #FF7A2E 26%, #00A6FF 52%, #00E28A 78%, #39FF14 100%)";

// Band colors align with the five stops. A value of 1 → red,
// 2 → orange, 3 → blue, 4 → teal, 5 → green. Fractionals adopt the
// nearest-integer band.
const BAND_COLORS = ["#FF3D6E", "#FF7A2E", "#00A6FF", "#00E28A", "#39FF14"];

function bandColorFor(v: number): string {
  const idx = Math.max(0, Math.min(4, Math.round(v) - 1));
  return BAND_COLORS[idx];
}

// Star path taken from Design's mockup. viewBox 0..24.
const STAR_D =
  "M12 3.2l2.63 5.99 6.52.55-4.95 4.28 1.49 6.38L12 16.9l-5.68 3.5 1.49-6.38L2.85 9.74l6.52-.55z";

interface RatingSliderProps {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
  /** Overall gets a rainbow label treatment. */
  isOverall?: boolean;
}

// Snap a raw float to the nearest 0.25 step.
function snapTo25(raw: number): number {
  return Math.round(raw * 4) / 4;
}

// Display helper: drop trailing zeros. 5.0 → "5", 3.5 → "3.5", 2.75
// → "2.75".
function formatRating(val: number): string {
  return parseFloat(val.toFixed(2)).toString();
}

// Fill amount for star at index (0..4) given the current slider value.
// Returns a number 0..1 representing the fraction of the star that
// should be filled.
function starFillAt(idx: number, value: number): number {
  return Math.max(0, Math.min(1, value - idx));
}

export function RatingSlider({
  label,
  value,
  onChange,
  isOverall = false,
}: RatingSliderProps) {
  // We render the track as if values map 1..5 → 0..100%. When the
  // user hasn't set a rating yet, we show empty stars and a subtle
  // dashed track with no handle.
  const hasValue = value !== null;
  const displayVal = value ?? 1;
  const band = bandColorFor(displayVal);
  const pct = hasValue ? ((displayVal - 1) / 4) * 100 : 0;

  return (
    <div>
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={
            isOverall
              ? {
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: 17,
                  letterSpacing: "-0.01em",
                  background:
                    "linear-gradient(90deg, #FF3D6E 0%, #FFAE3B 22%, #FFD24A 40%, #39FF14 58%, #00F0FF 76%, #FF00E5 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: "transparent",
                }
              : {
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 17,
                  letterSpacing: "-0.01em",
                  color: "#FFFFFF",
                }
          }
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 26,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: hasValue ? band : "rgba(255,255,255,0.28)",
            minWidth: 44,
            textAlign: "right",
            textShadow: hasValue ? `0 0 12px ${band}55` : undefined,
          }}
        >
          {hasValue ? formatRating(displayVal) : "—"}
        </span>
      </div>

      {/* Track + handle */}
      <div style={{ position: "relative", width: "100%", height: 44 }}>
        {/* Track base — 12px tall, always shows the full 5-stop
            gradient as a faint background so the ladder is visible
            even before the user drags. */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: 0,
            right: 0,
            height: 12,
            borderRadius: 8,
            background: SCALE_GRADIENT,
            opacity: hasValue ? 1 : 0.35,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)",
          }}
        />

        {/* Track dimmer — a semi-opaque overlay over the UNFILLED
            portion, so the filled portion pops. Design's technique. */}
        {hasValue && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              left: `${pct}%`,
              right: 0,
              height: 12,
              borderRadius: 8,
              background: "rgba(16,0,32,0.62)",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Handle — 44px tactile target, 22px visible disc with a
            band-colored double glow. Only shown when the user has
            actually set a value. */}
        {hasValue && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: `${pct}%`,
              width: 44,
              height: 44,
              transform: "translate(-50%, -50%)",
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#FFFFFF",
                boxShadow: `0 0 0 4px ${band}, 0 0 18px ${band}, 0 2px 6px rgba(0,0,0,0.4)`,
              }}
            />
          </div>
        )}

        {/* Native range input drives the value. Hidden visually but
            fully accessible: keyboard arrow-key steps by 0.25,
            aria-valuenow reflects the current value.
            2026-07-13: `touchAction: pan-y` so a vertical scroll
            gesture starting on the slider passes through to the page
            instead of being captured as a slider drag. The horizontal
            drag axis is what actually moves the value, so this
            preserves the mobile UX while un-breaking page scroll on
            the Ratings step (six stacked sliders eat a lot of
            vertical touch area). */}
        <input
          type="range"
          min={1}
          max={5}
          step={0.25}
          value={displayVal}
          onChange={(e) => onChange(snapTo25(parseFloat(e.target.value)))}
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={displayVal}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
            padding: 0,
            touchAction: "pan-y",
          }}
        />
      </div>

      {/* Star row — five outlined stars, each fills proportionally
          via SVG clipPath. Design's "clip" fractional style. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 2px",
          marginTop: 14,
        }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((idx) => (
          <StarGlyph
            key={idx}
            fill={hasValue ? starFillAt(idx, displayVal) : 0}
            accent={band}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Star glyph ────────────────────────────────────────────────────────
// Outlined star; when `fill` > 0, a colored copy of the star is
// clipped by an SVG rect covering the left N% of the box so partial
// fills read at any 0.25 step. Line SVG only per anti-AI-art rule.

function StarGlyph({ fill, accent }: { fill: number; accent: string }) {
  const on = fill > 0;
  // Unique clipPath id per render so overlapping renders don't share
  // rects. We hash the accent + fill into a stable-ish id.
  const cid = `star-${accent.replace("#", "")}-${Math.round(fill * 100)}`;

  return (
    <svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      style={{
        overflow: "visible",
        filter: on ? `drop-shadow(0 0 5px ${accent})` : undefined,
      }}
    >
      {fill > 0 && (
        <defs>
          <clipPath id={cid}>
            <rect x={0} y={0} width={24 * fill} height={24} />
          </clipPath>
        </defs>
      )}
      {/* Outline — always drawn */}
      <path
        d={STAR_D}
        fill="none"
        stroke={on ? accent : "rgba(255,255,255,0.26)"}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Fill — clipped to fill portion */}
      {fill > 0 && (
        <path
          d={STAR_D}
          fill={accent}
          stroke={accent}
          strokeWidth={1}
          strokeLinejoin="round"
          clipPath={`url(#${cid})`}
        />
      )}
    </svg>
  );
}
