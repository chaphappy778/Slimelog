// apps/web/components/how-to-rate/HowToRateNav.tsx
// T32e (2026-07-13): Sticky pill row for /how-to-rate. Renders inline
// below the hero on first paint. On scroll past the hero, JS switches
// it to position: fixed so it pins under the PageHeader — same DNA as
// `components/guide/GuideNav.tsx`. Bypasses CSS `position: sticky`
// because PageWrapper's `overflow-x-hidden` ancestor kills sticky-attach
// in some browsers (iOS Safari, some Chrome combos).
//
// Owns:
//   - the scroll-spy that lights up the active pill (six axes + The Scale)
//   - the auto-scroll that keeps the active pill in frame
//   - hash-on-load handling for /how-to-rate#texture etc.
//   - manual scroll-restoration hardening so the page always opens at
//     the top when no hash is present.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HowToRatePart } from "@/app/how-to-rate/content";
import HowToRateTOCDrawer from "./HowToRateTOCDrawer";

interface HowToRateNavProps {
  parts: HowToRatePart[];
}

// Where the top of a section needs to sit to be considered active.
// Accounts for PageHeader (56px) + this nav (~52px) + a little
// breathing room, matching the guide's ACTIVE_OFFSET_PX.
const ACTIVE_OFFSET_PX = 132;
// Where the pill row locks under the PageHeader when pinned.
const PINNED_TOP_PX = 56;

export default function HowToRateNav({ parts }: HowToRateNavProps) {
  const [activeId, setActiveId] = useState<string>(
    parts[0]?.id ?? "texture",
  );
  const [tocOpen, setTocOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [navHeight, setNavHeight] = useState<number>(52);
  const pillRowRef = useRef<HTMLDivElement | null>(null);
  const navWrapperRef = useRef<HTMLDivElement | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Scroll-spy + pin logic. Combined into a single scroll listener so
  // both fire on the same RAF tick — no double-work, no jank. Mirrors
  // the pattern used by GuideNav.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const compute = () => {
      // ── Scroll-spy ──
      const line = window.scrollY + ACTIVE_OFFSET_PX;
      let candidate = parts[0]?.id ?? "texture";
      for (const p of parts) {
        const el = document.getElementById(p.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= line) candidate = p.id;
      }
      if (candidate !== activeIdRef.current) {
        setActiveId(candidate);
      }

      // ── Pin toggle ──
      const anchor = anchorRef.current;
      if (anchor) {
        const anchorTop = anchor.getBoundingClientRect().top;
        const shouldPin = anchorTop <= PINNED_TOP_PX;
        setIsPinned((prev) => (prev === shouldPin ? prev : shouldPin));
      }
    };

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [parts]);

  // Measure the pill row's height so the placeholder anchor reserves
  // the right amount of layout space when the nav goes fixed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      const wrapper = navWrapperRef.current;
      if (!wrapper) return;
      const h = wrapper.getBoundingClientRect().height;
      if (h > 0) setNavHeight(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Auto-scroll the pill row to keep the active pill visible.
  useEffect(() => {
    const row = pillRowRef.current;
    if (!row) return;
    const pill = row.querySelector<HTMLElement>(
      `[data-target="${activeId}"]`,
    );
    if (!pill) return;
    const target = Math.max(0, pill.offsetLeft - 84);
    row.scrollTo({ left: target, behavior: "smooth" });
  }, [activeId]);

  // Hash-on-load: /how-to-rate#sound scrolls straight to Sound on
  // first paint. Same triple-scrollTo hardening as GuideNav: the
  // browser and Next.js can BOTH try to restore scroll after our
  // useEffect fires, so we opt out of browser auto-restoration AND
  // beat any pending restore by firing scrollTo(0) at three points.
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => window.scrollTo(0, 0));
      window.setTimeout(() => window.scrollTo(0, 0), 100);
      return;
    }
    const isKnown = parts.some((p) => p.id === hash);
    if (isKnown) {
      window.setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [parts]);

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y =
        el.getBoundingClientRect().top +
        window.scrollY -
        (ACTIVE_OFFSET_PX - 20);
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
    setActiveId(id);
  }, []);

  return (
    <>
      {/* Anchor div — reserves layout space when the nav goes fixed
          and gives us a stable geometry reference for the pin toggle. */}
      <div
        ref={anchorRef}
        aria-hidden="true"
        style={{ height: isPinned ? navHeight : 0 }}
      />
      <div
        ref={navWrapperRef}
        className="z-20"
        style={{
          position: isPinned ? "fixed" : "relative",
          top: isPinned ? PINNED_TOP_PX : undefined,
          // Match PageWrapper's `px-1.5` (6px each side) so the fixed
          // pill row aligns with the inline width. Without this, the
          // fixed state escapes PageWrapper's padding and the pill row
          // briefly grows wider on the transition.
          left: isPinned ? 6 : undefined,
          right: isPinned ? 6 : undefined,
          background:
            "linear-gradient(180deg, rgba(15,0,24,0.94), rgba(15,0,24,0.55))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(45,10,78,0.55)",
          willChange: "transform",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div
            ref={pillRowRef}
            className="flex-1 flex gap-2 overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              // Vertical padding gives the active pill's glow room to
              // bloom top and bottom without being clipped by the
              // scroll container.
              paddingTop: 10,
              paddingBottom: 10,
            }}
          >
            {parts.map((p) => {
              const isActive = p.id === activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  data-target={p.id}
                  onClick={() => jumpTo(p.id)}
                  className="flex-none rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-all"
                  style={{
                    padding: "6px 12px",
                    border: isActive
                      ? "1px solid #00F0FF"
                      : "1px solid rgba(45,10,78,0.7)",
                    background: isActive
                      ? "#00F0FF"
                      : "rgba(45,10,78,0.3)",
                    color: isActive
                      ? "#0A0A0A"
                      : "rgba(245,245,245,0.7)",
                    boxShadow: isActive
                      ? "0 0 18px rgba(0,240,255,0.7), 0 0 6px rgba(0,240,255,0.5)"
                      : undefined,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <span
                    className="mr-1.5 font-black"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      opacity: isActive ? 1 : 0.6,
                      color: isActive
                        ? "#0A0A0A"
                        : "rgba(245,245,245,0.6)",
                    }}
                  >
                    {p.n.toString().padStart(2, "0")}
                  </span>
                  {p.shortTitle}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setTocOpen(true)}
            aria-label="Open rating axes contents"
            className="flex-none flex items-center justify-center transition-colors"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "rgba(45,10,78,0.5)",
              border: "1px solid rgba(45,10,78,0.75)",
              color: "#FFFFFF",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="w-5 h-5"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>

      <HowToRateTOCDrawer
        parts={parts}
        activeId={activeId}
        open={tocOpen}
        onClose={() => setTocOpen(false)}
        onJumpTo={(id) => {
          setTocOpen(false);
          // Small delay so the drawer close animation runs first.
          window.setTimeout(() => jumpTo(id), 60);
        }}
      />
    </>
  );
}
