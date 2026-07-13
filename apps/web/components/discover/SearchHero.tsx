// apps/web/components/discover/SearchHero.tsx
// [Discover V1 — 2026-07-13] Search hero: full-width input at the top of
// /discover that replaces the small "Search" pill. Submits to
// /search?q=<text> on Enter. Typeahead is deferred to V2 per Design's
// shipping tiers. Placeholder rotates through example queries so the
// user sees the intent immediately.
//
// The wrapper card mirrors how-to-rate's cyan hero language: cyan
// border + inset glow on the card, cyan-tinted search icon, Montserrat
// prompt copy.

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PLACEHOLDER_ROTATION = [
  'try "butter"',
  'try "Peachybbbies"',
  'try "galaxy floam"',
  'try "clear ice"',
  'try "Sky Butter"',
];

export default function SearchHero() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotate the placeholder every 3s so the field advertises real
  // search intents. Only rotates while the input is empty and
  // unfocused so we don't yank the placeholder away mid-typing.
  useEffect(() => {
    const t = setInterval(() => {
      if (
        !value &&
        document.activeElement !== inputRef.current
      ) {
        setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_ROTATION.length);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [value]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={submit}
      className="px-4 pt-6 pb-4"
      role="search"
      aria-label="Search SlimeLog"
    >
      <label
        className="flex items-center gap-3 rounded-2xl px-4"
        style={{
          height: 54,
          background: "rgba(0,240,255,0.06)",
          border: "1px solid rgba(0,240,255,0.42)",
          boxShadow:
            "inset 0 0 22px rgba(0,240,255,0.08), 0 0 22px rgba(0,240,255,0.10)",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            value ? undefined : PLACEHOLDER_ROTATION[placeholderIdx]
          }
          className="flex-1 bg-transparent outline-none text-[15px]"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 700,
            color: "#FFFFFF",
          }}
          aria-label="Search slimes, brands, and collectors"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue("")}
            className="shrink-0 grid place-items-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              color: "rgba(245,245,245,0.55)",
            }}
            aria-label="Clear search"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
              width="14"
              height="14"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </label>
    </form>
  );
}
