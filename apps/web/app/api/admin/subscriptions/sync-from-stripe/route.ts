// apps/web/app/api/admin/subscriptions/sync-from-stripe/route.ts
//
// T103 (2026-07-11): admin-only backstop for webhook drift.
//
// Queries Stripe for the target user's / brand's current subscription
// state and writes the authoritative shape back to the DB. Purpose:
// when a webhook silently no-ops (HP-8 trigger bug, missed retry,
// deploy race, etc.) leaves the DB stale, an admin can force
// reconciliation without waiting for the next lifecycle event.
//
// Auth: role === 'admin' via isAdminUser.
//
// Payload:
//   { target_type: "user" | "brand", target_id: string }
//
// Behavior:
//   1. Look up the row's stripe_customer_id
//   2. If null, return 400 (nothing to sync)
//   3. Query stripe.subscriptions.list({ customer, status: "all", limit: 5 })
//   4. Pick the "most authoritative" one (active > trialing > past_due >
//      canceled > incomplete etc — first hit in that priority order)
//   5. Write subscription_tier + subscription_status +
//      subscription_current_period_end + subscription_cancel_at_period_end
//      to the row via the admin client (bypasses HP-8)
//   6. If NO Stripe subs exist for the customer, downgrade the DB row to
//      free/null (matches "user cancelled and never resubscribed" shape)

import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import { stripe } from "@/lib/stripe";

// Priority order for picking the most authoritative sub when a customer
// has more than one. Active/trialing beats everything else.
const STATUS_PRIORITY: Stripe.Subscription.Status[] = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "canceled",
  "incomplete_expired",
  "paused",
];

function pickBestSub(
  subs: Stripe.Subscription[],
): Stripe.Subscription | null {
  for (const status of STATUS_PRIORITY) {
    const match = subs.find((s) => s.status === status);
    if (match) return match;
  }
  return subs[0] ?? null;
}

function periodEndIso(sub: Stripe.Subscription): string | null {
  const periodEnd = sub.items?.data?.[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { target_type?: unknown; target_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { target_type, target_id } = body;
  if (target_type !== "user" && target_type !== "brand") {
    return NextResponse.json(
      { error: "target_type must be 'user' or 'brand'" },
      { status: 400 },
    );
  }
  if (typeof target_id !== "string" || !target_id) {
    return NextResponse.json(
      { error: "target_id required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const table = target_type === "brand" ? "brands" : "profiles";

  // 1. Look up the row's stripe_customer_id.
  const { data: row, error: rowErr } = await admin
    .from(table)
    .select("id, stripe_customer_id, subscription_tier, subscription_status")
    .eq("id", target_id)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json(
      { error: `No ${target_type} row with id=${target_id}` },
      { status: 404 },
    );
  }
  if (!row.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          "No stripe_customer_id on this row — nothing to sync from Stripe.",
      },
      { status: 400 },
    );
  }

  // 2. Query Stripe.
  let subs: Stripe.Subscription[];
  try {
    const res = await stripe.subscriptions.list({
      customer: row.stripe_customer_id,
      status: "all",
      limit: 5,
    });
    subs = res.data;
  } catch (stripeErr) {
    console.error(
      "[admin/subscriptions/sync-from-stripe] Stripe list failed:",
      stripeErr,
    );
    return NextResponse.json(
      { error: "Stripe unreachable — try again shortly." },
      { status: 502 },
    );
  }

  const best = pickBestSub(subs);

  // 3. Compute the DB write.
  //
  // If Stripe knows nothing about this customer, downgrade to free/null.
  // If it knows an active/trialing sub, mark pro. Anything else (past_due,
  // canceled, unpaid, incomplete) keeps the status Stripe reports but
  // still marks tier=pro if there's a period_end in the future — we
  // let the DB row carry the raw truth rather than pre-collapsing it.
  // Tier value differs by target: profiles CHECK is ('free', 'pro'),
  // brands CHECK is ('free', 'brand_pro'). Pick the one that satisfies
  // the constraint on this row.
  const activeTierValue = target_type === "brand" ? "brand_pro" : "pro";
  // subscription_status CHECK on both tables is
  // ('active', 'canceled', 'past_due', 'trialing') OR null. Stripe can
  // return other lifecycle states (unpaid / incomplete /
  // incomplete_expired / paused), so we coerce those to null and let the
  // tier field carry the "not paying" signal.
  const ALLOWED_STATUSES = new Set([
    "active",
    "canceled",
    "past_due",
    "trialing",
  ]);

  const updatePayload: {
    subscription_tier: string;
    subscription_status: string | null;
    subscription_current_period_end: string | null;
    subscription_cancel_at_period_end: boolean;
  } = {
    subscription_tier: "free",
    subscription_status: null,
    subscription_current_period_end: null,
    subscription_cancel_at_period_end: false,
  };

  if (best) {
    const ACTIVE = new Set(["active", "trialing"]);
    updatePayload.subscription_status = ALLOWED_STATUSES.has(best.status)
      ? best.status
      : null;
    updatePayload.subscription_current_period_end = periodEndIso(best);
    updatePayload.subscription_cancel_at_period_end =
      !!best.cancel_at_period_end;
    updatePayload.subscription_tier = ACTIVE.has(best.status)
      ? activeTierValue
      : "free";
  }

  const { data: updated, error: updateErr } = await admin
    .from(table)
    .update(updatePayload)
    .eq("id", target_id)
    .select(
      "id, subscription_tier, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end",
    )
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    row: updated,
    stripe_sub_count: subs.length,
    picked_status: best?.status ?? null,
  });
}
