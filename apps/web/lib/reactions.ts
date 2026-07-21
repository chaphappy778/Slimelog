// apps/web/lib/reactions.ts
//
// T192 (2026-07-21): shared reaction vocabulary + aggregation.
//
// Pure module (no "use server" / "use client", no server-only imports)
// so it can be pulled into the server actions, the client ReactionRow,
// and the notification renderer without dragging any of those runtimes
// into each other.
//
// This module is the SOURCE OF TRUTH for the reaction set. The DB CHECK
// constraint in 20260721000086_comment_reactions.sql mirrors
// REACTION_TYPES — if the set ever changes, update BOTH (additive only:
// reactions already stored must keep validating).
//
// Originally shipped for T127 (reactions on logs), deleted in the T127
// revert, recreated here unchanged for T192 (reactions on comments).
// The vocabulary is surface-agnostic on purpose.

// Display order matches the reaction spec: 👍 ❤️ 🔥 🎯 🙌.
export const REACTION_TYPES = [
  "like",
  "love",
  "fire",
  "nailed_it",
  "celebrate",
] as const;

export type ReactionType = (typeof REACTION_TYPES)[number];

// Slug → glyph + human label. Label feeds aria-labels + the
// notification copy, so it must stay em-dash-free and direct-address
// friendly (CLAUDE.md voice rules).
export const REACTION_META: Record<
  ReactionType,
  { emoji: string; label: string }
> = {
  like: { emoji: "👍", label: "Like" },
  love: { emoji: "❤️", label: "Love" },
  fire: { emoji: "🔥", label: "Fire" },
  nailed_it: { emoji: "🎯", label: "Nailed it" },
  celebrate: { emoji: "🙌", label: "Celebrate" },
};

export interface ReactionSummary {
  reaction_type: ReactionType;
  count: number;
  // Whether the current viewer has this reaction toggled on.
  viewerReacted: boolean;
}

export function isReactionType(value: string): value is ReactionType {
  return (REACTION_TYPES as readonly string[]).includes(value);
}

/**
 * Fold a flat list of reaction rows into the fixed-order summary array.
 *
 * Always returns one entry per REACTION_TYPES member (count 0 when
 * nobody reacted) so the UI can render the full row of tap targets and
 * just hide the count when it's zero. Unknown slugs (e.g. a future
 * reaction the client doesn't know yet) are skipped rather than
 * crashing.
 *
 * `viewerId` null → viewerReacted is false for everything (logged-out
 * or anonymous render).
 */
export function aggregateReactions(
  rows: { reaction_type: string; user_id: string }[],
  viewerId: string | null,
): ReactionSummary[] {
  const counts: Record<string, number> = {};
  const viewer = new Set<string>();

  for (const row of rows) {
    if (!isReactionType(row.reaction_type)) continue;
    counts[row.reaction_type] = (counts[row.reaction_type] ?? 0) + 1;
    if (viewerId && row.user_id === viewerId) viewer.add(row.reaction_type);
  }

  return REACTION_TYPES.map((t) => ({
    reaction_type: t,
    count: counts[t] ?? 0,
    viewerReacted: viewer.has(t),
  }));
}
