// apps/web/components/discover/TypeCarousel.tsx
"use client";

import { useRouter } from "next/navigation";
import { SLIME_BASE_TYPE_LABELS, SLIME_BASE_TYPE_COLORS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

const SLIME_TYPES = Object.keys(SLIME_BASE_TYPE_LABELS) as SlimeBaseType[];

function BlobIcon({ color }: { color: string }) {
  return (
    <svg
      width="40"
      height="32"
      viewBox="0 0 28 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse cx="14" cy="13" rx="11" ry="7" fill={color} fillOpacity="0.25" />
      <ellipse cx="10" cy="10" rx="7" ry="6" fill={color} fillOpacity="0.3" />
      <ellipse cx="17" cy="9" rx="6" ry="5" fill={color} fillOpacity="0.2" />
      <ellipse
        cx="14"
        cy="11"
        rx="9"
        ry="5.5"
        fill={color}
        fillOpacity="0.15"
      />
    </svg>
  );
}

export default function TypeCarousel() {
  const router = useRouter();

  return (
    <div
      className="flex gap-3 overflow-x-auto scrollbar-none px-4"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {SLIME_TYPES.map((type) => {
        const colors = SLIME_BASE_TYPE_COLORS[type];
        const label = SLIME_BASE_TYPE_LABELS[type];
        const typeColor = colors.text;

        return (
          <button
            key={type}
            type="button"
            onClick={() => router.push(`/discover/type/${type}`)}
            className="shrink-0 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-150 active:scale-95 hover:scale-[1.02]"
            style={{
              width: "calc(62vw - 16px)",
              maxWidth: 260,
              height: 120,
              background: `linear-gradient(135deg, ${typeColor}26 0%, rgba(45,10,78,0.5) 100%)`,
              border: `1px solid ${typeColor}40`,
              padding: "14px 12px",
            }}
            aria-label={`Browse ${label} slimes`}
          >
            <BlobIcon color={typeColor} />
            <span
              className="text-sm font-bold text-center leading-tight"
              style={{ color: typeColor }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
