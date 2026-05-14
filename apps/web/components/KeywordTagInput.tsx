"use client";
// apps/web/components/KeywordTagInput.tsx
// T72 — hashtag-style keyword tag input with autocomplete

import { useState, useRef, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const inputCls =
  "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder:text-slime-muted focus:outline-none focus:ring-1 focus:ring-slime-accent/40 focus:border-slime-accent/50 transition";

interface KeywordTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

interface TagSuggestion {
  id: string;
  name: string;
}

export function KeywordTagInput({
  value,
  onChange,
  placeholder = "e.g. pastel, glitter, kawaii",
}: KeywordTagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAtMax = value.length >= 10;

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const { data } = await supabase
      .from("tags")
      .select("id, name")
      .ilike("name", `${query}%`)
      .order("use_count", { ascending: false })
      .limit(8);

    setSuggestions(data ?? []);
    setShowDropdown(true);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(inputValue.trim());
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchSuggestions]);

  // Click-outside closes dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addTag(name: string) {
    const normalized = name.toLowerCase().trim();
    if (!normalized) return;
    if (value.includes(normalized)) return;
    if (value.length >= 10) return;
    onChange([...value, normalized]);
    setInputValue("");
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {/* Existing tags */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                background: "rgba(57,255,20,0.12)",
                border: "1px solid rgba(57,255,20,0.3)",
                color: "#39FF14",
              }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className="ml-0.5 leading-none hover:opacity-70 transition"
                style={{ color: "#39FF14" }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="2" y1="2" x2="8" y2="8" />
                  <line x1="8" y1="2" x2="2" y2="8" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + dropdown */}
      <div className="relative">
        <input
          ref={inputRef}
          className={inputCls}
          placeholder={isAtMax ? "Maximum 10 keywords reached" : placeholder}
          value={inputValue}
          disabled={isAtMax}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />

        {showDropdown && suggestions.length > 0 && (
          <div
            className="absolute left-0 right-0 top-full mt-1 z-50 overflow-hidden rounded-xl"
            style={{
              background: "rgba(15,0,24,0.97)",
              border: "1px solid rgba(45,10,78,0.8)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  // mousedown fires before blur — prevent input blur closing dropdown
                  e.preventDefault();
                  addTag(s.name);
                }}
                className="w-full text-left px-4 py-2 text-sm transition-colors"
                style={{ color: "rgba(245,245,245,0.85)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(57,255,20,0.08)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {isAtMax && (
        <p className="text-xs" style={{ color: "rgba(245,245,245,0.35)" }}>
          Maximum 10 keywords reached
        </p>
      )}
    </div>
  );
}
