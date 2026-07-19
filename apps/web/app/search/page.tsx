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
// gap.
// [Item #28 Phase B — 2026-07-18] Relevance ranking + graceful
// degradation. Every section now scores each row: exact match (100)
// beats prefix (50) beats substring (10), then falls back to the
// section's existing tiebreaker (total_ratings for slimes,
// total_logs for brands, use_count for keywords). Per-section errors
// are tracked in state and surface as inline "couldn't load Brands"
// messages instead of silently dropping the section, so a Supabase
// hiccup on one query doesn't visually erase results the searcher
// might expect.
// [Item #28 Phase C — 2026-07-18] Added base-type chip filter above
// the Slimes section — user can narrow Slime results to a specific
// base type without a new query (in-memory filter). Chips only
// render when there are slime results with 2+ distinct base types
// to filter across, otherwise the row would just be visual noise.
// Typeahead lives on the Discover page's SearchHero (`typeahead`
// prop), NOT here — this page already renders live results below
// the input which would double-render with a typeahead dropdown.
// T161 (personal /collection search) still separate.

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

// Catalog slime shape returned from the initial `slimes` query.
// Doesn't have a `log_id` — that gets attached by the post-fetch
// enrichment step below (see the log_id doc on SlimeResult).
type RawSlime = {
  id: string;
  name: string;
  collection_name: string | null;
  base_type: string | null;
  image_url: string | null;
  avg_overall: number | null;
  total_ratings: number;
  brands: BrandJoin;
};

// [Item #28 Phase C hotfix 2026-07-18] Post-enrichment slime shape
// with `log_id` — the representative collection_logs.id we route to
// when a user clicks a slime row. `/slimes/[id]` fetches from
// `collection_logs`, NOT the `slimes` catalog, so linking to a
// catalog id 404s. Post-fetch we batch-query collection_logs to find
// each slime's most recent public log and attach its id here. Slimes
// with no public logs are dropped from the results (there's nowhere
// to route them yet — filed in the tracker as a follow-up to build
// a catalog-only detail page for zero-log slimes).
type SlimeResult = RawSlime & {
  log_id: string;
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
// profile_visibility = 'public').
// [Item #28 Phase C hotfix 2026-07-18] `display_name` was DROPPED
// from the view in migration T88 (see 20260521000045). Selecting or
// filtering on it errors the entire query and surfaces as the
// "couldn't load collectors" state in the UI. Username is the
// primary label everywhere else in the app; matching that pattern
// here.
type UserResult = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  is_premium: boolean;
};

// Strip characters that break PostgREST .or() filter parsing
function sanitizeForOrFilter(q: string): string {
  return q.replace(/[,()]/g, "").replace(/^\.+|\.+$/g, "");
}

// [Item #28 Phase B 2026-07-18] Relevance scoring helper.
//
// Every section receives rows that are already SUBSTRING matches
// (thanks to `ilike %q%`). This function tells us HOW GOOD a match a
// specific field is, so we can rank exact-name-matches above
// partial-bio-matches within a single section.
//
// Scale:
//   100 — normalized field IS the query (case- + whitespace-insensitive)
//    50 — field starts with the query (great for handles + brand names)
//    10 — field contains the query as a substring
//     0 — no match (or empty field)
//
// Callers pass an already-lowercased query for perf (avoids
// re-lowercasing across N rows × M fields).
function scoreMatch(
  field: string | null | undefined,
  loweredQuery: string,
): number {
  if (!field || !loweredQuery) return 0;
  const f = field.toLowerCase().trim();
  if (!f) return 0;
  if (f === loweredQuery) return 100;
  if (f.startsWith(loweredQuery)) return 50;
  if (f.includes(loweredQuery)) return 10;
  return 0;
}

// [Item #28 Phase B 2026-07-18] Which sections can independently fail
// their query and want an inline "couldn't load" fallback.
type SectionKey =
  | "slimes"
  | "brands"
  | "users"
  | "types"
  | "keywords";

