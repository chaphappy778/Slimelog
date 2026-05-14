// apps/web/components/DeleteLogButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSlimeLog } from "@/lib/slime-actions";

// [T67b] Delete button with bottom-sheet confirmation overlay.
// Default export — imported by app/slimes/[id]/page.tsx (server component)
// and components/collection/SlimeDetailCard.tsx.
// Named export alias preserved for any existing call sites.

export default function DeleteLogButton({ logId }: { logId: string }) {
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
          color: "#CC44FF",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "0 16px 40px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              background: "#0F0018",
              borderRadius: 20,
              border: "1px solid rgba(204,68,255,0.3)",
              padding: "24px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
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
                  background: isPending ? "rgba(204,68,255,0.15)" : "#CC44FF",
                  color: isPending ? "#CC44FF" : "#0A0A0A",
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
