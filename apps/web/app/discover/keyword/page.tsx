// apps/web/app/discover/keyword/page.tsx
// [T74-B] Keyword browse page — trending tags + live search.
// [T33a 2026-07-13] Redesigned per Design's Discover results pack.
// 2-column grid of 132px keyword tiles with gradient backgrounds +
// `#tagname` in Montserrat 800 + green log count with glow. Live
// search sits above the grid; typing filters the tile set instead of
// swapping to a list view.
//
// Anti-AI-art rule respected: gradient thumbnails are geometric, no
// illustration.

"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Tag = { id: string; name: string; use_count: number };

// Rotating gradient thumbnails — assigned to tiles deterministically
// by tag name hash so a tag always gets the same visual. Design's
// mockup used th-galaxy / th-cloud / th-cyan / th-magenta / th-green /
// th-gold / th-clear / th-ice. Ported inline as CSS gradients.
const TILE_GRADIENTS: string[] = [
  // galaxy
  "radial-gradient(circle at 30% 25%, #00F0FF, #7a1fd0 45%, #FF00E5 90%)",
  // cloud
  "radial-gradient(circle at 32% 28%, #ffffff, #d7c6ff 55%, #7d5fd0)",
  // cyan
  "radial-gradient(circle at 32% 28%, #c9fbff, #00F0FF 55%, #00707d)",
  // magenta
  "radial-gradient(circle at 32% 28%, #ff9bef, #FF00E5 55%, #7a0075)",
  // green
  "radial-gradient(circle at 32% 28%, #e2ffd6, #39FF14 55%, #1b7e08)",
  // gold
  "radial-gradient(circle at 32% 28%, #fff0c2, #FFD24A 55%, #b8860b)",
  // clear
  "radial-gradient(circle at 32% 28%, #eafffb, #a9e9df 50%, #3f9d8e)",
  // ice
  "radial-gradient(circle at 32% 28%, #ffffff, #aef4ff 45%, #3aa8c8)",
];

function gradientForName(name: string): string {
  // Deterministic hash → gradient index so a given tag is stable.
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TILE_GRADIENTS[h % TILE_GRADIENTS.length];
}

function KeywordTile({ tag }: { tag: Tag }) {
  return (
    <Link
      href={`/discover/keyword/${encodeURIComponent(tag.name)}`}
      className="relative block rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        height: 132,
        boxShadow:
          "inset 0 2px 8px rgba(255,255,255,0.18), 0 0 18px rgba(0,240,255,0.06)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: gradientForName(tag.name) }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "linear-gradient(to top, rgba(10,4,18,0.9), rgba(10,4,18,0.05) 70%)",
        }}
      />
      <div className="absolute left-3.5 right-3.5 bottom-3">
        <div
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 18,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
          }}
        >
          #{tag.name}
        </div>
        <div
          className="mt-0.5"
          style={{
            color: "#7BFF7B",
            fontWeight: 700,
            fontSize: 13,
            textShadow: "0 0 8px rgba(57,255,20,0.4)",
          }}
        >
          {tag.use_count} log{tag.use_count !== 1 ? "s" : ""}
        </div>
      </div>
    </Link>
  );
}

function TileSkeleton() {
  return (
    <div
      className="rounded-2xl"
      style={{
        height: 132,
        background:
          "linear-gradient(100deg, rgba(45,10,78,0.28) 30%, rgba(120,60,180,0.28) 50%, rgba(45,10,78,0.28) 70%)",
        backgroundSize: "220% 100%",
        animation: "shimmer 1.2s linear infinite",
      }}
      aria-hidden="true"
    />
  );
}

function KeywordPageInner() {
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("tags")
      .select("id, name, use_count")
      .order("use_count", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setTags(data ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(q));
  }, [query, tags]);

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24">
        {/* Back link */}
        <div className="px-4 pt-4 mb-3">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-[15px]"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            Back to Discover
          </Link>
        </div>

        {/* Section label + descriptive sub */}
        <div className="px-4 mb-3">
          <p className="section-label mb-1">Trending keywords</p>
          <p
            className="text-[14px]"
            style={{ color: "rgba(245,245,245,0.55)" }}
          >
            What the community is oozing about right now.
          </p>
        </div>

        {/* Live filter input — filters the tile set in place */}
        <div className="px-4 mb-4">
          <label
            className="flex items-center gap-3 rounded-2xl"
            style={{
              padding: "12px 16px",
              background: "rgba(10,4,18,0.55)",
              border: "1px solid rgba(0,240,255,0.4)",
              boxShadow: "0 0 18px rgba(0,240,255,0.14)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter keywords"
              className="flex-1 bg-transparent outline-none text-[15px]"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                color: "#FFFFFF",
              }}
              aria-label="Filter keywords"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear filter"
                style={{
                  width: 24,
                  height: 24,
                  color: "rgba(245,245,245,0.6)",
                  lineHeight: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </label>
        </div>

        {/* Tile grid */}
        <div className="px-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <TileSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p
                className="text-sm"
                style={{ color: "rgba(245,245,245,0.5)" }}
              >
                {query
                  ? `No keywords match "${query}".`
                  : "No keywords tracked yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((tag) => (
                <KeywordTile key={tag.id} tag={tag} />
              ))}
            </div>
          )}
        </div>
      </main>
    </PageWrapper>
  );
}

export default function KeywordPage() {
  return (
    <Suspense>
      <KeywordPageInner />
    </Suspense>
  );
}
