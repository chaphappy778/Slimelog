// apps/web/components/discover/TypeLogsClient.tsx
// [T74-B] Client component — sort pills + log cards for type/keyword detail pages

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { DiscoverLog } from "@/app/discover/type/[base_type]/page";

interface TypeLogsClientProps {
  logs: DiscoverLog[];
  baseType: string;
}

type SortMode = "newest" | "top_rated" | "most_liked";

// Local color swatch map — not exported from lib/types
const COLOR_SWATCHES: Record<string, string> = {
  pink: "#FF6B9D",
  green: "#39FF14",
  blue: "#4FC3F7",
  purple: "#9B59B6",
  white: "#F0F0F0",
  yellow: "#FFE66D",
  orange: "#FFB347",
  red: "#E74C3C",
  cyan: "#00F0FF",
  magenta: "#FF00E5",
  teal: "#4ECDC4",
  black: "#444",
  lavender: "#C4A0F0",
  peach: "#FFCBA4",
  mint: "#98FFD2",
  coral: "#FF6B6B",
  cream: "#FFF5DC",
  brown: "#8B4513",
};

function getSwatchColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_SWATCHES)) {
    if (lower.includes(key)) return val;
  }
  return "#666";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function AvatarCircle({
  url,
  username,
}: {
  url: string | null;
  username: string | null;
}) {
  const initials = username ? username.slice(0, 2).toUpperCase() : "?";
  if (url) {
    return (
      <img
        src={url}
        alt={username ?? "user"}
        width={32}
        height={32}
        className="rounded-full object-cover shrink-0"
        style={{ width: 32, height: 32 }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
      style={{
        width: 32,
        height: 32,
        background: "rgba(45,10,78,0.6)",
        color: "#FF00E5",
        border: "1px solid rgba(255,0,229,0.3)",
      }}
    >
      {initials}
    </div>
  );
}

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "top_rated", label: "Top Rated" },
  { key: "most_liked", label: "Most Liked" },
];

export default function TypeLogsClient({ logs }: TypeLogsClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const sorted = useMemo(() => {
    const result = [...logs];
    if (sortMode === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (sortMode === "top_rated") {
      result.sort((a, b) => (b.rating_overall ?? 0) - (a.rating_overall ?? 0));
    } else {
      // T79-likes: replace with real like count when available
      result.sort((a, b) => (b.rating_overall ?? 0) - (a.rating_overall ?? 0));
    }
    return result;
  }, [logs, sortMode]);

  return (
    <div>
      {/* Sort pills */}
      <div className="flex gap-2 px-4 mb-5 overflow-x-auto scrollbar-none">
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortMode(opt.key)}
              className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      color: "#0A0A0A",
                      border: "none",
                    }
                  : {
                      background: "rgba(45,10,78,0.3)",
                      color: "rgba(245,245,245,0.55)",
                      border: "1px solid rgba(45,10,78,0.6)",
                    }
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Log cards */}
      {sorted.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p
            className="text-sm mb-3"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            No logs yet for this type. Be the first to log one!
          </p>
          <Link
            href="/log"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
            }}
          >
            Log a Slime
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4">
          {sorted.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

function LogCard({ log }: { log: DiscoverLog }) {
  const colors = log.colors ?? [];
  const visibleColors = colors.slice(0, 5);

  return (
    <Link
      href={`/slimes/${log.id}`}
      className="block rounded-2xl overflow-hidden transition-all"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.75)",
      }}
    >
      {/* Cover image */}
      {log.image_url && (
        <div className="w-full overflow-hidden" style={{ height: 100 }}>
          <img
            src={log.image_url}
            alt={log.slime_name ?? "slime"}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        {/* Top row: name + rating */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p
            className="font-bold text-sm leading-snug"
            style={{ color: "#F5F5F5" }}
          >
            {log.slime_name ?? "Untitled"}
          </p>
          {log.rating_overall !== null && (
            <span
              className="shrink-0 text-xs font-bold"
              style={{ color: "#39FF14" }}
            >
              {log.rating_overall}/5
            </span>
          )}
        </div>

        {/* Brand */}
        {log.brand_name_raw && (
          <p className="text-xs truncate mb-2" style={{ color: "#FF00E5" }}>
            {log.brand_name_raw}
          </p>
        )}

        {/* Type badge */}
        {log.subtype_name && (
          <p className="text-xs mb-2" style={{ color: "#00F0FF" }}>
            {log.base_type ?? ""}{" "}
            {log.subtype_name ? `· ${log.subtype_name}` : ""}
          </p>
        )}

        {/* Color swatches */}
        {visibleColors.length > 0 && (
          <div className="flex gap-1 mb-3">
            {visibleColors.map((c, i) => (
              <span
                key={i}
                title={c}
                className="rounded-full"
                style={{
                  width: 14,
                  height: 14,
                  background: getSwatchColor(c),
                  border: "1px solid rgba(255,255,255,0.15)",
                  display: "inline-block",
                }}
              />
            ))}
          </div>
        )}

        {/* Footer: avatar + username + date */}
        <div className="flex items-center gap-2 mt-1">
          <AvatarCircle url={log.avatar_url} username={log.username} />
          <span className="text-xs font-semibold" style={{ color: "#FF00E5" }}>
            @{log.username ?? "unknown"}
          </span>
          <span
            className="text-xs ml-auto"
            style={{ color: "rgba(245,245,245,0.35)" }}
          >
            {formatDate(log.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}
