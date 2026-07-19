// apps/web/app/search/page.tsx
// [Global search page] — routes to slime types, slime catalog, brands,
// collectors, and keywords.
// [Discover V1 2026-07-13] Redesigned to visually match the Discover
// SearchHero. Reads the `?q=` URL param on mount so users landing
// from /discover?q=butter see their query in the field and the
// results already computed. Types matched in memory; slimes + tags +
// brands + collectors fetched from Supabase.
// [Item #28 Phase A — 2026-07-18] Global search now returns Brand +
// Collector sections. Previously the empty-state copy promised
// "slimes, base types, brands, and keywords" but only the first three
// were actually searched — brand queries returned zero rows and
// there was no way to find a user by @handle. Phase A closes that
// gap. Phase B (relevance ranking, typeahead, faceted filters) and
// T161 (personal /collection search) still to come.

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import SearchHero from "@/components/discover/SearchHero";
import {
  SLIME_BASE_TYPE_LABELS,
  SLIME_BASE_TYPE_COLORS,
  type SlimeBaseType,
} from "@/lib/types";

// Module-level browser client — never inside component body
const supabase = createClient();

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

// [Item #28 Phase A 2026-07-18] Brand search result row shape. All
// fields are materialized on the `brands` table so this is a single
// cheap query — no per-brand aggregation needed.
type BrandResult = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean;
  follower_count: number;
  total_logs: number;
};

// [Item #28 Phase A 2026-07-18] Collector search result row shape.
// Reads from `profiles_public` view (already RLS-filtered to
// profile_visibility = 'public'). Log counts intentionally omitted
// in Phase A — would require per-row aggregation against
// collection_logs. Phase B adds those + relevance ranking.
type UserResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  is_premium: boolean;
};

// Strip characters that break PostgREST .or() filter parsing
function sanitizeForOrFilter(q: string): string {
  return q.replace(/[,()]/g, "").replace(/^\.+|\.+$/g, "");
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
      <span
        style={{
          color: accentColor,
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        {result.label}
      </span>
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
    secondaryLine = `${brandName} · ${collectionName}`;
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

      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#F5F5F5",
          }}
        >
          {slime.name}
        </p>
        {secondaryLine && (
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: "#FF7BEB" }}
          >
            {secondaryLine}
          </p>
        )}
      </div>

      {ratingDisplay != null && (
        <div className="shrink-0 text-right">
          <div
            className="tabular-nums leading-none"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 18,
              color: "#00F0FF",
            }}
          >
            {ratingDisplay}
          </div>
          <div
            className="text-[9.5px] mt-1"
            style={{ color: "rgba(245,245,245,0.4)" }}
          >
            {slime.total_ratings} ratings
          </div>
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
        <span
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#F5F5F5",
          }}
        >
          {tag.name}
        </span>
      </div>
      <span
        className="tabular-nums font-bold"
        style={{
          color: "#7BFF7B",
          fontSize: 12,
        }}
      >
        {tag.use_count} logs
      </span>
    </Link>
  );
}

// [Item #28 Phase A 2026-07-18] Brand row — 44px logo (matches
// SlimeRow silhouette so mixed sections visually align), name +
// verified check inline, follower count + log count on the secondary
// line. Links to /brands/[slug].
function BrandRow({ brand }: { brand: BrandResult }) {
  const initial = brand.name.charAt(0).toUpperCase();
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.6)",
      }}
    >
      <div
        className="shrink-0 rounded-lg overflow-hidden relative"
        style={{ width: 44, height: 44, background: "rgba(45,10,78,0.5)" }}
      >
        {brand.logo_url ? (
          <Image
            src={brand.logo_url}
            alt={brand.name}
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(0,240,255,0.35), rgba(255,0,229,0.35))",
              color: "#FFFFFF",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {initial}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: "#F5F5F5",
            }}
          >
            {brand.name}
          </p>
          {brand.is_verified && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="#39FF14"
              aria-label="Verified"
              className="shrink-0"
            >
              <circle cx="12" cy="12" r="10" />
              <path
                d="M8 12l3 3 5-6"
                stroke="#0A0A0A"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "rgba(245,245,245,0.55)" }}
        >
          {brand.follower_count.toLocaleString()} followers ·{" "}
          {brand.total_logs.toLocaleString()} logs
        </p>
      </div>

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
        className="shrink-0"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

