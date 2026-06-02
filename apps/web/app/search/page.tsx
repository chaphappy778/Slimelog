// apps/web/app/search/page.tsx
// [Change 2] Global search page — routes to slime types, slime catalog, and keywords

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import {
  SLIME_BASE_TYPE_LABELS,
  SLIME_BASE_TYPE_COLORS,
  type SlimeBaseType,
} from "@/lib/types";

// Module-level browser client — never inside component body
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const inputCls =
  "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder:text-slime-muted focus:outline-none focus:ring-1 focus:ring-slime-accent/40 focus:border-slime-accent/50 transition pl-10";

type BrandJoin = { name: string; slug: string } | null;

type SlimeResult = {
  id: string;
  name: string;
  collection_name: string | null;
  base_type: string | null;
  image_url: string | null;
  avg_overall: number | null;
  total_ratings: number;
  brands: BrandJoin;
};

type TagResult = {
  id: string;
  name: string;
  use_count: number;
};

type TypeResult = {
  key: SlimeBaseType;
  label: string;
};

// Strip characters that break PostgREST .or() filter parsing
function sanitizeForOrFilter(q: string): string {
  return q.replace(/[,()]/g, "").replace(/^\.+|\.+$/g, "");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "rgba(245,245,245,0.45)",
      }}
      className="mb-2"
    >
      {children}
    </p>
  );
}

function TypeRow({ result }: { result: TypeResult }) {
  const accentColor = SLIME_BASE_TYPE_COLORS[result.key]?.text ?? "#00F0FF";
  return (
    <Link
      href={`/discover/type/${result.key}`}
      className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.6)",
      }}
    >
      <span className="text-sm font-semibold" style={{ color: accentColor }}>
        {result.label}
      </span>
      {/* Right chevron */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(245,245,245,0.35)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function SlimeRow({ slime }: { slime: SlimeResult }) {
  const ratingDisplay =
    slime.avg_overall != null
      ? parseFloat(slime.avg_overall.toFixed(2)).toString()
      : null;

  const brandName = slime.brands?.name ?? null;
  const collectionName = slime.collection_name ?? null;

  let secondaryLine: string | null = null;
  if (brandName && collectionName) {
    secondaryLine = `${brandName}  ${collectionName}`;
  } else if (brandName) {
    secondaryLine = brandName;
  } else if (collectionName) {
    secondaryLine = collectionName;
  }

  return (
    <Link
      href={`/slimes/${slime.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.6)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="shrink-0 rounded-lg overflow-hidden"
        style={{ width: 44, height: 44, background: "rgba(45,10,78,0.5)" }}
      >
        {slime.image_url ? (
          <Image
            src={slime.image_url}
            alt={slime.name}
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "#F5F5F5" }}
        >
          {slime.name}
        </p>
        {secondaryLine && (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            {secondaryLine}
          </p>
        )}
      </div>

      {/* Rating */}
      {ratingDisplay != null && (
        <div className="shrink-0 flex items-center gap-1">
          {/* Small star dot */}
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="#00F0FF"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="5" />
          </svg>
          <span className="text-xs font-semibold" style={{ color: "#00F0FF" }}>
            {ratingDisplay}
          </span>
        </div>
      )}
    </Link>
  );
}

function KeywordRow({ tag }: { tag: TagResult }) {
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
      <span className="text-xs" style={{ color: "rgba(245,245,245,0.45)" }}>
        {tag.use_count} logs
      </span>
    </Link>
  );
}

function SearchPageInner() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [typeResults, setTypeResults] = useState<TypeResult[]>([]);
  const [slimeResults, setSlimeResults] = useState<SlimeResult[]>([]);
  const [keywordResults, setKeywordResults] = useState<TagResult[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTypeResults([]);
      setSlimeResults([]);
      setKeywordResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);

      // In-memory type matching
      const lower = trimmed.toLowerCase();
      const types: TypeResult[] = Object.entries(SLIME_BASE_TYPE_LABELS)
        .filter(([, label]) => label.toLowerCase().includes(lower))
        .map(([key, label]) => ({ key: key as SlimeBaseType, label }));

      // Sanitize query for PostgREST .or() filter
      const safeQ = sanitizeForOrFilter(trimmed);

      // Parallel DB queries
      const [slimesRes, tagsRes] = await Promise.all([
        supabase
          .from("slimes")
          .select(
            "id, name, collection_name, base_type, image_url, avg_overall, total_ratings, brands(name, slug)",
          )
          .or(`name.ilike.%${safeQ}%,collection_name.ilike.%${safeQ}%`)
          .order("total_ratings", { ascending: false })
          .limit(20),

        supabase
          .from("tags")
          .select("id, name, use_count")
          .ilike("name", `${trimmed}%`)
          .order("use_count", { ascending: false })
          .limit(20),
      ]);

      // Normalize brands join
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSlimes: any[] = slimesRes.data ?? [];
      const normalizedSlimes: SlimeResult[] = rawSlimes.map((s) => ({
        ...s,
        brands: Array.isArray(s.brands) ? (s.brands[0] ?? null) : s.brands,
      }));

      setTypeResults(types);
      setSlimeResults(normalizedSlimes);
      setKeywordResults(tagsRes.data ?? []);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const trimmed = query.trim();
  const hasResults =
    typeResults.length > 0 ||
    slimeResults.length > 0 ||
    keywordResults.length > 0;

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      <main className="pt-14 pb-24 px-4">
        {/* Back button */}
        <div className="mb-5 mt-2">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to Discover
          </Link>
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-black" style={{ color: "#00F0FF" }}>
            Search
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgba(245,245,245,0.45)" }}
          >
            Find slimes, types, and keywords
          </p>
        </div>

        {/* Search input */}
        <div className="relative mb-6">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(245,245,245,0.4)"
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
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Results */}
        {trimmed && (
          <>
            {searching && (
              <p
                className="text-sm text-center py-4"
                style={{ color: "rgba(245,245,245,0.45)" }}
              >
                Searching...
              </p>
            )}

            {!searching && !hasResults && (
              <p
                className="text-sm text-center py-4"
                style={{ color: "rgba(245,245,245,0.45)" }}
              >
                No results found.
              </p>
            )}

            {!searching && (
              <div className="flex flex-col gap-6">
                {/* Slime Types */}
                {typeResults.length > 0 && (
                  <section>
                    <SectionLabel>Slime Types</SectionLabel>
                    <div className="flex flex-col gap-2">
                      {typeResults.map((t) => (
                        <TypeRow key={t.key} result={t} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Slimes */}
                {slimeResults.length > 0 && (
                  <section>
                    <SectionLabel>Slimes</SectionLabel>
                    <div className="flex flex-col gap-2">
                      {slimeResults.map((s) => (
                        <SlimeRow key={s.id} slime={s} />
                      ))}
                    </div>
                  </section>
                )}

                {/* Keywords */}
                {keywordResults.length > 0 && (
                  <section>
                    <SectionLabel>Keywords</SectionLabel>
                    <div className="flex flex-col gap-2">
                      {keywordResults.map((tag) => (
                        <KeywordRow key={tag.id} tag={tag} />
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </PageWrapper>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
