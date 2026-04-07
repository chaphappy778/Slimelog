// apps/web/components/ReportButton.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/Toast";

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
  const [openUpward, setOpenUpward] = useState(true);
  const { showToast } = useToast();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!currentUserId) return null;

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

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setOpenUpward(rect.top > 280);
          }
          setOpen((o) => !o);
        }}
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

      {/* Dropdown sheet */}
      {open && (
        <div
          style={{
            position: "absolute",
            ...(openUpward
              ? { bottom: "calc(100% + 8px)" }
              : { top: "calc(100% + 8px)" }),
            right: 0,
            zIndex: 200,
            width: 280,
            maxHeight: "60vh",
            overflowY: "auto",
            background: "rgba(15,0,24,0.97)",
            border: "1px solid rgba(45,10,78,0.7)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
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
      )}
    </div>
  );
}
