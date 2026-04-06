"use client";

// components/profile/ProfileFeaturedSection.tsx
// Client wrapper that owns the edit-mode toggle for the featured slimes section.
// The parent server component passes all data in; this component holds no fetch logic.

import { useState } from "react";
import Link from "next/link";
import { SLIME_TYPE_LABELS, type SlimeType } from "@/lib/types"; // [Change: no local type labels]
import ProfileFeaturedEditor from "@/components/profile/ProfileFeaturedEditor";

type FeaturedLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  colors: string[] | null;
};

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
  initialFeaturedLogs: FeaturedLog[];
  initialFeaturedIds: string[];
  allCollectionLogs: CandidateLog[];
  userId: string;
};

// ─── Featured card ─────────────────────────────────────────────────────────────

function FeaturedCard({ log }: { log: FeaturedLog }) {
  const typeLabel =
    (log.slime_type && SLIME_TYPE_LABELS[log.slime_type as SlimeType]) ??
    log.slime_type ??
    null;
  const c1 = log.colors?.[0] ?? "#2D0A4E";
  const c2 = log.colors?.[1] ?? c1;
  const rating = log.rating_overall ?? 0;

  return (
    <Link
      href={`/slimes/${log.id}`}
      className="shrink-0 w-40 rounded-2xl overflow-hidden flex flex-col active:opacity-80 transition-opacity"
      style={{
        background: "rgba(45,10,78,0.35)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      {/* Image / gradient fallback */}
      <div className="w-full h-28 relative overflow-hidden">
        {log.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={log.image_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Card body */}
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-xs font-bold text-slime-text truncate leading-tight">
          {log.slime_name ?? "Untitled slime"}
        </p>
        <p className="text-[10px] text-slime-muted truncate">
          {log.brand_name_raw ?? "Unknown brand"}
        </p>

        {/* Star row */}
        {log.rating_overall != null && (
          <div
            className="flex items-center gap-0.5 mt-0.5"
            aria-label={`Rating: ${rating} out of 5`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill={i < rating ? "#39FF14" : "none"}
                stroke={i < rating ? "#39FF14" : "rgba(255,255,255,0.2)"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        )}

        {/* Type badge */}
        {typeLabel && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full self-start mt-0.5 truncate max-w-full"
            style={{
              background: "rgba(255,0,229,0.12)",
              color: "#FF00E5",
              border: "1px solid rgba(255,0,229,0.3)",
            }}
          >
            {typeLabel}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────

export default function ProfileFeaturedSection({
  initialFeaturedLogs,
  initialFeaturedIds,
  allCollectionLogs,
  userId,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  // featuredLogs is refreshed from the editor's saved state on Done
  const [featuredLogs, setFeaturedLogs] =
    useState<FeaturedLog[]>(initialFeaturedLogs);
  const [featuredIds, setFeaturedIds] = useState<string[]>(initialFeaturedIds);

  // [Change: on Done, re-derive displayed cards from allCollectionLogs
  // using the latest saved IDs returned by the editor — no extra fetch needed
  // because allCollectionLogs is already the full candidate set]
  function handleEditorDone(savedIds: string[]) {
    setFeaturedIds(savedIds);
    const byId: Record<string, CandidateLog> = {};
    for (const log of allCollectionLogs) byId[log.id] = log;
    setFeaturedLogs(
      savedIds.map((id) => byId[id]).filter(Boolean) as FeaturedLog[],
    );
    setEditorOpen(false);
  }

  return (
    <section className="px-4 mb-8">
      {/* Section header — always shown when section is visible */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          {/* Star icon in #39FF14 per spec */}
          <svg
            width="14"
            height="14"
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
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#39FF14" }}
          >
            Featured Slimes
          </p>
        </div>

        {/* Edit Featured button — owner only (always owner on /profile) */}
        {!editorOpen && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-slime-muted hover:text-slime-accent transition-colors active:opacity-70"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Featured
          </button>
        )}
      </div>

      {/* Editor replaces card row when open */}
      {editorOpen ? (
        <ProfileFeaturedEditor
          allLogs={allCollectionLogs}
          initialFeaturedIds={featuredIds}
          userId={userId}
          onDone={handleEditorDone}
        />
      ) : featuredLogs.length > 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {featuredLogs.map((log) => (
            <FeaturedCard key={log.id} log={log} />
          ))}
        </div>
      ) : (
        /* Empty state — owner prompt to pin slimes */
        <p className="text-sm text-slime-muted">Pin your top slimes</p>
      )}
    </section>
  );
}
