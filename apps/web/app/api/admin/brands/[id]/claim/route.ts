// apps/web/app/api/admin/brands/[id]/claim/route.ts
//
// Admin brand-ownership testing surface (see /admin/brands).
//
// The current admin claims ownership of an unowned brand. Mirrors the DB
// write in api/admin/brand-claims/approve exactly (owner_id + is_verified +
// verified_at + verification_tier='verified' + updated_at), but is scoped to
// the admin's own account so Jennifer can toggle ownership for feature
// testing without going through the public claim flow (her admin account uses
// a personal email, so the domain-match auto-approve path never applies).
//
// Uses the admin (service_role) client because RLS on brands scopes
// owner-writes to auth.uid() = owner_id (migration 20260324000001, line 599),
// which would block an admin writing owner_id for a brand they don't own yet.
//
// Does NOT touch brand_claims rows — historical record stays intact.

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

  // Fetch the brand — reject if it already has an owner.
  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, owner_id")
    .eq("id", brandId)
    .maybeSingle();

  if (brandErr) {
    Sentry.captureException(brandErr, {
      tags: { route: "admin/brands/claim" },
    });
    return NextResponse.json(
      { error: "Could not load brand." },
      { status: 500 },
    );
  }
  if (!brand) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }
  if (brand.owner_id !== null) {
    return NextResponse.json(
      {
        error:
          "Brand already has an owner. Use force-unclaim or take-over instead.",
      },
      { status: 409 },
    );
  }

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
      tags: { route: "admin/brands/claim" },
    });
    return NextResponse.json(
      { error: `Failed to claim brand: ${updateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, ownerUserId: adminUser.id });
}
