// apps/web/components/FollowBrandButton.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface FollowBrandButtonProps {
  brandId: string;
  brandSlug: string;
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
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const uid = session.user.id;
      const { data, error } = await supabase
        .from("brand_follows")
        .select("user_id")
        .eq("user_id", uid)
        .eq("brand_id", brandId)
        .maybeSingle();

      if (!cancelled) {
        if (error)
          console.error("[FollowBrandButton] follow-check error:", error);
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

  const handleToggle = useCallback(async () => {
    if (!userId) {
      router.push(`/login?next=/brands/${brandSlug}`);
      return;
    }
    if (pending) return;

    setPending(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);

    try {
      if (wasFollowing) {
        const { error } = await supabase
          .from("brand_follows")
          .delete()
          .eq("user_id", userId)
          .eq("brand_id", brandId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("brand_follows")
          .insert({ user_id: userId, brand_id: brandId });
        if (error) throw error;
      }
    } catch (err) {
      console.error("[FollowBrandButton] toggle error:", err);
      setIsFollowing(wasFollowing);
    } finally {
      setPending(false);
    }
  }, [userId, isFollowing, pending, brandId, brandSlug, supabase, router]);

  if (loading) {
    return (
      <button
        disabled
        aria-label="Loading follow status"
        className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slime-surface border border-slime-border text-xs font-bold cursor-wait"
      >
        <span className="w-3.5 h-3.5 rounded-full bg-slime-border animate-pulse" />
        <span className="w-12 h-3 rounded bg-slime-border animate-pulse" />
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
        className="group flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slime-accent/10 border border-slime-accent/30 text-slime-accent text-xs font-bold active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
      >
        {pending ? (
          <Spinner className="text-current" />
        ) : (
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 fill-current shrink-0"
          >
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
      className="flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl text-slime-bg text-xs font-bold active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-glow-green"
      style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
    >
      {pending ? (
        <Spinner className="text-slime-bg" />
      ) : (
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current shrink-0">
          <path d="M8 1a3.5 3.5 0 1 0 0 7A3.5 3.5 0 0 0 8 1zM1 13c0-2.76 3.13-5 7-5s7 2.24 7 5H1z" />
        </svg>
      )}
      Follow
    </button>
  );
}

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
