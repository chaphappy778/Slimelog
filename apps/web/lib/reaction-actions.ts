// apps/web/lib/reaction-actions.ts
//
// T192 (2026-07-21): server actions for per-COMMENT emoji reactions.
//
// Two entry points:
//   toggleCommentReaction(commentId, reactionType) — add-or-remove the
//     current user's reaction of that type on that comment. Fires a
//     notification to the comment author on ADD only (never on remove,
//     never for self-reactions).
//   getReactionsForComments(commentIds) — batch aggregate for a whole
//     comment thread in a single indexed IN query. Returns a
//     Map<commentId, ReactionSummary[]> so the comment section enriches
//     every comment at once (no N+1).
//
// House rules honored:
//   - Result unions, never thrown Errors for anything the caller might
//     surface to a user (CLAUDE.md server-action rule).
//   - INSERT / DELETE go through the anon-key client so RLS runs.
//   - The cross-user notification INSERT uses the admin client (RLS on
//     notifications only lets you write rows where recipient = you).
//   - Reaction slugs come from a fixed set (lib/reactions.ts), so there
//     is no user-authored text and no moderation gate.

"use server";

import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureServerEvent } from "@/lib/posthog-server";
// NOTE (2026-07-21): Under Next.js 16 + Turbopack, the server-actions
// loader for "use server" files introspects function signatures at
// build time to generate the actions manifest, and any cross-module
// type reference in a signature — even a pure `import type` — gets
// mishandled and emitted as a runtime ReferenceError. Three attempts
// with different import syntaxes all failed. The reliable fix is to
// inline the types directly in this file so nothing type-shaped
// crosses a module boundary. Values (aggregateReactions,
// isReactionType) still come from lib/reactions.ts; only the shape
// declarations are duplicated below. Small maintenance cost, one
// place to keep in sync with lib/reactions.ts's exported types.
import { aggregateReactions, isReactionType } from "@/lib/reactions";

type ReactionType = "like" | "love" | "fire" | "nailed_it" | "celebrate";

interface ReactionSummary {
  reaction_type: ReactionType;
  count: number;
  viewerReacted: boolean;
}

// ─── Result unions ────────────────────────────────────────────────────────

export type ToggleReactionResult =
  | { ok: true; added: boolean; newCount: number }
  | { ok: false; error: string };

// ─── Notification fan-out ───────────────────────────────────────────────────
//
// Best-effort: the reaction row is already committed by the time we run,
// so a failed / skipped notification never fails the toggle. Uses the
// admin client because we (a) read the comment's author + parent log,
// and (b) INSERT a notifications row targeting a DIFFERENT user, which
// the anon-key client is blocked from doing by RLS.
//
// The notification carries both the log_id (so the existing notifications
// join resolves the slime name for the copy) and metadata
// { reaction_type, comment_id } (so the renderer shows the emoji and can
// deep-link to the exact comment anchor).
//
// Skips:
//   - comment not found / author unresolved
//   - author === reacter (self-love is allowed, but no self-notification)
async function notifyCommentAuthorOfReaction(args: {
  commentId: string;
  reacterId: string;
  reactionType: string;
}): Promise<void> {
  const { commentId, reacterId, reactionType } = args;

  try {
    const admin = createAdminClient();

    const { data: comment, error: cErr } = await admin
      .from("comments")
      .select("user_id, log_id")
      .eq("id", commentId)
      .maybeSingle();

    if (cErr) {
      console.error(
        "[notifyCommentAuthorOfReaction] comment lookup failed:",
        cErr.message,
        { commentId },
      );
      return;
    }

    const authorId = (comment?.user_id as string | null | undefined) ?? null;
    const logId = (comment?.log_id as string | null | undefined) ?? null;
    if (!authorId) return; // comment vanished between insert and lookup
    if (authorId === reacterId) return; // self-reaction, no notification

    const { error: notifErr } = await admin.from("notifications").insert({
      recipient_id: authorId,
      notification_type: "comment_reaction_received",
      actor_id: reacterId,
      // log_id lets the notifications join resolve the slime name for the
      // "on your comment on <slime>" copy AND anchors the deep link.
      log_id: logId,
      // reaction_type → which emoji; comment_id → the #comment-<id>
      // anchor the renderer links to.
      metadata: { reaction_type: reactionType, comment_id: commentId },
    });

    if (notifErr) {
      console.error(
        "[notifyCommentAuthorOfReaction] notification insert failed:",
        notifErr.message,
        { commentId, authorId, reactionType },
      );
    }
  } catch (err) {
    // Missing admin env vars, network, etc. Never propagate — the
    // reaction is already saved.
    console.error("[notifyCommentAuthorOfReaction] unexpected error:", err);
  }
}

// ─── toggleCommentReaction ──────────────────────────────────────────────────

/**
 * Toggle the current user's reaction of `reactionType` on `commentId`.
 * Present → deleted; absent → inserted. Returns whether the reaction is
 * now present (`added`) and the fresh count for that reaction on that
 * comment (`newCount`) so the optimistic client can reconcile.
 */
