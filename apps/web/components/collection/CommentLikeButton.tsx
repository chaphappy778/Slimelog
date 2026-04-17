// apps/web/components/collection/CommentLikeButton.tsx
"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

// Module-level client (absolute rule).
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Props {
  commentId: string;
  initialCount: number;
  initialLiked: boolean;
  currentUserId: string | null;
}

export default function CommentLikeButton({
  commentId,
  initialCount,
  initialLiked,
  currentUserId,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

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
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId);

      if (error) {
        // Revert on failure
        setLiked(wasLiked);
        setCount(prevCount);
      }
    } else {
      const { error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: currentUserId });

      if (error) {
        setLiked(wasLiked);
        setCount(prevCount);
      }
    }

    setPending(false);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!currentUserId || pending}
      aria-label={liked ? "Unlike comment" : "Like comment"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: "none",
        border: "none",
        cursor: currentUserId ? "pointer" : "default",
        padding: 0,
        opacity: pending ? 0.6 : 1,
        transition: "opacity 0.15s",
        lineHeight: 1,
      }}
    >
      <svg
        width="14"
        height="14"
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
      {count > 0 && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: liked ? "#39FF14" : "rgba(255,255,255,0.4)",
            transition: "color 0.15s",
            minWidth: 8,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
