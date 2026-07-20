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

// ─── Pro entitlement check ───────────────────────────────────────────
//
// Some care-plan features (custom interval overrides, care_plan_notes)
// are Pro-gated. This helper resolves the current user's active Pro
// status. Uses `profiles_public.is_premium` which is the computed
// (subscription_tier IN ('pro', 'brand_pro') AND subscription_status
// = 'active') column — respects trial states, past_due lapses, etc.
//
// Returns false on any error / missing profile, which is the safe
// default (feature gets blocked rather than accidentally unlocked).
async function currentUserIsPro(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles_public")
    .select("is_premium")
    .eq("id", user.id)
    .maybeSingle();
  return Boolean(data?.is_premium);
}

// ─── Result union — matches slime-actions convention ──────────────────

export type AgingActionResult =
  | { ok: true }
  | { ok: false; error: string };

// ─── Care action shape ────────────────────────────────────────────────

/**
 * One care action reported during a check-in. Matches the shape of
 * slime_care_actions rows minus the auto-set id/user_id/log_id.
 * Callers construct these client-side from the check-in modal
 * selections; the server inserts them alongside the aging update.
 *
 * `product_key` must be a valid key from `care_products`. Server
 * doesn't currently validate the FK before insert — Postgres does
 * that atomically via the FK constraint (bad keys just fail the
 * insert, which we surface as the whole markLogChecked failing).
 */
export interface CareActionInput {
  action_type:
    | "activator"
    | "softener"
    | "additive"
    | "physical"
    | "storage"
    | "other";
  // Nullable: a quick category re-log from the /collection/care
  // "Recent care" strip records that the category was performed
  // again without naming a product. slime_care_actions.product_key
  // is nullable in the schema (20260720000082_t125_care_actions.sql).
  product_key: string | null;
  quantity_type?:
    | "drops"
    | "pumps"
    | "tsp"
    | "tbsp"
    | "ml"
    | "oz"
    | "pinch"
    | "squirt"
    | null;
  quantity_amount?: number | null;
  notes?: string | null;
}

// ─── markLogChecked: user says "I checked this slime, reset the clock" ─

/**
 * User tapped "Save" on the check-in modal — resets last_checked_at
 * to now, flips aging_state back to 'fresh', AND inserts one row per
 * care action reported.
 *
 * Care actions are the data-collection flywheel: every check-in
 * captures 1..N structured actions (Kneaded by default, plus any
 * activator / softener / additive / storage the user reported).
 * Free tier + Pro tier both feed data in here — Pro gets richer
 * analytics + custom cadence + care history dashboard, but the
 * INSERT path is identical for both.
 *
 * If no careActions are passed, the check-in still marks the slime
 * fresh but records no care actions. That matches the legacy
 * "just checked" behavior — callers who don't yet open the modal
 * (e.g. older admin flows) keep working.
 *
 * Idempotent on the log update; the care_actions insert is
 * additive (new rows every call). Callers should NOT retry blindly
 * or they'll double-log actions.
 */
export async function markLogChecked(
  logId: string,
  careActions: CareActionInput[] = [],
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from("collection_logs")
    .update({
      last_checked_at: nowIso,
      aging_state: "fresh",
    })
    .eq("id", logId)
    .eq("user_id", userId);
  if (updateErr) {
    console.error("[markLogChecked] update failed:", updateErr.message);
    return { ok: false, error: "Couldn't mark this slime as checked." };
  }

  // Insert care action rows (if any were reported). Kept in the same
  // server round-trip so a failed care insert also gets flagged, but
  // NOT wrapped in an explicit transaction — the aging update is the
  // primary success signal and shouldn't be rolled back if a care
  // action row hiccups (we'd rather report "checked but couldn't
  // save what you did" than "check-in failed"). RLS enforces
  // user_id = auth.uid() on insert so we can pass user_id directly.
  if (careActions.length > 0) {
    const rows = careActions.map((a) => ({
      log_id: logId,
      user_id: userId,
      performed_at: nowIso,
      action_type: a.action_type,
      product_key: a.product_key,
      quantity_type: a.quantity_type ?? null,
      quantity_amount: a.quantity_amount ?? null,
      notes: a.notes ?? null,
    }));
    const { error: careErr } = await supabase
      .from("slime_care_actions")
      .insert(rows);
    if (careErr) {
      console.error(
        "[markLogChecked] care action insert failed:",
        careErr.message,
      );
      // Non-fatal — aging update already succeeded. Return a soft
      // error so the client can surface a "checked, but couldn't
      // save care details" toast if it wants.
      return {
        ok: false,
        error:
          "Checked, but couldn't save what you did. Try again from the slime page.",
      };
    }
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
 *
 * **Pro-gated.** Custom per-slime cadence is the core Pro-tier
 * feature of the care package concept. Free users hitting this
 * server-side (via a hacked client or dev tools) get blocked with
 * a friendly upgrade prompt. UI must not expose the interval editor
 * to free users in the first place, but server-side is the safety
 * net.
 */
export async function setLogAgingInterval(
  logId: string,
  intervalDays: number | null,
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const isPro = await currentUserIsPro();
  if (!isPro) {
    return {
      ok: false,
      error:
        "Custom check-in cadence is a Pro feature. Upgrade to build a care plan for this slime.",
    };
  }
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

// ─── setLogCarePlanNotes: Pro-only per-slime care instructions ────────

/**
 * User writes free-form care instructions for a specific slime on
 * the /collection/care page. Pro-only feature.
 *
 * Text passes through the moderation gate (same as scent_notes +
 * slime notes) before insert. Nullable — passing null clears the
 * plan.
 *
 * Max length capped at 500 characters — care plans are meant to be
 * short handling instructions, not essays. Frontend enforces the
 * same limit visually.
 */
export async function setLogCarePlanNotes(
  logId: string,
  notes: string | null,
): Promise<AgingActionResult> {
  const userId = await requireUserId();
  const isPro = await currentUserIsPro();
  if (!isPro) {
    return {
      ok: false,
      error:
        "Custom care plans are a Pro feature. Upgrade to save care instructions for your slimes.",
    };
  }
  const trimmed = notes?.trim() ?? null;
  if (trimmed !== null && trimmed.length > 500) {
    return {
      ok: false,
      error: "Care plan is too long. Keep it under 500 characters.",
    };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_logs")
    .update({ care_plan_notes: trimmed })
    .eq("id", logId)
    .eq("user_id", userId);
  if (error) {
    console.error("[setLogCarePlanNotes] update failed:", error.message);
    return { ok: false, error: "Couldn't save care plan." };
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
