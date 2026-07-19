// apps/web/components/discover/SearchHero.tsx
// [Discover V1 — 2026-07-13] Search hero: full-width input at the top of
// /discover that replaces the small "Search" pill. Submits to
// /search?q=<text> on Enter. Placeholder rotates through example
// queries so the user sees the intent immediately.
//
// The wrapper card mirrors how-to-rate's cyan hero language: cyan
// border + inset glow on the card, cyan-tinted search icon, Montserrat
// prompt copy.
//
// [Item #28 Phase C — 2026-07-18] Opt-in `typeahead` prop enables an
// absolute-positioned dropdown under the input showing top hits
// across slimes / brands / collectors as the user types. Used on
// /discover; explicitly disabled on /search (which already shows
// live results below the input, so a typeahead would double up).

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SearchTypeaheadDropdown from "./SearchTypeaheadDropdown";

const PLACEHOLDER_ROTATION = [
  'try "butter"',
  'try "Peachybbbies"',
  'try "galaxy floam"',
  'try "clear ice"',
  'try "Sky Butter"',
];

interface SearchHeroProps {
  /**
   * Initial input value. On the Discover page this is empty; on the
   * Search results page we hydrate it from the `?q=` URL param so
   * users see their query in the field instead of a blank box.
   */
  initialValue?: string;
  /**
   * Fired on every keystroke. When set, the parent typically lifts
   * `value` into its own state and drives result-fetching from it —
   * used by the Search page for live-search-as-you-type.
   */
  onValueChange?: (v: string) => void;
  /**
   * Auto-focus the input on mount. Defaults false. Enable on the
   * Search page so a user landing there via `?q=` can immediately
   * refine their query without an extra tap.
   */
  autoFocus?: boolean;
  /**
   * Override the default submit behavior (navigate to `/search?q=X`).
   * The Search page passes an explicit handler that updates the URL
   * with `router.replace` instead of pushing a new history entry.
   */
  onSubmit?: (value: string) => void;
  /**
   * [Item #28 Phase C 2026-07-18] Enable the typeahead dropdown that
   * shows top slime / brand / collector hits under the input as the
   * user types. Defaults false so /search (which already has live
   * results-below-input) doesn't double-render. Enable on /discover
   * for the quick-navigation UX.
   */
  typeahead?: boolean;
}

export default function SearchHero({
  initialValue = "",
  onValueChange,
  autoFocus = false,
  onSubmit,
  typeahead = false,
}: SearchHeroProps = {}) {
  const router = useRouter();
  const [value, setValueLocal] = useState(initialValue);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Wrapped setter so `onValueChange` fires from any code path that
  // mutates the value (typing, clearing).
  const setValue = (next: string) => {
    setValueLocal(next);
    onValueChange?.(next);
  };

  // Autofocus once on mount when requested. Selecting the current
  // text makes it easy to refine an existing query.
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [autoFocus]);

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
    // Custom handler wins if provided (e.g. Search page keeps you
    // on-page and just refreshes results).
    if (onSubmit) {
      onSubmit(trimmed);
      return;
    }
    if (!trimmed) {
      router.push("/search");
      return;
    }
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  const [focused, setFocused] = useState(false);
  // When collapsed (unfocused and empty) show the two-line prompt.
  // When expanded (focused or typing) show only the input field.
  const collapsed = !focused && !value;

  return (
    <form
      onSubmit={submit}
      className="px-4 pt-6 pb-5 relative"
      role="search"
      aria-label="Search SlimeLog"
    >
      {/* Section header above the search bar, matching the cyan
          section-label treatment used elsewhere on the page. */}
      <p className="section-label mb-3">Search</p>

      <label
        className="flex items-center gap-3.5 rounded-2xl transition-all"
        style={{
          minHeight: 78,
          padding: "14px 18px",
          background: "rgba(6,0,14,0.55)",
          border: "1px solid rgba(0,240,255,0.55)",
          // Glow only outside the pill — no inset. Matches the
          // how-to-rate pill treatment: subtle bloom around the
          // border, nothing behind the text.
          boxShadow:
            "0 0 20px rgba(0,240,255,0.28), 0 0 4px rgba(0,240,255,0.35)",
          cursor: "text",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
          style={{
            filter: "drop-shadow(0 0 8px rgba(0,240,255,0.6))",
          }}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" />
        </svg>

        {/* Two-line prompt when collapsed. Focus / typing switches to
            the raw input treatment so the field still feels like a
            search box, not a static banner. */}
        <div className="flex-1 min-w-0">
          {collapsed && (
            <div
              className="pointer-events-none"
              aria-hidden="true"
            >
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  lineHeight: 1.15,
                }}
              >
                What slime are you looking for?
              </div>
              <div
                className="mt-1 text-[13px]"
                style={{
                  color: "rgba(0,240,255,0.85)",
                  fontStyle: "italic",
                }}
              >
                {PLACEHOLDER_ROTATION[placeholderIdx]}
              </div>
            </div>
          )}
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={
              collapsed ? undefined : "Search slimes, brands, or collectors"
            }
            className="bg-transparent outline-none text-[18px]"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 800,
              color: "#FFFFFF",
              width: collapsed ? 1 : "100%",
              height: collapsed ? 1 : "auto",
              opacity: collapsed ? 0 : 1,
              // Keep it in the DOM so submit still works via Enter, but
              // shrink to invisible when collapsed so the two-line
              // prompt owns the visual real estate.
              position: collapsed ? "absolute" : "static",
            }}
            aria-label="Search slimes, brands, and collectors"
          />
        </div>

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

      {/* [Item #28 Phase C 2026-07-18] Typeahead dropdown — only
          renders when the parent opts in (`typeahead` prop true) AND
          the input has 2+ chars AND is focused. Component handles
          all fetching + ranking internally. */}
      {typeahead && (
        <SearchTypeaheadDropdown
          query={value}
          focused={focused}
          onSeeAll={(q) => {
            // Same behavior as pressing Enter: route to full /search.
            if (onSubmit) {
              onSubmit(q);
              return;
            }
            if (!q) {
              router.push("/search");
              return;
            }
            router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
          onEntityPick={() => {
            // Clear the input + blur so the dropdown closes cleanly
            // after a nav — otherwise coming back to /discover
            // via back button re-renders the dropdown with the old
            // query.
            setValue("");
            inputRef.current?.blur();
          }}
        />
      )}
    </form>
  );
}
