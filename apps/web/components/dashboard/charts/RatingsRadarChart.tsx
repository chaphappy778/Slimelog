"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface DimensionData {
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  avg_overall: number | null;
}

interface RatingsRadarChartProps {
  data: DimensionData[];
}

const DIMENSIONS = [
  { key: "avg_texture", label: "Texture" },
  { key: "avg_scent", label: "Scent" },
  { key: "avg_sound", label: "Sound" },
  { key: "avg_drizzle", label: "Drizzle" },
  { key: "avg_creativity", label: "Creativity" },
  { key: "avg_sensory_fit", label: "Sensory Fit" },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: "#0A0A0A",
        border: "1px solid rgba(57,255,20,0.3)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <p style={{ color: "rgba(245,245,245,0.5)" }}>
        {payload[0]?.payload?.dimension}
      </p>
      <p className="font-bold mt-0.5" style={{ color: "#39FF14" }}>
        {payload[0]?.value?.toFixed(1)} / 5
      </p>
    </div>
  );
};

export default function RatingsRadarChart({ data }: RatingsRadarChartProps) {
  const hasData = data.length > 0;

  const chartData = DIMENSIONS.map((dim) => {
    if (!hasData) return { dimension: dim.label, value: 0 };
    const vals = data
      .map((d) => (d as any)[dim.key])
      .filter((v): v is number => v !== null && v !== undefined);
    const avg =
      vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { dimension: dim.label, value: parseFloat(avg.toFixed(2)) };
  });

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
        >
          Community Ratings
        </p>
        <p
          className="text-sm mt-0.5"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Avg across all official slimes
        </p>
      </div>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center">
          <p
            className="text-sm text-center px-4"
            style={{
              color: "rgba(245,245,245,0.3)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Rate data will appear once community members log your slimes
          </p>
        </div>
      ) : (
        // [FIX 1] Explicit minHeight wrapper prevents width(-1)/height(-1) warnings.
        <div style={{ width: "100%", minHeight: 260 }}>
          <ResponsiveContainer width="100%" height={260} minWidth={0}>
            <RadarChart
              data={chartData}
              margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
            >
              <PolarGrid stroke="rgba(45,10,78,0.8)" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{
                  fill: "rgba(245,245,245,0.5)",
                  fontSize: 11,
                  fontFamily: "Inter, sans-serif",
                }}
              />
              <Radar
                name="Rating"
                dataKey="value"
                stroke="#39FF14"
                fill="rgba(57,255,20,0.2)"
                strokeWidth={2}
                dot={{ fill: "#39FF14", r: 3 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
