// apps/web/components/collection/CommentInputGate.tsx
"use client";

// Logged-out replacement for the comment textarea in CommentSection.
// Renders as a button styled to look like an input field — matches the
// existing textarea's dark glass treatment but with muted text and no
// real input behavior. Clicking the button routes to /signup with the
// validated `next` param so the user lands back on this slime/log after
// signup.
//
// This is a button (not a readOnly input) on purpose — the semantics
// are "perform action: go to signup", not "edit text".

import { useRouter } from "next/navigation";
import { safeRedirect } from "@/lib/safe-redirect";

interface Props {
  redirectPath: string;
}

export default function CommentInputGate({ redirectPath }: Props) {
  const router = useRouter();

  function handleClick() {
    const next = safeRedirect(redirectPath, "/landing");
    router.push(`/signup?next=${encodeURIComponent(next)}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.6)",
        borderRadius: 10,
        padding: "12px 10px",
        color: "rgba(255,255,255,0.35)",
        fontSize: 13,
        fontFamily: "Inter, sans-serif",
        textAlign: "left",
        cursor: "pointer",
        outline: "none",
        lineHeight: 1.5,
        transition: "border-color 0.15s, color 0.15s",
        minHeight: 56,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(57,255,20,0.4)";
        e.currentTarget.style.color = "rgba(255,255,255,0.6)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(45,10,78,0.6)";
        e.currentTarget.style.color = "rgba(255,255,255,0.35)";
      }}
    >
      Sign up to comment
    </button>
  );
}
