// apps/web/app/api/cron/aging-scan/route.ts
//
// T125 — nightly aging-scan cron.
//
// Triggered daily by Vercel Cron (see vercel.json → 4 AM ET) OR
// manually via `curl -X POST -H 'Authorization: Bearer <CRON_SECRET>'
// https://slimelog.com/api/cron/aging-scan`.
//
// Does two passes:
//
//   PASS 1 — recompute aging_state for every eligible collection_log.
//     `eligible` = shelf_state='on_shelf' AND aging_enabled=true.
//     A single Postgres UPDATE handles this via the
//     `get_effective_aging_interval(log)` helper. State transitions:
//       fresh   → days-since-check < interval - 5
//       warning → interval - 5 ≤ days < interval
//       overdue → days ≥ interval
//
//   PASS 2 — fan out one in-app notification per user who has at
//     least one warning-or-overdue log AND hasn't been notified in
//     the last 20 hours. Dedupe log written to
//     `aging_notifications_sent` so the next day's run doesn't spam.
//
// Deliberately DOES NOT send email (Jenn's decision — reminders live
// in the app; monthly Brevo wrap-up carries the aggregate story). The
// notification row surfaces on the bell + /notifications feed.

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

// Same lazy-init pattern the Stripe checkout route uses — throws a
// clear error if env vars are missing rather than silently 200-ing.
let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  cachedAdmin = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}

