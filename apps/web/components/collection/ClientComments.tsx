// apps/web/components/collection/ClientComments.tsx
"use client";

// Client-only wrapper around CommentSection. Mounted on /slimes/[id] so
// comments do NOT render in the SSR HTML — they only appear after
// hydration when this component fetches the current user's session.
//
// This deliberate deferral keeps comment text out of the indexable
// page source. Logged-out arrivals see a brief loading state before
// the comments thread appears.

import { useEffect, useState } from "react";
import CommentSection from "@/components/collection/CommentSection";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface Props {
  logId: string;
}

export default function ClientComments({ logId }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setCurrentUserId(data.user?.id ?? null);
      setAuthResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      style={{
        marginTop: 24,
        padding: "0 16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#39FF14",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          Comments
        </h2>
        {commentCount > 0 && (
          <span
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            {commentCount}
          </span>
        )}
      </header>

      {authResolved ? (
        <CommentSection
          logId={logId}
          currentUserId={currentUserId}
          onCountChange={setCommentCount}
        />
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "rgba(255,255,255,0.25)",
            textAlign: "center",
            padding: "12px 0",
          }}
        >
          Loading comments...
        </p>
      )}
    </section>
  );
}
