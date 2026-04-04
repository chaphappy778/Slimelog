"use client";
// apps/web/components/collection/LikeButton.tsx

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function handleToggle() {
    if (!currentUserId || pending) return;

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
        setLiked(wasLiked);
        setCount(prevCount);
      }
    } else {
      const { error } = await supabase
        .from("likes")
        .insert({ log_id: logId, user_id: currentUserId });

      if (error) {
        setLiked(wasLiked);
        setCount(prevCount);
      }
    }

    setPending(false);
  }

  return (
    // [Bug 3 fix] type="button" prevents implicit form submission that could
    // trigger this handler when Enter is pressed in an adjacent textarea.
    <button
      type="button"
      onClick={handleToggle}
      disabled={!currentUserId || pending}
      aria-label={liked ? "Unlike" : "Like"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: currentUserId ? "pointer" : "default",
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
