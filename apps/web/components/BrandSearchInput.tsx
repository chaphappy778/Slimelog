"use client";
// apps/web/components/BrandSearchInput.tsx
//
// 2026-07-11 (log wizard audit): hardened after Jennifer reported that
// the auto-brand-fill "sometimes" didn't populate. Three fixes:
//
//   1. Errors are no longer swallowed — a failed query now logs a
//      warning AND keeps the dropdown open with a "search failed"
//      message so we notice next time. Same class as the recent
//      brands.name_raw 400s that ran silent for hours.
//   2. Race protection: rapid typing (P → Pi → Pig) can fire multiple
//      requests. If the "P" response arrives after "Pig", it used to
//      overwrite the fresher results. Now we tag each request with an
//      incrementing id and drop responses from stale requests.
//   3. Component now returns the catalog brand_id even when the parent
//      passes in a prefilled `value` (e.g. from `?brand=Cloud%20Nine`).
//      See the new "prefill lookup" effect. Previously the field
//      showed the name but brand_id stayed null, so the log saved
//      without a catalog link.
//
// T110 (2026-07-11): when the current query is >= 2 chars and returns
// no results (and isn't an errored request), render a "Not seeing your
// brand? Submit it →" link in the dropdown so users can escape into
// /submit-brand without abandoning the log flow. Prefills the name.

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandResult {
  id: string;
  name: string;
  slug: string;
  verification_tier: string | null;
}

