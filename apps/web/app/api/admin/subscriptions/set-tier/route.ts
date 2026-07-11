// apps/web/app/api/admin/subscriptions/set-tier/route.ts
//
// T102 (2026-07-11): admin-only subscription tier override.
//
// Directly flips profiles.subscription_tier / brands.subscription_tier
// without going through Stripe. Purpose: QA + fresh-account test cycles
// pre-launch — flip a test user to Pro, run through the Pro-only flows,
// flip them back. NOT for customer-facing sub management (that goes
// through Stripe checkout / billing portal).
//
// Auth: role === 'admin' via isAdminUser (bypasses HP-8 trigger because
// service_role admin client writes).
//
// Payload:
//   { target_type: "user" | "brand", target_id: string,
//     tier: "free" | "pro", status: "active" | "canceled" | null }
//
// If tier flips to "free", subscription_status is set to null (matches
// the webhook's "user never subscribed" shape). subscription_status
// values otherwise follow Stripe's vocabulary so the DB row stays
// coherent even if a real Stripe sub later shows up.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";

const VALID_TIERS = new Set(["free", "pro"]);
const VALID_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
]);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    target_type?: unknown;
    target_id?: unknown;
    tier?: unknown;
    status?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { target_type, target_id, tier, status } = body;
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
  if (typeof tier !== "string" || !VALID_TIERS.has(tier)) {
    return NextResponse.json(
      { error: `tier must be one of: ${[...VALID_TIERS].join(", ")}` },
      { status: 400 },
    );
  }
  if (
    status !== null &&
    (typeof status !== "string" || !VALID_STATUSES.has(status))
  ) {
    return NextResponse.json(
      {
        error: `status must be null or one of: ${[...VALID_STATUSES].join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Coerce: if flipping to free, force status to null so we don't leave
  // a stale "active" flag on a downgraded row.
  const effectiveStatus = tier === "free" ? null : status;

  const admin = createAdminClient();
  const table = target_type === "brand" ? "brands" : "profiles";

  const { data: updated, error } = await admin
    .from(table)
    .update({
      subscription_tier: tier,
      subscription_status: effectiveStatus,
    })
    .eq("id", target_id)
    .select("id, subscription_tier, subscription_status")
    .maybeSingle();

  if (error) {
    console.error("[admin/subscriptions/set-tier] update failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json(
      { error: `No ${target_type} row with id=${target_id}` },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, row: updated });
}
