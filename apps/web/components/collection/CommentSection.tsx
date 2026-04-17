// apps/web/components/collection/CommentSection.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useToast } from "@/components/Toast";
import ReportButton from "@/components/ReportButton";
import CommentLikeButton from "@/components/collection/CommentLikeButton"; // [Change 1] Import new comment like button

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
  profiles: { username: string | null } | null;
}

interface Props {
  logId: string;
  currentUserId: string | null;
  onCountChange: (count: number) => void;
}

const COLLAPSED_COUNT = 2;

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
  // [Change 2] Per-comment like state — keyed by comment id.
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likedByUser, setLikedByUser] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("comments")
        .select("id, user_id, body, created_at, profiles ( username )")
        .eq("log_id", logId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      const loaded = (data as unknown as Comment[]) ?? [];

      // [Change 3] Fetch like counts and current user's liked state in parallel.
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
      .select("id, user_id, body, created_at, profiles ( username )")
      .single();

    setSubmitting(false);

    if (!error && data) {
      const newComment = data as unknown as Comment;
      setComments((prev) => [newComment, ...prev]);
      // [Change 4] Initialize like state for the new comment.
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
      // [Change 5] Drop the deleted comment's like state.
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

  function formatRelativeTime(isoString: string): string {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      Math.round((new Date(isoString).getTime() - Date.now()) / 1000 / 60),
      "minute",
    );
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
            const username =
              (c.profiles as { username: string | null } | null)?.username ??
              "unknown";
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
                {/* Comment header row with like button, timestamp, report, delete */}
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
                    {/* [Change 6] Comment like button — left of timestamp */}
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

      {/* Input */}
      {currentUserId && (
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
      )}
    </div>
  );
}