interface Props {
  value: string;
  onChange: (brandName: string, brandId: string | null) => void;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandSearchInput({
  value,
  onChange,
  placeholder = "Search brands...",
}: Props) {
  const [results, setResults] = useState<BrandResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Race protection: increment on every new request; only apply a
  // response if its id still matches the latest request.
  const requestIdRef = useRef(0);
  // Prefill lookup happens exactly once — otherwise every keystroke
  // that clears brand_id would retrigger it.
  const prefillLookedUpRef = useRef(false);

  // ── Fetch matching brands ─────────────────────────────────────────────────

  const fetchBrands = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setErrored(false);

    // 2026-07-16 Jennifer flagged: substring search + alphabetical
    // sort meant typing "P" surfaced "Alpha" first because it contains
    // a P. We now query prefix + substring in parallel, then merge
    // with prefix matches ranked first so what the user typed
    // actually leads. Both queries alphabetically sorted within their
    // buckets.
    const trimmed = query.trim();
    const [prefixRes, substringRes] = await Promise.all([
      supabase
        .from("brands")
        .select("id, name, slug, verification_tier")
        .ilike("name", `${trimmed}%`)
        .order("name")
        .limit(10),
      supabase
        .from("brands")
        .select("id, name, slug, verification_tier")
        .ilike("name", `%${trimmed}%`)
        .order("name")
        .limit(10),
    ]);

    // Stale-response guard — a newer keystroke has already fired.
    if (myRequestId !== requestIdRef.current) return;

    if (prefixRes.error || substringRes.error) {
      console.warn(
        "[BrandSearchInput] brand search failed:",
        prefixRes.error?.message ?? substringRes.error?.message,
      );
      setResults([]);
      setErrored(true);
      setOpen(true);
      setLoading(false);
      return;
    }

    const prefixHits = prefixRes.data ?? [];
    const substringHits = substringRes.data ?? [];
    const prefixIds = new Set(prefixHits.map((b) => b.id));
    // Merge: prefix matches first (already alpha within bucket), then
    // substring matches that weren't already in the prefix bucket.
    const merged = [
      ...prefixHits,
      ...substringHits.filter((b) => !prefixIds.has(b.id)),
    ].slice(0, 10);

    setResults(merged);
    setErrored(false);
    setOpen(true);
    setLoading(false);
  }, []);

  // ── One-shot prefill lookup ───────────────────────────────────────────────
  // When the parent hands us a `value` on mount (e.g. from `?brand=X`)
  // but no brand_id has been linked yet, look up the catalog once and
  // emit the id upstream if we find a match. Avoids the "field shows
  // the brand name but the log saves with brand_id=null" bug.
  useEffect(() => {
    if (prefillLookedUpRef.current) return;
    if (!value.trim()) return;
    prefillLookedUpRef.current = true;

    (async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .ilike("name", value.trim())
        .maybeSingle();
      if (error) {
        console.warn(
          "[BrandSearchInput] prefill lookup failed:",
          error.message,
        );
        return;
      }
      if (data) {
        // Use the canonical catalog name so casing matches the DB row.
        onChange(data.name, data.id);
      }
    })();
    // We deliberately only run this once, controlled by the ref. Adding
    // `value` to deps would re-trigger on user typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounce input ────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    onChange(newValue, null); // clear brand_id on free-type
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!newValue.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchBrands(newValue);
    }, 200);
  }

  // ── Select from dropdown ──────────────────────────────────────────────────

  function handleSelect(brand: BrandResult) {
    onChange(brand.name, brand.id);
    setResults([]);
    setOpen(false);
  }

  // ── Keyboard: Escape closes ───────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // ── Click outside closes ──────────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Cleanup debounce on unmount ───────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%",
          borderRadius: 12,
          background: "rgba(45,10,78,0.35)",
          border: "1px solid rgba(45,10,78,0.8)",
          color: "white",
          padding: "12px 16px",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
        }}
      />

      {open &&
        (results.length > 0 ||
          (!loading && !errored && value.trim().length >= 2)) && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              background: "rgba(15,0,24,0.97)",
              border: "1px solid rgba(45,10,78,0.8)",
              borderRadius: 8,
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            {results.map((brand) => (
              <button
                key={brand.id}
                type="button"
                onClick={() => handleSelect(brand)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "white",
                  fontSize: 14,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(45,10,78,0.4)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                <span style={{ flex: 1 }}>{brand.name}</span>
                {brand.verification_tier === "verified" && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#00F0FF",
                      flexShrink: 0,
                    }}
                  />
                )}
              </button>
            ))}

            {/* T110: fallback CTA — shows when the query has >= 2 chars
                and the query is stable (not loading, not errored). Sits
                below any results as an escape hatch, or acts as the sole
                item when there are no matches at all. */}
            {!loading && !errored && value.trim().length >= 2 && (
              <Link
                href={`/submit-brand?name=${encodeURIComponent(value.trim())}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  textAlign: "left",
                  color: "#FF00E5",
                  fontSize: 13,
                  fontWeight: 600,
                  borderTop:
                    results.length > 0
                      ? "1px solid rgba(45,10,78,0.6)"
                      : "none",
                  textDecoration: "none",
                }}
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
                  style={{ flexShrink: 0 }}
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span style={{ flex: 1 }}>
                  {results.length === 0
                    ? `Not seeing "${value.trim()}"? Submit it`
                    : "Not seeing your brand? Submit it"}
                </span>
                <span style={{ opacity: 0.6 }}>&rarr;</span>
              </Link>
            )}
          </div>
        )}

      {open && loading && results.length === 0 && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "rgba(15,0,24,0.97)",
            border: "1px solid rgba(45,10,78,0.8)",
            borderRadius: 8,
            zIndex: 50,
            padding: "10px 12px",
            fontSize: 13,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          Searching...
        </div>
      )}

      {/* Error state — was silently empty before, which hid real
          failures like the brands.name_raw 400s. Now the user sees
          "search failed" so we notice too. */}
      {open && !loading && errored && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "rgba(15,0,24,0.97)",
            border: "1px solid rgba(255,120,120,0.5)",
            borderRadius: 8,
            zIndex: 50,
            padding: "10px 12px",
            fontSize: 13,
            color: "rgba(255,180,180,0.85)",
          }}
        >
          Brand search failed — keep typing and we&apos;ll retry.
        </div>
      )}
    </div>
  );
}
