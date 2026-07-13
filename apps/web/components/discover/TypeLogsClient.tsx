// apps/web/components/discover/TypeLogsClient.tsx
// [T33a 2026-07-13] Discover result surfaces V1. Reused by both
// `/discover/type/<base_type>` and `/discover/keyword/<name>`. Renders
// the subtype chip row (type page only), the sort tabs, and the log
// card list per Design's spec:
//   - 172px cover photo top, rating pill top-right (cyan-outlined,
//     star + score)
//   - Body: slime name (Montserrat 700 19px), brand (magenta), footer
//     with avatar + magenta @username + muted date, divider above
//   - Sort tabs Newest / Top Rated (Most Liked deferred to T33d)
//   - Subtype chips filter the visible logs by subtype_id when they
//     apply to the current base type.

"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DiscoverLog } from "@/app/discover/type/[base_type]/page";

interface TypeLogsClientProps {
  logs: DiscoverLog[];
  /** Base type for the current page, or "" when rendered under the
   *  keyword result page (no subtype chip row in that case). */
  baseType: string;
  /**
   * Optional: label to weave into the empty-state CTA
   * ("Be the first to log a {emptyLabel} slime →"). Falls back to
   * "slime" if not provided.
   */
  emptyLabel?: string;
  /** Accent color for the empty-state CTA text tint. */
  emptyAccent?: string;
}

type SortMode = "newest" | "top_rated";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "top_rated", label: "Top Rated" },
  // [T33d] Most Liked deferred until we have a log_likes table.
];

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
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : "?";
  if (url) {
    return (
      <Image
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
      className="rounded-full flex items-center justify-center shrink-0 font-black"
      style={{
        width: 32,
        height: 32,
        fontFamily: "Montserrat, sans-serif",
        fontSize: 12,
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
        color: "#04110A",
      }}
    >
      {initials}
    </div>
  );
}