type SectionErrorState = Partial<Record<SectionKey, string>>;

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
      // [Item #28 Phase C hotfix 2026-07-18] Uses log_id, not the
      // catalog slime id, because /slimes/[id] resolves against
      // collection_logs. See SlimeResult.log_id doc for context.
      href={`/slimes/${slime.log_id}`}
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
// initial-fallback with brand-gradient), @username + verified check +
// Pro badge inline. Links to /users/[username].
// [Item #28 Phase C hotfix 2026-07-18] display_name was dropped from
// profiles_public in T88; using username as the primary label
// (consistent with FollowListRow + PopularCollectorsCarousel).
function UserRow({ user }: { user: UserResult }) {
  const primary = `@${user.username}`;
  const initial = user.username.charAt(0).toUpperCase();
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
              color: "#00F0FF",
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

// [Item #28 Phase C 2026-07-18] Horizontal scrollable chip row for
// narrowing the Slimes section to a specific base type. First chip
// is always "All" (cyan-filled when selected). Each subsequent chip
// uses the base type's signature accent color (from
// SLIME_BASE_TYPE_COLORS) for its selected state so the chip row
// visually echoes the type carousel elsewhere in the app.
function BaseTypeFilterChips({
  types,
  selected,
  onSelect,
}: {
  types: SlimeBaseType[];
  selected: SlimeBaseType | null;
  onSelect: (v: SlimeBaseType | null) => void;
}) {
  return (
    <div
      className="flex gap-2 mb-3 overflow-x-auto"
      // Hide scrollbar for cleanliness — chip row is small so users
      // discover overflow via swipe, not visible scrollbars.
      style={{ scrollbarWidth: "none" }}
    >
      <FilterChip
        active={selected == null}
        label="All"
        accent="#00F0FF"
        onClick={() => onSelect(null)}
      />
      {types.map((t) => (
        <FilterChip
          key={t}
          active={selected === t}
          label={SLIME_BASE_TYPE_LABELS[t] ?? t}
          accent={SLIME_BASE_TYPE_COLORS[t]?.text ?? "#00F0FF"}
          onClick={() => onSelect(t)}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  label,
  accent,
  onClick,
}: {
  active: boolean;
  label: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full transition-all"
      style={{
        padding: "6px 14px",
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.02em",
        color: active ? "#0A0A0A" : accent,
        background: active ? accent : "rgba(45,10,78,0.35)",
        border: `1px solid ${active ? accent : "rgba(45,10,78,0.7)"}`,
        boxShadow: active ? `0 0 12px ${accent}55` : "none",
      }}
    >
      {label}
    </button>
  );
}

// [Item #28 Phase B 2026-07-18] Inline "couldn't load" fallback for
// when an individual section's Supabase query fails. Rendered inside
// the section header so the section keeps its label but shows an
// honest error state instead of silently disappearing.
function SectionErrorRow({ label }: { label: string }) {
  return (
    <div
      className="px-4 py-3 rounded-xl"
      style={{
        background: "rgba(255,61,110,0.08)",
        border: "1px solid rgba(255,61,110,0.35)",
        color: "rgba(245,245,245,0.75)",
        fontSize: 13,
      }}
    >
      Couldn&apos;t load {label} results. Try again in a moment.
    </div>
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
  // [Item #28 Phase B 2026-07-18] Per-section error state so a failed
  // Supabase query can render an inline "couldn't load X" fallback
  // instead of silently dropping the section.
  const [sectionErrors, setSectionErrors] = useState<SectionErrorState>(
    {},
  );
  // [Item #28 Phase C 2026-07-18] Optional base-type narrowing on the
  // Slimes section. `null` = show all. Filter is in-memory over the
  // already-fetched results so switching between types is instant.
  const [selectedBaseType, setSelectedBaseType] =
    useState<SlimeBaseType | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setTypeResults([]);
      setSlimeResults([]);
      setKeywordResults([]);
      setBrandResults([]);
      setUserResults([]);
      setSectionErrors({});
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      // Reset errors for this new query. Each section will set its
      // own key below only if the query fails.
      const errs: SectionErrorState = {};

      const lower = trimmed.toLowerCase();
      // [Item #28 Phase B 2026-07-18] Score + sort Types by relevance
      // instead of alphabetical / order of definition. A user
      // searching "butter" should land Butter → Butter Slime →
      // anything containing "butter" as the sort tail.
      const types: TypeResult[] = Object.entries(SLIME_BASE_TYPE_LABELS)
        .map(([key, label]) => ({
          key: key as SlimeBaseType,
          label,
          score: scoreMatch(label, lower),
        }))
        .filter((t) => t.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ key, label }) => ({ key, label }));

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
        // RLS-filters to profile_visibility = 'public'. Matches on
        // username only — display_name was dropped from the view in
        // migration T88 (see 20260521000045).
        supabase
          .from("profiles_public")
          .select("id, username, avatar_url, is_verified, is_premium")
          .ilike("username", `%${safeQ}%`)
          .limit(10),
      ]);

      // Log subtype lookup errors — search still works via the
      // name/collection path if the join hiccups. This one doesn't
      // get a user-facing message because it's a QUERY ENHANCEMENT
      // (widens slime matches), not a section of its own.
      if (subtypesRes.error) {
        console.warn(
          "[search] subtype lookup failed:",
          subtypesRes.error.message,
        );
      }
      // [Item #28 Phase B 2026-07-18] Per-section error tracking.
      // Log to console AND record a per-section error message so the
      // UI can show inline "couldn't load" copy instead of silently
      // dropping the section.
      if (tagsRes.error) {
        console.warn(
          "[search] tag lookup failed:",
          tagsRes.error.message,
        );
        errs.keywords = tagsRes.error.message;
      }
      if (brandsRes.error) {
        console.warn(
          "[search] brand lookup failed:",
          brandsRes.error.message,
        );
        errs.brands = brandsRes.error.message;
      }
      if (usersRes.error) {
        console.warn(
          "[search] user lookup failed:",
          usersRes.error.message,
        );
        errs.users = usersRes.error.message;
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

      // Merge + dedupe by id. Also remember which slimes came in via
      // the subtype-alias path so Phase B can boost them (they matched
      // by variant, which is genuine relevance even if the slime's own
      // name doesn't contain the query).
      const seenIds = new Set<string>();
      const merged: RawSlime[] = [];
      const matchedBySubtype = new Set<string>();
      let slimeQueryFailed = false;
      for (let i = 0; i < slimesResults.length; i++) {
        const res = slimesResults[i];
        if (!res) continue;
        if (res.error) {
          console.warn(
            "[search] slime query failed:",
            res.error.message,
          );
          slimeQueryFailed = true;
          continue;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows: any[] = (res.data as any[]) ?? [];
        // Index 1 is the subtype-id union query; anything found there
        // gets the Phase B subtype boost.
        const isSubtypePath = i === 1;
        for (const s of rows) {
          if (seenIds.has(s.id)) continue;
          seenIds.add(s.id);
          if (isSubtypePath) matchedBySubtype.add(s.id);
          merged.push({
            ...s,
            brands: Array.isArray(s.brands)
              ? (s.brands[0] ?? null)
              : s.brands,
          } as RawSlime);
        }
      }
      // [Item #28 Phase B 2026-07-18] Track slime-section failure only
      // when BOTH slime queries failed. If the name/collection query
      // returned rows but the subtype query hiccuped, the section
      // still has meaningful results and we don't want an alarming
      // "couldn't load" banner.
      if (slimeQueryFailed && merged.length === 0) {
        errs.slimes = "Slime query failed";
      }
      // [Item #28 Phase B 2026-07-18] Score each merged slime:
      //   - Slime name is the strongest signal (score 0..100)
      //   - Collection name is a weaker signal (0.6× multiplier)
      //   - Subtype-match rows get a fixed +15 relevance boost
      // Tiebreaker stays as total_ratings so popular slimes with
      // equivalent relevance still bubble up.
      const scoredSlimes = merged.map((s) => ({
        row: s,
        score:
          Math.max(
            scoreMatch(s.name, lower),
            scoreMatch(s.collection_name, lower) * 0.6,
          ) + (matchedBySubtype.has(s.id) ? 15 : 0),
      }));
      scoredSlimes.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.row.total_ratings ?? 0) - (a.row.total_ratings ?? 0);
      });
      const rankedRawSlimes: RawSlime[] = scoredSlimes
        .map((r) => r.row)
        .slice(0, 20);

      // [Item #28 Phase C hotfix 2026-07-18] Enrich each ranked slime
      // with a representative collection_logs.id so SlimeRow can link
      // to a real log detail page (see SlimeResult / RawSlime docs
      // above). One batch query for all slimes in the result set.
      const slimeIds = rankedRawSlimes.map((s) => s.id);
      const logIdBySlime = new Map<string, string>();
      if (slimeIds.length > 0) {
        const { data: logRows, error: logErr } = await supabase
          .from("collection_logs")
          .select("id, slime_id, created_at")
          .in("slime_id", slimeIds)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (logErr) {
          console.warn(
            "[search] log-id enrichment failed:",
            logErr.message,
          );
        }
        for (const l of logRows ?? []) {
          const sid = (l as { slime_id: string | null }).slime_id;
          const lid = (l as { id: string }).id;
          if (sid && !logIdBySlime.has(sid)) {
            logIdBySlime.set(sid, lid);
          }
        }
      }
      // Attach log_id and drop slimes with no public log — there's no
      // catalog-only detail page yet, so an unclickable row would be
      // a dead end.
      const normalizedSlimes: SlimeResult[] = rankedRawSlimes
        .map((s) => {
          const log_id = logIdBySlime.get(s.id);
          return log_id ? { ...s, log_id } : null;
        })
        .filter((s): s is SlimeResult => s !== null);

      // [Item #28 Phase B 2026-07-18] Score + sort Brands. Score
      // primarily on name (0..100), secondarily on slug (0.7×). Bio
      // matches are already included via the .or() ilike filter, but
      // we DON'T rank on bio — a substring match in a long free-text
      // bio doesn't reliably signal relevance. Tiebreaker stays as
      // total_logs so well-known brands bubble up on ties.
      const rawBrands = (brandsRes.data ?? []) as BrandResult[];
      const scoredBrands = rawBrands.map((b) => ({
        row: b,
        score: Math.max(
          scoreMatch(b.name, lower),
          scoreMatch(b.slug, lower) * 0.7,
        ),
      }));
      scoredBrands.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.row.total_logs ?? 0) - (a.row.total_logs ?? 0);
      });
      const normalizedBrands = scoredBrands.map((r) => r.row);

      // [Item #28 Phase B 2026-07-18] Score + sort Collectors on the
      // username field only (display_name no longer exists on
      // profiles_public — see hotfix note above).
      const rawUsers = (usersRes.data ?? []) as UserResult[];
      const scoredUsers = rawUsers.map((u) => ({
        row: u,
        score: scoreMatch(u.username, lower),
      }));
      scoredUsers.sort((a, b) => b.score - a.score);
      const normalizedUsers = scoredUsers.map((r) => r.row);

      // [Item #28 Phase B 2026-07-18] Keyword rows are already
      // prefix-matched at query time (ilike ${q}%), but within that
      // prefix set we want an exact-match tag on top of a
      // longer-prefix tag. Then fall back to use_count for popularity.
      const rawTags = (tagsRes.data ?? []) as TagResult[];
      const scoredTags = rawTags.map((t) => ({
        row: t,
        score: scoreMatch(t.name, lower),
      }));
      scoredTags.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.row.use_count ?? 0) - (a.row.use_count ?? 0);
      });
      const normalizedTags = scoredTags.map((r) => r.row);

      setTypeResults(types);
      setSlimeResults(normalizedSlimes);
      setKeywordResults(normalizedTags);
      // [Item #28 Phase A 2026-07-18] Persist brand + user results.
      // Cast is here because the auto-generated types from Supabase
      // widen json/boolean columns in a way that doesn't line up 1:1
      // with our narrower interface. Fields are hand-verified against
      // the query above.
      setBrandResults(normalizedBrands);
      setUserResults(normalizedUsers);
      setSectionErrors(errs);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const trimmed = query.trim();
  const hasErrors = Object.keys(sectionErrors).length > 0;

  // [Item #28 Phase C 2026-07-18] Compute the distinct base types
  // present in the current slime results — these are the chips we'll
  // render as a filter row. Only render the row if there are ≥2
  // distinct types (otherwise the row would just contain "All" and
  // one chip, useless).
  const slimeBaseTypes: SlimeBaseType[] = Array.from(
    new Set(
      slimeResults
        .map((s) => s.base_type as SlimeBaseType | null)
        .filter((t): t is SlimeBaseType => !!t),
    ),
  );
  const shouldShowBaseTypeFilter = slimeBaseTypes.length >= 2;

  // Apply the filter for the render pass. Passthrough when null.
  const filteredSlimes =
    selectedBaseType == null
      ? slimeResults
      : slimeResults.filter((s) => s.base_type === selectedBaseType);

  // Reset the filter when the query changes so a new search doesn't
  // land you on an empty section because the previous query's filter
  // is stuck on a base type that isn't in the new results.
  useEffect(() => {
    setSelectedBaseType(null);
  }, [query]);
  const hasResults =
    typeResults.length > 0 ||
    slimeResults.length > 0 ||
    keywordResults.length > 0 ||
    // [Item #28 Phase A 2026-07-18] Include brand + user counts so the
    // "no results" empty state doesn't fire when we DO have brand or
    // collector matches (just no slime/type/keyword).
    brandResults.length > 0 ||
    userResults.length > 0 ||
    // [Item #28 Phase B 2026-07-18] If any section errored, we still
    // want to render the sections wrapper so the inline "couldn't
    // load" fallback shows instead of the generic "no results"
    // empty state — those are different signals.
    hasErrors;

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
                  {/* [Item #28 Phase B 2026-07-18] Each section now
                      renders its results OR (if the section-specific
                      Supabase query failed) an inline SectionErrorRow.
                      Sections with zero results AND no error still
                      hide themselves — that's the empty-tail case. */}
                  {(slimeResults.length > 0 || sectionErrors.slimes) && (
                    <section>
                      <p className="section-label mb-3">Slimes</p>
                      {sectionErrors.slimes ? (
                        <SectionErrorRow label="slime" />
                      ) : (
                        <>
                          {/* [Item #28 Phase C 2026-07-18]
                              Base-type filter chip row. Only shown
                              when there are ≥2 distinct base types
                              in the current results. In-memory
                              filter over the already-fetched slimes
                              so switching is instant. */}
                          {shouldShowBaseTypeFilter && (
                            <BaseTypeFilterChips
                              types={slimeBaseTypes}
                              selected={selectedBaseType}
                              onSelect={setSelectedBaseType}
                            />
                          )}
                          {filteredSlimes.length > 0 ? (
                            <div className="flex flex-col gap-2">
                              {filteredSlimes.map((s) => (
                                <SlimeRow key={s.id} slime={s} />
                              ))}
                            </div>
                          ) : (
                            <div
                              className="px-4 py-3 rounded-xl text-sm"
                              style={{
                                background: "rgba(45,10,78,0.20)",
                                border: "1px dashed rgba(45,10,78,0.55)",
                                color: "rgba(245,245,245,0.65)",
                              }}
                            >
                              No slimes match this base type in your
                              current search. Try another chip or
                              clear the filter.
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  )}

                  {(brandResults.length > 0 || sectionErrors.brands) && (
                    <section>
                      <p className="section-label mb-3">Brands</p>
                      {sectionErrors.brands ? (
                        <SectionErrorRow label="brand" />
                      ) : (
                        <div className="flex flex-col gap-2">
                          {brandResults.map((b) => (
                            <BrandRow key={b.id} brand={b} />
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {(userResults.length > 0 || sectionErrors.users) && (
                    <section>
                      <p className="section-label mb-3">Collectors</p>
                      {sectionErrors.users ? (
                        <SectionErrorRow label="collector" />
                      ) : (
                        <div className="flex flex-col gap-2">
                          {userResults.map((u) => (
                            <UserRow key={u.id} user={u} />
                          ))}
                        </div>
                      )}
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

                  {(keywordResults.length > 0 || sectionErrors.keywords) && (
                    <section>
                      <p className="section-label mb-3">Keywords</p>
                      {sectionErrors.keywords ? (
                        <SectionErrorRow label="keyword" />
                      ) : (
                        <div className="flex flex-col gap-2">
                          {keywordResults.map((tag) => (
                            <KeywordRow key={tag.id} tag={tag} />
                          ))}
                        </div>
                      )}
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
