// apps/web/app/api/admin/brand-claims/approve/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "SlimeLog <noreply@slimelog.com>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://slimelog.com";

const FOOTER_HTML = `
  <hr style="border:none;border-top:1px solid #2D0A4E;margin:32px 0 16px 0;" />
  <p style="font-size:11px;color:#888;line-height:1.5;margin:0;">
    SlimeLog · ChapHaus LLC · 310R Flanders Rd #447, East Lyme, CT 06333, USA<br />
    You're receiving this email because you submitted a brand claim on SlimeLog.<br />
    Questions? Email <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a>.
  </p>
`;

function approvalEmailHtml(brandName: string, brandSlug: string): string {
  const dashboardUrl = `${SITE_URL}/brand-dashboard/${brandSlug}`;
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Helvetica,Arial,sans-serif;color:#fff;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-family:Montserrat,sans-serif;font-size:24px;font-weight:900;margin:0 0 16px 0;color:#39FF14;">
      Your brand claim was approved
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#e5e5e5;margin:0 0 16px 0;">
      Welcome to SlimeLog. We've verified your claim for <strong>${brandName}</strong> and you now have access to the brand dashboard.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#e5e5e5;margin:0 0 24px 0;">
      From the dashboard you can manage your brand profile, schedule drops, and see analytics on how the community is engaging with your products.
    </p>
    <p style="margin:0 0 24px 0;">
      <a href="${dashboardUrl}"
         style="display:inline-block;background:linear-gradient(135deg,#39FF14,#00F0FF);color:#0A0A0A;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;font-family:Montserrat,sans-serif;">
        Open Brand Dashboard
      </a>
    </p>
    <p style="font-size:13px;line-height:1.6;color:#888;margin:0 0 16px 0;">
      Brand Pro is available if you'd like deeper analytics, drop scheduling tools, and the ability to feature your top products. You can upgrade anytime from the dashboard — no rush.
    </p>
    ${FOOTER_HTML}
  </div>
</body>
</html>`;
}

function autoRejectionEmailHtml(brandName: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Helvetica,Arial,sans-serif;color:#fff;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-family:Montserrat,sans-serif;font-size:22px;font-weight:900;margin:0 0 16px 0;color:#fff;">
      Update on your SlimeLog brand claim
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#e5e5e5;margin:0 0 16px 0;">
      Thanks for submitting a claim for <strong>${brandName}</strong>.
    </p>
    <p style="font-size:15px;line-height:1.6;color:#e5e5e5;margin:0 0 16px 0;">
      Another claim for this brand was approved, so we've closed yours. If you believe the wrong person was approved, please reach out to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> and we'll review the situation.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#888;margin:0;">
      We appreciate your interest in SlimeLog.
    </p>
    ${FOOTER_HTML}
  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  // Auth gate
  const authClient = await createClient();
  const {
    data: { user: adminUser },
  } = await authClient.auth.getUser();

  if (!adminUser || adminUser.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  let body: { claim_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const claimId = typeof body.claim_id === "string" ? body.claim_id : null;
  if (!claimId) {
    return NextResponse.json(
      { error: "claim_id is required" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Fetch claim
  const { data: claim, error: claimErr } = await admin
    .from("brand_claims")
    .select("id, brand_id, user_id, status, business_email")
    .eq("id", claimId)
    .maybeSingle();

  if (claimErr || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "pending_review") {
    return NextResponse.json(
      {
        error: `Claim is in status '${claim.status}' and cannot be approved.`,
      },
      { status: 409 },
    );
  }

  // Fetch brand — defensive owner_id null check
  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, name, slug, owner_id")
    .eq("id", claim.brand_id)
    .maybeSingle();

  if (brandErr || !brand) {
    return NextResponse.json({ error: "Brand not found" }, { status: 404 });
  }

  if (brand.owner_id !== null) {
    return NextResponse.json(
      { error: "Brand already has an owner. Cannot approve." },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();

  // Update brand
  const { error: brandUpdateErr } = await admin
    .from("brands")
    .update({
      owner_id: claim.user_id,
      is_verified: true,
      verified_at: nowIso,
      verification_tier: "verified",
      updated_at: nowIso,
    })
    .eq("id", brand.id);

  if (brandUpdateErr) {
    return NextResponse.json(
      { error: `Failed to update brand: ${brandUpdateErr.message}` },
      { status: 500 },
    );
  }

  // Approve this claim
  const { error: claimUpdateErr } = await admin
    .from("brand_claims")
    .update({
      status: "approved",
      reviewed_by: adminUser.id,
      reviewed_at: nowIso,
      rejection_reason: null,
      updated_at: nowIso,
    })
    .eq("id", claim.id);

  if (claimUpdateErr) {
    return NextResponse.json(
      { error: `Failed to update claim: ${claimUpdateErr.message}` },
      { status: 500 },
    );
  }

  // Auto-reject competing claims and capture their business_email values
  const { data: autoRejected, error: autoRejectErr } = await admin
    .from("brand_claims")
    .update({
      status: "auto_rejected",
      reviewed_by: adminUser.id,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("brand_id", claim.brand_id)
    .neq("id", claim.id)
    .in("status", ["pending_review", "pending_email_verification"])
    .select("id, business_email");

  if (autoRejectErr) {
    // Brand + primary claim are already committed. Surface a partial-success
    // warning rather than a hard failure.
    console.error(
      "[brand-claims/approve] auto-reject cascade failed:",
      autoRejectErr,
    );
  }

  const autoRejectedRows = autoRejected ?? [];

  // Email dispatch — best effort, never fails the route
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: claim.business_email,
      subject: "Your SlimeLog brand claim was approved",
      html: approvalEmailHtml(brand.name, brand.slug),
    });
  } catch (e) {
    console.error("[brand-claims/approve] approval email failed:", e);
  }

  for (const row of autoRejectedRows) {
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: row.business_email as string,
        subject: "Update on your SlimeLog brand claim",
        html: autoRejectionEmailHtml(brand.name),
      });
    } catch (e) {
      console.error(
        "[brand-claims/approve] auto-rejection email failed:",
        row.id,
        e,
      );
    }
  }

  return NextResponse.json({
    status: "approved",
    auto_rejected_count: autoRejectedRows.length,
  });
}
