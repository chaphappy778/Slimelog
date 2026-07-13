"use client";
// apps/web/components/SubtypeAutocomplete.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import type { SlimeBaseType } from "@/lib/types";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubtypeResult {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  baseType: SlimeBaseType | "";
  value: string; // display name of current subtype, "" if none
  subtypeId: string | null; // selected subtype id, or null
  onChange: (subtypeId: string | null, subtypeName: string) => void;
  placeholder?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubtypeAutocomplete({
  baseType,
  value,
  subtypeId,
  onChange,
  placeholder,
}: Props) {
  const [results, setResults] = useState<SubtypeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMountRef = useRef(false);

  const isDisabled = baseType === "";
  const resolvedPlaceholder =
    placeholder ??
    (isDisabled ? "Pick a base type first" : "Search variants (optional)");

  // ── Fetch matching subtypes ───────────────────────────────────────────────

  const fetchSubtypes = useCallback(
    async (query: string) => {
      if (!baseType || !query.trim()) {
        setResults([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("subtypes")
        .select("id, name, slug")
        .eq("base_type", baseType)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(15);
      setResults(data ?? []);
      setOpen(true);
      setLoading(false);
    },
    [baseType],
  );

  // ── Reset when baseType changes (skip initial mount) ─────────────────────

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    // Base type changed — clear any selected/typed subtype so a no-longer-valid
    // subtype can't carry over (e.g. "Sally Butter" under Slay → Cloud).
    if (value !== "" || subtypeId !== null) {
      onChange(null, "");
    }
    setResults([]);
    setOpen(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    // Intentionally omit value/subtypeId/onChange from deps — we only want this
    // to fire on baseType changes; including them would cause feedback loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseType]);

  // ── Debounce input ────────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    // Always clear current subtypeId on free-type — selection is only valid
    // when the user picks from the dropdown.
    onChange(null, newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!newValue.trim()) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSubtypes(newValue);
    }, 200);
  }

  // ── Select from dropdown ──────────────────────────────────────────────────

  function handleSelect(subtype: SubtypeResult) {
    onChange(subtype.id, subtype.name);
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
        placeholder={resolvedPlaceholder}
        disabled={isDisabled}
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
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? "not-allowed" : "text",
        }}
      />

      {open && results.length > 0 && (
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
          {results.map((subtype) => (
            <button
              key={subtype.id}
              type="button"
              onClick={() => handleSelect(subtype)}
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
              <span style={{ flex: 1 }}>{subtype.name}</span>
            </button>
          ))}
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
    </div>
  );
}
