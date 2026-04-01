"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopSlime {
  name: string;
  total_logs: number;
  avg_overall: number | null;
}

interface TopSlimesChartProps {
  data: TopSlime[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: "#0A0A0A",
        border: "1px solid rgba(0,240,255,0.3)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <p className="font-semibold text-white mb-0.5">
        {payload[0]?.payload?.name}
      </p>
      <p style={{ color: "#39FF14" }}>{payload[0]?.value} logs</p>
      {payload[0]?.payload?.avg_overall && (
        <p style={{ color: "rgba(245,245,245,0.5)" }}>
          {payload[0].payload.avg_overall.toFixed(1)} avg rating
        </p>
      )}
    </div>
  );
};

const CustomBar = (props: any) => {
  const { x, y, width, height, index } = props;
  const gradientId = `slimeBarGrad-${index}`;
  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#39FF14" />
          <stop offset="100%" stopColor="#00F0FF" />
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={`url(#${gradientId})`}
        rx={3}
      />
    </g>
  );
};

export default function TopSlimesChart({ data }: TopSlimesChartProps) {
  const top5 = data.slice(0, 5);

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
        >
          Top Slimes by Logs
        </p>
        <p
          className="text-sm mt-0.5"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Community logging activity
        </p>
      </div>

      {top5.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p
            className="text-sm text-center px-4"
            style={{
              color: "rgba(245,245,245,0.3)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Add slimes to your catalog to start tracking
          </p>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={top5}
              layout="vertical"
              margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                tick={{
                  fill: "rgba(245,245,245,0.3)",
                  fontSize: 10,
                  fontFamily: "Inter, sans-serif",
                }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{
                  fill: "rgba(245,245,245,0.6)",
                  fontSize: 11,
                  fontFamily: "Inter, sans-serif",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: string) =>
                  v.length > 14 ? v.slice(0, 12) + "…" : v
                }
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(57,255,20,0.05)" }}
              />
              <Bar dataKey="total_logs" shape={<CustomBar />} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
