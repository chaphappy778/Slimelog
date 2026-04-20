// apps/web/app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// [Fix 2A] Active subscription statuses — block new checkout for these.
// past_due / canceled / unpaid users are allowed through to start a fresh checkout.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      price_id,
      mode,
      brand_id,
      success_url,
      cancel_url,
    }: {
      price_id: string;
      mode: "user" | "brand";
      brand_id?: string;
      success_url: string;
      cancel_url: string;
    } = body;

    if (!price_id || !mode || !success_url || !cancel_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (mode === "brand" && !brand_id) {
      return NextResponse.json(
        { error: "brand_id required for brand mode" },
        { status: 400 },
      );
    }

    let customerId: string;
    let sessionMetadata: Record<string, string>;
    // [Fix 2A] Track current subscription status so we can short-circuit to portal
    // if the caller is already in an active/trialing subscription.
    let currentSubscriptionStatus: string | null = null;

    if (mode === "user") {
      const { data: profile } = await adminClient
        .from("profiles")
        // [Fix 2A] pull subscription_status alongside stripe_customer_id
        .select("stripe_customer_id, subscription_status")
        .eq("id", user.id)
        .single();

      currentSubscriptionStatus = profile?.subscription_status ?? null;

      if (profile?.stripe_customer_id) {
        customerId = profile.stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
        await adminClient
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }

      sessionMetadata = { supabase_user_id: user.id };
    } else {
      const { data: brand } = await adminClient
        .from("brands")
        // [Fix 2A] pull subscription_status alongside existing fields
        .select("id, name, stripe_customer_id, owner_id, subscription_status")
        .eq("id", brand_id!)
        .single();

      if (!brand) {
        return NextResponse.json({ error: "Brand not found" }, { status: 404 });
      }

      if (brand.owner_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      currentSubscriptionStatus = brand.subscription_status ?? null;

      if (brand.stripe_customer_id) {
        customerId = brand.stripe_customer_id;
      } else {
        const customer = await stripe.customers.create({
          name: brand.name,
          metadata: { brand_id: brand_id! },
        });
        customerId = customer.id;
        await adminClient
          .from("brands")
          .update({ stripe_customer_id: customerId })
          .eq("id", brand_id!);
      }

      sessionMetadata = { brand_id: brand_id! };
    }

    // [Fix 2A] If the caller is already in an active or trialing subscription,
    // don't create a second checkout session. Create a billing portal session
    // for the existing customer and return { already_active, portal_url } so
    // the client can show a toast and redirect to subscription management.
    if (
      currentSubscriptionStatus &&
      ACTIVE_STATUSES.has(currentSubscriptionStatus)
    ) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: cancel_url,
      });

      return NextResponse.json({
        already_active: true,
        portal_url: portalSession.url,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: price_id, quantity: 1 }],
      success_url,
      cancel_url,
      metadata: sessionMetadata,
      subscription_data: {
        metadata: sessionMetadata,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