export async function toggleCommentReaction(
  commentId: string,
  reactionType: string,
): Promise<ToggleReactionResult> {
  // Guard the slug against the fixed set — never trust the client. The
  // DB CHECK constraint is the backstop; this returns a friendly error
  // instead of surfacing a raw constraint violation.
  if (!isReactionType(reactionType)) {
    return { ok: false, error: "That reaction isn't available." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "Sign in to react." };
  }
  const userId = user.id;

  // Does the reaction already exist? RLS lets everyone SELECT, so this
  // reads the user's own row fine.
  const { data: existing, error: selErr } = await supabase
    .from("comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .maybeSingle();

  if (selErr) {
    console.error(
      "[toggleCommentReaction] existence check failed:",
      selErr.message,
    );
    Sentry.captureException(selErr, {
      tags: { action: "toggleCommentReaction" },
    });
    return { ok: false, error: "Couldn't update your reaction." };
  }

  let added: boolean;

  if (existing) {
    const { error: delErr } = await supabase
      .from("comment_reactions")
      .delete()
      .eq("id", existing.id as string);
    if (delErr) {
      console.error("[toggleCommentReaction] delete failed:", delErr.message);
      Sentry.captureException(delErr, {
        tags: { action: "toggleCommentReaction", stage: "delete" },
      });
      return { ok: false, error: "Couldn't remove your reaction." };
    }
    added = false;
  } else {
    // ON CONFLICT DO NOTHING (via ignoreDuplicates) so a double-tap race
    // that inserts twice is a silent no-op rather than a 23505 error.
    const { error: insErr } = await supabase
      .from("comment_reactions")
      .upsert(
        { comment_id: commentId, user_id: userId, reaction_type: reactionType },
        {
          onConflict: "user_id,comment_id,reaction_type",
          ignoreDuplicates: true,
        },
      );
    if (insErr) {
      console.error("[toggleCommentReaction] insert failed:", insErr.message);
      Sentry.captureException(insErr, {
        tags: { action: "toggleCommentReaction", stage: "insert" },
      });
      return { ok: false, error: "Couldn't add your reaction." };
    }
    // Whether the row was freshly inserted or already there from a race,
    // the server's real state is "reacted".
    added = true;
  }

  // Authoritative fresh count for this reaction on this comment —
  // head+count so we don't pull rows.
  const { count, error: cntErr } = await supabase
    .from("comment_reactions")
    .select("id", { count: "exact", head: true })
    .eq("comment_id", commentId)
    .eq("reaction_type", reactionType);

  if (cntErr) {
    // Non-fatal — the toggle itself succeeded. Fall back to a best-guess
    // count of 1/0 so the client still reconciles to the right sign.
    console.warn("[toggleCommentReaction] count query failed:", cntErr.message);
  }
  const newCount = cntErr ? (added ? 1 : 0) : (count ?? 0);

  // Notify the comment author on ADD only.
  if (added) {
    await notifyCommentAuthorOfReaction({
      commentId,
      reacterId: userId,
      reactionType,
    });
  }

  await captureServerEvent(userId, "comment_reaction_toggled", {
    comment_id: commentId,
    reaction_type: reactionType,
    added,
  });

  return { ok: true, added, newCount };
}

// ─── getReactionsForComments ────────────────────────────────────────────────

/**
 * Batch aggregate reactions for a whole comment thread. Returns a
 * Map keyed by comment_id; every id in the input gets an entry (the
 * full fixed-order array, count 0 for reactions nobody added yet) so
 * the caller can render each comment's row without a per-comment fetch.
 *
 * Single indexed IN query over comment_reactions.comment_id — cheap
 * because a rendered thread is a bounded page of comments. Errors and
 * the empty-input case both return an all-zero map rather than throwing,
 * so a reaction-load failure never breaks the comments render.
 */
export async function getReactionsForComments(
  commentIds: string[],
): Promise<Map<string, ReactionSummary[]>> {
  const result = new Map<string, ReactionSummary[]>();
  const ids = Array.from(new Set(commentIds)).filter(Boolean);

  // Seed every requested comment with an all-zero summary so callers get
  // a complete map regardless of what rows come back.
  for (const id of ids) {
    result.set(id, aggregateReactions([], null));
  }
  if (ids.length === 0) return result;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const viewerId = user?.id ?? null;

  const { data, error } = await supabase
    .from("comment_reactions")
    .select("comment_id, reaction_type, user_id")
    .in("comment_id", ids);

  if (error) {
    console.error(
      "[getReactionsForComments] query failed:",
      error.message,
    );
    Sentry.captureException(error, {
      tags: { action: "getReactionsForComments" },
    });
    // Return the all-zero seed map — reactions just render empty.
    return result;
  }

  // Bucket rows by comment_id, then aggregate each bucket.
  const byComment = new Map<
    string,
    { reaction_type: string; user_id: string }[]
  >();
  for (const row of (data ?? []) as {
    comment_id: string;
    reaction_type: string;
    user_id: string;
  }[]) {
    const bucket = byComment.get(row.comment_id) ?? [];
    bucket.push({ reaction_type: row.reaction_type, user_id: row.user_id });
    byComment.set(row.comment_id, bucket);
  }

  for (const [commentId, rows] of byComment) {
    // Only overwrite ids we seeded (all of them, since RLS SELECT is
    // public and we filtered by the input ids).
    result.set(commentId, aggregateReactions(rows, viewerId));
  }

  return result;
}

// NO type re-exports here. This is a "use server" file — Next.js is
// strict that server-actions files may only export async functions.
// Anything else (values, types, constants) breaks the server-actions
// loader's introspection pass. That's the root cause of the 4 failed
// deploy attempts on 2026-07-21: T192 tried to re-export the summary
// type as a convenience, which corrupted the entire module's export
// graph and surfaced as "ReferenceError: ReactionSummary is not
// defined" pointing at the function signature.
//
// Consumers that need the ReactionSummary / ReactionType shapes must
// import them directly from @/lib/reactions instead of from here.