// [Item #28 Phase A 2026-07-18] Collector row — 44px avatar (or
// initial-fallback with brand-gradient), display_name + verified
// check + Pro badge, @username on secondary line. Links to
// /users/[username].
function UserRow({ user }: { user: UserResult }) {
  const primary = user.display_name?.trim() || user.username;
  const initial = primary.charAt(0).toUpperCase();
  return (
    <Link
      href={`/users/${user.username}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.6)",
      }}
    >
      <div
        className="shrink-0 rounded-full overflow-hidden relative"
        style={{
          width: 44,
          height: 44,
          background: "rgba(45,10,78,0.5)",
          border: user.is_verified
            ? "1.5px solid #39FF14"
            : "1.5px solid transparent",
        }}
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={primary}
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(135deg, rgba(57,255,20,0.35), rgba(0,240,255,0.35))",
              color: "#FFFFFF",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 18,
            }}
          >
            {initial}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className="truncate"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: "#F5F5F5",
            }}
          >
            {primary}
          </p>
          {user.is_premium && (
            <span
              className="shrink-0 tabular-nums"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 800,
                fontSize: 9,
                letterSpacing: "0.08em",
                color: "#FFD24A",
                border: "1px solid rgba(255,210,74,0.55)",
                borderRadius: 4,
                padding: "1px 5px",
                textTransform: "uppercase",
              }}
            >
              Pro
            </span>
          )}
        </div>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "#00F0FF" }}
        >
          @{user.username}
        </p>
      </div>

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
        className="shrink-0"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function SearchPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [searching, setSearching] = useState(false);
  const [typeResults, setTypeResults] = useState<TypeResult[]>([]);
  const [slimeResults, setSlimeResults] = useState<SlimeResult[]>([]);
  const [keywordResults, setKeywordResults] = useState<TagResult[]>([]);
  // [Item #28 Phase A 2026-07-18] Brand + collector result state.
  const [brandResults, setBrandResults] = useState<BrandResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTypeResults([]);
      setSlimeResults([]);
      setKeywordResults([]);
      setBrandResults([]);
      setUserResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);

      const lower = trimmed.toLowerCase();
      const types: TypeResult[] = Object.entries(SLIME_BASE_TYPE_LABELS)
        .filter(([, label]) => label.toLowerCase().includes(lower))
        .map(([key, label]) => ({ key: key as SlimeBaseType, label }));

      const safeQ = sanitizeForOrFilter(trimmed);

      // 2026-07-16 Commit B-display: variant-aware search. First look
      // up subtypes whose name OR aliases match the query so users
      // searching "cloud puff" or "fluffernutter" hit slimes whose
      // subtype has that name/alias. Then fetch slimes by BOTH the
      // existing name/collection filter AND (union) subtype_id in the
      // matched set. Dedupe by id + preserve total_ratings ordering.
      //
      // [Item #28 Phase A 2026-07-18] Added parallel brand + user
      // queries here so a single .then() wave fans all five sections
      // out at once instead of chaining.
      const [subtypesRes, tagsRes, brandsRes, usersRes] = await Promise.all([
        supabase
          .from("subtypes")
          .select("id, name, aliases")
          .or(
            `name.ilike.%${safeQ}%,aliases.cs.{${trimmed.toLowerCase()}}`,
          )
          .limit(20),

        supabase
          .from("tags")
          .select("id, name, use_count")
          .ilike("name", `${trimmed}%`)
          .order("use_count", { ascending: false })
          .limit(20),

        // Brand search — hits materialized name, slug, and bio.
        // Ordered by total_logs desc so a well-known brand outranks a
        // name-alike newcomer. All fields on the row are already
        // stored on `brands` (no per-row aggregation), so this is a
        // single cheap read.
        supabase
          .from("brands")
          .select(
            "id, slug, name, logo_url, is_verified, follower_count, total_logs",
          )
          .or(
            `name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%,bio.ilike.%${safeQ}%`,
          )
          .order("total_logs", { ascending: false })
          .limit(10),

        // Collector search against profiles_public. The view already
        // RLS-filters to profile_visibility = 'public', so no
        // extra guard needed. Matches username OR display_name.
        supabase
          .from("profiles_public")
          .select(
            "id, username, display_name, avatar_url, is_verified, is_premium",
          )
          .or(
            `username.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`,
          )
          .limit(10),
      ]);

      // Log (but don't surface) subtype lookup errors — search still
      // works via the name/collection path if the join hiccups.
      if (subtypesRes.error) {
        console.warn(
          "[search] subtype lookup failed:",
          subtypesRes.error.message,
        );
      }
      if (tagsRes.error) {
        console.warn(
          "[search] tag lookup failed:",
          tagsRes.error.message,
        );
      }
      // [Item #28 Phase A 2026-07-18] Same warn-only pattern for the
      // new sections. A failure in one section should never take out
      // the whole page.
      if (brandsRes.error) {
        console.warn(
          "[search] brand lookup failed:",
          brandsRes.error.message,
        );
      }
      if (usersRes.error) {
        console.warn(
          "[search] user lookup failed:",
          usersRes.error.message,
        );
      }

      const matchedSubtypeIds: string[] = (subtypesRes.data ?? []).map(
        (r: { id: string }) => r.id,
      );

      // Slime fetches — one by name/collection, one by matched
      // subtype_id list (only if there were any matches). Both queries
      // return the same shape so merging is trivial.
      const slimeSelect =
        "id, name, collection_name, base_type, image_url, avg_overall, total_ratings, brands(name, slug)";

      const nameCollectionQuery = supabase
        .from("slimes")
        .select(slimeSelect)
        .or(`name.ilike.%${safeQ}%,collection_name.ilike.%${safeQ}%`)
        .order("total_ratings", { ascending: false })
        .limit(20);
      const subtypeIdsQuery =
        matchedSubtypeIds.length > 0
          ? supabase
              .from("slimes")
              .select(slimeSelect)
              .in("subtype_id", matchedSubtypeIds)
              .order("total_ratings", { ascending: false })
              .limit(20)
          : null;
      const slimesResults = await Promise.all([
        nameCollectionQuery,
        subtypeIdsQuery,
      ]);

      // Merge + dedupe by id, keeping the highest total_ratings first.
      const seenIds = new Set<string>();
      const merged: SlimeResult[] = [];
      for (const res of slimesResults) {
        if (!res) continue;
        if (res.error) {
          console.warn(
            "[search] slime query failed:",
            res.error.message,
          );
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = (res.data as any[]) ?? [];
        for (const s of rows) {
          if (seenIds.has(s.id)) continue;
          seenIds.add(s.id);
          merged.push({
            ...s,
            brands: Array.isArray(s.brands)
              ? (s.brands[0] ?? null)
              : s.brands,
          } as SlimeResult);
        }
      }
      // Re-sort merged list by total_ratings desc so the union stays
      // meaningful (the two queries were each already sorted, but the
      // interleaving loses that ordering).
      merged.sort(
        (a, b) => (b.total_ratings ?? 0) - (a.total_ratings ?? 0),
      );
      const normalizedSlimes: SlimeResult[] = merged.slice(0, 20);

      setTypeResults(types);
      setSlimeResults(normalizedSlimes);
      setKeywordResults(tagsRes.data ?? []);
      // [Item #28 Phase A 2026-07-18] Persist brand + user results.
      // Cast is here because the auto-generated types from Supabase
      // widen json/boolean columns in a way that doesn't line up 1:1
      // with our narrower interface. Fields are hand-verified against
      // the query above.
      setBrandResults((brandsRes.data ?? []) as BrandResult[]);
      setUserResults((usersRes.data ?? []) as UserResult[]);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const trimmed = query.trim();
  const hasResults =
    typeResults.length > 0 ||
    slimeResults.length > 0 ||
    keywordResults.length > 0 ||
    // [Item #28 Phase A 2026-07-18] Include brand + user counts so the
    // "no results" empty state doesn't fire when we DO have brand or
    // collector matches (just no slime/type/keyword).
    brandResults.length > 0 ||
    userResults.length > 0;

  // Update the URL as the user types so refresh / share works.
  // `replace` (not `push`) so the back button skips the intermediate
  // states.
  useEffect(() => {
    const t = query.trim();
    const target = t ? `/search?q=${encodeURIComponent(t)}` : "/search";
    router.replace(target, { scroll: false });
  }, [query, router]);

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />
      <main className="pt-14 pb-24">
        {/* Back button */}
        <div className="px-4 mb-3 mt-2">
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 text-sm"
            style={{ color: "rgba(245,245,245,0.55)" }}
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

        {/* Search hero — same visual as Discover so the transition
            reads as continuous. Autofocus so refining is a single
            tap. Live-updates URL and results as the user types. */}
        <SearchHero
          initialValue={initialQ}
          onValueChange={setQuery}
          onSubmit={() => {
            /* no-op — results update live via onValueChange */
          }}
          autoFocus
        />

        {/* Results */}
        <div className="px-4">
          {/* Empty query — illustrated prompt */}
          {!trimmed && (
            <SearchEmptyPrompt />
          )}

          {trimmed && (
            <>
              {searching && <SearchSkeleton />}

              {!searching && !hasResults && (
                <SearchNoResults query={trimmed} />
              )}

              {/* [T33a 2026-07-13] Section order per Design's spec:
                  Slimes → Types → Keywords. Impact first, less-common
                  matches after.
                  [Item #28 Phase A 2026-07-18] Extended to include
                  Brands + Collectors. Order is Slimes → Brands →
                  Collectors → Types → Keywords — same "impact first"
                  logic (concrete slime/brand hits are typically what
                  a searcher wants; taxonomy + tags are refinements).
                  Real relevance ranking is Phase B; for now each
                  section is independently ordered by its own signal
                  (total_ratings for slimes, total_logs for brands,
                  use_count for keywords). */}
              {!searching && hasResults && (
                <div className="flex flex-col gap-8">
                  {slimeResults.length > 0 && (
                    <section>
                      <p className="section-label mb-3">Slimes</p>
                      <div className="flex flex-col gap-2">
                        {slimeResults.map((s) => (
                          <SlimeRow key={s.id} slime={s} />
                        ))}
                      </div>
                    </section>
                  )}

                  {brandResults.length > 0 && (
                    <section>
                      <p className="section-label mb-3">Brands</p>
                      <div className="flex flex-col gap-2">
                        {brandResults.map((b) => (
                          <BrandRow key={b.id} brand={b} />
                        ))}
                      </div>
                    </section>
                  )}

                  {userResults.length > 0 && (
                    <section>
                      <p className="section-label mb-3">Collectors</p>
                      <div className="flex flex-col gap-2">
                        {userResults.map((u) => (
                          <UserRow key={u.id} user={u} />
                        ))}
                      </div>
                    </section>
                  )}

                  {typeResults.length > 0 && (
                    <section>
                      <p className="section-label mb-3">Slime Types</p>
                      <div className="flex flex-col gap-2">
                        {typeResults.map((t) => (
                          <TypeRow key={t.key} result={t} />
                        ))}
                      </div>
                    </section>
                  )}

                  {keywordResults.length > 0 && (
                    <section>
                      <p className="section-label mb-3">Keywords</p>
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
        </div>
      </main>
    </PageWrapper>
  );
}

// ─── Illustrated states ────────────────────────────────────────────────
// [T33a 2026-07-13] Line-SVG ooze blob illustrations for empty query
// and no-results. Line SVG only, no illustration (anti-AI-art rule).

function OozeBlob({ variant }: { variant: "search" | "x" }) {
  return (
    <svg
      viewBox="0 0 104 104"
      width="104"
      height="104"
      className="mx-auto"
      fill="none"
      aria-hidden="true"
      style={{ filter: "drop-shadow(0 0 10px rgba(0,240,255,0.35))" }}
    >
      <path
        d="M32 18h40a12 12 0 0 1 12 12v22c0 18-14 32-32 32S20 70 20 52V30a12 12 0 0 1 12-12z"
        stroke="#00F0FF"
        strokeWidth="2.5"
        fill="rgba(0,240,255,0.05)"
      />
      <circle cx="36" cy="90" r="4" fill="#FF00E5" />
      <circle cx="64" cy="94" r="3" fill="#FF00E5" />
      {variant === "search" ? (
        <>
          <circle
            cx="47"
            cy="45"
            r="12"
            fill="none"
            stroke="#00F0FF"
            strokeWidth="3"
          />
          <path
            d="M56 54l9 9"
            stroke="#00F0FF"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <path
          d="M40 40l24 24M64 40 40 64"
          stroke="#00F0FF"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function SearchEmptyPrompt() {
  return (
    <div className="text-center pt-14 pb-6">
      <OozeBlob variant="search" />
      <h3
        className="mt-5"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          color: "#FFFFFF",
          letterSpacing: "-0.01em",
        }}
      >
        Search the ooze
      </h3>
      <p
        className="mx-auto mt-2"
        style={{
          maxWidth: 280,
          fontSize: 15,
          lineHeight: 1.5,
          color: "rgba(245,245,245,0.55)",
        }}
      >
        Find slimes, brands, collectors, base types, and keywords
        across the whole community.
      </p>
    </div>
  );
}

function SearchNoResults({ query }: { query: string }) {
  return (
    <div className="text-center pt-10 pb-6">
      <OozeBlob variant="x" />
      <h3
        className="mt-5"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 22,
          color: "#FFFFFF",
          letterSpacing: "-0.01em",
        }}
      >
        No results for &ldquo;{query}&rdquo;
      </h3>
      <p
        className="mx-auto mt-2 mb-5"
        style={{
          maxWidth: 280,
          fontSize: 15,
          lineHeight: 1.5,
          color: "rgba(245,245,245,0.55)",
        }}
      >
        We could not find any slimes, brands, collectors, types, or
        keywords. Try a different spelling or browse Discover.
      </p>
      <Link
        href="/discover"
        className="inline-flex items-center gap-2 rounded-2xl transition-colors"
        style={{
          padding: "12px 22px",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 15,
          background: "rgba(0,240,255,0.06)",
          border: "1px solid rgba(0,240,255,0.4)",
          color: "#00F0FF",
          textDecoration: "none",
        }}
      >
        Back to Discover
      </Link>
    </div>
  );
}

// Skeleton row — matches the SlimeRow silhouette (44px thumb + 2 text
// lines). Three of them stack to fake the "results loading" state.
function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-2 pt-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl"
          style={{
            height: 68,
            background:
              "linear-gradient(100deg, rgba(45,10,78,0.28) 30%, rgba(120,60,180,0.28) 50%, rgba(45,10,78,0.28) 70%)",
            backgroundSize: "220% 100%",
            animation: "shimmer 1.2s linear infinite",
            border: "1px solid rgba(45,10,78,0.55)",
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageInner />
    </Suspense>
  );
}
