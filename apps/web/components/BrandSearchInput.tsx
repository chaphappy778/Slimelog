"use client";
// apps/web/components/BrandSearchInput.tsx

import { useState, useEffect, useRef, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

// ─── Supabase client — module level to avoid session issues ───────────────────

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch matching brands ─────────────────────────────────────────────────

  const fetchBrands = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("brands")
      .select("id, name, slug, verification_tier")
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(10);
    setResults(data ?? []);
    setOpen(true);
    setLoading(false);
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
