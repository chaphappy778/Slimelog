// apps/web/app/discover/keyword/page.tsx
// [T74-B] Keyword search page — trending tags, live search, stubbed favorites

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const inputCls =
  "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder:text-slime-muted focus:outline-none focus:ring-1 focus:ring-slime-accent/40 focus:border-slime-accent/50 transition pl-10";

type Tag = { id: string; name: string; use_count: number };

function KeywordRow({ tag }: { tag: Tag }) {
  return (
    <Link
      href={`/discover/keyword/${encodeURIComponent(tag.name)}`}
      className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.6)",
      }}
    >
      <div className="flex items-center gap-3">
        {/* Tag icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "#F5F5F5" }}>
          {tag.name}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: "rgba(245,245,245,0.45)" }}>
          {tag.use_count} logs
        </span>
        {/* T79-favorites: stub heart button — no persistence yet */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            // T79-favorites: wire to user_keyword_favorites table
          }}
          aria-label={`Save ${tag.name}`}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            lineHeight: 0,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(204,68,255,0.5)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </Link>
  );
}

function KeywordPageInner() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Tag[]>([]);
  const [searching, setSearching] = useState(false);
  const [trendingTags, setTrendingTags] = useState<Tag[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  // Fetch trending on mount
  useEffect(() => {
    supabase
      .from("tags")
      .select("id, name, use_count")
      .order("use_count", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setTrendingTags(data ?? []);
        setLoadingTrending(false);
      });
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("tags")
        .select("id, name, use_count")
        .ilike("name", `${query.trim()}%`)
        .order("use_count", { ascending: false })
        .limit(20);
      setResults(data ?? []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      <main className="pt-14 pb-24 px-4">
        {/* Back button */}
        <div className="pt-4 mb-4">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
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

        {/* Page title */}
        <div className="mb-5">
          <h1 className="text-2xl font-black" style={{ color: "#00F0FF" }}>
            Keywords
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            Browse and search community tags
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(245,245,245,0.35)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
          <input
            className={inputCls}
            placeholder="Search keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Results — when query is non-empty */}
        {query.trim() && (
          <section className="mb-6">
            <p
              className="section-label mb-3"
              style={{
                color: "rgba(245,245,245,0.45)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Results
            </p>
            {searching ? (
              <p
                className="text-sm"
                style={{ color: "rgba(245,245,245,0.45)" }}
              >
                Searching...
              </p>
            ) : results.length === 0 ? (
              <p
                className="text-sm"
                style={{ color: "rgba(245,245,245,0.45)" }}
              >
                No keywords found.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {results.map((tag) => (
                  <KeywordRow key={tag.id} tag={tag} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Trending — when no query */}
        {!query.trim() && (
          <section>
            <p
              className="section-label mb-3"
              style={{
                color: "rgba(245,245,245,0.45)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Trending Keywords
            </p>
            {loadingTrending ? (
              <p
                className="text-sm"
                style={{ color: "rgba(245,245,245,0.45)" }}
              >
                Loading...
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {trendingTags.map((tag) => (
                  <KeywordRow key={tag.id} tag={tag} />
                ))}
              </div>
            )}
          </section>
        )}
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
