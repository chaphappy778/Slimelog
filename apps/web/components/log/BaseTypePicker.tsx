// apps/web/components/log/BaseTypePicker.tsx
// [T-wizard 2026-07-13] Horizontal scrolling photo carousel picker
// for the log wizard's base type field. Replaces the previous native
// dropdown so users can visually confirm the base type they're
// selecting (butter looks like butter). Reuses the same photo library
// and tint palette as the Discover TypeCarousel — one asset source
// keeps the app coherent.
//
// Selected card gets a magenta ring + magenta glow (matches Design's
// selected-chip highlight on the mocked chip grid — we ported the
// treatment onto the photo card).
//
// Anti-AI-art hard rule respected: real user photos + typography
// only, no illustration.

"use client";

import Image from "next/image";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";
import {
  BASE_TYPE_HERO_PHOTO,
  BASE_TYPE_HERO_TINT,
  DEFAULT_HERO_TINT,
} from "@/lib/base-type-hero";

const SLIME_TYPES = Object.keys(SLIME_BASE_TYPE_LABELS) as SlimeBaseType[];

interface BaseTypePickerProps {
  value: SlimeBaseType | "";
  onChange: (val: SlimeBaseType) => void;
}

export default function BaseTypePicker({
  value,
  onChange,
}: BaseTypePickerProps) {
  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-none"
      style={
        {
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
          paddingTop: 4,
          paddingBottom: 4,
        } as React.CSSProperties
      }
    >
      {SLIME_TYPES.map((type) => {
        const label = SLIME_BASE_TYPE_LABELS[type];
        const tint = BASE_TYPE_HERO_TINT[type] ?? DEFAULT_HERO_TINT;
        const photo = BASE_TYPE_HERO_PHOTO[type] ?? null;
        const isSelected = value === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className="shrink-0 rounded-2xl overflow-hidden relative transition-all duration-150 active:scale-95"
            style={{
              width: 144,
              height: 168,
              background: "rgba(16,0,32,0.55)",
              border: isSelected
                ? "2px solid #FF00E5"
                : `1px solid ${tint}55`,
              boxShadow: isSelected
                ? "0 0 18px rgba(255,0,229,0.5), inset 0 0 0 1px rgba(255,0,229,0.35)"
                : `0 0 12px ${tint}15`,
            }}
            aria-pressed={isSelected}
            aria-label={`Base type: ${label}`}
          >
            {/* Photo or tint fallback */}
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background: photo
                  ? undefined
                  : `radial-gradient(120% 120% at 40% 30%, ${tint}55, rgba(16,0,32,0.85))`,
              }}
            >
              {photo && (
                <Image
                  src={photo}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="144px"
                />
              )}
            </div>

            {/* Bottom gradient wash for legibility */}
            <div
              className="absolute inset-x-0 bottom-0"
              aria-hidden="true"
              style={{
                height: "62%",
                background:
                  "linear-gradient(0deg, rgba(6,0,14,0.94) 40%, rgba(6,0,14,0.55) 80%, transparent 100%)",
              }}
            />

            {/* Meta strip */}
            <div
              className="absolute inset-x-0 bottom-0 px-3 pb-3 text-left"
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
              {isSelected && (
                <div
                  className="mt-0.5 text-[11px] font-black uppercase"
                  style={{
                    color: "#FF7BEB",
                    letterSpacing: "0.1em",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Selected
                </div>
              )}
            </div>

            {/* Top halo — signature color always faintly visible even
                when the photo dominates. Matches TypeCarousel. */}
            <div
              className="absolute inset-x-0 top-0 pointer-events-none"
              aria-hidden="true"
              style={{
                height: 3,
                background: `linear-gradient(90deg, transparent, ${tint}, transparent)`,
                opacity: 0.75,
              }}
            />

            {/* Selected checkmark glyph, top-right */}
            {isSelected && (
              <div
                className="absolute grid place-items-center"
                aria-hidden="true"
                style={{
                  top: 8,
                  right: 8,
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: "#FF00E5",
                  boxShadow: "0 0 12px rgba(255,0,229,0.65)",
                  zIndex: 3,
                }}
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
