// apps/web/app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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

    let customerId: string | null = null;

    if (mode === "user") {
      const { data: profile } = await adminClient
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

      const { data: brand } = await adminClient
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
