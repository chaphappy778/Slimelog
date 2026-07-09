// apps/web/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

// Audit hp-23 (2026-07-08): the previous module-scope
// `createAdminClient(url!, key!)` silently accepted `undefined` env
// vars (JS coerces `undefined!` to a runtime undefined which
// createClient treats as "" for the key). If the env was missing at
// deploy, the webhook accepted Stripe events and returned 200 while
// no DB updates ever landed — the worst class of silent failure at
// the money-flow layer. Lazy-init inside the handler with explicit
// env presence check now. Module-scope singleton cache avoids
// re-instantiating on every invocation once the check passes.
let cachedAdminClient: ReturnType<typeof createSupabaseClient> | null = null;
function getAdminClient() {
  if (cachedAdminClient) return cachedAdminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  cachedAdminClient = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdminClient;
}

// [Fix B] Signature widened from Record<string, string | null> to accept boolean
// values so subscription_cancel_at_period_end can be written alongside string
// and nullable timestamp values.
async function updateByCustomerId(
  customerId: string,
  updates: Record<string, string | null | boolean>,
) {
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile) {
    await getAdminClient()
      .from("profiles")
      .update(updates)
      .eq("stripe_customer_id", customerId);
    return;
  }

  const { data: brand } = await getAdminClient()
    .from("brands")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (brand) {
    await getAdminClient()
      .from("brands")
      .update(updates)
      .eq("stripe_customer_id", customerId);
  }
}

// [Fix B] Same widening as above — both profileUpdates and brandUpdates now
// accept boolean values.
async function updateByCustomerIdTyped(
  customerId: string,
  profileUpdates: Record<string, string | null | boolean>,
  brandUpdates: Record<string, string | null | boolean>,
) {
  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile) {
    await getAdminClient()
      .from("profiles")
      .update(profileUpdates)
      .eq("stripe_customer_id", customerId);
    return;
  }

  const { data: brand } = await getAdminClient()
    .from("brands")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (brand) {
    await getAdminClient()
      .from("brands")
      .update(brandUpdates)
      .eq("stripe_customer_id", customerId);
  }
}

