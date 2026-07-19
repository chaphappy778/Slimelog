// apps/web/components/discover/SearchTypeaheadDropdown.tsx
// [Item #28 Phase C — 2026-07-18] Absolute-positioned dropdown that
// renders directly under the SearchHero input, offering "top N of
// each" quick-navigation hits as the user types. Distinct from the
// full /search page in that:
//   - Fires after only 2 chars (versus /search's live results-below
//     pattern which starts at 1)
//   - Debounced 250ms
//   - Renders top 3 slimes + top 3 brands + top 2 collectors max
//   - Each row navigates directly to the entity page (skipping
//     /search) — the point of typeahead is fewer taps
//   - Bottom row is a "See all results for X" link that acts like
//     hitting Enter — routes to /search?q=X
//
// SearchHero owns the raw <input>; this component only handles the
// dropdown UI and the fetching + ranking behind it. It re-uses the
// same scoreMatch relevance system as /search for ordering.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

// Module-level browser client — same singleton pattern as /search.
const supabase = createClient();

// Same shape helpers as /search/page.tsx. Kept lean because the
// dropdown only shows a handful of rows.
// [Item #28 Phase C hotfix 2026-07-18] `log_id` is the representative
// collection_logs.id we route to when a user clicks a slime row.
// /slimes/[id] resolves against collection_logs, not the slimes
// catalog, so linking to a catalog id 404s. Post-fetch we
// batch-query collection_logs to find each slime's most recent
// public log and attach its id here. Slimes with no public log get
// dropped from the dropdown (no clickable destination).
type SlimeHit = {
  id: string;
  name: string;
  base_type: string | null;
  image_url: string | null;
  brands: { name: string; slug: string } | null;
  log_id: string;
};

type BrandHit = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean;
};

// [Item #28 Phase C hotfix 2026-07-18] Removed `display_name` — the
// column was dropped from `profiles_public` in migration T88.
// Selecting or filtering on it errors the whole query.
type UserHit = {
  id: string;
  username: string;
  avatar_url: string | null;
};

interface Props {
  /** Current search query (comes from the SearchHero input). */
  query: string;
  /** Whether the input is currently focused. Dropdown hides on blur. */
  focused: boolean;
  /**
   * Called when the user picks a "See all results" row. SearchHero
   * uses this to also submit the input (route to /search?q=X).
   */
  onSeeAll: (query: string) => void;
  /**
   * Called when the user picks an entity row. SearchHero uses this
   * to also clear its focus / value so navigation feels clean.
   */
  onEntityPick?: () => void;
}

function sanitize(q: string): string {
  return q.replace(/[,()]/g, "").replace(/^\.+|\.+$/g, "");
}

function scoreMatch(field: string | null | undefined, lower: string): number {
  if (!field || !lower) return 0;
  const f = field.toLowerCase().trim();
  if (!f) return 0;
  if (f === lower) return 100;
  if (f.startsWith(lower)) return 50;
  if (f.includes(lower)) return 10;
  return 0;
}

