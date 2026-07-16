// apps/web/components/collection/CollectionSummaryChart.tsx
"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { CollectionLog, SlimeBaseType } from "@/lib/types";

interface Props {
  logs: CollectionLog[];
}

type GroupBy = "brand" | "type" | "color";

const GROUP_OPTIONS: { id: GroupBy; label: string }[] = [
  { id: "brand", label: "Brand" },
  { id: "type", label: "Type" },
  { id: "color", label: "Color" },
];

// [Change CSC1] Local TYPE_COLORS kept as a chart-palette map (saturated
// hex values are visually distinct on the donut; SLIME_BASE_TYPE_COLORS
// returns bg/text pairs tuned for badges). Typed Record<SlimeBaseType, string>
// to catch any future taxonomy drift at compile time. All 20 base types
// present. Removed `thermochromic` (now a subtype under `clear`).
const TYPE_COLORS: Record<SlimeBaseType, string> = {
  avalanche: "#3498DB",
  beaded: "#FF00E5",
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  cloud_cream: "#FFE66D",
  floam: "#8BC34A",
  fluffy: "#FF6B9D",
  hybrid: "#B39DDB",
  icee: "#4FC3F7",
  jelly: "#4ECDC4",
  magnetic: "#78909C",
  sand: "#D2B48C",
  slay: "#39FF14",
  snow_fizz: "#E0E0E0",
  sugar_scrub: "#FFC1CC",
  thick_and_glossy: "#9B59B6",
  water: "#5DADE2",
  wax_and_wax_cracking: "#A569BD",
};

const ROTATING_PALETTE = [
  "#39FF14",
  "#FF6B9D",
  "#00F0FF",
  "#FF00E5",
  "#FFB347",
  "#9B59B6",
  "#4ECDC4",
  "#FFE66D",
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#F39C12",
  "#8BC34A",
  "#00BCD4",
  "#FF5722",
];

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  key: string;
}

function buildData(logs: CollectionLog[], groupBy: GroupBy): ChartEntry[] {
  const counts: Record<string, number> = {};

  logs.forEach((log) => {
    let key: string;
    switch (groupBy) {
      case "brand":
        key = log.brand_name_raw ?? "Unknown Brand";
        break;
      case "type":
        // [Change CSC2] base_type replaces slime_type.
        key = log.base_type ?? "unknown";
        break;
      case "color":
        key = log.colors?.[0] ?? "No Color";
        break;
      default:
        key = "unknown";
    }
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([key, value], index) => {
      let color: string;
      if (groupBy === "type") {
        color =
          TYPE_COLORS[key as SlimeBaseType] ??
          ROTATING_PALETTE[index % ROTATING_PALETTE.length];
      } else if (groupBy === "color") {
        const COLOR_NAME_MAP: Record<string, string> = {
          pink: "#FF6B9D",
          "hot pink": "#FF00E5",
          green: "#39FF14",
          blue: "#00F0FF",
          purple: "#9B59B6",
          white: "#F5F5F5",
          yellow: "#FFE66D",
          orange: "#FFB347",
          red: "#E74C3C",
          cyan: "#00F0FF",
          magenta: "#FF00E5",
          teal: "#4ECDC4",
          black: "#444",
          lavender: "#B39DDB",
          mint: "#98FF98",
        };
        const lk = key.toLowerCase();
        color =
          Object.entries(COLOR_NAME_MAP).find(([k]) => lk.includes(k))?.[1] ??
          ROTATING_PALETTE[index % ROTATING_PALETTE.length];
      } else {
        color = ROTATING_PALETTE[index % ROTATING_PALETTE.length];
      }
      // [Change CSC1] Labels use canonical SLIME_BASE_TYPE_LABELS.
      const name =
        groupBy === "type"
          ? (SLIME_BASE_TYPE_LABELS[key as SlimeBaseType] ?? key)
          : key;
      return { name, value, color, key };
    });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div
        style={{
          background: "rgba(45,10,78,0.95)",
          border: "1px solid rgba(45,10,78,0.9)",
          borderRadius: 8,
          padding: "6px 12px",
          color: "#fff",
          fontSize: 13,
        }}
      >
        <span style={{ color: item.payload.color, fontWeight: 700 }}>
          {item.name}
        </span>
        <span style={{ color: "#aaa", marginLeft: 8 }}>{item.value}</span>
      </div>
    );
  }
  return null;
};

export default function CollectionSummaryChart({ logs }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("brand");
  const data = buildData(logs, groupBy);
  const total = logs.length;

  if (total === 0) {
    return (
      <div
        style={{
          background: "rgba(45,10,78,0.25)",
          border: "1px solid rgba(45,10,78,0.7)",
          borderRadius: 16,
          padding: "20px 16px",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ position: "relative", width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={[{ value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="rgba(45,10,78,0.5)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: "#39FF14" }}>
              0
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              slimes
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          Log your first slime to see your collection breakdown
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        borderRadius: 16,
        padding: "16px 16px 20px",
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Group-by pill selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {GROUP_OPTIONS.map(({ id, label }) => {
          const isActive = groupBy === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setGroupBy(id)}
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                border: isActive
                  ? "1px solid #39FF14"
                  : "1px solid rgba(45,10,78,0.7)",
                borderLeft: isActive
                  ? "3px solid #39FF14"
                  : "1px solid rgba(45,10,78,0.7)",
                background: isActive ? "rgba(57,255,20,0.1)" : "transparent",
                color: isActive ? "#39FF14" : "rgba(255,255,255,0.4)",
                fontSize: 12,
                fontWeight: isActive ? 700 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Donut + legend row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Donut */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                stroke="none"
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: "#39FF14",
                lineHeight: 1,
              }}
            >
              {total}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                marginTop: 2,
              }}
            >
              slimes
            </div>
          </div>
        </div>

        {/* Legend pills */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            overflowY: "auto",
            maxHeight: 140,
            flex: 1,
          }}
        >
          {data.map((entry) => (
            <div
              key={entry.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                background: "rgba(45,10,78,0.4)",
                borderRadius: 20,
                borderLeft: `3px solid ${entry.color}`,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {entry.name}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: entry.color,
                  flexShrink: 0,
                }}
              >
                {entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
