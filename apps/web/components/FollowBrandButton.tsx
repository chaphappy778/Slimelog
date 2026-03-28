// apps/web/components/FollowBrandButton.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface FollowBrandButtonProps {
  brandId: string;
  brandSlug: string;
  /** Optional: initial follower count to allow optimistic display */
  initialFollowerCount?: number;
}

export default function FollowBrandButton({
  brandId,
  brandSlug,
  initialFollowerCount,
}: FollowBrandButtonProps) {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true); // true while we resolve auth + follow status
  const [pending, setPending] = useState(false); // true during the optimistic toggle

  // ── 1. Resolve current user & follow status on mount ──────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Get session (no network call — reads from local storage)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const uid = session.user.id;

      // Check whether this user already follows the brand
      const { data, error } = await supabase
        .from("brand_follows")
        .select("user_id")
        .eq("user_id", uid)
        .eq("brand_id", brandId)
        .maybeSingle();

      if (!cancelled) {
        if (error) {
          console.error("[FollowBrandButton] follow-check error:", error);
        }
        setUserId(uid);
        setIsFollowing(!!data);
        setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [brandId, supabase]);

  // ── 2. Toggle follow ───────────────────────────────────────────────────────
  const handleToggle = useCallback(async () => {
    // Unauthenticated → redirect to login
    if (!userId) {
      router.push(`/login?next=/brands/${brandSlug}`);
      return;
    }

    if (pending) return;

    // Optimistic update
    setPending(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("brand_follows")
          .delete()
          .eq("user_id", userId)
          .eq("brand_id", brandId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase.from("brand_follows").insert({
          user_id: userId,
          brand_id: brandId,
        });

        if (error) throw error;
      }
    } catch (err: unknown) {
      // Roll back optimistic update
      console.error("[FollowBrandButton] toggle error:", err);
      setIsFollowing(wasFollowing);

      // Surface a lightweight toast if window.dispatchEvent / sonner is wired up,
      // otherwise fall back to console. Replace this block with your toast lib.
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("slimelog:toast", {
            detail: {
              type: "error",
              message: wasFollowing
                ? "Couldn't unfollow. Try again."
                : "Couldn't follow. Try again.",
            },
          }),
        );
      }
    } finally {
      setPending(false);
    }
  }, [userId, isFollowing, pending, brandId, brandSlug, supabase, router]);

  // ── 3. Render ──────────────────────────────────────────────────────────────

  // While resolving auth / initial follow state, show a neutral skeleton button
  if (loading) {
    return (
      <button
        disabled
        aria-label="Loading follow status"
        className="
          flex items-center gap-1.5
          min-h-[44px] px-4 py-2
          rounded-xl
          bg-gray-100 text-gray-400
          text-xs font-bold
          cursor-wait
          transition-all duration-200
        "
      >
        <span className="w-3.5 h-3.5 rounded-full bg-gray-300 animate-pulse" />
        <span className="w-12 h-3 rounded bg-gray-300 animate-pulse" />
      </button>
    );
  }

  if (isFollowing) {
    return (
      <button
        onClick={handleToggle}
        disabled={pending}
        aria-label="Unfollow this brand"
        aria-pressed={true}
        className="
          group
          flex items-center gap-1.5
          min-h-[44px] px-4 py-2
          rounded-xl
          bg-fuchsia-50 border border-fuchsia-200
          text-fuchsia-600 text-xs font-bold
          shadow-sm
          active:scale-95
          disabled:opacity-60 disabled:cursor-not-allowed
          transition-all duration-150
          hover:bg-fuchsia-100 hover:border-fuchsia-300
        "
      >
        {pending ? (
          <Spinner className="text-fuchsia-400" />
        ) : (
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 fill-current shrink-0"
          >
            {/* checkmark person */}
            <path d="M8 1a3.5 3.5 0 1 0 0 7A3.5 3.5 0 0 0 8 1zM1 13c0-2.76 3.13-5 7-5 .34 0 .67.02 1 .05" />
            <path
              d="M10.5 12l1.5 1.5 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <span className="group-hover:hidden">Following</span>
        <span className="hidden group-hover:inline">Unfollow</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      aria-label="Follow this brand"
      aria-pressed={false}
      className="
        flex items-center gap-1.5
        min-h-[44px] px-4 py-2
        rounded-xl
        bg-gradient-to-r from-pink-500 to-fuchsia-500
        text-white text-xs font-bold
        shadow-sm
        active:scale-95
        disabled:opacity-60 disabled:cursor-not-allowed
        transition-all duration-150
        hover:from-pink-600 hover:to-fuchsia-600
      "
    >
      {pending ? (
        <Spinner className="text-white/80" />
      ) : (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current shrink-0">
          <path d="M8 1a3.5 3.5 0 1 0 0 7A3.5 3.5 0 0 0 8 1zM1 13c0-2.76 3.13-5 7-5s7 2.24 7 5H1z" />
        </svg>
      )}
      Follow
    </button>
  );
}

// ── Tiny inline spinner ────────────────────────────────────────────────────
function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`w-3.5 h-3.5 animate-spin shrink-0 ${className}`}
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.25"
      />
      <path
        d="M14 8a6 6 0 0 0-6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