// [Fix B] Helper: convert Stripe's Unix seconds timestamp into an ISO string
// suitable for a Postgres timestamptz column. Returns null when the field is
// absent (Stripe may omit it on some lifecycle events).
function periodEndIso(subscription: Stripe.Subscription): string | null {
  // In Stripe API 2026-03-25.dahlia, current_period_end is per-item.
  // Our subs are single-item so items.data[0] is the correct source.
  const periodEnd = subscription.items?.data?.[0]?.current_period_end;
  return periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  // Audit hp-23 (2026-07-08): validate env presence up front so a
  // deploy with missing Supabase env vars fails visibly rather than
  // accepting Stripe events and returning 200 while doing nothing.
  // Cache-warms getAdminClient so subsequent calls are cheap.
  try {
    getAdminClient();
  } catch (envErr) {
    console.error("[stripe/webhook] env check failed:", envErr);
    return NextResponse.json(
      { error: "Server misconfigured — Supabase env vars missing." },
      { status: 500 },
    );
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { error: "Server misconfigured — Stripe webhook secret missing." },
      { status: 500 },
    );
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Audit hp-10 (2026-07-06): idempotency dedup. Insert-first with
  // ON CONFLICT DO NOTHING against public.stripe_webhook_events. If
  // the row already exists (returning empty select), another delivery
  // already claimed this event — short-circuit with 200 so Stripe
  // stops retrying. On successful handler execution we leave the row
  // in place; on handler failure we delete it so the next retry can
  // reclaim the event fresh.
  //
  // Payload stored so a postmortem can reprocess without hitting Stripe.
  const { data: claim, error: claimErr } = await getAdminClient()
    .from("stripe_webhook_events")
    .upsert(
      {
        event_id: event.id,
        event_type: event.type,
        payload: event.data.object as unknown as Record<string, unknown>,
      },
      { onConflict: "event_id", ignoreDuplicates: true },
    )
    .select("event_id");

  if (claimErr) {
    console.error("Webhook idempotency claim error:", claimErr);
    // Fail closed — return 500 so Stripe retries. If the table is
    // temporarily unavailable, we'd rather deliver-late than double.
    return NextResponse.json(
      { error: "Idempotency store unavailable" },
      { status: 500 },
    );
  }

  if (!claim || claim.length === 0) {
    // Already processed — return 200 without running the handler.
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // [Fix B] No change to the new period-end fields here — the paired
        // customer.subscription.created event fires right after checkout and
        // is responsible for writing current_period_end + cancel_at_period_end.
        // This handler remains a tier + status primer only.
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        if (!customerId) break;
        await updateByCustomerIdTyped(
          customerId,
          { subscription_tier: "pro", subscription_status: "active" },
          { subscription_tier: "brand_pro", subscription_status: "active" },
        );
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) break;
        const status = subscription.status;
        // [Fix B] Extend with period end + cancel_at_period_end on the
        // creation event so the settings card shows a renewal date immediately
        // after checkout.
        const periodEnd = periodEndIso(subscription);
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await updateByCustomerIdTyped(
          customerId,
          {
            subscription_tier: "pro",
            subscription_status: status,
            subscription_current_period_end: periodEnd,
            subscription_cancel_at_period_end: cancelAtPeriodEnd,
          },
          {
            subscription_tier: "brand_pro",
            subscription_status: status,
            subscription_current_period_end: periodEnd,
            subscription_cancel_at_period_end: cancelAtPeriodEnd,
          },
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) break;
        const status = subscription.status;
        // [Fix B] Compute once and reuse across branches.
        const periodEnd = periodEndIso(subscription);
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;

        if (status === "active" || status === "trialing") {
          // [Fix B] Always refresh period end + cancel flag — this is where
          // the "user clicked Cancel in the portal" signal arrives (status
          // stays active, cancel_at_period_end flips to true).
          await updateByCustomerIdTyped(
            customerId,
            {
              subscription_tier: "pro",
              subscription_status: status,
              subscription_current_period_end: periodEnd,
              subscription_cancel_at_period_end: cancelAtPeriodEnd,
            },
            {
              subscription_tier: "brand_pro",
              subscription_status: status,
              subscription_current_period_end: periodEnd,
              subscription_cancel_at_period_end: cancelAtPeriodEnd,
            },
          );
        } else if (status === "past_due") {
          // [Fix B] Past-due also refreshes both fields — the renewal date
          // still displays, but the status signals dunning.
          await updateByCustomerId(customerId, {
            subscription_status: "past_due",
            subscription_current_period_end: periodEnd,
            subscription_cancel_at_period_end: cancelAtPeriodEnd,
          });
        } else if (status === "canceled" || status === "unpaid") {
          // [Fix B] Terminal states: clear period end and reset the cancel
          // flag — the sub is fully gone, no renewal or end-date relevant.
          await updateByCustomerIdTyped(
            customerId,
            {
              subscription_tier: "free",
              subscription_status: "canceled",
              subscription_current_period_end: null,
              subscription_cancel_at_period_end: false,
            },
            {
              subscription_tier: "free",
              subscription_status: "canceled",
              subscription_current_period_end: null,
              subscription_cancel_at_period_end: false,
            },
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) break;
        // [Fix B] Subscription fully removed — clear period end and reset
        // cancel flag, mirroring the canceled/unpaid branch above.
        await updateByCustomerIdTyped(
          customerId,
          {
            subscription_tier: "free",
            subscription_status: "canceled",
            subscription_current_period_end: null,
            subscription_cancel_at_period_end: false,
          },
          {
            subscription_tier: "free",
            subscription_status: "canceled",
            subscription_current_period_end: null,
            subscription_cancel_at_period_end: false,
          },
        );
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);

    // Audit hp-10 (2026-07-06): roll back the idempotency claim so
    // Stripe's next retry can reclaim this event. Without this, a
    // partial handler failure would be permanently locked out from
    // reprocessing. Best-effort delete — if this fails, the event is
    // stuck in "claimed but not applied" state and needs manual
    // intervention, but that's better than silently double-processing.
    const { error: rollbackErr } = await getAdminClient()
      .from("stripe_webhook_events")
      .delete()
      .eq("event_id", event.id);
    if (rollbackErr) {
      console.error(
        "Webhook idempotency rollback failed for",
        event.id,
        rollbackErr,
      );
    }

    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
