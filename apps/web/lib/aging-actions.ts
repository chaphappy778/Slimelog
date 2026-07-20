// apps/web/lib/aging-actions.ts
//
// T125 — server actions for aging-reminder interactions.
//
// All actions require an authenticated user + verify the target log
// belongs to that user before mutating (RLS also enforces this, but
// double-guarding keeps error messages helpful when RLS would just
// return "not found").
//
// Kept separate from slime-actions.ts because:
//   1. Each action has narrow, obvious intent — no generic Partial<>
//      that a caller could accidentally use to mutate unrelated
//      fields.
//   2. Business rules stay local (Mark as Checked resets state to
//      "fresh" regardless of what the cron thought; can't leak).
//   3. Analytics + event fan-out will grow here as we add features
//      (SMS opt-in, per-log activator ratio recommendations, etc.).

"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Auth guard (same pattern as slime-actions) ───────────────────────

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return user.id;
}

// ─── Result union — matches slime-actions convention ──────────────────

export type AgingActionResult =
  | { ok: true }
  | { ok: false; error: string };

// ─── markLogChecked: user says "I checked this slime, reset the clock" ─

/**
 * User tapped "Mark as checked" — resets last_checked_at to now and
 * flips aging_state back to 'fresh'. The nightly cron will
 * recompute state on the next run based on the new anchor.
 *
 * Idempotent: calling twice in a row is fine; both calls just
 * refresh last_checked_at.
 */
export async function markLogChecked(logId: string): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("collection_logs")
    .update({
      last_checked_at: nowIso,
      aging_state: "fresh",
    })
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) {
    console.error("[markLogChecked] update failed:", error.message);
    return { ok: false, error: "Couldn't mark this slime as checked." };
  }
  return { ok: true };
}

// ─── snoozeLog: temporarily push out the next reminder ────────────────

/**
 * User tapped "Snooze" — bumps last_checked_at forward by `days`,
 * effectively delaying the next reminder by that many days without
 * mutating the base-type default or the per-log interval override.
 *
 * Different from markChecked in intent: "I know I haven't checked it,
 * remind me later" vs "I just checked it, reset the clock."
 * Same DB write shape, different UX + copy.
 *
 * Defaults to 7 days. Caller can pass 14/30 for longer snoozes.
 */
export async function snoozeLog(
  logId: string,
  days: number = 7,
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const anchor = new Date(Date.now() + days * 86_400_000).toISOString();
  const { error } = await supabase
    .from("collection_logs")
    .update({
      last_checked_at: anchor,
      aging_state: "fresh",
    })
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) {
    console.error("[snoozeLog] update failed:", error.message);
    return { ok: false, error: "Couldn't snooze this reminder." };
  }
  return { ok: true };
}

// ─── setLogAgingEnabled: per-log toggle on/off ────────────────────────

/**
 * User tapped "Turn off reminders" on a specific slime (e.g., an
 * heirloom slime they want to keep visible but not be nagged about).
 * Toggles `aging_enabled` — the nightly cron respects this and skips
 * the log entirely.
 */
export async function setLogAgingEnabled(
  logId: string,
  enabled: boolean,
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_logs")
    .update({ aging_enabled: enabled })
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) {
    console.error("[setLogAgingEnabled] update failed:", error.message);
    return { ok: false, error: "Couldn't update reminder setting." };
  }
  return { ok: true };
}

// ─── setLogInterval: per-log override of the aging interval ───────────

/**
 * User adjusts the reminder cadence for a specific slime — e.g.,
 * they know their Aloe Nightmares butter goes 45 days not 30.
 * `null` clears the override and falls back to the base-type default.
 */
export async function setLogAgingInterval(
  logId: string,
  intervalDays: number | null,
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  if (intervalDays !== null && (intervalDays < 1 || intervalDays > 365)) {
    return {
      ok: false,
      error: "Interval must be between 1 and 365 days.",
    };
  }
  const { error } = await supabase
    .from("collection_logs")
    .update({ aging_interval_days: intervalDays })
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) {
    console.error("[setLogAgingInterval] update failed:", error.message);
    return { ok: false, error: "Couldn't update reminder interval." };
  }
  return { ok: true };
}

// ─── setLogShelfState: on_shelf / for_sale / archived ─────────────────

/**
 * Moves a log between shelf states. Archived logs stop getting aging
 * reminders (the cron filter excludes non-`on_shelf`). For-sale logs
 * also skip reminders (you don't want to be nagged about a slime
 * you're already trying to sell) — plus the future marketplace flow
 * hooks off this state.
 */
export async function setLogShelfState(
  logId: string,
  state: "on_shelf" | "for_sale" | "archived",
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_logs")
    .update({ shelf_state: state })
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) {
    console.error("[setLogShelfState] update failed:", error.message);
    return { ok: false, error: "Couldn't move this slime." };
  }
  return { ok: true };
}

// ─── setProfileAgingEnabled: global on/off ────────────────────────────

/**
 * Global aging-reminders toggle from Settings. When false, the
 * nightly cron skips this user entirely, regardless of per-log
 * aging_enabled state. Useful for users who prefer no notifications
 * across the board without having to per-log opt out.
 */
export async function setProfileAgingEnabled(
  enabled: boolean,
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ aging_reminders_enabled: enabled })
    .eq("id", userId);
  if (error) {
    console.error("[setProfileAgingEnabled] update failed:", error.message);
    return { ok: false, error: "Couldn't update reminder setting." };
  }
  return { ok: true };
}
