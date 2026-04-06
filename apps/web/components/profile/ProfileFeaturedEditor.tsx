"use client";

// components/profile/ProfileFeaturedEditor.tsx
// Lets the profile owner select up to 3 featured slimes.
// Saves immediately on each toggle via PATCH to profiles.featured_log_ids.
// onDone receives the final saved IDs so the parent can update display without a refetch.

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { SLIME_TYPE_LABELS, type SlimeType } from "@/lib/types"; // [Change: no local type labels]

type CandidateLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  colors: string[] | null;
};

type Props = {
  allLogs: CandidateLog[];
  initialFeaturedIds: string[];
  userId: string;
  /** Called when user taps Done. Receives the final saved featured IDs. */
  onDone: (savedIds: string[]) => void;
};

const MAX = 3;

// ─── Star SVGs ─────────────────────────────────────────────────────────────────

function StarFilled({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#39FF14"
      stroke="#39FF14"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function StarOutline({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(255,255,255,0.3)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

// ─── Gradient swatch for logs without an image ─────────────────────────────────

function ColorSwatch({ colors }: { colors: string[] | null }) {
  const c1 = colors?.[0] ?? "#2D0A4E";
  const c2 = colors?.[1] ?? c1;
  return (
    <div
      className="w-full h-full rounded-xl"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      aria-hidden="true"
    />
  );
}

// ─── Candidate row ─────────────────────────────────────────────────────────────

function CandidateRow({
  log,
  featured,
  atMax,
  onToggle,
  saving,
}: {
  log: CandidateLog;
  featured: boolean;
  atMax: boolean;
  onToggle: () => void;
  saving: boolean;
}) {
  const typeLabel =
    (log.slime_type && SLIME_TYPE_LABELS[log.slime_type as SlimeType]) ??
    log.slime_type ??
    null;
  const disabled = saving || (!featured && atMax);

  return (
    <li className="flex items-center gap-3 py-3 border-b border-slime-border/50 last:border-0">
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-slime-surface border border-slime-border">
        {log.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={log.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <ColorSwatch colors={log.colors} />
        )}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slime-text truncate leading-tight">
          {log.slime_name ?? "Untitled slime"}
        </p>
        <p className="text-xs text-slime-muted truncate">
          {log.brand_name_raw ?? "Unknown brand"}
          {typeLabel && (
            <>
              {" · "}
              <span className="text-slime-magenta">{typeLabel}</span>
            </>
          )}
        </p>
      </div>

      {/* Rating */}
      {log.rating_overall != null && (
        <p className="text-xs font-bold text-slime-cyan shrink-0 tabular-nums">
          {log.rating_overall}/5
        </p>
      )}

      {/* Toggle star */}
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={featured ? "Remove from featured" : "Add to featured"}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-opacity active:opacity-60 disabled:opacity-30"
        style={{
          background: featured
            ? "rgba(57,255,20,0.12)"
            : "rgba(255,255,255,0.04)",
          border: featured
            ? "1px solid rgba(57,255,20,0.4)"
            : "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {featured ? <StarFilled /> : <StarOutline />}
      </button>
    </li>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────────

export default function ProfileFeaturedEditor({
  allLogs,
  initialFeaturedIds,
  userId,
  onDone,
}: Props) {
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function toggle(logId: string) {
    const isFeatured = featuredIds.includes(logId);
    if (!isFeatured && featuredIds.length >= MAX) return;

    const newIds = isFeatured
      ? featuredIds.filter((id) => id !== logId)
      : [...featuredIds, logId];

    // Optimistic update
    setFeaturedIds(newIds);
    setError(null);
    setSaving(true);

    const { error: saveErr } = await supabase
      .from("profiles")
      .update({ featured_log_ids: newIds })
      .eq("id", userId);

    setSaving(false);
    if (saveErr) {
      // Roll back
      setFeaturedIds(featuredIds);
      setError("Couldn\u2019t save \u2014 please try again.");
    }
  }

  const atMax = featuredIds.length >= MAX;

  return (
    <div
      className="rounded-2xl px-4 pb-4"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between py-3 border-b border-slime-border/50 mb-1">
        <div>
          <p className="text-sm font-bold text-slime-text">
            Select Featured Slimes
          </p>
          <p className="text-xs text-slime-muted mt-0.5">
            {featuredIds.length}/{MAX} selected
            {atMax && (
              <span className="ml-2 italic">Max 3 featured slimes</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDone(featuredIds)}
          className="px-4 py-1.5 rounded-full text-xs font-bold text-slime-bg transition-opacity active:opacity-70"
          style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
        >
          Done
        </button>
      </div>

      {error && <p className="text-xs text-red-400 pt-2 pb-1">{error}</p>}

      {allLogs.length === 0 ? (
        <div className="py-8 text-center text-slime-muted text-sm">
          No logs in your collection yet.{" "}
          <Link href="/log" className="text-slime-accent font-semibold">
            Log a slime
          </Link>{" "}
          to get started.
        </div>
      ) : (
        <ul role="list">
          {allLogs.map((log) => (
            <CandidateRow
              key={log.id}
              log={log}
              featured={featuredIds.includes(log.id)}
              atMax={atMax}
              onToggle={() => toggle(log.id)}
              saving={saving}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
