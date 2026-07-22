// apps/web/app/api/admin/brands/[id]/unclaim/route.ts
//
// Admin brand-ownership testing surface (see /admin/brands).
//
// Releases ownership of a brand: clears owner_id and resets the verification
// fields back to the community default. An admin can unclaim ANY brand, not
// just ones they own — that's the point of the admin override.
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
  const nowIso = new Date().toISOString();

  // No owner check — an admin can release any brand.
  const { error: updateErr } = await admin
    .from("brands")
    .update({
      owner_id: null,
      is_verified: false,
      verified_at: null,
      verification_tier: "community",
      updated_at: nowIso,
    })
    .eq("id", brandId);

  if (updateErr) {
    Sentry.captureException(updateErr, {
      tags: { route: "admin/brands/unclaim" },
    });
    return NextResponse.json(
      { error: `Failed to unclaim brand: ${updateErr.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
