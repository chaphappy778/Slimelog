"use client";
// apps/web/components/DeleteLogButton.tsx

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSlimeLog } from "@/lib/slime-actions";

export function DeleteLogButton({ logId }: { logId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }

    startTransition(async () => {
      try {
        await deleteSlimeLog(logId);
        router.push("/collection");
        router.refresh();
      } catch (err) {
        console.error("Delete failed:", err);
        setConfirming(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition ${
        confirming
          ? "bg-red-500 text-white border-2 border-red-500 animate-pulse"
          : "border border-red-500/30 text-red-400 hover:bg-red-500/10"
      } disabled:opacity-60`}
    >
      {isPending ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Deleting…
        </>
      ) : confirming ? (
        "Tap again to confirm"
      ) : (
        <>
          {/* SVG trash icon */}
          <svg
            width="14"
            height="14"
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
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          Delete
        </>
      )}
    </button>
  );
}
