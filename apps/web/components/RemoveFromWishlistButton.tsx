"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

interface Props {
  logId: string;
}

export default function RemoveFromWishlistButton({ logId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRemove() {
    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.from("collection_logs").delete().eq("id", logId);
    router.refresh();
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
      {loading ? "Removing…" : "Remove from Wishlist"}
    </button>
  );
}
