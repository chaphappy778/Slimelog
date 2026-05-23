// apps/web/components/profile/PublicFeaturedSlimes.tsx
"use client";

import StackedSlimes from "@/components/profile/StackedSlimes";

type FeaturedLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  colors: string[] | null;
};

type Props = {
  featuredLogs: FeaturedLog[];
};

// ─── Section ───────────────────────────────────────────────────────────────────

export default function PublicFeaturedSlimes({ featuredLogs }: Props) {
  // Per spec: return null when empty — no "Pin your top slimes" copy on public profiles
  if (!featuredLogs || featuredLogs.length === 0) return null;

  return (
    <section className="px-4 mb-6">
      {/* Section header — matches owner profile exactly */}
      <div className="flex items-center gap-1.5 mb-3">
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

      <StackedSlimes featuredLogs={featuredLogs} />
    </section>
  );
}
