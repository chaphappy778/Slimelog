// apps/web/components/log/LogWizardShared.tsx
// [T-wizard 2026-07-13] Shared building blocks for the log wizard.
// Extracted so `/log/page.tsx` (create) and `/log/edit/[id]/page.tsx`
// (update) render the same visual — previously they were two forked
// copies and only the create page picked up Design's rebuild. Any
// wizard visual change now happens in one place.

"use client";

import type { CSSProperties } from "react";
import { RatingSlider } from "@/components/RatingSlider";

// ─── Rating field metadata ────────────────────────────────────────────

export type RatingKey =
  | "rating_texture"
  | "rating_sound"
  | "rating_drizzle"
  | "rating_creativity"
  | "rating_sensory_fit"
  | "rating_overall";

export interface RatingAxisMeta {
  key: RatingKey;
  label: string;
  accent: string;
  hint: string;
  overall?: true;
}

// Ordering + accent + hint pulled from `/how-to-rate/content.ts` so
// the wizard visual matches the axis pages.
export const RATING_FIELDS: RatingAxisMeta[] = [
  {
    key: "rating_texture",
    label: "Texture",
    accent: "#39FF14",
    hint: "How it feels in hand: the poke, the pull, the squish.",
  },
  {
    key: "rating_sound",
    label: "Sound / ASMR",
    accent: "#00F0FF",
    hint: "Crunch, click, bubble. The audio payoff.",
  },
  {
    key: "rating_drizzle",
    label: "Aesthetic",
    accent: "#FF00E5",
    hint: "Color, mix-ins, how it reads on the shelf.",
  },
  {
    key: "rating_creativity",
    label: "Creativity",
    accent: "#FFD24A",
    hint: "Original concept, add-ins, theme follow-through.",
  },
  {
    key: "rating_sensory_fit",
    label: "Quality",
    accent: "#8B5CF6",
    hint: "Build, hold, no over-stick, ages well.",
  },
  {
    key: "rating_overall",
    label: "Overall",
    accent: "#00F0FF",
    hint: "Your one number for the whole tub.",
    overall: true,
  },
];

// ─── Color swatches ───────────────────────────────────────────────────

export interface ColorSwatch {
  label: string;
  hex: string;
  value: string;
  dark?: boolean;
}

export const COLOR_SWATCHES: ColorSwatch[] = [
  { label: "White", hex: "#FFFFFF", value: "white", dark: true },
  { label: "Cream", hex: "#FFF5DC", value: "cream", dark: true },
  { label: "Pink", hex: "#FFB6C1", value: "pink" },
  { label: "Hot Pink", hex: "#FF3E8A", value: "hot pink" },
  { label: "Purple", hex: "#9B5DE5", value: "purple" },
  { label: "Lavender", hex: "#C9B8F5", value: "lavender" },
  { label: "Blue", hex: "#4A90E2", value: "blue" },
  { label: "Mint", hex: "#98E4C8", value: "mint" },
  { label: "Green", hex: "#4CAF50", value: "green" },
  { label: "Yellow", hex: "#FFE135", value: "yellow", dark: true },
  { label: "Orange", hex: "#FF8C42", value: "orange" },
  { label: "Red", hex: "#E94040", value: "red" },
  { label: "Brown", hex: "#8B4513", value: "brown" },
  { label: "Black", hex: "#1A1A1A", value: "black" },
];

// ─── Canonical style tokens ───────────────────────────────────────────

export const sectionCardStyle: CSSProperties = {
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.7)",
  borderRadius: 20,
  padding: 16,
};

export const fieldInputStyle: CSSProperties = {
  width: "100%",
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.7)",
  borderRadius: 14,
  padding: "14px 15px",
  color: "#FFFFFF",
  fontFamily: "system-ui, sans-serif",
  fontSize: 15,
  outline: "none",
};

// ─── FieldLabel ───────────────────────────────────────────────────────

export function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div
      className="flex items-baseline gap-1.5 mb-2"
      style={{
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        color: "#00F0FF",
      }}
    >
      {children}
      {optional ? (
        <span
          style={{
            color: "rgba(245,245,245,0.42)",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: 0,
            textTransform: "none",
          }}
        >
          optional
        </span>
      ) : (
        <span style={{ color: "#FF00E5" }}>*</span>
      )}
    </div>
  );
}

// ─── PickChip — settable-tint chip toggle ─────────────────────────────

