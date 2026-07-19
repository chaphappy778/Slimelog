// apps/web/components/BackLink.tsx
// [Item #28 Phase C hotfix 2026-07-18] Small client component for
// "smart" back nav. Previously each detail page hard-coded a link
// like "Back to Discover" that always routed to /discover, even
// when the user arrived from /search or a brand page. Using
// `router.back()` respects the actual history — a user who tapped
// through from /search returns to /search with their query intact.
// Falls back to the passed `fallbackHref` when there's no history
// (e.g. hard-linked into the page).

"use client";

import { useRouter } from "next/navigation";

interface Props {
  /** Where to route when there's no history to go back to. */
  fallbackHref: string;
  /** Label rendered next to the arrow. */
  label: string;
}

export default function BackLink({ fallbackHref, label }: Props) {
  const router = useRouter();

  function onClick() {
    // window.history.length includes the initial entry, so > 1 means
    // there's at least one back-target. In practice, direct-link
    // opens have length 1 and we fall through to the fallback.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-[15px] bg-transparent border-0 p-0 cursor-pointer"
      style={{
        color: "rgba(245,245,245,0.55)",
        fontFamily: "inherit",
      }}
      aria-label={`Go back to ${label}`}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      {label}
    </button>
  );
}
