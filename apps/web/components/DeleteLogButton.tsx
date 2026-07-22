// apps/web/components/DeleteLogButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSlimeLog } from "@/lib/slime-actions";

// [T67b] Delete button with bottom-sheet confirmation overlay.
// Default export — imported by app/slimes/[id]/page.tsx (server component)
// and components/collection/SlimeDetailCard.tsx.
// Named export alias preserved for any existing call sites.

// T188 (2026-07-21): optional `accent` so the /slimes/[id] redesign can
// flip Delete from the legacy purple to palette red (#FF3D6E) without
// touching the other call site (SlimeDetailCard), which keeps the default.
export default function DeleteLogButton({
  logId,
  accent = "#CC44FF",
}: {
  logId: string;
  accent?: string;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteSlimeLog(logId);
        router.push("/collection");
        router.refresh();
      } catch (err) {
        console.error("Delete failed:", err);
        setShowConfirm(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-2 text-sm font-semibold transition-colors"
        style={{
          color: accent,
          // T188 (2026-07-22): framed "action pill" so Delete reads with
          // the same visual weight as the green Edit pill beside it.
          // 10px 20px + radius 12 mirror the Edit button; border + subtle
          // tint use the passed accent (red #FF3D6E on /slimes/[id]).
          background: `${accent}0F`,
          border: `1px solid ${accent}`,
          borderRadius: 12,
          cursor: "pointer",
          padding: "10px 20px",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        Delete
      </button>

      {showConfirm && (
        // 2026-07-07: switched from bottom-sheet alignment
        // (alignItems: flex-end with 40px bottom padding) to
        // viewport-centered — matches the report modal pattern from
        // the earlier smoke-test fix. The bottom-sheet placement
        // collided with the BottomNavWrapper (64px + iOS safe area),
        // so the card rendered underneath or barely above the nav.
        // Centered fits regardless of nav height and dvh chrome.
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          onClick={() => (isPending ? null : setShowConfirm(false))}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.75)",
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
              border: `1px solid ${accent}4D`,
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              Delete this log?
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
              }}
            >
              This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  background: "rgba(45,10,78,0.4)",
                  color: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(45,10,78,0.6)",
                  cursor: isPending ? "default" : "pointer",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                style={{
                  flex: 1,
                  padding: "13px 0",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  background: isPending ? `${accent}26` : accent,
                  color: isPending ? accent : "#0A0A0A",
                  border: "none",
                  cursor: isPending ? "default" : "pointer",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Named export alias — preserves any existing import sites that use
// { DeleteLogButton } before this refactor.
export { DeleteLogButton as DeleteLogButton };
