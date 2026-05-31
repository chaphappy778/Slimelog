// apps/web/components/RatingSlider.tsx
"use client";

interface RatingSliderProps {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
  isOverall?: boolean;
}

// Snap a raw float to the nearest 0.25 step
function snapTo25(raw: number): number {
  return Math.round(raw * 4) / 4;
}

// Display helper: drop trailing zeros, never show ".0" on whole numbers
// 5.0 → "5", 3.5 → "3.5", 2.75 → "2.75"
function formatRating(val: number): string {
  return parseFloat(val.toFixed(2)).toString();
}

export function RatingSlider({
  label,
  value,
  onChange,
  isOverall = false,
}: RatingSliderProps) {
  const pct = value !== null ? (value / 5) * 100 : 0;

  const fillGradient = `linear-gradient(90deg, #2D0A4E 0%, #00F0FF 50%, #39FF14 100%)`;

  const TICKS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

  return (
    <div
      style={{
        padding: isOverall ? "20px 0 12px" : "12px 0",
        borderBottom: "1px solid rgba(45,10,78,0.5)",
        borderTop: isOverall ? "1px solid rgba(255,255,255,0.08)" : "none",
        marginTop: isOverall ? 8 : 0,
      }}
    >
      {/* Label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: isOverall ? 800 : 500,
            color: isOverall ? "#ffffff" : "rgba(245,245,245,0.7)",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: value !== null ? "#00F0FF" : "rgba(255,255,255,0.3)",
            fontFamily: "Montserrat, Inter, sans-serif",
            minWidth: 28,
            textAlign: "right",
          }}
        >
          {value !== null ? formatRating(value) : "\u2014"}
        </span>
      </div>

      {/* Slider track area */}
      <div style={{ position: "relative", width: "100%", height: 20 }}>
        {/* Track background */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: "100%",
            height: 6,
            borderRadius: 3,
            background: "rgba(45,10,78,0.6)",
          }}
        />

        {/* Fill */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            transform: "translateY(-50%)",
            width: `${pct}%`,
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: pct > 0 ? `${10000 / pct}%` : "100%",
              height: "100%",
              background: fillGradient,
            }}
          />
        </div>

        {/* Thumb circle */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#ffffff",
            boxShadow: "0 0 8px rgba(57,255,20,0.6)",
            pointerEvents: "none",
          }}
        />

        {/* Native range input — snap to 0.25 on change */}
        <input
          type="range"
          min={0}
          max={5}
          step={0.25}
          value={value ?? 0}
          onChange={(e) => onChange(snapTo25(parseFloat(e.target.value)))}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            margin: 0,
            padding: 0,
          }}
          aria-label={label}
        />
      </div>

      {/* Tick marks */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
          marginTop: 4,
          paddingLeft: 1,
          paddingRight: 1,
        }}
      >
        {TICKS.map((t) => (
          <div
            key={t}
            style={{
              width: 1,
              height: 4,
              background: "rgba(255,255,255,0.15)",
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
