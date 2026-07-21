// apps/web/app/api/stripe/checkout/route.ts
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/posthog-server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import {
  isAllowedPriceIdForMode,
  introCouponForPriceId,
  validateRedirectUrl,
} from "@/lib/stripe-guards";

// Audit hp-23 (2026-07-08): lazy-init admin client with explicit env
// check. Previous module-scope `createAdminClient(url!, key!)` let
// undefined env vars through silently — checkout returned 200 while
// no DB updates landed. See webhook/route.ts for full context.
// Explicit `SupabaseClient` type (defaults its Database generic to `any`)
// so downstream .from() queries don't infer as `never`. ReturnType<typeof
// createSupabaseClient> without an explicit Database generic resolves to
// SupabaseClient<never> in newer supabase-js versions, which broke the
// build on first attempt at this refactor.
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

// [Fix 2A] Active subscription statuses — block new checkout for these.
// past_due / canceled / unpaid users are allowed through to start a fresh checkout.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function POST(req: NextRequest) {
  try {
    // Audit hp-23 (2026-07-08): validate env presence up front so a
    // deploy with missing Supabase env vars returns a clear 500
    // rather than accepting the checkout call and failing silently
    // later. Cache-warms getAdminClient for subsequent use.
    getAdminClient();

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

    // ── Audit blocker #4 (2026-07-06): validate price + redirect URLs ────
    // Before this block, price_id was passed straight into
    // stripe.checkout.sessions.create — a client could substitute any
    // active Stripe price on this account (a $0.01 test SKU, for
    // example) and end up entitled to PRO after paying pennies.
    // success_url and cancel_url were also unvalidated, turning a signed
    // checkout link into an open redirect a phishing site could exploit.
    if (!isAllowedPriceIdForMode(price_id, mode)) {
      return NextResponse.json(
        { error: "Price is not available for this subscription tier." },
        { status: 400 },
      );
    }

    const host = req.headers.get("host");
    const successErr = validateRedirectUrl(success_url, host);
    if (successErr) {
      return NextResponse.json({ error: successErr }, { status: 400 });
    }
    const cancelErr = validateRedirectUrl(cancel_url, host);
    if (cancelErr) {
      return NextResponse.json({ error: cancelErr }, { status: 400 });
    }

    let customerId: string;
    let sessionMetadata: Record<string, string>;
    // [Fix 2A] Track current subscription status so we can short-circuit to portal
    // if the caller is already in an active/trialing subscription.
    let currentSubscriptionStatus: string | null = null;

    if (mode === "user") {
      const { data: profile } = await getAdminClient()
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
        await getAdminClient()
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }

      // T149 (2026-07-14): also write `app_user_id` for RevenueCat's Stripe
      // Server Notifications. RevCat's "Read App User ID from Stripe metadata"
      // detection method looks in the Checkout Session metadata and the
      // Subscription metadata (never Customer metadata), so we must include
      // the field on the session — which is exactly where sessionMetadata
      // gets attached below. Keep `supabase_user_id` for backward compatibility
      // with our existing webhook handler in /api/stripe/webhook.
      sessionMetadata = {
        supabase_user_id: user.id,
        app_user_id: user.id,
      };
    } else {
      const { data: brand } = await getAdminClient()
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
        await getAdminClient()
          .from("brands")
          .update({ stripe_customer_id: customerId })
          .eq("id", brand_id!);
      }

      sessionMetadata = { brand_id: brand_id! };
    }

    // [Fix 2A] DB-based check: fast path using our own subscription_status
    // column. Catches the common case without a Stripe round-trip.
    let alreadyActive =
      !!currentSubscriptionStatus &&
      ACTIVE_STATUSES.has(currentSubscriptionStatus);

    // #21 (2026-07-10): belt-and-braces authoritative check against Stripe.
    // The DB column can drift out of sync with Stripe reality — the HP-8
    // trigger bug (mig 59) is one recent example where webhook updates
    // silently no-op'd. Without querying Stripe here, a customer with a
    // still-live Stripe subscription but a stale `null` in the DB could
    // successfully create a SECOND checkout session and get double-billed.
    //
    // We only make this call when the DB says "not active," which means
    // the extra round-trip only fires when we're about to potentially
    // duplicate. Truly active users hit the fast path above.
    if (!alreadyActive) {
      try {
        const stripeSubs = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 5,
        });
        const liveSub = stripeSubs.data.find((s) =>
          ACTIVE_STATUSES.has(s.status),
        );
        if (liveSub) {
          alreadyActive = true;
          // Reconcile the DB drift so we don't need to re-query on every
          // subsequent checkout attempt. Uses the same target-table split
          // as the webhook — brand mode → brands, user mode → profiles.
          // current_period_end lives on the subscription item in Stripe
          // API 2026-03-25.dahlia (matches the webhook's handling).
          try {
            const table = mode === "brand" ? "brands" : "profiles";
            const idValue = mode === "brand" ? brand_id! : user.id;
            const periodEnd = liveSub.items?.data?.[0]?.current_period_end;
            await getAdminClient()
              .from(table)
              .update({
                subscription_status: liveSub.status,
                subscription_current_period_end: periodEnd
                  ? new Date(periodEnd * 1000).toISOString()
                  : null,
              })
              .eq("id", idValue);
          } catch (reconcileErr) {
            console.error(
              "[checkout] Failed to reconcile subscription_status from Stripe:",
              reconcileErr,
            );
            // Reconciliation failure is non-fatal — we still route to
            // the portal to prevent the duplicate.
          }
        }
      } catch (stripeListErr) {
        console.error(
          "[checkout] Stripe subscriptions.list failed — falling back to DB check only:",
          stripeListErr,
        );
        // If Stripe is unreachable, we've already got the DB check above.
        // Better to permit the potential-duplicate than to block the
        // legitimate first-time purchase.
      }
    }

    // If EITHER the DB check or the Stripe check says the caller already
    // has an active subscription, don't create a second checkout session.
    // Create a billing portal session for the existing customer and
    // return { already_active, portal_url } so the client can show a
    // toast and redirect to subscription management.
    if (alreadyActive) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: cancel_url,
      });

      return NextResponse.json({
        already_active: true,
        portal_url: portalSession.url,
      });
    }

    // [Item T171 / anchor-pricing 2026-07-19] Auto-attach the intro
    // coupon for consumer Pro checkouts (Monthly $2.99 for 3 months
    // off $4.99 base, Annual $19.99 for the first year off $29.99
    // base). No client-supplied promo code required; the server maps
    // price → coupon so users can't cross-apply an annual coupon to
    // a monthly checkout. Brand-Pro price passes through unchanged
    // (no intro offer configured for brand subs). Non-fatal when the
    // env var isn't set — checkout still succeeds at the base price.
    const introCoupon =
      mode === "user" ? introCouponForPriceId(price_id) : null;

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
      ...(introCoupon
        ? { discounts: [{ coupon: introCoupon }] }
        : {}),
    });

    // Observability push (2026-07-20): checkout_started funnel event.
    // Fires once we've successfully created a Stripe Checkout Session
    // (i.e. the user is about to be redirected to pay). The already-active
    // portal short-circuit above returns earlier and is intentionally not
    // counted as a checkout start.
    await captureServerEvent(user.id, "checkout_started", {
      mode,
      price_id,
      brand_id: brand_id ?? undefined,
      has_intro_coupon: Boolean(introCoupon),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    // Observability: capture the swallowed 500 so ops sees payment-path
    // failures immediately instead of only in Vercel logs.
    Sentry.captureException(err, { tags: { route: "stripe/checkout" } });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
