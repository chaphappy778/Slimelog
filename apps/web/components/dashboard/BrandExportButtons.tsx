"use client";

import { useState } from "react";

interface CommunityLog {
  slime_name: string;
  slime_type: string | null;
  overall: number | null;
  texture: number | null;
  scent: number | null;
  sound: number | null;
  drizzle: number | null;
  creativity: number | null;
  sensory_fit: number | null;
  logged_at: string;
  username: string | null;
}

interface SlimeAggregate {
  name: string;
  slime_type: string | null;
  avg_overall: number | null;
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  total_logs: number;
}

interface BrandExportButtonsProps {
  brandName: string;
  brandSlug: string;
  communityLogs: CommunityLog[];
  slimeAggregates: SlimeAggregate[];
}

function formatDateForFilename(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // produces YYYY-MM-DD
}

function formatDateForHeader(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

// Wrap a cell value: escape quotes and wrap in double-quotes if needed.
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function BrandExportButtons({
  brandName,
  brandSlug,
  communityLogs,
  slimeAggregates,
}: BrandExportButtonsProps) {
  const [exportingLogs, setExportingLogs] = useState(false);
  const [exportingRatings, setExportingRatings] = useState(false);

  function handleExportRatings() {
    setExportingRatings(true);
    try {
      const now = new Date();
      const headerComment = `# SlimeLog Analytics Export — ${brandName} — ${formatDateForHeader(now)}`;
      const columns = [
        "Slime Name",
        "Slime Type",
        "Avg Overall",
        "Avg Texture",
        "Avg Scent",
        "Avg Sound",
        "Avg Drizzle",
        "Avg Creativity",
        "Avg Sensory Fit",
        "Total Logs",
      ]
        .map(csvCell)
        .join(",");

      const rows = slimeAggregates.map((s) =>
        [
          s.name,
          s.slime_type,
          s.avg_overall?.toFixed(2) ?? null,
          s.avg_texture?.toFixed(2) ?? null,
          s.avg_scent?.toFixed(2) ?? null,
          s.avg_sound?.toFixed(2) ?? null,
          s.avg_drizzle?.toFixed(2) ?? null,
          s.avg_creativity?.toFixed(2) ?? null,
          s.avg_sensory_fit?.toFixed(2) ?? null,
          s.total_logs,
        ]
          .map(csvCell)
          .join(","),
      );

      const csv = [headerComment, columns, ...rows].join("\n");
      const filename = `slimelog-analytics-${brandSlug}-${formatDateForFilename(now)}.csv`;
      downloadCsv(csv, filename);
    } finally {
      setExportingRatings(false);
    }
  }

  function handleExportLogs() {
    setExportingLogs(true);
    try {
      const now = new Date();
      const headerComment = `# SlimeLog Analytics Export — ${brandName} — ${formatDateForHeader(now)}`;
      const columns = [
        "Slime Name",
        "Slime Type",
        "Overall",
        "Texture",
        "Scent",
        "Sound",
        "Drizzle",
        "Creativity",
        "Sensory Fit",
        "Logged Date",
        "Logger Username",
      ]
        .map(csvCell)
        .join(",");

      const rows = communityLogs.map((l) => {
        const loggedDate = new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }).format(new Date(l.logged_at));
        return [
          l.slime_name,
          l.slime_type,
          l.overall,
          l.texture,
          l.scent,
          l.sound,
          l.drizzle,
          l.creativity,
          l.sensory_fit,
          loggedDate,
          l.username,
        ]
          .map(csvCell)
          .join(",");
      });

      const csv = [headerComment, columns, ...rows].join("\n");
      const filename = `slimelog-analytics-${brandSlug}-${formatDateForFilename(now)}.csv`;
      downloadCsv(csv, filename);
    } finally {
      setExportingLogs(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleExportRatings}
        disabled={exportingRatings}
        className="px-4 py-2 rounded-full text-sm font-bold transition-opacity"
        style={{
          background: exportingRatings
            ? "rgba(57,255,20,0.4)"
            : "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          opacity: exportingRatings ? 0.7 : 1,
          cursor: exportingRatings ? "not-allowed" : "pointer",
        }}
      >
        {exportingRatings ? "Exporting..." : "Export Slime Ratings CSV"}
      </button>
      <button
        onClick={handleExportLogs}
        disabled={exportingLogs}
        className="px-4 py-2 rounded-full text-sm font-bold transition-opacity"
        style={{
          background: "rgba(45,10,78,0.4)",
          border: "1px solid rgba(45,10,78,0.8)",
          color: exportingLogs
            ? "rgba(245,245,245,0.4)"
            : "rgba(245,245,245,0.7)",
          cursor: exportingLogs ? "not-allowed" : "pointer",
        }}
      >
        {exportingLogs ? "Exporting..." : "Export Community Logs CSV"}
      </button>
    </div>
  );
}