export function PickChip({
  selected,
  selectedTint,
  onClick,
  children,
}: {
  selected: boolean;
  selectedTint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="active:scale-[0.96] transition-transform"
      style={{
        padding: "9px 15px",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "system-ui, sans-serif",
        cursor: "pointer",
        border: selected
          ? `1px solid ${selectedTint}88`
          : "1px solid rgba(120,60,180,0.5)",
        background: selected ? `${selectedTint}18` : "rgba(45,10,78,0.4)",
        color: selected ? selectedTint : "rgba(245,245,245,0.6)",
        boxShadow: selected ? `0 0 12px ${selectedTint}55` : "none",
      }}
    >
      {children}
    </button>
  );
}

// ─── ToggleKnob ───────────────────────────────────────────────────────

export function ToggleKnob({ on }: { on: boolean }) {
  return (
    <div
      className="flex-none relative"
      aria-hidden="true"
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        background: on
          ? "linear-gradient(135deg, #39FF14, #00F0FF)"
          : "rgba(45,10,78,0.6)",
        border: on
          ? "1px solid transparent"
          : "1px solid rgba(120,60,180,0.5)",
        boxShadow: on ? "0 0 14px rgba(57,255,20,0.4)" : "none",
        transition: "background 140ms ease",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 3,
          left: on ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "left 140ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

// ─── SummaryRow — Notes step summary card ─────────────────────────────

export function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <p
      style={{
        color: "rgba(245,245,245,0.55)",
        fontSize: 15,
        margin: "3px 0",
      }}
    >
      {label}:{" "}
      <b style={{ color: valueColor ?? "#FFFFFF", fontWeight: 600 }}>
        {value}
      </b>
    </p>
  );
}

// ─── RatingAxisCard — per-axis tinted rating card ─────────────────────

export function RatingAxisCard({
  axis,
  value,
  onChange,
}: {
  axis: RatingAxisMeta;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const cardStyle: CSSProperties = axis.overall
    ? {
        background: "rgba(45,10,78,0.34)",
        border: "1.5px solid transparent",
        backgroundImage:
          "linear-gradient(rgba(20,4,38,0.75), rgba(20,4,38,0.75)), linear-gradient(90deg, #FF3D6E 0%, #FFAE3B 22%, #FFD24A 40%, #39FF14 58%, #00F0FF 76%, #FF00E5 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        boxShadow:
          "0 0 30px -6px rgba(204,68,255,0.35), inset 0 0 40px -18px rgba(0,240,255,0.4)",
        padding: "20px 18px 22px",
        borderRadius: 20,
      }
    : {
        background: "rgba(45,10,78,0.3)",
        border: `1px solid ${axis.accent}66`,
        boxShadow: `inset 0 0 34px -20px ${axis.accent}`,
        padding: "16px 16px 18px",
        borderRadius: 20,
      };

  return (
    <div style={cardStyle}>
      {axis.overall && (
        <p
          className="uppercase"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "#FFFFFF",
            margin: "0 0 8px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FFFFFF",
              boxShadow: "0 0 10px #FFFFFF",
              display: "inline-block",
            }}
          />
          Almost done, final call
        </p>
      )}
      <p
        style={{
          color: "rgba(245,245,245,0.65)",
          fontSize: 12.5,
          lineHeight: 1.35,
          margin: "0 0 12px",
        }}
      >
        {axis.hint}
      </p>
      <RatingSlider
        label={axis.label}
        value={value}
        onChange={onChange}
        isOverall={axis.overall}
      />
    </div>
  );
}

// ─── ColorPicker ──────────────────────────────────────────────────────
// Shared between create + edit. Multi-select grid of color swatches.

export function ColorPicker({
  selectedValues,
  onToggle,
}: {
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {COLOR_SWATCHES.map((c) => {
        const active = selectedValues.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onToggle(c.value)}
            aria-pressed={active}
            aria-label={c.label}
            className="rounded-full transition-transform active:scale-[0.92]"
            style={{
              width: 42,
              height: 42,
              background: c.hex,
              border: active
                ? "3px solid #39FF14"
                : "3px solid transparent",
              boxShadow: active
                ? "0 0 12px rgba(57,255,20,0.5)"
                : c.hex === "#FFFFFF"
                  ? "inset 0 0 0 1px rgba(0,0,0,0.15)"
                  : undefined,
              position: "relative",
            }}
          >
            {active && (
              <span
                className="absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                <svg
                  width={16}
                  height={16}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={c.dark ? "#111" : "#fff"}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
