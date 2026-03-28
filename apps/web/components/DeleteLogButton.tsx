// apps/web/components/DeleteLogButton.tsx
// Client component — handles confirm dialog, calls server action, redirects.

"use client";

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
      // Auto-reset after 3 s if user doesn't confirm
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
          : "border-2 border-red-200 text-red-400 hover:bg-red-50"
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
        "🗑 Delete"
      )}
    </button>
  );
}
