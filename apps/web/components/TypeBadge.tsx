"use client";

import { SlimeType, SLIME_TYPE_LABELS } from "@/lib/types";

interface TypeBadgeProps {
  type: SlimeType;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Dark theme color overrides — replaces the light pastel values from types.ts
const DARK_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  butter: { bg: "rgba(255,243,0,0.12)", text: "#fde68a" },
  clear: { bg: "rgba(0,240,255,0.12)", text: "#67e8f9" },
  cloud: { bg: "rgba(139,92,246,0.12)", text: "#c4b5fd" },
  icee: { bg: "rgba(59,130,246,0.12)", text: "#93c5fd" },
  fluffy: { bg: "rgba(236,72,153,0.12)", text: "#f9a8d4" },
  floam: { bg: "rgba(57,255,20,0.12)", text: "#86efac" },
  snow_fizz: { bg: "rgba(14,165,233,0.12)", text: "#7dd3fc" },
  thick_and_glossy: { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  jelly: { bg: "rgba(245,158,11,0.12)", text: "#fcd34d" },
  beaded: { bg: "rgba(249,115,22,0.12)", text: "#fdba74" },
  clay: { bg: "rgba(234,179,8,0.12)", text: "#fde047" },
  cloud_cream: { bg: "rgba(217,70,239,0.12)", text: "#e879f9" },
  magnetic: { bg: "rgba(100,116,139,0.15)", text: "#94a3b8" },
  thermochromic: { bg: "rgba(239,68,68,0.12)", text: "#fca5a5" },
  avalanche: { bg: "rgba(99,102,241,0.12)", text: "#a5b4fc" },
  slay: { bg: "rgba(255,0,229,0.12)", text: "#f0abfc" },
};

export function TypeBadge({
  type,
  size = "md",
  className = "",
}: TypeBadgeProps) {
  const colors = DARK_TYPE_COLORS[type] ?? {
    bg: "rgba(42,42,42,0.8)",
    text: "#888888",
  };
  const label = SLIME_TYPE_LABELS[type] ?? type;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 font-semibold",
    md: "text-xs px-2.5 py-1 font-semibold",
    lg: "text-sm px-3 py-1.5 font-bold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full leading-none tracking-wide ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}
