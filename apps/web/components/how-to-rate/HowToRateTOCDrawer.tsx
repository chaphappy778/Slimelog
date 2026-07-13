// apps/web/components/how-to-rate/HowToRateTOCDrawer.tsx
// T32e (2026-07-13): Right-side hamburger drawer for /how-to-rate. Lists
// all seven parts (six rating axes + The Scale) and lets the user jump
// between them. Forked from the inline TOC drawer inside
// `components/guide/GuideNav.tsx`, adjusted for the how-to-rate part
// shape and copy.

"use client";

import { useEffect } from "react";
import type { HowToRatePart } from "@/app/how-to-rate/content";

interface HowToRateTOCDrawerProps {
  parts: HowToRatePart[];
  activeId: string;
  open: boolean;
  onClose: () => void;
  onJumpTo: (id: string) => void;
}

export default function HowToRateTOCDrawer({
  parts,
  activeId,
  open,
  onClose,
  onJumpTo,
}: HowToRateTOCDrawerProps) {
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
        aria-label="Rating axes contents"
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
          How to Rate
        </div>
        <div
          className="px-5 pb-4 text-[11px]"
          style={{ color: "rgba(245,245,245,0.5)" }}
        >
          Jump to any axis
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
