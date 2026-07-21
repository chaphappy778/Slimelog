// apps/web/lib/reaction-actions.ts
//
// T127 (2026-07-21): server actions for feed-card emoji reactions.
//
// Two entry points:
//   toggleReaction(logId, reactionType) — add-or-remove the current
//     user's reaction of that type on that log. Fires a notification to
//     the log owner on ADD only (never on remove, never for
//     self-reactions).
//   getReactionsForLog(logId) — aggregate summary for a single log
//     (used by the /slimes/[id] detail page + any client refetch).
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
import {
  aggregateReactions,
  isReactionType,
  type ReactionSummary,
} from "@/lib/reactions";

// ─── Result unions ────────────────────────────────────────────────────────

export type ToggleReactionResult =
  | { ok: true; added: boolean; newCount: number }
  | { ok: false; error: string };

export type GetReactionsResult =
  | { ok: true; reactions: ReactionSummary[] }
  | { ok: false; error: string };

// ─── Notification fan-out ───────────────────────────────────────────────────
//
// Best-effort: the reaction row is already committed by the time we run,
// so a failed / skipped notification never fails the toggle. Uses the
// admin client because we (a) read collection_logs.user_id which the
// reacter may not have RLS access to on a private log (though reactions
// only surface on public logs today), and (b) INSERT a notifications
// row targeting a DIFFERENT user, which the anon-key client is blocked
// from doing.
//
// Skips:
//   - log not found / owner unresolved
//   - owner === reacter (self-love is allowed, but no self-notification)
async function notifyLogOwnerOfReaction(args: {
  logId: string;
  reacterId: string;
  reactionType: string;
}): Promise<void> {
  const { logId, reacterId, reactionType } = args;

  try {
    const admin = createAdminClient();

    const { data: log, error: logErr } = await admin
      .from("collection_logs")
      .select("user_id")
      .eq("id", logId)
      .maybeSingle();

    if (logErr) {
      console.error(
        "[notifyLogOwnerOfReaction] log lookup failed:",
        logErr.message,
        { logId },
      );
      return;
    }

    const ownerId = (log?.user_id as string | null | undefined) ?? null;
    if (!ownerId) return; // log vanished between insert and lookup
    if (ownerId === reacterId) return; // self-reaction, no notification

    const { error: notifErr } = await admin.from("notifications").insert({
      recipient_id: ownerId,
      notification_type: "log_reaction_received",
      actor_id: reacterId,
      log_id: logId,
      // The specific emoji lives in metadata so the renderer can show
      // "reacted 🔥 to your <slime> log" without a dedicated column.
      metadata: { reaction_type: reactionType },
    });

    if (notifErr) {
      console.error(
        "[notifyLogOwnerOfReaction] notification insert failed:",
        notifErr.message,
        { logId, ownerId, reactionType },
      );
    }
  } catch (err) {
    // Missing admin env vars, network, etc. Never propagate — the
    // reaction is already saved.
    console.error("[notifyLogOwnerOfReaction] unexpected error:", err);
  }
}

// ─── toggleReaction ─────────────────────────────────────────────────────────

/**
 * Toggle the current user's reaction of `reactionType` on `logId`.
 * Present → deleted; absent → inserted. Returns whether the reaction is
 * now present (`added`) and the fresh count for that reaction on that
 * log (`newCount`) so the optimistic client can reconcile.
 */
export async function toggleReaction(
  logId: string,
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
    .from("log_reactions")
    .select("id")
    .eq("log_id", logId)
    .eq("user_id", userId)
    .eq("reaction_type", reactionType)
    .maybeSingle();

  if (selErr) {
    console.error("[toggleReaction] existence check failed:", selErr.message);
    Sentry.captureException(selErr, { tags: { action: "toggleReaction" } });
    return { ok: false, error: "Couldn't update your reaction." };
  }

  let added: boolean;

  if (existing) {
    const { error: delErr } = await supabase
      .from("log_reactions")
      .delete()
      .eq("id", existing.id as string);
    if (delErr) {
      console.error("[toggleReaction] delete failed:", delErr.message);
      Sentry.captureException(delErr, {
        tags: { action: "toggleReaction", stage: "delete" },
      });
      return { ok: false, error: "Couldn't remove your reaction." };
    }
    added = false;
  } else {
    const { error: insErr } = await supabase
      .from("log_reactions")
      .insert({ log_id: logId, user_id: userId, reaction_type: reactionType });
    if (insErr) {
      // 23505 = unique violation. A double-tap race can insert twice;
      // the server's real state is "reacted", so treat it as added
      // rather than rolling the user's optimistic UI back.
      if (insErr.code === "23505") {
        added = true;
      } else {
        console.error("[toggleReaction] insert failed:", insErr.message);
        Sentry.captureException(insErr, {
          tags: { action: "toggleReaction", stage: "insert" },
        });
        return { ok: false, error: "Couldn't add your reaction." };
      }
    } else {
      added = true;
    }
  }

  // Authoritative fresh count for this reaction on this log — head+count
  // so we don't pull rows.
  const { count, error: cntErr } = await supabase
    .from("log_reactions")
    .select("id", { count: "exact", head: true })
    .eq("log_id", logId)
    .eq("reaction_type", reactionType);

  if (cntErr) {
    // Non-fatal — the toggle itself succeeded. Fall back to a best-guess
    // count of 1/0 so the client still reconciles to the right sign.
    console.warn("[toggleReaction] count query failed:", cntErr.message);
  }
  const newCount = cntErr ? (added ? 1 : 0) : (count ?? 0);

  // Notify the owner on ADD only.
  if (added) {
    await notifyLogOwnerOfReaction({ logId, reacterId: userId, reactionType });
  }

  await captureServerEvent(userId, "log_reaction_toggled", {
    log_id: logId,
    reaction_type: reactionType,
    added,
  });

  return { ok: true, added, newCount };
}

// ─── getReactionsForLog ─────────────────────────────────────────────────────

/**
 * Aggregate reaction summary for a single log. Used by the detail page
 * and any client that wants to refetch after a toggle. Returns the full
 * fixed-order array (count 0 for reactions nobody added yet).
 */
export async function getReactionsForLog(
  logId: string,
): Promise<GetReactionsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("log_reactions")
    .select("reaction_type, user_id")
    .eq("log_id", logId);

  if (error) {
    console.error("[getReactionsForLog] query failed:", error.message);
    Sentry.captureException(error, { tags: { action: "getReactionsForLog" } });
    return { ok: false, error: "Couldn't load reactions." };
  }

  const rows = (data ?? []) as { reaction_type: string; user_id: string }[];
  return { ok: true, reactions: aggregateReactions(rows, user?.id ?? null) };
}
