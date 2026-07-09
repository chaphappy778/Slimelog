// apps/web/app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { validateRedirectUrl } from "@/lib/stripe-guards";

// Audit hp-23 (2026-07-08): lazy-init admin client with explicit env
// check. See webhook/route.ts for full context.
// Explicit `SupabaseClient` type so downstream .from() queries don't
// infer as `never`. See webhook/route.ts for the same fix.
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

export async function POST(req: NextRequest) {
  try {
    // Audit hp-23 (2026-07-08): validate env presence up front.
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
      return_url,
      mode,
      brand_id,
    }: {
      return_url: string;
      mode: "user" | "brand";
      brand_id?: string;
    } = body;

    if (!return_url || !mode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Audit blocker #4 (2026-07-06): return_url must be on this site.
    // Without this check, an attacker who could deep-link a portal
    // session URL could deliver a signed Stripe URL that redirects
    // users back to a phishing page they control.
    const returnErr = validateRedirectUrl(return_url, req.headers.get("host"));
    if (returnErr) {
      return NextResponse.json({ error: returnErr }, { status: 400 });
    }

    let customerId: string | null = null;

    if (mode === "user") {
      const { data: profile } = await getAdminClient()
        .from("profiles")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .single();

      customerId = profile?.stripe_customer_id ?? null;
    } else {
      if (!brand_id) {
        return NextResponse.json(
          { error: "brand_id required for brand mode" },
          { status: 400 },
        );
      }

      const { data: brand } = await getAdminClient()
        .from("brands")
        .select("stripe_customer_id, owner_id")
        .eq("id", brand_id)
        .single();

      if (!brand || brand.owner_id !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      customerId = brand?.stripe_customer_id ?? null;
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 400 },
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
