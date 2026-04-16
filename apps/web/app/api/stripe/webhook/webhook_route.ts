// apps/web/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export const runtime = "nodejs";

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function updateByCustomerId(
  customerId: string,
  updates: Record<string, string | null>,
) {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile) {
    await adminClient
      .from("profiles")
      .update(updates)
      .eq("stripe_customer_id", customerId);
    return;
  }

  const { data: brand } = await adminClient
    .from("brands")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (brand) {
    await adminClient
      .from("brands")
      .update(updates)
      .eq("stripe_customer_id", customerId);
  }
}

async function updateByCustomerIdTyped(
  customerId: string,
  profileUpdates: Record<string, string | null>,
  brandUpdates: Record<string, string | null>,
) {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (profile) {
    await adminClient
      .from("profiles")
      .update(profileUpdates)
      .eq("stripe_customer_id", customerId);
    return;
  }

  const { data: brand } = await adminClient
    .from("brands")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (brand) {
    await adminClient
      .from("brands")
      .update(brandUpdates)
      .eq("stripe_customer_id", customerId);
  }
}

export async function POST(req: NextRequest) {
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
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
        await updateByCustomerIdTyped(
          customerId,
          { subscription_tier: "pro", subscription_status: status },
          { subscription_tier: "brand_pro", subscription_status: status },
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) break;
        const status = subscription.status;

        if (status === "active" || status === "trialing") {
          await updateByCustomerIdTyped(
            customerId,
            { subscription_tier: "pro", subscription_status: status },
            { subscription_tier: "brand_pro", subscription_status: status },
          );
        } else if (status === "past_due") {
          await updateByCustomerId(customerId, {
            subscription_status: "past_due",
          });
        } else if (status === "canceled" || status === "unpaid") {
          await updateByCustomerIdTyped(
            customerId,
            { subscription_tier: "free", subscription_status: "canceled" },
            { subscription_tier: "free", subscription_status: "canceled" },
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (!customerId) break;
        await updateByCustomerIdTyped(
          customerId,
          { subscription_tier: "free", subscription_status: "canceled" },
          { subscription_tier: "free", subscription_status: "canceled" },
        );
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}
