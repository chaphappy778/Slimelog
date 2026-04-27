// apps/web/components/collection/CommentSection.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useToast } from "@/components/Toast";
import ReportButton from "@/components/ReportButton";
import CommentLikeButton from "@/components/collection/CommentLikeButton";
import CommentInputGate from "@/components/collection/CommentInputGate";

// Module-level client
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

interface Comment {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  // [Change 1 — #35] Profile fetched separately and merged in. Embedded
  // join replaced with manual two-step batch fetch via profiles_public —
  // PostgREST FK auto-resolution through views is unreliable, so we hydrate
  // usernames in a second query keyed by user_id.
  username: string | null;
}

interface Props {
  logId: string;
  currentUserId: string | null;
  onCountChange: (count: number) => void;
}

const COLLAPSED_COUNT = 2;

// Bucketed short-form relative time — matches users/[username]/page.tsx.
function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

export default function CommentSection({
  logId,
  currentUserId,
  onCountChange,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByUser, setLikedByUser] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // [Change 2 — #35] Two-step fetch: comments first (from base table),
      // then profiles_public batch-fetched by user_id. PostgREST FK hints
      // through views are unreliable; manual hydration is the documented
      // fallback per the spec's F.6 guidance.
      const { data: rawComments } = await supabase
        .from("comments")
        .select("id, user_id, body, created_at")
        .eq("log_id", logId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const baseRows = (rawComments ?? []) as Array<{
        id: string;
        user_id: string;
        body: string;
        created_at: string;
      }>;

      // Resolve usernames via profiles_public — single batch round-trip.
      const userIds = Array.from(new Set(baseRows.map((r) => r.user_id)));
      let usernameMap: Record<string, string | null> = {};
      if (userIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles_public")
          .select("id, username")
          .in("id", userIds);

        if (cancelled) return;

        for (const p of (profileRows ?? []) as Array<{
          id: string;
          username: string | null;
        }>) {
          usernameMap[p.id] = p.username;
        }
      }

      const loaded: Comment[] = baseRows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        body: r.body,
        created_at: r.created_at,
        username: usernameMap[r.user_id] ?? null,
      }));

      const commentIds = loaded.map((c) => c.id);

      let countMap: Record<string, number> = {};
      let likedMap: Record<string, boolean> = {};

      if (commentIds.length > 0) {
        const [likeCountsRes, userLikesRes] = await Promise.all([
          supabase
            .from("comment_likes")
            .select("comment_id")
            .in("comment_id", commentIds),
          currentUserId
            ? supabase
                .from("comment_likes")
                .select("comment_id")
                .in("comment_id", commentIds)
                .eq("user_id", currentUserId)
            : Promise.resolve({ data: [] as { comment_id: string }[] }),
        ]);

        if (cancelled) return;

        for (const row of (likeCountsRes.data ?? []) as {
          comment_id: string;
        }[]) {
          countMap[row.comment_id] = (countMap[row.comment_id] ?? 0) + 1;
        }
        for (const row of (userLikesRes.data ?? []) as {
          comment_id: string;
        }[]) {
          likedMap[row.comment_id] = true;
        }
      }

      setComments(loaded);
      setLikeCounts(countMap);
      setLikedByUser(likedMap);
      onCountChange(loaded.length);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [logId, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed || !currentUserId || submitting) return;

    setSubmitting(true);

    const { data, error } = await supabase
      .from("comments")
      .insert({ log_id: logId, user_id: currentUserId, body: trimmed })
      .select("id, user_id, body, created_at")
      .single();

    setSubmitting(false);

    if (!error && data) {
      // [Change 3 — #35] After insert, look up the new comment's author
      // username via profiles_public so the optimistic prepend renders
      // correctly. This is a single-row lookup, fast.
      const { data: profileRow } = await supabase
        .from("profiles_public")
        .select("username")
        .eq("id", currentUserId)
        .maybeSingle();

      const newComment: Comment = {
        id: (data as { id: string }).id,
        user_id: (data as { user_id: string }).user_id,
        body: (data as { body: string }).body,
        created_at: (data as { created_at: string }).created_at,
        username:
          (profileRow as { username: string | null } | null)?.username ?? null,
      };

      setComments((prev) => [newComment, ...prev]);
      setLikeCounts((prev) => ({ ...prev, [newComment.id]: 0 }));
      setLikedByUser((prev) => ({ ...prev, [newComment.id]: false }));
      onCountChange(comments.length + 1);
      setBody("");
      showToast("Comment posted", "success");
    } else {
      showToast("Could not post comment", "error");
    }
  }

  async function handleDelete(commentId: string) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId!);

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setLikeCounts((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      setLikedByUser((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
      onCountChange(comments.length - 1);
      showToast("Comment deleted", "info");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const visibleComments = expanded
    ? comments
    : comments.slice(0, COLLAPSED_COUNT);
  const hasMore = comments.length > COLLAPSED_COUNT;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Divider */}
      <div
        style={{
          height: 1,
          background: "rgba(45,10,78,0.6)",
          margin: "4px 0 12px",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          marginBottom: 8,
        }}
      >
        {loading ? (
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.25)",
              textAlign: "center",
              padding: "8px 0",
            }}
          >
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.25)",
              textAlign: "center",
              padding: "8px 0",
            }}
          >
            No comments yet. Be the first.
          </p>
        ) : (
          visibleComments.map((c) => {
            const username = c.username ?? "unknown";
            const isOwn = c.user_id === currentUserId;

            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                  padding: "8px 10px",
                  background: "rgba(45,10,78,0.2)",
                  borderRadius: 8,
                  border: "1px solid rgba(45,10,78,0.4)",
                  position: "relative",
                }}
              >
                {/* Comment header row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#FF00E5",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    @{username}
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <CommentLikeButton
                      commentId={c.id}
                      initialCount={likeCounts[c.id] ?? 0}
                      initialLiked={likedByUser[c.id] ?? false}
                      currentUserId={currentUserId}
                    />
                    <span
                      style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}
                    >
                      {formatRelativeTime(c.created_at)}
                    </span>
                    <ReportButton
                      contentType="comment"
                      contentId={c.id}
                      currentUserId={currentUserId}
                    />
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        aria-label="Delete comment"
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          lineHeight: 1,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="rgba(255,255,255,0.3)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.85)",
                    lineHeight: 1.5,
                    fontFamily: "Inter, sans-serif",
                    wordBreak: "break-word",
                  }}
                >
                  {c.body}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Expand / collapse */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            color: "#00F0FF",
            fontWeight: 600,
            padding: "4px 0",
            fontFamily: "Montserrat, sans-serif",
            marginBottom: 10,
            textAlign: "left",
          }}
        >
          {expanded ? "Show less" : `Show all ${comments.length} comments`}
        </button>
      )}

      {/* Input — gated for logged-out users via CommentInputGate.
          [Change 4 — #35] Previously the input block was hidden entirely
          when no user. Now we always render — either real input or gate. */}
      {currentUserId ? (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
            rows={2}
            placeholder="Add a comment..."
            style={{
              flex: 1,
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.6)",
              borderRadius: 10,
              padding: "8px 10px",
              color: "#fff",
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              resize: "none",
              outline: "none",
              lineHeight: 1.5,
            }}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!body.trim() || submitting}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background:
                !body.trim() || submitting
                  ? "rgba(45,10,78,0.4)"
                  : "linear-gradient(135deg, #39FF14, #00F0FF)",
              color:
                !body.trim() || submitting
                  ? "rgba(255,255,255,0.3)"
                  : "#0A0A0A",
              fontSize: 13,
              fontWeight: 700,
              cursor: !body.trim() || submitting ? "default" : "pointer",
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
              alignSelf: "stretch",
            }}
          >
            Post
          </button>
        </div>
      ) : (
        <CommentInputGate redirectPath={pathname ?? "/"} />
      )}
    </div>
  );
}
