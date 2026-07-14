// apps/web/components/RatingSlider.tsx
// [T-wizard 2026-07-13, revised for Jenn's mobile feedback] Full
// rebuild with custom pointer events and axis-locked dragging. The
// previous version used a hidden native `<input type="range">` with
// `touch-action: pan-y` — that unblocks vertical scroll on mobile
// but iOS Safari's pan-y also refuses horizontal panning gestures,
// so touch-drag on the slider never registered. Only taps worked.
//
// New pointer strategy:
//
//   pointerdown           → record start position, don't commit yet
//   first pointermove     → measure dominant axis:
//                             |dx| > |dy| ⇒ we're the slider,
//                             setPointerCapture + start dragging
//                             |dy| > |dx| ⇒ user is scrolling,
//                             release and never touch the value
//   subsequent pointermove → update value based on pointer x
//   pointerup             → if we never captured, treat as tap
//                             (set value to tap position). If we did
//                             capture, we already committed.
//
// This gives us: horizontal drag → slider, vertical drag → page
// scroll, tap → jump-to-position. Same feel as native mobile sliders
// on iOS Photos / Twitter etc.
//
// Accessibility: kept the native `<input type="range">` fully hidden
// (pointer-events: none) so keyboard nav (arrow keys, home/end) still
// works via focus. Screen readers get aria-valuenow etc.

"use client";

import { useRef } from "react";

const SCALE_GRADIENT =
  "linear-gradient(90deg, #FF3D6E 0%, #FF7A2E 26%, #00A6FF 52%, #00E28A 78%, #39FF14 100%)";

// Value 1 → red, 2 → orange, 3 → blue, 4 → teal, 5 → green.
const BAND_COLORS = ["#FF3D6E", "#FF7A2E", "#00A6FF", "#00E28A", "#39FF14"];

function bandColorFor(v: number): string {
  const idx = Math.max(0, Math.min(4, Math.round(v) - 1));
  return BAND_COLORS[idx];
}

const STAR_D =
  "M12 3.2l2.63 5.99 6.52.55-4.95 4.28 1.49 6.38L12 16.9l-5.68 3.5 1.49-6.38L2.85 9.74l6.52-.55z";

interface RatingSliderProps {
  label: string;
  value: number | null;
  onChange: (val: number) => void;
  isOverall?: boolean;
}

function snapTo25(raw: number): number {
  return Math.round(raw * 4) / 4;
}

function formatRating(val: number): string {
  return parseFloat(val.toFixed(2)).toString();
}

function starFillAt(idx: number, value: number): number {
  return Math.max(0, Math.min(1, value - idx));
}

// Pixel threshold before we decide whether a drag is a slide or a
// scroll. Smaller = snappier response, larger = fewer false positives
// on wobbly fingers. 6px matches iOS's own gesture threshold.
const AXIS_LOCK_THRESHOLD = 6;

// Map a pointer x within the track element to a rating value 1..5,
// then snap to the nearest 0.25 step.
function valueFromPointer(clientX: number, el: HTMLDivElement): number {
  const rect = el.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  return snapTo25(1 + pct * 4);
}

export function RatingSlider({
  label,
  value,
  onChange,
  isOverall = false,
}: RatingSliderProps) {
  const hasValue = value !== null;
  const displayVal = value ?? 1;
  const band = bandColorFor(displayVal);
  const pct = hasValue ? ((displayVal - 1) / 4) * 100 : 0;

  // Drag state — kept in a ref so React re-renders don't clobber it
  // mid-drag. Cleared on pointerup / pointercancel.
  const dragRef = useRef<{
    el: HTMLDivElement;
    startX: number;
    startY: number;
    captured: boolean;
    pointerId: number;
  } | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only react to primary buttons / single-finger touches.
    if (e.button !== undefined && e.button !== 0) return;
    dragRef.current = {
      el: e.currentTarget,
      startX: e.clientX,
      startY: e.clientY,
      captured: false,
      pointerId: e.pointerId,
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    // First move: decide the axis. Wait until we've moved past the
    // threshold in either direction so a wobbly touch isn't
    // misclassified.
    if (!drag.captured) {
      const dx = Math.abs(e.clientX - drag.startX);
      const dy = Math.abs(e.clientY - drag.startY);
      if (dx < AXIS_LOCK_THRESHOLD && dy < AXIS_LOCK_THRESHOLD) return;

      if (dx > dy) {
        // Horizontal → we own the drag.
        drag.captured = true;
        try {
          drag.el.setPointerCapture(e.pointerId);
        } catch {
          // setPointerCapture can throw if the pointer is already
          // released. Nothing to recover — treat as uncaptured.
          dragRef.current = null;
          return;
        }
        // Preventing default here stops iOS from starting a scroll
        // once we've committed to a slider drag.
        e.preventDefault();
      } else {
        // Vertical → let the page scroll. Drop the drag state so
        // subsequent moves don't touch the slider.
        dragRef.current = null;
        return;
      }
    }

    // We're dragging. Update value based on pointer x.
    if (drag.captured) {
      e.preventDefault();
      onChange(valueFromPointer(e.clientX, drag.el));
    }
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    if (!drag.captured) {
      // Never crossed the drag threshold — treat as a tap. Set the
      // value to the tap x position.
      onChange(valueFromPointer(e.clientX, drag.el));
    }
    dragRef.current = null;
  }

  function onPointerCancel() {
    dragRef.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Keyboard nav via the container so the visible slider is fully
    // keyboard-controllable when it has focus. Steps by 0.25.
    const current = value ?? 1;
    let next: number | null = null;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(5, current + 0.25);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(1, current - 0.25);
        break;
      case "Home":
        next = 1;
        break;
      case "End":
        next = 5;
        break;
      default:
        return;
    }
    e.preventDefault();
    onChange(snapTo25(next));
  }

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

      {/* Track + handle. Custom pointer events for tap + drag with
          axis lock — see file header for the strategy. */}
      <div
        role="slider"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={displayVal}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        style={{
          position: "relative",
          width: "100%",
          height: 44,
          cursor: "pointer",
          // Neutral default touch-action so the browser lets us do
          // our own axis-lock logic. If we didn't take over on
          // pointermove, the page still scrolls fine.
          touchAction: "auto",
          outline: "none",
        }}
      >
        {/* Track base */}
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
            pointerEvents: "none",
          }}
        />

        {/* Dimmer over the unfilled portion */}
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

        {/* Handle */}
        {hasValue && (
          <div
            aria-hidden="true"
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
      </div>

      {/* Star row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 2px",
          marginTop: 14,
          pointerEvents: "none",
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

function StarGlyph({ fill, accent }: { fill: number; accent: string }) {
  const on = fill > 0;
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
      <path
        d={STAR_D}
        fill="none"
        stroke={on ? accent : "rgba(255,255,255,0.26)"}
        strokeWidth={2}
        strokeLinejoin="round"
      />
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
