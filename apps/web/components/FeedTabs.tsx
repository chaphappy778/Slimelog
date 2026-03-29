"use client";
// apps/web/components/FeedTabs.tsx

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
      style={{
        background: "rgba(57, 255, 20, 0.06)",
        border: "1px solid rgba(57, 255, 20, 0.12)",
      }}
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
            ? "bg-slime-surface text-slime-accent shadow-sm border border-slime-accent/20"
            : "text-slime-muted hover:text-slime-text",
        ].join(" ")}
      >
        🌍 Community
      </button>

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
              ? "bg-slime-surface text-slime-accent shadow-sm border border-slime-accent/20"
              : "text-slime-muted hover:text-slime-text",
          ].join(" ")}
        >
          💚 Following
        </button>
      )}

      {!isLoggedIn && (
        <button
          role="tab"
          aria-disabled="true"
          onClick={() => navigate("following")}
          className="flex-1 py-2 px-3 rounded-xl text-sm font-semibold text-slime-muted/50 cursor-pointer hover:text-slime-muted transition-colors"
          title="Sign in to see your Following feed"
        >
          🔒 Following
        </button>
      )}
    </div>
  );
}
