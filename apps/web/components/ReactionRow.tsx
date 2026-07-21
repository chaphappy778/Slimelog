// apps/web/components/ReactionRow.tsx
//
// T192 (2026-07-21): the tap-to-react emoji row under a single comment.
//
// A horizontal row of the five fixed reactions (lib/reactions.ts). Each
// emoji is a tap target; its count renders only when > 0. Reactions the
// current viewer has on get a subtle cyan glow border. Taps toggle
// optimistically and reconcile against the server's authoritative count
// (toggleCommentReaction). On error OR network failure the optimistic
// change rolls back and a brief error toast fires.
//
// Mounted once per comment inside CommentSection, so it defaults to the
// dense `compact` size — it sits inline under the comment body and must
// not compete with the comment text.
//
// Logged-out users get routed to signup on tap (same pattern as the
// like buttons), so the row still renders as an affordance.

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/Toast";
import { safeRedirect } from "@/lib/safe-redirect";
import { toggleCommentReaction } from "@/lib/reaction-actions";
import {
  REACTION_META,
  REACTION_TYPES,
  type ReactionSummary,
  type ReactionType,
} from "@/lib/reactions";

interface Props {
  commentId: string;
  initialReactions: ReactionSummary[];
  currentUserId: string | null;
  size?: "default" | "compact";
}

// Normalize whatever the caller passed into the full fixed-order array,
// so a short / empty / out-of-order list still renders every tap target.
function normalize(
  input: ReactionSummary[],
): Record<ReactionType, ReactionSummary> {
  const byType = {} as Record<ReactionType, ReactionSummary>;
  for (const t of REACTION_TYPES) {
    byType[t] = { reaction_type: t, count: 0, viewerReacted: false };
  }
  for (const r of input) {
    if (byType[r.reaction_type]) {
      byType[r.reaction_type] = {
        reaction_type: r.reaction_type,
        count: Math.max(0, r.count),
        viewerReacted: r.viewerReacted,
      };
    }
  }
  return byType;
}

export default function ReactionRow({
  commentId,
  initialReactions,
  currentUserId,
  size = "compact",
}: Props) {
  const [byType, setByType] = useState(() => normalize(initialReactions));
  // Per-reaction in-flight guard so a user can toggle two different
  // emojis fast without one clobbering the other, while still blocking a
  // double-tap on the SAME emoji mid-request.
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();

  // Resync when the server sends fresh props (e.g. after the thread
  // reloads). Only depends on the incoming data so we don't clobber a
  // mid-flight optimistic update.
  useEffect(() => {
    setByType(normalize(initialReactions));
  }, [initialReactions]);

  const compact = size === "compact";
  const emojiFontSize = compact ? 13 : 16;
  const gap = compact ? 3 : 6;
  const padX = compact ? 5 : 8;
  const padY = compact ? 2 : 4;

  async function handleToggle(type: ReactionType) {
    if (!currentUserId) {
      const next = safeRedirect(pathname ?? "/", "/landing");
      router.push(`/signup?next=${encodeURIComponent(next)}`);
      return;
    }
    if (pending[type]) return;

    const prev = byType[type];
    const wasReacted = prev.viewerReacted;

    // Optimistic flip.
    setByType((cur) => ({
      ...cur,
      [type]: {
        reaction_type: type,
        viewerReacted: !wasReacted,
        count: Math.max(0, cur[type].count + (wasReacted ? -1 : 1)),
      },
    }));
    setPending((p) => ({ ...p, [type]: true }));

    // IMPORTANT (offline-rollback fix): the server action call is awaited
    // inside a try so BOTH a returned { ok: false } AND a thrown/rejected
    // promise (e.g. network offline — the action never resolves to a
    // result) roll the optimistic flip back. The T127 first cut only
    // handled the { ok: false } branch, so an offline tap left the count
    // stuck at +1 forever with no way to recover. finally clears the
    // in-flight guard on every path so the button never wedges.
    try {
      const result = await toggleCommentReaction(commentId, type);

      if (!result.ok) {
        // Server-returned failure — roll back to the pre-tap state.
        setByType((cur) => ({ ...cur, [type]: prev }));
        showToast(result.error, "error");
      } else {
        // Reconcile to the server's authoritative count + presence.
        setByType((cur) => ({
          ...cur,
          [type]: {
            reaction_type: type,
            viewerReacted: result.added,
            count: Math.max(0, result.newCount),
          },
        }));
      }
    } catch (err) {
      // Network failure / server action never resolved. Roll back the
      // optimistic flip and tell the user, quietly (no Sentry noise —
      // this is an expected offline/cancel path, not a bug).
      console.warn("[ReactionRow] toggle failed:", err);
      setByType((cur) => ({ ...cur, [type]: prev }));
      showToast("Couldn't save your reaction. Check your connection.", "error");
    } finally {
      setPending((p) => ({ ...p, [type]: false }));
    }
  }

  return (
    <div
      className="flex items-center flex-wrap"
      style={{ gap }}
      onClick={(e) => e.stopPropagation()}
    >
      {REACTION_TYPES.map((type) => {
        const r = byType[type];
        const meta = REACTION_META[type];
        const active = r.viewerReacted;
        return (
          <button
            key={type}
            type="button"
            onClick={() => handleToggle(type)}
            disabled={pending[type]}
            aria-label={
              active ? `Remove ${meta.label} reaction` : `React ${meta.label}`
            }
            aria-pressed={active}
            title={meta.label}
            className="inline-flex items-center rounded-full transition-colors active:scale-95"
            style={{
              gap: compact ? 3 : 4,
              padding: `${padY}px ${padX}px`,
              lineHeight: 1,
              cursor: "pointer",
              background: active
                ? "rgba(0,240,255,0.12)"
                : "rgba(255,255,255,0.04)",
              border: active
                ? "1px solid rgba(0,240,255,0.65)"
                : "1px solid rgba(255,255,255,0.10)",
              boxShadow: active ? "0 0 8px rgba(0,240,255,0.35)" : "none",
              opacity: pending[type] ? 0.6 : 1,
            }}
          >
            <span
              aria-hidden="true"
              style={{ fontSize: emojiFontSize, lineHeight: 1 }}
            >
              {meta.emoji}
            </span>
            {r.count > 0 && (
              <span
                className="tabular-nums font-bold"
                style={{
                  fontSize: compact ? 10 : 12,
                  color: active ? "#00F0FF" : "rgba(255,255,255,0.6)",
                }}
              >
                {r.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
