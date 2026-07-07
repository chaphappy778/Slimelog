// apps/web/components/ReportButton.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/Toast";
import { safeRedirect } from "@/lib/safe-redirect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  contentType: "log" | "comment" | "profile";
  contentId: string;
  currentUserId: string | null;
}

const REASONS = [
  "Inappropriate content",
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Copyright violation",
  "Misinformation",
  "Underage user concern",
  "Other",
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReportButton({
  contentType,
  contentId,
  currentUserId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  // 2026-07-07: closes on Escape key. Backdrop click is handled by
  // the overlay's own onClick — removed the outside-click listener
  // from the previous absolute-positioned dropdown implementation
  // because the modal is now viewport-anchored, so "outside" is any
  // click on the backdrop.
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  // 2026-07-07: lock body scroll while the modal is open so the
  // background page can't scroll under it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // [Change 1 — #35] Removed early `if (!currentUserId) return null;`.
  // The trigger button now renders for logged-out users and routes to
  // signup on click instead of opening the dropdown sheet.

  async function handleSubmit() {
    if (!reason || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          reason,
          details: details.trim() || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        showToast("Report submitted", "info");
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setReason("");
          setDetails("");
        }, 2000);
      } else {
        showToast("Could not submit report", "error");
      }
    } catch {
      showToast("Could not submit report", "error");
    } finally {
      setSubmitting(false);
    }
  }

  // [Change 2 — #35] Trigger handler — routes logged-out users to signup
  // before any dropdown logic runs.
  function handleTriggerClick() {
    if (!currentUserId) {
      const next = safeRedirect(pathname ?? "/", "/landing");
      router.push(`/signup?next=${encodeURIComponent(next)}`);
      return;
    }
    // 2026-07-07: modal is viewport-centered now, so the previous
    // openUpward positioning heuristic is gone.
    setOpen((o) => !o);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-label="Report this content"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 8,
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          fontFamily: "Inter, sans-serif",
          transition: "color 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(255,255,255,0.55)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color =
            "rgba(255,255,255,0.3)";
        }}
      >
        {/* Flag icon */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
        Report
      </button>

      {/* Report modal — only opens for authenticated users (handler routes
          logged-out users away before this can be true).

          2026-07-07: switched from absolute-positioned dropdown to a
          viewport-centered fixed modal with backdrop. Previously the
          dropdown anchored to the flag button; when the flag was near
          the bottom of the card the dropdown opened upward and its
          contents clipped off the top of the viewport (see wishlist/
          report screenshots from 2026-07-07 smoke test). The centered
          modal always fits regardless of where the trigger sits. */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 199,
            }}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report content"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 200,
              width: "min(320px, calc(100vw - 32px))",
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "rgba(15,0,24,0.97)",
              border: "1px solid rgba(45,10,78,0.7)",
              borderRadius: 14,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              // Prevent clicks inside the sheet from bubbling to the
              // backdrop (which would close the modal).
            }}
            onClick={(e) => e.stopPropagation()}
          >
          {submitted ? (
            <div
              style={{
                textAlign: "center",
                padding: "12px 0",
                color: "#39FF14",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              Report submitted
            </div>
          ) : (
            <>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.8)",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                Report content
              </p>

              {/* Reason list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    style={{
                      textAlign: "left",
                      background:
                        reason === r
                          ? "rgba(57,255,20,0.1)"
                          : "rgba(45,10,78,0.25)",
                      border:
                        reason === r
                          ? "1px solid rgba(57,255,20,0.35)"
                          : "1px solid rgba(45,10,78,0.5)",
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: 12,
                      color: reason === r ? "#39FF14" : "rgba(255,255,255,0.6)",
                      cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                      transition: "all 0.1s",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Optional details */}
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Additional details (optional)"
                maxLength={500}
                rows={2}
                style={{
                  background: "rgba(45,10,78,0.3)",
                  border: "1px solid rgba(45,10,78,0.6)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#fff",
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.5,
                }}
              />

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!reason || submitting}
                style={{
                  padding: "10px 0",
                  borderRadius: 10,
                  border: "none",
                  background:
                    !reason || submitting
                      ? "rgba(45,10,78,0.4)"
                      : "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color:
                    !reason || submitting ? "rgba(255,255,255,0.3)" : "#0A0A0A",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "Montserrat, Inter, sans-serif",
                  cursor: !reason || submitting ? "default" : "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>

              {/* Cancel */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.3)",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: 0,
                  fontFamily: "Inter, sans-serif",
                  textAlign: "center",
                }}
              >
                Cancel
              </button>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
