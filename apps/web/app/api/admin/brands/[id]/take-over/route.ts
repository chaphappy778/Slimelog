// apps/web/app/api/admin/brands/[id]/take-over/route.ts
//
// Admin brand-ownership testing surface (see /admin/brands).
//
// Transfers ownership of an already-owned brand from whoever holds it to the
// current admin. Same DB write as claim (owner_id -> adminUser.id + verified
// fields), but requires the brand to already have an owner — use claim for
// unowned brands.
//
// Uses the admin (service_role) client to bypass the owner-scoped RLS on
// brands (migration 20260324000001, line 599).
//
// Does NOT touch brand_claims rows.

import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authClient = await createClient();
  const {
    data: { user: adminUser },
  } = await authClient.auth.getUser();

  if (!adminUser || !(await isAdminUser(authClient, adminUser))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { id: brandId } = await context.params;
  if (!brandId) {
    return NextResponse.json({ error: "Missing brand id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, owner_id")
    .eq("id", brandId)
    .maybeSingle();

  if (brandErr) {
    Sentry.captureException(brandErr, {
      tags: { route: "admin/brands/take-over" },
    });
    return NextResponse.json(
      { error: "Could not load brand." },
      { status: 500 },
    );
  }
  if (!brand) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }
  if (brand.owner_id === null) {
    return NextResponse.json(
      { error: "Brand has no owner to take over. Use claim instead." },
      { status: 400 },
    );
  }

  const prevOwnerId = brand.owner_id as string;
  const nowIso = new Date().toISOString();

  const { error: updateErr } = await admin
    .from("brands")
    .update({
      owner_id: adminUser.id,
      is_verified: true,
      verified_at: nowIso,
      verification_tier: "verified",
      updated_at: nowIso,
    })
    .eq("id", brand.id);

  if (updateErr) {
    Sentry.captureException(updateErr, {
      tags: { route: "admin/brands/take-over" },
    });
    return NextResponse.json(
      { error: `Failed to take over brand: ${updateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    previousOwnerId: prevOwnerId,
    ownerUserId: adminUser.id,
  });
}
