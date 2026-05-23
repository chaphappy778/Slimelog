// apps/web/components/profile/ProfileFeaturedSection.tsx
"use client";

// Client wrapper that owns the edit-mode toggle for the favorite slimes section.
// The parent server component passes all data in; this component holds no fetch logic.

import { useState } from "react";
import StackedSlimes from "@/components/profile/StackedSlimes";
import ProfileFeaturedEditor from "@/components/profile/ProfileFeaturedEditor";

type FeaturedLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  colors: string[] | null;
};

type CandidateLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
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

// ─── Section ───────────────────────────────────────────────────────────────────

export default function ProfileFeaturedSection({
  initialFeaturedLogs,
  initialFeaturedIds,
  allCollectionLogs,
  userId,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
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
    <section className="px-4 mt-6 mb-12">
      {/* Section header — always shown when section is visible */}
      <div className="flex items-center justify-between mb-5">
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
            Favorite Slimes
          </p>
        </div>

        {/* Edit Favorites button — owner only (always owner on /profile) */}
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
            Edit Favorites
          </button>
        )}
      </div>

      {/* Editor replaces card stack when open */}
      {editorOpen ? (
        <ProfileFeaturedEditor
          allLogs={allCollectionLogs}
          initialFeaturedIds={featuredIds}
          userId={userId}
          onDone={handleEditorDone}
        />
      ) : featuredLogs.length > 0 ? (
        <StackedSlimes featuredLogs={featuredLogs} />
      ) : (
        /* Empty state — owner prompt to pin slimes */
        <p className="text-sm text-slime-muted">Pin your top slimes</p>
      )}
    </section>
  );
}
