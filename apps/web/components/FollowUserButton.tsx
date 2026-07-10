// apps/web/components/FollowUserButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { safeRedirect } from "@/lib/safe-redirect";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

interface FollowUserButtonProps {
  targetUserId: string;
  currentUserId: string | null;
  initialIsFollowing: boolean;
}

const supabase = createClient();

export default function FollowUserButton({
  targetUserId,
  currentUserId,
  initialIsFollowing,
}: FollowUserButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  // [Change 1 — #35] Previously: return null when no user OR self.
  // Now: only return null on self. Logged-out viewers see a Follow
  // button that routes to signup on click.
  if (currentUserId !== null && currentUserId === targetUserId) return null;

  function handleClick() {
    // [Change 2 — #35] Logged-out users get routed to signup.
    if (!currentUserId) {
      const next = safeRedirect(pathname ?? "/", "/landing");
      router.push(`/signup?next=${encodeURIComponent(next)}`);
      return;
    }

    startTransition(async () => {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUserId);
        if (!error) setIsFollowing(false);
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({ follower_id: currentUserId, following_id: targetUserId });
        if (!error) setIsFollowing(true);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFollowing ? "Unfollow user" : "Follow user"}
      className={[
        "relative inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold",
        "transition-all duration-150 select-none",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        isFollowing
          ? /* Following state — magenta (social/community) */
            "bg-slime-magenta/10 text-slime-magenta border border-slime-magenta/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          : /* Follow state — keep green */
            "text-slime-bg shadow-glow-green hover:scale-[1.02] active:scale-[0.98]",
      ].join(" ")}
      style={
        !isFollowing
          ? { background: "linear-gradient(135deg, #39FF14, #00F0FF)" }
          : undefined
      }
    >
      {isPending ? (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : isFollowing ? (
        /* [Change] Checkmark SVG removed — text-only in Following state */
        "Following"
      ) : (
        <>
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M8 3v10M3 8h10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          Follow
        </>
      )}
    </button>
  );
}
