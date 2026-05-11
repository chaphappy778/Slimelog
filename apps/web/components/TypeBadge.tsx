// apps/web/components/TypeBadge.tsx

import { SLIME_BASE_TYPE_LABELS, SLIME_BASE_TYPE_COLORS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

interface TypeBadgeProps {
  baseType: SlimeBaseType;
  subtypeName?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TypeBadge({
  baseType,
  subtypeName,
  size = "md",
  className = "",
}: TypeBadgeProps) {
  const colors = SLIME_BASE_TYPE_COLORS[baseType] ?? {
    bg: "rgba(42,42,42,0.8)",
    text: "#888888",
  };
  const baseLabel = SLIME_BASE_TYPE_LABELS[baseType] ?? baseType;

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5 font-semibold",
    md: "text-xs px-2.5 py-1 font-semibold",
    lg: "text-sm px-3 py-1.5 font-bold",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full leading-none tracking-wide ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <span>{baseLabel}</span>
      {subtypeName && (
        <>
          <span className="opacity-50" aria-hidden="true">
            ·
          </span>
          <span className="opacity-80 font-normal">{subtypeName}</span>
        </>
      )}
    </span>
  );
}
