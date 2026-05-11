// apps/web/components/profile/PublicFeaturedSlimes.tsx
"use client";

import Link from "next/link";
import { SLIME_BASE_TYPE_LABELS, type SlimeBaseType } from "@/lib/types";

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

// ─── Featured card (read-only, identical visual to owner profile) ─────────────

function FeaturedCard({ log }: { log: FeaturedLog }) {
  const typeLabel =
    (log.base_type && SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType]) ??
    log.base_type ??
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
        {/* [Label rename] Featured Slimes → Favorite Slimes */}
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "#39FF14" }}
        >
          Favorite Slimes
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {featuredLogs.map((log) => (
          <FeaturedCard key={log.id} log={log} />
        ))}
      </div>
    </section>
  );
}
