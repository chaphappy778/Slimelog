// apps/web/app/api/admin/brand-claims/reject/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "SlimeLog <noreply@slimelog.com>";

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

const FOOTER_HTML = `
  <hr style="border:none;border-top:1px solid #2D0A4E;margin:32px 0 16px 0;" />
  <p style="font-size:11px;color:#888;line-height:1.5;margin:0;">
    SlimeLog · ChapHaus LLC · Glastonbury, CT, USA<br />
    You're receiving this email because you submitted a brand claim on SlimeLog.<br />
    Questions? Email <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a>.
  </p>
`;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rejectionEmailHtml(brandName: string, reason: string): string {
  const safeReason = escapeHtml(reason).replace(/\n/g, "<br />");
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Inter,Helvetica,Arial,sans-serif;color:#fff;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <h1 style="font-family:Montserrat,sans-serif;font-size:22px;font-weight:900;margin:0 0 16px 0;color:#fff;">
      Update on your SlimeLog brand claim
    </h1>
    <p style="font-size:15px;line-height:1.6;color:#e5e5e5;margin:0 0 16px 0;">
      Thanks for submitting a brand claim for <strong>${escapeHtml(brandName)}</strong>. After reviewing your submission, we weren't able to approve it at this time.
    </p>
    <div style="background:#1a0a2e;border:1px solid #2D0A4E;border-radius:10px;padding:16px;margin:0 0 24px 0;">
      <p style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#888;margin:0 0 8px 0;font-weight:700;">
        Reason
      </p>
      <p style="font-size:14px;line-height:1.6;color:#e5e5e5;margin:0;">
        ${safeReason}
      </p>
    </div>
    <p style="font-size:15px;line-height:1.6;color:#e5e5e5;margin:0 0 16px 0;">
      You're welcome to resubmit your claim once the issue above is resolved. If you believe this decision was made in error, reach out to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> and we'll take another look.
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
  let body: { claim_id?: unknown; reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const claimId = typeof body.claim_id === "string" ? body.claim_id : null;
  const rawReason = typeof body.reason === "string" ? body.reason : null;

  if (!claimId) {
    return NextResponse.json(
      { error: "claim_id is required" },
      { status: 400 },
    );
  }
  if (rawReason === null) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const reason = rawReason.trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return NextResponse.json(
      {
        error: `Rejection reason must be at least ${MIN_REASON_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json(
      {
        error: `Rejection reason must be at most ${MAX_REASON_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Fetch claim
  const { data: claim, error: claimErr } = await admin
    .from("brand_claims")
    .select(
      `id, brand_id, status, business_email,
       brands!brand_claims_brand_id_fkey ( name )`,
    )
    .eq("id", claimId)
    .maybeSingle();

  if (claimErr || !claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "pending_review") {
    return NextResponse.json(
      {
        error: `Claim is in status '${claim.status}' and cannot be rejected.`,
      },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();

  // Reject claim
  const { error: updateErr } = await admin
    .from("brand_claims")
    .update({
      status: "rejected",
      rejection_reason: reason,
      reviewed_by: adminUser.id,
      reviewed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", claim.id);

  if (updateErr) {
    return NextResponse.json(
      { error: `Failed to reject claim: ${updateErr.message}` },
      { status: 500 },
    );
  }

  // Resolve brand name for email (handle array vs object shape)
  const brandsField = claim.brands as
    | { name: string | null }
    | { name: string | null }[]
    | null;
  const brandName = Array.isArray(brandsField)
    ? (brandsField[0]?.name ?? "your brand")
    : (brandsField?.name ?? "your brand");

  // Email — best effort
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: claim.business_email as string,
      subject: "Update on your SlimeLog brand claim",
      html: rejectionEmailHtml(brandName, reason),
    });
  } catch (e) {
    console.error("[brand-claims/reject] rejection email failed:", e);
  }

  return NextResponse.json({ status: "rejected" });
}
