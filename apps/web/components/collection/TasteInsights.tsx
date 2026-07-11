// apps/web/components/collection/TasteInsights.tsx
//
// Collection rework batch B (2026-07-11). Replaces the previous donut
// chart with a two-part insights card:
//   - 6-axis taste radar: user's avg per rating dimension across their
//     OWNED logs (wishlist entries have no rating and are excluded)
//   - horizontal base-type bars underneath, sorted by count
//
// Axis labels match the app's actual rating vocab (see log/page.tsx
// RATING_FIELDS): Texture / Sound / Aesthetic / Creativity / Quality /
// Overall. Not the design's mock labels (Scent / Drizzle / Sensory) —
// stays consistent with what users see when they log.

"use client";

import type { CollectionLog, SlimeBaseType } from "@/lib/types";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";

// Rating axes drawn on the radar. Order is clockwise from top.
const RATING_AXES: {
  key: keyof CollectionLog;
  label: string;
}[] = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_sound", label: "Sound" },
  { key: "rating_drizzle", label: "Aesthetic" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Quality" },
  { key: "rating_overall", label: "Overall" },
];

// Base-type accent palette used for the horizontal bars. Matches the
// hues we already use elsewhere; unknown types fall back to violet.
const BASE_COLORS: Partial<Record<SlimeBaseType, string>> = {
  butter: "#FFAE3B",
  cloud: "#3DF2FF",
  floam: "#D976FF",
  clear: "#39FF14",
  jelly: "#FF3D6E",
  icee: "#00F0FF",
  cloud_cream: "#FFA7C7",
  fluffy: "#FFA6D9",
  thick_and_glossy: "#FF7BFF",
  slay: "#FF4D6D",
  clay: "#F0B060",
  beaded: "#FFB56B",
  snow_fizz: "#8FD8FF",
  magnetic: "#B0B0B0",
  avalanche: "#8B77E0",
};
const FALLBACK_COLOR = "#8B77E0";

export default function TasteInsights({
  logs,
}: {
  logs: CollectionLog[];
}) {
  // Owned only — wishlist entries typically have no ratings.
  const owned = logs.filter((l) => !l.in_wishlist);

  // ── Radar values: avg per axis across owned logs that have a value on
  //    that axis. Scaled to 0..1 for the polygon geometry.
  const axisAverages = RATING_AXES.map(({ key, label }) => {
    const values = owned
      .map((l) => l[key])
      .filter(
        (v): v is number => typeof v === "number" && !Number.isNaN(v),
      );
    if (values.length === 0) return { label, value: null as number | null };
    return { label, value: values.reduce((a, b) => a + b, 0) / values.length };
  });

  // Radar geometry
  const cx = 110;
  const cy = 110;
  const R = 90;
  const gridLevels = [1, 0.66, 0.33];
  const axisAngles = RATING_AXES.map(
    (_, i) => (-90 + i * 60) * (Math.PI / 180),
  );

  function pointOnAxis(i: number, r: number): [number, number] {
    const a = axisAngles[i];
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  const gridPolygons = gridLevels.map((level) =>
    axisAngles
      .map((_, i) => {
        const [x, y] = pointOnAxis(i, R * level);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" "),
  );

  const hasAnyRating = axisAverages.some((a) => a.value !== null);
  const dataPoints = axisAverages.map((a, i) => {
    // Missing axes get 0 — the polygon collapses to center on those
    // spokes, which reads as "not rated yet" without needing a legend.
    const r = ((a.value ?? 0) / 5) * R;
    return pointOnAxis(i, r);
  });
  const dataPointsStr = dataPoints
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");

  // ── Base type counts, sorted desc.
  const baseCounts: Partial<Record<SlimeBaseType, number>> = {};
  for (const l of owned) {
    if (l.base_type) {
      const k = l.base_type as SlimeBaseType;
      baseCounts[k] = (baseCounts[k] ?? 0) + 1;
    }
  }
  const sortedBases = (
    Object.entries(baseCounts) as [SlimeBaseType, number][]
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxBaseCount = sortedBases[0]?.[1] ?? 1;

  return (
    <div
      className="rounded-2xl p-4 mb-4"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
        boxShadow: "inset 0 0 24px rgba(45,10,78,0.12)",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <p
          className="text-[11px] font-black uppercase tracking-widest"
          style={{ color: "#00F0FF" }}
        >
          Your taste
        </p>
        <p
          className="text-[10.5px] font-medium"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          avg of {owned.length} log{owned.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Radar — viewBox expanded on both sides so the label text
          (previously cut off at 10.5px, especially "Creativity" and
          "Aesthetic" which extend past the polygon edge) has real
          room. Rendered a touch larger to compensate for the extra
          padding so the polygon stays visually prominent. */}
      <div className="flex justify-center">
        <svg viewBox="-40 -10 300 244" width="260" height="212">
          {gridPolygons.map((points, idx) => (
            <polygon
              key={idx}
              points={points}
              fill="none"
              stroke={`rgba(120,60,180,${0.35 - idx * 0.08})`}
              strokeWidth="1"
            />
          ))}
          {axisAngles.map((a, i) => {
            const [x, y] = pointOnAxis(i, R);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x.toFixed(1)}
                y2={y.toFixed(1)}
                stroke="rgba(120,60,180,0.22)"
              />
            );
          })}
          {hasAnyRating && (
            <polygon
              points={dataPointsStr}
              fill="rgba(0,240,255,0.18)"
              stroke="#00F0FF"
              strokeWidth="2"
              style={{ filter: "drop-shadow(0 0 6px rgba(0,240,255,0.55))" }}
            />
          )}
          {/* Axis labels — positioned just outside the outer ring */}
          {axisAverages.map(({ label }, i) => {
            const [x, y] = pointOnAxis(i, R + 16);
            // Anchor + baseline for the six clock positions.
            const anchor =
              i === 0
                ? "middle"
                : i === 3
                  ? "middle"
                  : i === 1 || i === 2
                    ? "start"
                    : "end";
            return (
              <text
                key={label}
                x={x.toFixed(1)}
                y={y.toFixed(1)}
                textAnchor={anchor as "middle" | "start" | "end"}
                fontSize="10.5"
                fontWeight={600}
                fill="rgba(255,255,255,0.75)"
                style={{ fontFamily: "system-ui" }}
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      <div
        style={{
          borderTop: "1px solid rgba(45,10,78,0.7)",
          margin: "10px -4px 14px",
        }}
      />

      {/* Base type breakdown */}
      <p
        className="text-[10.5px] font-bold uppercase mb-2"
        style={{
          letterSpacing: "0.08em",
          color: "rgba(255,255,255,0.5)",
        }}
      >
        By base type
      </p>
      {sortedBases.length === 0 ? (
        <p
          className="text-[12px] font-medium"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Log a slime to see your breakdown.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedBases.map(([base, count]) => {
            const color = BASE_COLORS[base] ?? FALLBACK_COLOR;
            const pct = Math.round((count / maxBaseCount) * 100);
            const label = SLIME_BASE_TYPE_LABELS[base] ?? base;
            return (
              <div key={base} className="flex items-center gap-2">
                <span
                  className="text-[11.5px] font-semibold"
                  style={{
                    width: 68,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {label}
                </span>
                <span
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(45,10,78,0.55)" }}
                >
                  <span
                    className="block h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      boxShadow: `0 0 6px ${color}80`,
                    }}
                  />
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums text-right"
                  style={{
                    width: 20,
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