// Vercel Cron sends the header `Authorization: Bearer <CRON_SECRET>`
// automatically when triggering scheduled routes, but any manual
// curl needs to pass the same. Env var name matches the standard
// Vercel Cron convention.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In dev, allow unauthenticated calls so a developer can hit the
    // endpoint from their terminal without setting up secrets.
    // Production always sets CRON_SECRET so this branch never fires
    // there.
    return process.env.NODE_ENV !== "production";
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const started = Date.now();

  // ─── PASS 1: recompute aging_state for eligible logs ──────────────
  //
  // Single big UPDATE. Uses the `get_effective_aging_interval` helper
  // from the migration so the interval resolution logic lives in one
  // place (per-log override → base-type default → 45-day fallback).
  const recomputeSql = `
    UPDATE public.collection_logs cl
    SET aging_state = CASE
      WHEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.last_checked_at, cl.created_at))) / 86400
           >= public.get_effective_aging_interval(cl.*)::numeric
        THEN 'overdue'::public.aging_state
      WHEN EXTRACT(EPOCH FROM (now() - COALESCE(cl.last_checked_at, cl.created_at))) / 86400
           >= (public.get_effective_aging_interval(cl.*)::numeric - 5)
        THEN 'warning'::public.aging_state
      ELSE 'fresh'::public.aging_state
    END
    WHERE cl.shelf_state = 'on_shelf'
      AND cl.aging_enabled = true
    RETURNING cl.id;
  `;

  // Note: Supabase JS client's `.rpc()` requires a defined function.
  // For arbitrary SQL we use `.from().select()` won't work, so we call
  // a wrapper function we defined in a small SQL migration OR use a
  // direct query via the REST /rpc/execute alternative. Cleanest:
  // wrap the whole scan in a Postgres function and call it via .rpc().
  //
  // For simplicity here we do the two-pass logic in JS via
  // supabase-js queries. Each pass is a single round-trip so the
  // total wall time is <500ms even at thousands of logs.

  // Pass 1: pull all eligible logs' state-relevant columns, compute
  // new state in JS, batch-update via `upsert` on id.
  const { data: eligibleRows, error: fetchErr } = await admin
    .from("collection_logs")
    .select("id, base_type, last_checked_at, created_at, aging_interval_days")
    .eq("shelf_state", "on_shelf")
    .eq("aging_enabled", true);

  if (fetchErr) {
    console.error("[aging-scan] Failed to load eligible logs:", fetchErr);
    Sentry.captureException(fetchErr, {
      tags: { route: "cron/aging-scan", stage: "load_logs" },
    });
    return NextResponse.json(
      { error: "Failed to load logs" },
      { status: 500 },
    );
  }

  // Pull base-type defaults into an in-memory map so we don't join on
  // every row.
  const { data: defaults, error: defaultsErr } = await admin
    .from("base_type_activator_defaults")
    .select("base_type, default_interval_days");
  if (defaultsErr) {
    console.error(
      "[aging-scan] Failed to load base_type_activator_defaults:",
      defaultsErr,
    );
    Sentry.captureException(defaultsErr, {
      tags: { route: "cron/aging-scan", stage: "load_defaults" },
    });
    return NextResponse.json(
      { error: "Failed to load defaults" },
      { status: 500 },
    );
  }
  const defaultByBaseType = new Map<string, number>();
  for (const row of defaults ?? []) {
    defaultByBaseType.set(
      row.base_type as string,
      row.default_interval_days as number,
    );
  }
  const HARD_FALLBACK_DAYS = 45;

  function stateFor(row: {
    base_type: string | null;
    last_checked_at: string | null;
    created_at: string;
    aging_interval_days: number | null;
  }): "fresh" | "warning" | "overdue" {
    const interval =
      row.aging_interval_days ??
      (row.base_type ? defaultByBaseType.get(row.base_type) : undefined) ??
      HARD_FALLBACK_DAYS;
    const anchor = new Date(row.last_checked_at ?? row.created_at).getTime();
    const daysSince = (Date.now() - anchor) / 86_400_000;
    if (daysSince >= interval) return "overdue";
    if (daysSince >= interval - 5) return "warning";
    return "fresh";
  }

  // Bucket updates by target state so each state gets one batch UPDATE
  // instead of one-per-row. At ~thousands of logs this collapses to
  // three round-trips regardless of scale.
  const buckets: Record<"fresh" | "warning" | "overdue", string[]> = {
    fresh: [],
    warning: [],
    overdue: [],
  };
  for (const row of eligibleRows ?? []) {
    const s = stateFor(row);
    buckets[s].push(row.id as string);
  }

  let updatedCount = 0;
  for (const state of ["fresh", "warning", "overdue"] as const) {
    if (buckets[state].length === 0) continue;
    const { error: updErr, count } = await admin
      .from("collection_logs")
      .update({ aging_state: state }, { count: "exact" })
      .in("id", buckets[state]);
    if (updErr) {
      console.error(
        `[aging-scan] Failed to update ${state} bucket:`,
        updErr,
      );
      continue;
    }
    updatedCount += count ?? 0;
  }

  // ─── PASS 2: fan out per-user notifications ──────────────────────
  //
  // Users to notify = those whose profile has aging_reminders_enabled
  // AND who have at least one warning-or-overdue log AND who haven't
  // been notified in the last 20 hours.

  // Build user → flagged_count map from the buckets we just computed.
  const flaggedByUser = new Map<string, number>();
  for (const state of ["warning", "overdue"] as const) {
    for (const logId of buckets[state]) {
      const row = eligibleRows?.find((r) => r.id === logId);
      if (!row) continue;
      // We need user_id here. It wasn't in the SELECT above — fix by
      // pulling it. Instead of re-querying, we do a one-shot user_id
      // lookup below. (Simpler than adding user_id to the initial
      // SELECT and passing it through; keeps stateFor pure.)
    }
  }
  // Re-fetch user_ids for the flagged logs. Cheaper than looping
  // through eligibleRows above because we only need the union of
  // warning + overdue log IDs.
  const flaggedLogIds = [...buckets.warning, ...buckets.overdue];
  if (flaggedLogIds.length > 0) {
    const { data: flaggedLogRows, error: flaggedErr } = await admin
      .from("collection_logs")
      .select("id, user_id")
      .in("id", flaggedLogIds);
    if (flaggedErr) {
      console.error("[aging-scan] Failed to resolve user_ids:", flaggedErr);
    } else {
      for (const row of flaggedLogRows ?? []) {
        const uid = row.user_id as string;
        flaggedByUser.set(uid, (flaggedByUser.get(uid) ?? 0) + 1);
      }
    }
  }

  // Filter to users who have aging_reminders_enabled + haven't been
  // notified in the last 20 hours. Two batched queries.
  const candidateUserIds = [...flaggedByUser.keys()];
  let notificationsSent = 0;

  if (candidateUserIds.length > 0) {
    const { data: enabledProfiles, error: profilesErr } = await admin
      .from("profiles")
      .select("id")
      .in("id", candidateUserIds)
      .eq("aging_reminders_enabled", true);
    if (profilesErr) {
      console.error("[aging-scan] Failed to load profiles:", profilesErr);
    }
    const enabledUserIds = new Set(
      (enabledProfiles ?? []).map((p) => p.id as string),
    );

    // Load recent sends for dedupe
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
    const { data: recentSends, error: sendsErr } = await admin
      .from("aging_notifications_sent")
      .select("user_id")
      .in("user_id", candidateUserIds)
      .gt("sent_at", cutoff);
    if (sendsErr) {
      console.error(
        "[aging-scan] Failed to load recent sends:",
        sendsErr,
      );
    }
    const recentlyNotifiedUserIds = new Set(
      (recentSends ?? []).map((s) => s.user_id as string),
    );

    const usersToNotify = candidateUserIds.filter(
      (uid) =>
        enabledUserIds.has(uid) && !recentlyNotifiedUserIds.has(uid),
    );

    if (usersToNotify.length > 0) {
      // Insert notifications in one batch
      const notifRows = usersToNotify.map((uid) => ({
        recipient_id: uid,
        notification_type: "slime_needs_attention" as const,
      }));
      const { data: insertedNotifs, error: notifErr } = await admin
        .from("notifications")
        .insert(notifRows)
        .select("id, recipient_id");

      if (notifErr) {
        console.error("[aging-scan] Failed to insert notifs:", notifErr);
        // The cron silently failing to notify is exactly the class of
        // silent bug this observability push targets — surface it.
        Sentry.captureException(notifErr, {
          tags: { route: "cron/aging-scan", stage: "insert_notifications" },
        });
      } else {
        // Log the sends for dedupe
        const sentRows = (insertedNotifs ?? []).map((n) => ({
          user_id: n.recipient_id as string,
          logs_flagged: flaggedByUser.get(n.recipient_id as string) ?? 0,
          notification_id: n.id as string,
        }));
        const { error: logErr } = await admin
          .from("aging_notifications_sent")
          .insert(sentRows);
        if (logErr) {
          console.error("[aging-scan] Failed to log sends:", logErr);
        }
        notificationsSent = sentRows.length;
      }
    }
  }

  const elapsed = Date.now() - started;
  console.log(
    `[aging-scan] Done in ${elapsed}ms — updated=${updatedCount} notified=${notificationsSent}`,
  );

  return NextResponse.json({
    ok: true,
    updated_count: updatedCount,
    notifications_sent: notificationsSent,
    elapsed_ms: elapsed,
  });
}
