"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DropData {
  name: string;
  log_count: number;
}

interface DropPerformanceChartProps {
  data: DropData[];
  fullSize?: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: "#100a1c",
        border: "1px solid rgba(255,43,214,0.3)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <p className="font-semibold text-white mb-0.5">
        {payload[0]?.payload?.name}
      </p>
      <p style={{ color: "#ff2bd6" }}>{payload[0]?.value} logs</p>
    </div>
  );
};

export default function DropPerformanceChart({
  data,
  fullSize = false,
}: DropPerformanceChartProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <p
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
        >
          Drop Performance
        </p>
        <p
          className="text-sm mt-0.5"
          style={{
            color: "#8f83b0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Community logs per drop
        </p>
      </div>

      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p
            className="text-sm text-center px-4"
            style={{
              color: "#8f83b0",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Create your first drop to start tracking performance
          </p>
        </div>
      ) : (
        // [FIX 1] Explicit minHeight wrapper prevents width(-1)/height(-1) warnings.
        <div style={{ width: "100%", minHeight: 220 }}>
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(150,110,240,0.14)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{
                  fill: "#8f83b0",
                  fontSize: 10,
                  fontFamily: "Inter, sans-serif",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) =>
                  v.length > 10 ? v.slice(0, 9) + "…" : v
                }
              />
              <YAxis
                tick={{
                  fill: "#8f83b0",
                  fontSize: 10,
                  fontFamily: "Inter, sans-serif",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,43,214,0.06)" }}
              />
              <Bar
                dataKey="log_count"
                fill="#ff2bd6"
                maxBarSize={40}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
