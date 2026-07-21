"use client";
// apps/web/components/collection/RatingScaleModal.tsx
//
// T188 Part 5 (2026-07-21): the "See scale" affordance for the RATINGS
// section on /slimes/[id]. Replaces the per-card accordion legends that
// Jenn flagged as dropdown-excessive. Instead, one small "See scale" pill
// sits on the right of the RATINGS header; tapping it opens this modal,
// which shows the 1-to-5 legend a single time.
//
// This component owns BOTH the trigger pill and the modal so the parent
// (a server component) can drop it in without wiring client state. The
// legend copy comes from SCALE_BANDS in app/how-to-rate/content.ts so the
// vocabulary stays in one place (Skip / Under / Solid / Great / Elite).
//
// Close paths: backdrop click, Escape key, and the X button.

import { useEffect, useState } from "react";
import { SCALE_BANDS } from "@/app/how-to-rate/content";

export default function RatingScaleModal() {
  const [open, setOpen] = useState(false);

  // Escape-to-close + lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {/* See-scale pill */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors"
        style={{
          background: "rgba(0,240,255,0.10)",
          border: "1px solid rgba(0,240,255,0.35)",
          color: "#00F0FF",
          cursor: "pointer",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        See scale
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rating scale"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 140,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "#0F0018",
              borderRadius: 20,
              border: "1px solid rgba(0,240,255,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                padding: "20px 20px 12px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  className="mont"
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#fff",
                    fontFamily: "Montserrat, Inter, sans-serif",
                    letterSpacing: "0.01em",
                  }}
                >
                  The rating scale
                </p>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12.5,
                    color: "rgba(245,245,245,0.5)",
                    lineHeight: 1.4,
                  }}
                >
                  Every axis is scored 1 to 5. Here is what each number means.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{
                  flexShrink: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(45,10,78,0.4)",
                  border: "1px solid rgba(45,10,78,0.7)",
                  color: "rgba(245,245,245,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Legend rows */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "4px 20px 24px",
              }}
            >
              {SCALE_BANDS.map((band) => (
                <div
                  key={band.n}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <span
                    className="mont"
                    style={{
                      flexShrink: 0,
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 900,
                      color: "#0A0A0A",
                      background: band.accentColor,
                      fontFamily: "Montserrat, Inter, sans-serif",
                    }}
                    aria-hidden="true"
                  >
                    {band.n}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      className="mont"
                      style={{
                        margin: 0,
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: band.accentColor,
                        fontFamily: "Montserrat, Inter, sans-serif",
                      }}
                    >
                      {band.name}
                    </p>
                    <p
                      style={{
                        margin: "2px 0 0",
                        fontSize: 12.5,
                        lineHeight: 1.45,
                        color: "rgba(245,245,245,0.6)",
                      }}
                    >
                      {band.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
