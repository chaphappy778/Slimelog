// apps/web/app/api/stripe/webhook/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
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
// Explicit `SupabaseClient` type so downstream .from() queries don't
// infer as `never` (ReturnType<typeof createSupabaseClient> without a
// Database generic resolves to SupabaseClient<never> in newer versions).
let cachedAdminClient: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient {
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

// 2026-07-09: metadata-first routing. Every checkout session we create
// sets `subscription_data.metadata = { brand_id }` or
// `{ supabase_user_id }`, which Stripe propagates onto the subscription
// object AND surfaces on the checkout session itself. Routing by
// metadata gives us deterministic table selection independent of
// stripe_customer_id lookups (which were fragile: dependent on the
// customer_id being written to our row before the webhook fires, and
// on there being no collisions across profiles+brands).
//
// We fall back to customer_id lookup for defensive coverage — mostly
// for historical subscriptions created before metadata routing shipped.
type Target =
  | { kind: "profile"; matchColumn: string; matchValue: string }
  | { kind: "brand"; matchColumn: string; matchValue: string }
  | null;

interface StripeMetadata {
  brand_id?: string;
  supabase_user_id?: string;
}

async function resolveTarget(
  customerId: string | null,
  metadata: StripeMetadata | null | undefined,
): Promise<Target> {
  // 1. Metadata-first routing.
  if (metadata?.brand_id) {
    return { kind: "brand", matchColumn: "id", matchValue: metadata.brand_id };
  }
  if (metadata?.supabase_user_id) {
    return {
      kind: "profile",
      matchColumn: "id",
      matchValue: metadata.supabase_user_id,
    };
  }

  // 2. Fallback: look up by stripe_customer_id.
  if (!customerId) return null;

  const { data: profile } = await getAdminClient()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (profile) {
    return {
      kind: "profile",
      matchColumn: "stripe_customer_id",
      matchValue: customerId,
    };
  }

  const { data: brand } = await getAdminClient()
    .from("brands")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (brand) {
    return {
      kind: "brand",
      matchColumn: "stripe_customer_id",
      matchValue: customerId,
    };
  }

  return null;
}

// [Fix B] Signature widened from Record<string, string | null> to accept boolean
// values so subscription_cancel_at_period_end can be written alongside string
// and nullable timestamp values.
async function updateByCustomerId(
  customerId: string | null,
  metadata: StripeMetadata | null | undefined,
  updates: Record<string, string | null | boolean>,
) {
  const target = await resolveTarget(customerId, metadata);
  if (!target) {
    console.error(
      "[stripe/webhook] updateByCustomerId: no target resolved",
      { customerId, metadata },
    );
    return;
  }

  // 2026-07-09: if the row also needs its stripe_customer_id set (when
  // we routed by metadata but the row didn't yet have a customer_id
  // stored), include it in the update. Catches the class of bug where
  // the checkout route's own update to stripe_customer_id landed but
  // then something else cleared it.
  const enrichedUpdates = customerId
    ? { ...updates, stripe_customer_id: customerId }
    : updates;

  const { data, error } = await getAdminClient()
    .from(target.kind === "profile" ? "profiles" : "brands")
    .update(enrichedUpdates)
    .eq(target.matchColumn, target.matchValue)
    .select("id");

  if (error) {
    console.error("[stripe/webhook] updateByCustomerId error:", error);
    throw error;
  }
  if (!data || data.length === 0) {
    console.error(
      "[stripe/webhook] updateByCustomerId affected 0 rows",
      { customerId, metadata, target },
    );
  }
}

// [Fix B] Same widening as above — both profileUpdates and brandUpdates now
// accept boolean values.
async function updateByCustomerIdTyped(
  customerId: string | null,
  metadata: StripeMetadata | null | undefined,
  profileUpdates: Record<string, string | null | boolean>,
  brandUpdates: Record<string, string | null | boolean>,
) {
  const target = await resolveTarget(customerId, metadata);
  if (!target) {
    console.error(
      "[stripe/webhook] updateByCustomerIdTyped: no target resolved",
      { customerId, metadata },
    );
    return;
  }

  const updates = target.kind === "profile" ? profileUpdates : brandUpdates;
  const enrichedUpdates = customerId
    ? { ...updates, stripe_customer_id: customerId }
    : updates;

  const { data, error } = await getAdminClient()
    .from(target.kind === "profile" ? "profiles" : "brands")
    .update(enrichedUpdates)
    .eq(target.matchColumn, target.matchValue)
    .select("id");

  if (error) {
    console.error("[stripe/webhook] updateByCustomerIdTyped error:", error);
    throw error;
  }
  if (!data || data.length === 0) {
    console.error(
      "[stripe/webhook] updateByCustomerIdTyped affected 0 rows",
      { customerId, metadata, target },
    );
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
    // Observability: surface the swallowed error to Sentry.
    Sentry.captureException(envErr, { tags: { route: "stripe/webhook" } });
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
    // Observability: a failed signature check is a silent revenue bug
    // (broken webhook), so capture it even though we return a 400.
    Sentry.captureException(err, {
      tags: { route: "stripe/webhook", reason: "signature_verification" },
    });
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
        //
        // 2026-07-09: pass session.metadata to updateByCustomerIdTyped so
        // routing can use brand_id / supabase_user_id when present.
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = (session.customer as string) || null;
        const metadata =
          (session.metadata as StripeMetadata | null) ?? null;
        if (!customerId && !metadata?.brand_id && !metadata?.supabase_user_id) {
          break;
        }
        await updateByCustomerIdTyped(
          customerId,
          metadata,
          { subscription_tier: "pro", subscription_status: "active" },
          { subscription_tier: "brand_pro", subscription_status: "active" },
        );
        break;
      }

      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = (subscription.customer as string) || null;
        const metadata =
          (subscription.metadata as StripeMetadata | null) ?? null;
        if (!customerId && !metadata?.brand_id && !metadata?.supabase_user_id) {
          break;
        }
        const status = subscription.status;
        // [Fix B] Extend with period end + cancel_at_period_end on the
        // creation event so the settings card shows a renewal date immediately
        // after checkout.
        const periodEnd = periodEndIso(subscription);
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await updateByCustomerIdTyped(
          customerId,
          metadata,
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
        const customerId = (subscription.customer as string) || null;
        const metadata =
          (subscription.metadata as StripeMetadata | null) ?? null;
        if (!customerId && !metadata?.brand_id && !metadata?.supabase_user_id) {
          break;
        }
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
            metadata,
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
          await updateByCustomerId(customerId, metadata, {
            subscription_status: "past_due",
            subscription_current_period_end: periodEnd,
            subscription_cancel_at_period_end: cancelAtPeriodEnd,
          });
        } else if (status === "canceled" || status === "unpaid") {
          // [Fix B] Terminal states: clear period end and reset the cancel
          // flag — the sub is fully gone, no renewal or end-date relevant.
          await updateByCustomerIdTyped(
            customerId,
            metadata,
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
        const customerId = (subscription.customer as string) || null;
        const metadata =
          (subscription.metadata as StripeMetadata | null) ?? null;
        if (!customerId && !metadata?.brand_id && !metadata?.supabase_user_id) {
          break;
        }
        // [Fix B] Subscription fully removed — clear period end and reset
        // cancel flag, mirroring the canceled/unpaid branch above.
        await updateByCustomerIdTyped(
          customerId,
          metadata,
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
    // Observability: surface the swallowed error to Sentry.
    Sentry.captureException(err, { tags: { route: "stripe/webhook" } });

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
