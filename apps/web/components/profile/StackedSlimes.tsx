// apps/web/components/profile/StackedSlimes.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { SLIME_BASE_TYPE_LABELS, type SlimeBaseType } from "@/lib/types";

type FeaturedLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  colors: string[] | null;
};

interface Props {
  featuredLogs: FeaturedLog[];
}

const TRANSFORMS = [
  { translateY: 0, translateX: 0, scale: 1, rotate: 0, opacity: 1 },
  { translateY: -18, translateX: 12, scale: 0.93, rotate: 2.5, opacity: 0.6 },
  { translateY: -34, translateX: 24, scale: 0.86, rotate: 5, opacity: 0.35 },
];

function StackCard({
  log,
  stackIndex,
  totalCards,
}: {
  log: FeaturedLog;
  stackIndex: number;
  totalCards: number;
}) {
  const typeLabel =
    (log.base_type && SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType]) ??
    log.base_type ??
    null;
  const c1 = log.colors?.[0] ?? "#2D0A4E";
  const c2 = log.colors?.[1] ?? c1;
  const rating = log.rating_overall ?? 0;
  const t = TRANSFORMS[Math.min(stackIndex, TRANSFORMS.length - 1)];
  const isFront = stackIndex === 0;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        width: "100%",
        transform: `translateY(${t.translateY}px) translateX(${t.translateX}px) scale(${t.scale}) rotate(${t.rotate}deg)`,
        opacity: t.opacity,
        transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: totalCards - stackIndex,
        borderRadius: 20,
        background: "#0F0018",
        border: "1px solid rgba(45,10,78,0.85)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Image area */}
      <div className="relative overflow-hidden" style={{ height: 200 }}>
        {log.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={log.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, transparent 50%, rgba(10,0,20,0.65) 100%)",
          }}
        />
        {/* View button — front card only */}
        {isFront && (
          <Link
            href={`/slimes/${log.id}`}
            className="absolute bottom-2 right-2"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 12px",
              borderRadius: 10,
              textDecoration: "none",
              display: "inline-block",
              lineHeight: 1.4,
              pointerEvents: "auto",
              position: "relative",
              zIndex: 10,
            }}
          >
            View
          </Link>
        )}
      </div>

      {/* Card body */}
      <div
        className="px-3 pt-2.5 pb-3 flex flex-col gap-1"
        style={{ background: "#0F0018" }}
      >
        <p className="text-sm font-bold text-slime-text truncate leading-tight">
          {log.slime_name ?? "Untitled slime"}
        </p>
        <p className="text-[11px] text-slime-muted truncate">
          {log.brand_name_raw ?? "Unknown brand"}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          {log.rating_overall != null && (
            // [Change 1 — T98b] Replace integer star row with fill bar + toFixed(1)
            <div
              className="flex items-center gap-1.5"
              aria-label={`Rating: ${log.rating_overall?.toFixed(1)} out of 5`}
            >
              <div
                style={{
                  width: 40,
                  height: 3,
                  borderRadius: 2,
                  background: "rgba(45,10,78,0.5)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${((log.rating_overall ?? 0) / 5) * 100}%`,
                    background: "#39FF14",
                    borderRadius: 2,
                  }}
                />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#39FF14" }}>
                {log.rating_overall?.toFixed(1)}
              </span>
            </div>
          )}
          {typeLabel && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full truncate"
              style={{
                background: "rgba(255,0,229,0.12)",
                color: "#FF00E5",
                border: "1px solid rgba(255,0,229,0.3)",
              }}
            >
              {typeLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StackedSlimes({ featuredLogs }: Props) {
  const [frontIndex, setFrontIndex] = useState(0);

  if (!featuredLogs || featuredLogs.length === 0) return null;

  const count = featuredLogs.length;
  const orderedLogs = Array.from(
    { length: count },
    (_, i) => featuredLogs[(frontIndex + i) % count],
  );

  function advance() {
    setFrontIndex((prev) => (prev + 1) % count);
  }

  return (
    <div
      className="flex flex-col items-center w-full"
      style={{ marginTop: 16 }}
    >
      <div
        style={{
          position: "relative",
          height: 320,
          width: "100%",
          maxWidth: 300,
        }}
      >
        {/* Cards — rendered back to front, all pointer-events none */}
        {[...orderedLogs].reverse().map((log, reversedIdx) => {
          const stackIndex = count - 1 - reversedIdx;
          return (
            <StackCard
              key={log.id}
              log={log}
              stackIndex={stackIndex}
              totalCards={count}
            />
          );
        })}

        {/* Single invisible tap target that covers the whole stack. */}
        {count > 1 && (
          <button
            type="button"
            onClick={advance}
            aria-label="Show next slime"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 50,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          />
        )}

        {/* View link for front card — sits above tap overlay at z-index 60 */}
        {count > 0 && orderedLogs[0] && (
          <Link
            href={`/slimes/${orderedLogs[0].id}`}
            style={{
              position: "absolute",
              bottom: 58,
              right: 12,
              zIndex: 60,
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontSize: 11,
              fontWeight: 700,
              padding: "5px 12px",
              borderRadius: 10,
              textDecoration: "none",
              display: "inline-block",
              lineHeight: 1.4,
            }}
          >
            View
          </Link>
        )}
      </div>

      {count > 1 && (
        <p className="text-[10px] text-slime-muted" style={{ marginTop: 12 }}>
          Tap to cycle
        </p>
      )}
    </div>
  );
}
