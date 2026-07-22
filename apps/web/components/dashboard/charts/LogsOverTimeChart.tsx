"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface WeeklyLog {
  week: string;
  log_count: number;
}

interface LogsOverTimeChartProps {
  data: WeeklyLog[];
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function formatWeek(weekStr: string) {
  const d = new Date(weekStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-lg text-xs"
      style={{
        background: "#100a1c",
        border: "1px solid rgba(34,211,238,0.3)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <p style={{ color: "#8f83b0" }}>{label}</p>
      <p className="font-bold mt-0.5" style={{ color: "#22d3ee" }}>
        {payload[0].value} {payload[0].value === 1 ? "log" : "logs"}
      </p>
    </div>
  );
};

export default function LogsOverTimeChart({ data }: LogsOverTimeChartProps) {
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const filtered = useMemo(() => {
    if (!data.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - range);
    return data
      .filter((d) => new Date(d.week) >= cutoff)
      .map((d) => ({ week: formatWeek(d.week), logs: d.log_count }));
  }, [data, range]);

  const totalInRange = filtered.reduce((sum, d) => sum + d.logs, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <p
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
          >
            Logs Over Time
          </p>
          <p
            className="text-2xl font-black text-white mt-0.5"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {totalInRange.toLocaleString()}
            <span
              className="text-sm font-normal ml-1.5"
              style={{ color: "#8f83b0" }}
            >
              in {range} days
            </span>
          </p>
        </div>
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid rgba(150,110,240,0.24)" }}
        >
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days as 7 | 30 | 90)}
              className="px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background:
                  range === r.days
                    ? "rgba(255,43,214,0.14)"
                    : "rgba(255,255,255,0.04)",
                color: range === r.days ? "#ff2bd6" : "#8f83b0",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p
            className="text-sm text-center"
            style={{
              color: "#8f83b0",
              fontFamily: "Inter, sans-serif",
            }}
          >
            No log data yet. Share your brand page to get started.
          </p>
        </div>
      ) : (
        // [FIX 1] Explicit minHeight wrapper prevents ResponsiveContainer from
        // measuring a 0px parent and emitting width(-1)/height(-1) warnings.
        <div style={{ width: "100%", minHeight: 220 }}>
          <ResponsiveContainer width="100%" height={220} minWidth={0}>
            <AreaChart
              data={filtered}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="logsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(150,110,240,0.14)"
                vertical={false}
              />
              <XAxis
                dataKey="week"
                tick={{
                  fill: "#8f83b0",
                  fontSize: 10,
                  fontFamily: "Inter, sans-serif",
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
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
                cursor={{ stroke: "rgba(34,211,238,0.25)", strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="logs"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#logsGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#22d3ee",
                  stroke: "#0A0A0A",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
