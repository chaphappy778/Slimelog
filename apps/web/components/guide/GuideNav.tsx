// apps/web/components/guide/GuideNav.tsx
// T32 (2026-07-13): Sticky pill row across the top of /guide, with
// hamburger button that opens a full TOC drawer. IntersectionObserver
// scroll-spy sets the active pill and auto-scrolls the pill into view
// inside its row. Also supports hash-on-load navigation.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GuidePart } from "@/app/guide/content";

interface GuideNavProps {
  parts: GuidePart[];
}

// Offset from the top of the viewport where a section is considered
// "active". Accounts for the PageHeader (56px) + this nav (~52px) + a
// bit of breathing room.
const ACTIVE_OFFSET_PX = 132;

export default function GuideNav({ parts }: GuideNavProps) {
  const [activeId, setActiveId] = useState<string>(parts[0]?.id ?? "part-1");
  const [tocOpen, setTocOpen] = useState(false);
  const pillRowRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // Scroll-spy: on scroll, find the last section whose top is above the
  // active line. Simpler + more reliable than IntersectionObserver here
  // because our sections vary wildly in height.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const compute = () => {
      const line = window.scrollY + ACTIVE_OFFSET_PX;
      let candidate = parts[0]?.id ?? "part-1";
      for (const p of parts) {
        const el = document.getElementById(p.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (top <= line) candidate = p.id;
      }
      if (candidate !== activeIdRef.current) {
        setActiveId(candidate);
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

  // When active pill changes, auto-scroll the pill row to keep it visible.
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

  // Hash-on-load: /guide#part-6 scrolls to Part Six on first paint.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.replace(/^#/, "");
    if (!hash) return;
    if (hash.startsWith("part-")) {
      window.setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, []);

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y =
        el.getBoundingClientRect().top + window.scrollY - (ACTIVE_OFFSET_PX - 20);
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
    setActiveId(id);
  }, []);

  return (
    <>
      <div
        className="sticky z-20"
        style={{
          top: 56,
          background: "linear-gradient(180deg, rgba(15,0,24,0.94), rgba(15,0,24,0.55))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(45,10,78,0.55)",
          // 2026-07-13: paints a compositor layer so the sticky doesn't
          // repaint the whole viewport on every scroll frame, and helps
          // some browsers keep sticky attached under overflow-x-hidden
          // ancestors (PageWrapper).
          willChange: "transform",
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          <div
            ref={pillRowRef}
            className="flex-1 flex gap-2 overflow-x-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
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
                    // 2026-07-13 refinement: active pill goes solid cyan
                    // with black text and a subtle glow, so the current
                    // section reads at a glance without needing to
                    // parse the outline treatment.
                    border: isActive
                      ? "1px solid #00F0FF"
                      : "1px solid rgba(45,10,78,0.7)",
                    background: isActive ? "#00F0FF" : "rgba(45,10,78,0.3)",
                    color: isActive ? "#0A0A0A" : "rgba(245,245,245,0.7)",
                    boxShadow: isActive
                      ? "0 0 18px rgba(0,240,255,0.55), 0 0 6px rgba(0,240,255,0.35)"
                      : undefined,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  <span
                    className="mr-1.5 font-black"
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      opacity: isActive ? 1 : 0.6,
                      color: isActive ? "#0A0A0A" : "rgba(245,245,245,0.6)",
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
            aria-label="Open guide contents"
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

      <GuideTOCDrawer
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

// ─── TOC Drawer ────────────────────────────────────────────────────────

function GuideTOCDrawer({
  parts,
  activeId,
  open,
  onClose,
  onJumpTo,
}: {
  parts: GuidePart[];
  activeId: string;
  open: boolean;
  onClose: () => void;
  onJumpTo: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        aria-hidden="true"
        onClick={onClose}
        style={{
          background: "rgba(6,0,14,0.62)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          opacity: open ? 1 : 0,
          transition: "opacity 200ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Guide contents"
        className="fixed right-0 top-0 bottom-0 z-[61] overflow-y-auto"
        style={{
          width: "min(78vw, 340px)",
          background: "#12061F",
          borderLeft: "1px solid rgba(0,240,255,0.18)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 320ms cubic-bezier(0.34, 1.2, 0.64, 1)",
          paddingTop: 60,
          paddingBottom: 20,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close contents"
          className="absolute top-3 right-3 flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
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
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div
          className="px-5 pb-2 text-white"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: "-0.01em",
          }}
        >
          The SlimeLog Guide
        </div>
        <div
          className="px-5 pb-4 text-[11px]"
          style={{ color: "rgba(245,245,245,0.5)" }}
        >
          Jump to any part
        </div>

        <nav>
          {parts.map((p) => {
            const isActive = p.id === activeId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onJumpTo(p.id)}
                className="w-full text-left flex items-center gap-3 transition-colors"
                style={{
                  padding: "12px 20px",
                  background: isActive
                    ? "rgba(0,240,255,0.10)"
                    : "transparent",
                  color: isActive ? "#7BF5FF" : "rgba(245,245,245,0.85)",
                  fontSize: 14,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                <span
                  className="flex-none font-black"
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontSize: 12,
                    color: isActive ? "#00F0FF" : "rgba(245,245,245,0.4)",
                    width: 24,
                  }}
                >
                  {p.n.toString().padStart(2, "0")}
                </span>
                <span>{p.fullTitle}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
