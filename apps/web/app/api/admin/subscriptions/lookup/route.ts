// apps/web/app/api/admin/subscriptions/lookup/route.ts
//
// Admin-only lookup for the /admin/subscriptions form. Uses the service_role
// client so RLS doesn't strip subscription_tier / subscription_status /
// stripe_customer_id from the response. Without this, the client-side
// browser query on /admin/subscriptions was hanging on RLS-hidden fields
// and rendering nothing.
//
// Payload:
//   { target_type: "user" | "brand", query: string }
//
// Response on success:
//   { row: { id, label, subscription_tier, subscription_status,
//            subscription_current_period_end, stripe_customer_id } }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { target_type?: unknown; query?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { target_type, query } = body;
  if (target_type !== "user" && target_type !== "brand") {
    return NextResponse.json(
      { error: "target_type must be 'user' or 'brand'" },
      { status: 400 },
    );
  }
  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json(
      { error: "query is required" },
      { status: 400 },
    );
  }

  const q = query.trim();
  const admin = createAdminClient();

  if (target_type === "user") {
    const isUuid = UUID_RE.test(q);
    const columns =
      "id, username, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id";

    // Try id → username → email (via auth.users) in that order.
    let profile: {
      id: string;
      username: string | null;
      subscription_tier: string | null;
      subscription_status: string | null;
      subscription_current_period_end: string | null;
      stripe_customer_id: string | null;
    } | null = null;

    if (isUuid) {
      const { data } = await admin
        .from("profiles")
        .select(columns)
        .eq("id", q)
        .maybeSingle();
      profile = data ?? null;
    }

    if (!profile) {
      // Try username (with or without leading @).
      const bareUsername = q.replace(/^@/, "");
      const { data } = await admin
        .from("profiles")
        .select(columns)
        .eq("username", bareUsername)
        .maybeSingle();
      profile = data ?? null;
    }

    if (!profile && q.includes("@")) {
      // Email path: auth.users is accessible via the admin API only.
      const { data: authList, error: authErr } =
        await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (authErr) {
        return NextResponse.json({ error: authErr.message }, { status: 500 });
      }
      const found = authList.users.find(
        (u) => (u.email ?? "").toLowerCase() === q.toLowerCase(),
      );
      if (found) {
        const { data } = await admin
          .from("profiles")
          .select(columns)
          .eq("id", found.id)
          .maybeSingle();
        profile = data ?? null;
      }
    }

    if (!profile) {
      return NextResponse.json(
        { error: "No matching user profile." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      row: {
        id: profile.id,
        label: `@${profile.username ?? "(no username)"}`,
        subscription_tier: profile.subscription_tier ?? null,
        subscription_status: profile.subscription_status ?? null,
        subscription_current_period_end:
          profile.subscription_current_period_end ?? null,
        stripe_customer_id: profile.stripe_customer_id ?? null,
      },
    });
  }

  // Brand lookup. Slug first (exact), then name (case-insensitive).
  const columns =
    "id, name, slug, subscription_tier, subscription_status, subscription_current_period_end, stripe_customer_id";

  const { data: bySlug } = await admin
    .from("brands")
    .select(columns)
    .eq("slug", q)
    .maybeSingle();

  let brand = bySlug ?? null;
  if (!brand) {
    const { data: byName } = await admin
      .from("brands")
      .select(columns)
      .ilike("name", q)
      .maybeSingle();
    brand = byName ?? null;
  }

  if (!brand) {
    return NextResponse.json(
      { error: "No matching brand." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    row: {
      id: brand.id,
      label: `${brand.name} (${brand.slug})`,
      subscription_tier: brand.subscription_tier ?? null,
      subscription_status: brand.subscription_status ?? null,
      subscription_current_period_end:
        brand.subscription_current_period_end ?? null,
      stripe_customer_id: brand.stripe_customer_id ?? null,
    },
  });
}
