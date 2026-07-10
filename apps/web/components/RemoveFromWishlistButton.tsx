// apps/web/components/RemoveFromWishlistButton.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast"; // [Change 1] Import useToast
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Props {
  logId: string;
}

export default function RemoveFromWishlistButton({ logId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast(); // [Change 1]

  async function handleRemove() {
    setLoading(true);

    const { error } = await supabase
      .from("collection_logs")
      .delete()
      .eq("id", logId);

    setLoading(false);

    // [Change 1] Toast on result
    if (error) {
      showToast("Could not remove from wishlist", "error");
    } else {
      showToast("Removed from wishlist", "success");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="w-full mt-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
      style={{
        background: "rgba(204,68,255,0.10)",
        border: "1px solid rgba(204,68,255,0.30)",
        color: "#CC44FF",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {loading ? "Removing..." : "Remove from Wishlist"}
    </button>
  );
}