export default function TypeLogsClient({
  logs,
  baseType,
  emptyLabel = "slime",
  emptyAccent = "#39FF14",
}: TypeLogsClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [activeSubtype, setActiveSubtype] = useState<string | null>(null);

  // Subtypes present in the current log set — only relevant on the
  // base type page (baseType != ""). Empty when we're rendering the
  // keyword page's log list.
  const availableSubtypes = useMemo(() => {
    if (!baseType) return [];
    const seen = new Map<string, string>();
    for (const l of logs) {
      if (l.subtype_name && l.base_type === baseType) {
        // Group by the visible name — collection_logs doesn't carry
        // a subtype_id we can reference here without a schema
        // change, so we key on the name string.
        seen.set(l.subtype_name, l.subtype_name);
      }
    }
    return Array.from(seen.keys()).sort();
  }, [logs, baseType]);

  const filteredSorted = useMemo(() => {
    let result = [...logs];
    if (activeSubtype) {
      result = result.filter((l) => l.subtype_name === activeSubtype);
    }
    if (sortMode === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      result.sort((a, b) => (b.rating_overall ?? 0) - (a.rating_overall ?? 0));
    }
    return result;
  }, [logs, sortMode, activeSubtype]);

  return (
    <div>
      {/* Subtype chip row — only on the base type page and only when
          any subtypes exist for this type. */}
      {availableSubtypes.length > 0 && (
        <div
          className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-none"
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        >
          <SubtypeChip
            active={activeSubtype === null}
            label="All"
            onClick={() => setActiveSubtype(null)}
          />
          {availableSubtypes.map((name) => (
            <SubtypeChip
              key={name}
              active={activeSubtype === name}
              label={name}
              onClick={() =>
                setActiveSubtype((prev) => (prev === name ? null : name))
              }
            />
          ))}
        </div>
      )}

      {/* Sort tabs */}
      <div className="flex gap-2 px-4 mb-5">
        {SORT_OPTIONS.map((opt) => {
          const active = sortMode === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSortMode(opt.key)}
              className="shrink-0 rounded-full transition-all active:scale-[0.96]"
              style={{
                padding: "10px 20px",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                background: active
                  ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                  : "rgba(45,10,78,0.28)",
                color: active ? "#04110A" : "rgba(245,245,245,0.6)",
                border: active
                  ? "1px solid transparent"
                  : "1px solid rgba(120,60,180,0.4)",
                boxShadow: active
                  ? "0 0 18px rgba(57,255,20,0.4)"
                  : "none",
                transition: "all 160ms ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Log cards, or empty CTA */}
      {filteredSorted.length === 0 ? (
        <EmptyState label={emptyLabel} accent={emptyAccent} />
      ) : (
        <div className="flex flex-col gap-4 px-4">
          {filteredSorted.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subtype chip ──────────────────────────────────────────────────────

function SubtypeChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full transition-all active:scale-[0.96]"
      style={{
        padding: "8px 15px",
        fontFamily: "system-ui, sans-serif",
        fontWeight: 700,
        fontSize: 13.5,
        background: active ? "#00F0FF" : "rgba(45,10,78,0.28)",
        color: active ? "#04110A" : "#00F0FF",
        border: active
          ? "1px solid #00F0FF"
          : "1px solid rgba(0,240,255,0.35)",
        boxShadow: active ? "0 0 16px rgba(0,240,255,0.5)" : "none",
        whiteSpace: "nowrap",
        transition: "all 160ms ease",
      }}
    >
      {label}
    </button>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────
// Design principle: never render "0 logs". Show an illustrated seed
// prompt with a green→cyan CTA that weaves in the type / keyword
// label.

function EmptyState({ label, accent }: { label: string; accent: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <OozeBlobIllus accent={accent} />
      <h3
        className="mt-5 mb-2"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          color: "#FFFFFF",
          letterSpacing: "-0.01em",
        }}
      >
        No {label} logs yet
      </h3>
      <p
        className="mx-auto"
        style={{
          maxWidth: 280,
          fontSize: 15,
          lineHeight: 1.5,
          color: "rgba(245,245,245,0.55)",
          margin: "0 auto 22px",
        }}
      >
        This shelf is empty and waiting. Log the first {label} and start
        the collection.
      </p>
      <Link
        href="/log"
        className="inline-flex items-center gap-2 rounded-2xl"
        style={{
          padding: "13px 24px",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 15,
          color: "#04110A",
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          boxShadow: "0 0 20px rgba(57,255,20,0.45)",
          textDecoration: "none",
        }}
      >
        Be the first to log a {label}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

function OozeBlobIllus({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 104 104"
      width="104"
      height="104"
      className="mx-auto"
      fill="none"
      aria-hidden="true"
      style={{ filter: `drop-shadow(0 0 10px ${accent}55)` }}
    >
      <path
        d="M32 18h40a12 12 0 0 1 12 12v22c0 18-14 32-32 32S20 70 20 52V30a12 12 0 0 1 12-12z"
        stroke="#00F0FF"
        strokeWidth="2.5"
        fill="rgba(0,240,255,0.05)"
      />
      <circle cx="36" cy="90" r="4" fill="#FF00E5" />
      <circle cx="64" cy="94" r="3" fill="#FF00E5" />
      <path
        d="M52 34v28M38 48h28"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Log card ──────────────────────────────────────────────────────────

function LogCard({ log }: { log: DiscoverLog }) {
  const rating =
    typeof log.rating_overall === "number"
      ? log.rating_overall.toFixed(1)
      : null;

  return (
    <Link
      href={`/slimes/${log.id}`}
      className="block rounded-2xl overflow-hidden transition-all active:scale-[0.985] hover:scale-[1.005]"
      style={{
        background: "rgba(45,10,78,0.28)",
        border: "1px solid rgba(120,60,180,0.42)",
        boxShadow: "0 0 18px rgba(0,240,255,0.06)",
      }}
    >
      {/* Cover photo — 172px tall per Design's spec. Rating pill sits
          top-right of the photo with a backdrop blur so it reads
          cleanly against any photo. */}
      {log.image_url ? (
        <div className="relative w-full overflow-hidden" style={{ height: 172 }}>
          <Image
            src={log.image_url}
            alt={log.slime_name ?? "slime"}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover"
          />
          {rating && <RatingPill value={rating} />}
        </div>
      ) : (
        <div
          className="relative w-full flex items-center justify-center"
          style={{
            height: 172,
            background:
              "linear-gradient(135deg, rgba(45,10,78,0.6), rgba(16,0,32,0.6))",
          }}
        >
          <div
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 36,
              color: "rgba(0,240,255,0.4)",
              letterSpacing: "-0.02em",
            }}
          >
            {(log.slime_name?.[0] ?? "?").toUpperCase()}
          </div>
          {rating && <RatingPill value={rating} />}
        </div>
      )}

      {/* Body */}
      <div className="px-[18px] pt-4 pb-[14px]">
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 19,
            color: "#FFFFFF",
            lineHeight: 1.15,
          }}
        >
          {log.slime_name ?? "Untitled"}
        </div>
        {log.brand_name_raw && (
          <div
            className="mt-1"
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 14,
              color: "#FF00E5",
            }}
          >
            {log.brand_name_raw}
          </div>
        )}

        {/* Footer: avatar + username + date */}
        <div
          className="flex items-center gap-2.5 mt-3.5 pt-3.5"
          style={{ borderTop: "1px solid rgba(120,60,180,0.28)" }}
        >
          <AvatarCircle url={log.avatar_url} username={log.username} />
          <span
            className="truncate flex-1 min-w-0"
            style={{
              fontFamily: "system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: "#FF00E5",
            }}
          >
            @{log.username ?? "unknown"}
          </span>
          <span
            style={{
              fontSize: 13,
              color: "rgba(245,245,245,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            {formatDate(log.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function RatingPill({ value }: { value: string }) {
  return (
    <span
      className="absolute inline-flex items-center gap-1"
      style={{
        top: 12,
        right: 12,
        padding: "6px 12px",
        borderRadius: 999,
        background: "rgba(10,4,18,0.72)",
        border: "1px solid #00F0FF",
        color: "#00F0FF",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 900,
        fontSize: 14,
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="#00F0FF"
        stroke="none"
        aria-hidden="true"
      >
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.1 6.6 20l1-6.1L3.2 9.5l6.1-.9z" />
      </svg>
      {value}
    </span>
  );
}
