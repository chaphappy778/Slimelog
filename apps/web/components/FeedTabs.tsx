"use client";

// ============================================================
// File: apps/web/components/FeedTabs.tsx
// Client component — Community / Following tab toggle.
// Pushes ?tab= to the URL so the server page re-renders.
// ============================================================

import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface FeedTabsProps {
  activeTab: "community" | "following";
  isLoggedIn: boolean;
}

export default function FeedTabs({ activeTab, isLoggedIn }: FeedTabsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(tab: "community" | "following") {
    startTransition(() => {
      router.push(tab === "community" ? "/" : "/?tab=following");
    });
  }

  return (
    <div
      className="inline-flex w-full rounded-2xl p-1 gap-1"
      style={{ background: "rgba(244, 114, 182, 0.08)" }}
      role="tablist"
      aria-label="Feed tabs"
    >
      <button
        role="tab"
        aria-selected={activeTab === "community"}
        onClick={() => navigate("community")}
        disabled={isPending}
        className={[
          "flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-150",
          "disabled:opacity-60",
          activeTab === "community"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-400 hover:text-gray-600",
        ].join(" ")}
      >
        🌍 Community
      </button>

      {/* Only render Following tab when user is logged in */}
      {isLoggedIn && (
        <button
          role="tab"
          aria-selected={activeTab === "following"}
          onClick={() => navigate("following")}
          disabled={isPending}
          className={[
            "flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-150",
            "disabled:opacity-60",
            activeTab === "following"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-400 hover:text-gray-600",
          ].join(" ")}
        >
          💜 Following
        </button>
      )}

      {/* Unauthenticated users see a disabled Following tab with a hint */}
      {!isLoggedIn && (
        <button
          role="tab"
          aria-disabled="true"
          onClick={() => navigate("following")}
          className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold text-gray-300 cursor-pointer hover:text-gray-400 transition-colors"
          title="Sign in to see your Following feed"
        >
          🔒 Following
        </button>
      )}
    </div>
  );
}
