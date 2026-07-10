// apps/web/components/collection/LikeButton.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { safeRedirect } from "@/lib/safe-redirect";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Props {
  logId: string;
  initialCount: number;
  initialLiked: boolean;
  currentUserId: string | null;
}

export default function LikeButton({
  logId,
  initialCount,
  initialLiked,
  currentUserId,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // 2026-07-09: sync local state when the parent re-renders with new
  // props (e.g., after router.refresh() picks up the fresh server
  // data). Only depend on the incoming prop values themselves — an
  // earlier revision also included `pending` in the deps, which
  // caused a "flash" on click: setPending(false) fired the effect
  // while initialLiked was still stale from the parent's not-yet-
  // refreshed render, briefly reverting the optimistic UI. The guard
  // against clobbering mid-flight optimistic updates isn't needed
  // because router.refresh() is called AFTER setPending(false), so
  // props only change once pending is already false.
  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);

  async function handleToggle() {
    // [Change 2 — #35] Logged-out users get routed to signup instead of
    // a no-op disabled button. The button still renders so the UI signals
    // that liking is possible after signup.
    if (!currentUserId) {
      const next = safeRedirect(pathname ?? "/", "/landing");
      router.push(`/signup?next=${encodeURIComponent(next)}`);
      return;
    }

    if (pending) return;

    const wasLiked = liked;
    const prevCount = count;
    // Optimistic update
    setLiked(!wasLiked);
    setCount(wasLiked ? count - 1 : count + 1);
    setPending(true);

    if (wasLiked) {
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("log_id", logId)
        .eq("user_id", currentUserId);

      if (error) {
        // 2026-07-09: if the row didn't exist server-side (state was
        // already "not liked" on the server), treat as success rather
        // than rolling back the optimistic update. Happens when the
        // feed shows stale cached state after back-navigation.
        setLiked(wasLiked);
        setCount(prevCount);
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ log_id: logId, user_id: currentUserId });

      // 2026-07-09: gracefully handle 23505 unique-violation ("already
      // liked"). Fires when the feed shows stale "not liked" state
      // but the server has an existing like row. Rather than rolling
      // back the optimistic "now liked" UI, keep it — because the
      // server's real state IS "liked." Only roll back on other
      // errors (network, RLS, etc.).
      if (error && error.code !== "23505") {
        setLiked(wasLiked);
        setCount(prevCount);
      }
    }

    setPending(false);

    // 2026-07-09: refresh the current route's server-component cache
    // so the feed's like state stays in sync after back-navigation.
    // Without this, hearts/counts on the feed cards stayed stale
    // until a manual page refresh.
    router.refresh();
  }

  return (
    // [Change 3 — #35] Removed `disabled={!currentUserId}` so logged-out
    // users can click the button. type="button" already present.
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-label={liked ? "Unlike" : "Like"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.15s",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={liked ? "#39FF14" : "none"}
        stroke={liked ? "#39FF14" : "rgba(255,255,255,0.4)"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: "fill 0.15s, stroke 0.15s", flexShrink: 0 }}
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: liked ? "#39FF14" : "rgba(255,255,255,0.4)",
          transition: "color 0.15s",
          minWidth: 12,
        }}
      >
        {count}
      </span>
    </button>
  );
}