export default function SearchTypeaheadDropdown({
  query,
  focused,
  onSeeAll,
  onEntityPick,
}: Props) {
  const [slimes, setSlimes] = useState<SlimeHit[]>([]);
  const [brands, setBrands] = useState<BrandHit[]>([]);
  const [users, setUsers] = useState<UserHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSlimes([]);
      setBrands([]);
      setUsers([]);
      return;
    }

    // 250ms debounce — enough to avoid quering on every keystroke,
    // fast enough that the dropdown feels responsive.
    const t = setTimeout(async () => {
      setLoading(true);
      const safeQ = sanitize(trimmed);
      const lower = trimmed.toLowerCase();

      // Fire all three lookups in parallel. Each is a very cheap
      // ilike query with a small limit so we can afford to run them
      // on every debounced keystroke.
      const [slimesRes, brandsRes, usersRes] = await Promise.all([
        supabase
          .from("slimes")
          .select("id, name, base_type, image_url, brands(name, slug)")
          .or(`name.ilike.%${safeQ}%,collection_name.ilike.%${safeQ}%`)
          .order("total_ratings", { ascending: false })
          .limit(8),
        supabase
          .from("brands")
          .select("id, slug, name, logo_url, is_verified")
          .or(`name.ilike.%${safeQ}%,slug.ilike.%${safeQ}%`)
          .order("total_logs", { ascending: false })
          .limit(8),
        supabase
          .from("profiles_public")
          .select("id, username, avatar_url")
          .ilike("username", `%${safeQ}%`)
          .limit(8),
      ]);

      // Log-only errors so the dropdown never falls back to noise
      // when one lookup hiccups — we just show fewer categories.
      if (slimesRes.error) {
        console.warn("[typeahead] slime lookup failed:", slimesRes.error.message);
      }
      if (brandsRes.error) {
        console.warn("[typeahead] brand lookup failed:", brandsRes.error.message);
      }
      if (usersRes.error) {
        console.warn("[typeahead] user lookup failed:", usersRes.error.message);
      }

      // Normalize slime brands join (Supabase returns as array in some
      // cases; we always want an object-or-null). log_id is filled in
      // by the enrichment step below.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSlimes: any[] = (slimesRes.data as any[]) ?? [];
      type PreSlime = Omit<SlimeHit, "log_id"> & { log_id: string | null };
      const preSlimes: PreSlime[] = rawSlimes.map((s) => ({
        id: s.id,
        name: s.name,
        base_type: s.base_type,
        image_url: s.image_url,
        brands: Array.isArray(s.brands) ? (s.brands[0] ?? null) : s.brands,
        log_id: null,
      }));

      // Rank first so we only enrich the top-N with a log id lookup.
      const scoredPre = preSlimes
        .map((s) => ({ row: s, score: scoreMatch(s.name, lower) }))
        .sort((a, b) => b.score - a.score);
      const topPre = scoredPre.slice(0, 5).map((r) => r.row);

      // [Item #28 Phase C hotfix 2026-07-18] Enrich each of the top
      // slimes with a representative public collection_logs.id.
      // /slimes/[id] resolves against collection_logs so we must link
      // to a log id, not a catalog slime id (which 404s). One batch
      // query keeps this cheap.
      const topSlimeIds = topPre.map((s) => s.id);
      const logIdBySlime = new Map<string, string>();
      if (topSlimeIds.length > 0) {
        const { data: logRows, error: logErr } = await supabase
          .from("collection_logs")
          .select("id, slime_id, created_at")
          .in("slime_id", topSlimeIds)
          .eq("is_public", true)
          .order("created_at", { ascending: false });
        if (logErr) {
          console.warn(
            "[typeahead] log-id enrichment failed:",
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
      // Drop pre-slimes that have no public log — a catalog-only
      // slime has no /slimes/[id] destination in the current app.
      const scoredSlimes = topPre
        .map((s) => {
          const log_id = logIdBySlime.get(s.id);
          return log_id ? ({ ...s, log_id } as SlimeHit) : null;
        })
        .filter((s): s is SlimeHit => s !== null)
        .map((row) => ({ row, score: 0 }));
      const scoredBrands = ((brandsRes.data ?? []) as BrandHit[])
        .map((b) => ({
          row: b,
          score: Math.max(
            scoreMatch(b.name, lower),
            scoreMatch(b.slug, lower) * 0.7,
          ),
        }))
        .sort((a, b) => b.score - a.score);
      const scoredUsers = ((usersRes.data ?? []) as UserHit[])
        .map((u) => ({
          row: u,
          score: scoreMatch(u.username, lower),
        }))
        .sort((a, b) => b.score - a.score);

      // slice already applied above via topPre.slice(0,5) — take the
      // top 3 that survived enrichment for the dropdown.
      setSlimes(scoredSlimes.slice(0, 3).map((r) => r.row));
      setBrands(scoredBrands.slice(0, 3).map((r) => r.row));
      setUsers(scoredUsers.slice(0, 2).map((r) => r.row));
      setLoading(false);
    }, 250);

    return () => clearTimeout(t);
  }, [query]);

  const trimmed = query.trim();
  const shouldRender = focused && trimmed.length >= 2;
  const hasAny = slimes.length > 0 || brands.length > 0 || users.length > 0;

  if (!shouldRender) return null;

  return (
    <div
      className="absolute left-4 right-4 rounded-2xl overflow-hidden"
      style={{
        top: "calc(100% - 12px)",
        zIndex: 40,
        background: "rgba(10,0,20,0.96)",
        border: "1px solid rgba(0,240,255,0.35)",
        boxShadow:
          "0 12px 40px rgba(0,0,0,0.65), 0 0 24px rgba(0,240,255,0.18)",
        backdropFilter: "blur(20px)",
      }}
      // MouseDown on the dropdown itself must not blur the input —
      // otherwise the click never lands. We intercept mousedown
      // rather than click so React doesn't fire blur first.
      onMouseDown={(e) => e.preventDefault()}
    >
      {loading && !hasAny && (
        <div
          className="px-4 py-3 text-sm"
          style={{ color: "rgba(245,245,245,0.55)" }}
        >
          Searching…
        </div>
      )}

      {!loading && !hasAny && (
        <div
          className="px-4 py-3 text-sm"
          style={{ color: "rgba(245,245,245,0.55)" }}
        >
          No quick matches. Press Enter to search everywhere.
        </div>
      )}

      {slimes.length > 0 && (
        <TypeaheadSection label="Slimes">
          {slimes.map((s) => (
            <TypeaheadSlimeRow
              key={s.id}
              slime={s}
              onPick={onEntityPick}
            />
          ))}
        </TypeaheadSection>
      )}

      {brands.length > 0 && (
        <TypeaheadSection label="Brands">
          {brands.map((b) => (
            <TypeaheadBrandRow
              key={b.id}
              brand={b}
              onPick={onEntityPick}
            />
          ))}
        </TypeaheadSection>
      )}

      {users.length > 0 && (
        <TypeaheadSection label="Collectors">
          {users.map((u) => (
            <TypeaheadUserRow
              key={u.id}
              user={u}
              onPick={onEntityPick}
            />
          ))}
        </TypeaheadSection>
      )}

      {/* "See all" row — behaves like hitting Enter. Always shown
          when there's a real query so the user has a clear escape
          hatch to the full results page. */}
      <button
        type="button"
        onClick={() => onSeeAll(trimmed)}
        className="w-full text-left px-4 py-3 flex items-center justify-between transition-all"
        style={{
          background: "rgba(0,240,255,0.06)",
          borderTop: "1px solid rgba(0,240,255,0.18)",
          color: "#00F0FF",
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span>See all results for &ldquo;{trimmed}&rdquo;</span>
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
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}

// ─── Row helpers (compact — smaller than /search page rows) ───────

function TypeaheadSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="px-4 pt-2 pb-1"
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontWeight: 800,
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "rgba(0,240,255,0.75)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <div>{children}</div>
    </div>
  );
}

function TypeaheadSlimeRow({
  slime,
  onPick,
}: {
  slime: SlimeHit;
  onPick?: () => void;
}) {
  return (
    <Link
      // [Item #28 Phase C hotfix 2026-07-18] Route to log_id, not the
      // catalog slime id (see SlimeHit doc above).
      href={`/slimes/${slime.log_id}`}
      onClick={onPick}
      className="flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{ borderBottom: "1px solid rgba(45,10,78,0.35)" }}
    >
      <div
        className="shrink-0 rounded-md overflow-hidden"
        style={{ width: 32, height: 32, background: "rgba(45,10,78,0.5)" }}
      >
        {slime.image_url && (
          <Image
            src={slime.image_url}
            alt={slime.name}
            width={32}
            height={32}
            className="object-cover w-full h-full"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#F5F5F5",
          }}
        >
          {slime.name}
        </p>
        {slime.brands?.name && (
          <p
            className="truncate text-[11px]"
            style={{ color: "#FF7BEB" }}
          >
            {slime.brands.name}
          </p>
        )}
      </div>
    </Link>
  );
}

function TypeaheadBrandRow({
  brand,
  onPick,
}: {
  brand: BrandHit;
  onPick?: () => void;
}) {
  const initial = brand.name.charAt(0).toUpperCase();
  return (
    <Link
      href={`/brands/${brand.slug}`}
      onClick={onPick}
      className="flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{ borderBottom: "1px solid rgba(45,10,78,0.35)" }}
    >
      <div
        className="shrink-0 rounded-md overflow-hidden"
        style={{ width: 32, height: 32, background: "rgba(45,10,78,0.5)" }}
      >
        {brand.logo_url ? (
          <Image
            src={brand.logo_url}
            alt={brand.name}
            width={32}
            height={32}
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
              fontSize: 14,
            }}
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <p
          className="truncate"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#F5F5F5",
          }}
        >
          {brand.name}
        </p>
        {brand.is_verified && (
          <svg
            width="11"
            height="11"
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
    </Link>
  );
}

function TypeaheadUserRow({
  user,
  onPick,
}: {
  user: UserHit;
  onPick?: () => void;
}) {
  // display_name was dropped from profiles_public in T88, so
  // username is the only label we can show.
  const initial = user.username.charAt(0).toUpperCase();
  return (
    <Link
      href={`/users/${user.username}`}
      onClick={onPick}
      className="flex items-center gap-3 px-4 py-2.5 transition-all"
      style={{ borderBottom: "1px solid rgba(45,10,78,0.35)" }}
    >
      <div
        className="shrink-0 rounded-full overflow-hidden"
        style={{ width: 32, height: 32, background: "rgba(45,10,78,0.5)" }}
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={user.username}
            width={32}
            height={32}
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
              fontSize: 14,
            }}
          >
            {initial}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#00F0FF",
          }}
        >
          @{user.username}
        </p>
      </div>
    </Link>
  );
}
