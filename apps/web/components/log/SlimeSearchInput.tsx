"use client";
// apps/web/components/log/SlimeSearchInput.tsx
//
// Track 2 (2026-07-23): brand-scoped slime-name autocomplete for the log
// wizard. Analogous to BrandSearchInput, but scoped to the `slimes`
// catalog rows for the brand the user already picked. Second-and-later
// loggers of a given slime pick the existing catalog entry instead of
// re-typing a variation, which curbs typo proliferation and multiplies
// data quality over time.
//
// Companion to Track 1b's server-side auto-catalog: when a user types a
// name that isn't in the brand's catalog and saves, the server still
// auto-creates an unofficial `slimes` row and links the log. This
// component just lets a canonical pick short-circuit that path (the
// wizard threads the picked slime_id straight into the payload).
//
// Behavior:
//   * brandId null  → autocomplete disabled, plain text input. Still
//     emits onChange(name, null, null) on every keystroke.
//   * brandId set    → debounced 200ms ilike search against `slimes`
//     for that brand. Official rows sort first, then alphabetical.
//   * Keyboard nav: ArrowDown / ArrowUp move the highlight, Enter picks
//     the highlighted row, Escape closes. Same shape as BrandSearchInput
//     plus the arrow-key selection this flow benefits from.
//   * Errors are logged (console.warn) and surfaced as a dropdown
//     message rather than silently swallowed — same rule that hardened
//     BrandSearchInput after the brands.name_raw 400s ran silent.

import { useState, useEffect, useRef, useCallback, useId } from "react";
import { createClient } from "@/lib/supabase/client";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";
import { fieldInputStyle } from "./LogWizardShared";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlimeResult {
  id: string;
  name: string;
  base_type: string | null;
  is_brand_official: boolean;
}

interface SlimeSearchInputProps {
  /** Required for autocomplete to fire. Null → plain text input. */
  brandId: string | null;
  /** Current name in the wizard field. */
  value: string;
  /** Emits (canonical/typed name, catalog slime id or null, base_type or null). */
  onChange: (name: string, id: string | null, baseType: string | null) => void;
  placeholder?: string;
}

// Turn a stored base_type value into its display label, tolerating rows
// whose base_type isn't a known enum member (older / unusual data).
function baseTypeLabel(baseType: string | null): string | null {
  if (!baseType) return null;
  return (
    SLIME_BASE_TYPE_LABELS[baseType as SlimeBaseType] ?? baseType
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlimeSearchInput({
  brandId,
  value,
  onChange,
  placeholder = "e.g. Honeydew Dreams",
}: SlimeSearchInputProps) {
  const [results, setResults] = useState<SlimeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);
  // Highlighted row for keyboard nav. -1 = nothing highlighted.
  const [highlight, setHighlight] = useState(-1);
  // Stable id so the combobox can point aria-controls at its listbox.
  const listboxId = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Race protection: increment on every request; drop stale responses.
  const requestIdRef = useRef(0);

  // ── Fetch matching slimes for the picked brand ────────────────────────────

  const fetchSlimes = useCallback(
    async (query: string, forBrandId: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setResults([]);
        setOpen(false);
        return;
      }
      const myRequestId = ++requestIdRef.current;
      setLoading(true);
      setErrored(false);

      const { data, error } = await supabase
        .from("slimes")
        .select("id, name, base_type, is_brand_official")
        .eq("brand_id", forBrandId)
        .ilike("name", `%${trimmed}%`)
        .order("is_brand_official", { ascending: false }) // official first
        .order("name", { ascending: true })
        .limit(8);

      // Stale-response guard — a newer keystroke (or a brand switch) has
      // already fired.
      if (myRequestId !== requestIdRef.current) return;

      if (error) {
        console.warn(
          "[SlimeSearchInput] slime search failed:",
          error.message,
        );
        setResults([]);
        setErrored(true);
        setOpen(true);
        setLoading(false);
        setHighlight(-1);
        return;
      }

      setResults((data as SlimeResult[] | null) ?? []);
      setErrored(false);
      setOpen(true);
      setLoading(false);
      setHighlight(-1);
    },
    [],
  );

  // ── Debounced input ───────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    // Free-type always clears the linked id + base_type. Track 1b's
    // server-side match will still try to link on save.
    onChange(newValue, null, null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // No brand picked yet → plain input, no dropdown.
    if (!brandId) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (!newValue.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSlimes(newValue, brandId);
    }, 200);
  }

  // ── Select a match ────────────────────────────────────────────────────────

  function handleSelect(slime: SlimeResult) {
    // Canonical name from the catalog wins so casing/spelling matches
    // the existing row.
    onChange(slime.name, slime.id, slime.base_type);
    setResults([]);
    setOpen(false);
    setHighlight(-1);
  }

  // ── Keyboard nav ──────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
      return;
    }
    if (!open || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? results.length - 1 : h - 1));
    } else if (e.key === "Enter") {
      if (highlight >= 0 && highlight < results.length) {
        e.preventDefault();
        handleSelect(results[highlight]);
      }
    }
  }

  // ── If the brand changes/clears, drop any open dropdown state ──────────────

  useEffect(() => {
    setResults([]);
    setOpen(false);
    setErrored(false);
    setHighlight(-1);
    // Bump the request id so any in-flight response for the old brand is
    // treated as stale and ignored.
    requestIdRef.current++;
  }, [brandId]);

  // ── Click outside closes ──────────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setHighlight(-1);
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

  const showNoMatches =
    !!brandId &&
    open &&
    !loading &&
    !errored &&
    results.length === 0 &&
    value.trim().length > 0;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          // Re-open the dropdown when refocusing with results already
          // loaded for the current query.
          if (brandId && results.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        style={fieldInputStyle}
      />

      {open && results.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
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
          {results.map((slime, i) => {
            const label = baseTypeLabel(slime.base_type);
            const highlighted = i === highlight;
            return (
              <button
                key={slime.id}
                type="button"
                role="option"
                aria-selected={highlighted}
                onClick={() => handleSelect(slime)}
                onMouseEnter={() => setHighlight(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 12px",
                  background: highlighted
                    ? "rgba(45,10,78,0.4)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "white",
                  fontSize: 14,
                  transition: "background 0.1s",
                }}
              >
                <span
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 900,
                    color: "#F5F5F5",
                    flexShrink: 0,
                  }}
                >
                  {slime.name}
                </span>
                {label && (
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.06em",
                      textTransform: "lowercase",
                      color: "rgba(245,245,245,0.45)",
                      flex: 1,
                    }}
                  >
                    {label}
                  </span>
                )}
                {slime.is_brand_official && (
                  <span
                    style={{
                      marginLeft: "auto",
                      flexShrink: 0,
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: "#FF00E5",
                      background: "rgba(255,0,229,0.12)",
                      border: "1px solid rgba(255,0,229,0.4)",
                      borderRadius: 6,
                      padding: "2px 6px",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    OFFICIAL
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* No-match state — reassures that a genuinely new name will still
          be captured on save (Track 1b auto-catalog). */}
      {showNoMatches && (
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
            color: "rgba(255,255,255,0.5)",
          }}
        >
          No matches. New slime. It&apos;ll be added when you log it.
        </div>
      )}

      {brandId && open && loading && results.length === 0 && (
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

      {brandId && open && !loading && errored && (
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
          Slime search failed. Keep typing and we&apos;ll retry.
        </div>
      )}
    </div>
  );
}
