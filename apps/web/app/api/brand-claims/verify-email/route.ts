// apps/web/app/api/brand-claims/verify-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { constantTimeEqual, hashVerificationCode } from "@/lib/brand-claims";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "SlimeLog <noreply@slimelog.com>";
const REPLY_TO = "support@slimelog.com";
const ADMIN_NOTIFY = "support@slimelog.com";

interface VerifyBody {
  claim_id?: string;
  code?: string;
}

export async function POST(req: Request) {
  // 1. Auth.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate.
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { claim_id, code } = body;
  if (!claim_id) {
    return NextResponse.json(
      { error: "claim_id is required." },
      { status: 400 },
    );
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 3. Fetch claim.
  const { data: claim, error: claimErr } = await admin
    .from("brand_claims")
    .select(
      `id, user_id, brand_id, status, full_legal_name, role, business_email,
       instagram_handle, document_filename, document_uploaded_at,
       email_verification_code, email_verification_expires_at`,
    )
    .eq("id", claim_id)
    .maybeSingle();

  if (claimErr || !claim) {
    return NextResponse.json({ error: "Claim not found." }, { status: 404 });
  }

  // 4. Ownership.
  if (claim.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // 5. State.
  if (claim.status !== "pending_email_verification") {
    return NextResponse.json(
      { error: "This claim is no longer awaiting verification." },
      { status: 409 },
    );
  }

  // 6. Expiry.
  if (
    !claim.email_verification_expires_at ||
    new Date(claim.email_verification_expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json({ error: "expired" }, { status: 400 });
  }

  // 7. Document gate.
  if (!claim.document_uploaded_at) {
    return NextResponse.json({ error: "no_document" }, { status: 400 });
  }

  // 8. Hash + compare.
  const submittedHash = await hashVerificationCode(code);
  const storedHash = claim.email_verification_code ?? "";
  if (!storedHash || !constantTimeEqual(submittedHash, storedHash)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 400 });
  }

  // 9. Transition to pending_review + clear code.
  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from("brand_claims")
    .update({
      status: "pending_review",
      email_verified_at: now,
      email_verification_code: null,
      updated_at: now,
    })
    .eq("id", claim_id);

  if (updateErr) {
    return NextResponse.json(
      { error: "Could not update claim. Try again." },
      { status: 500 },
    );
  }

  // 10. Fetch brand for notification context.
  const { data: brandRow } = await admin
    .from("brands")
    .select("name, slug")
    .eq("id", claim.brand_id)
    .maybeSingle();

  const brandName = brandRow?.name ?? "your brand";
  const brandSlug = brandRow?.slug ?? "";

  // 11. Send confirmation to claimant.
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: claim.business_email,
      replyTo: REPLY_TO,
      subject: "We received your SlimeLog brand claim",
      html: buildClaimantConfirmationEmail(brandName),
    });
  } catch {
    // Don't fail the request — claim is already in pending_review.
  }

  // 12. Send admin notification.
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: ADMIN_NOTIFY,
      replyTo: REPLY_TO,
      subject: `[Brand Claim] ${brandName} — review needed`,
      html: buildAdminNotificationEmail({
        claimId: claim.id,
        brandName,
        brandSlug,
        claimantName: claim.full_legal_name,
        role: claim.role,
        businessEmail: claim.business_email,
        instagramHandle: claim.instagram_handle,
        documentFilename: claim.document_filename,
      }),
    });
  } catch {
    // Don't fail the request.
  }

  return NextResponse.json({ status: "pending_review" });
}

// ─── Email bodies ───────────────────────────────────────────────────────────

function buildClaimantConfirmationEmail(brandName: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#100020;border:1px solid #2D0A4E;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00F0FF;font-weight:700;">SlimeLog</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;font-weight:800;">We received your brand claim</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            Thanks for submitting a claim for <strong>${escapeHtml(brandName)}</strong>. Our team will review your application within <strong>3-5 business days</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            What happens next:
          </p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:1.7;color:#ffffff;opacity:0.85;">
            <li>We review the documentation you uploaded.</li>
            <li>We confirm your business email matches the brand.</li>
            <li>We email you a decision — approved or rejected with a reason.</li>
          </ul>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            If approved, you'll get access to the brand dashboard and your brand will display the verified badge. If rejected, you can resubmit with corrected information.
          </p>
          <hr style="border:none;border-top:1px solid #2D0A4E;margin:24px 0;" />
          <p style="margin:0;font-size:11px;color:#ffffff;opacity:0.5;line-height:1.6;">
            SlimeLog &middot; Glastonbury, CT &middot; Reply to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> for help.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function buildAdminNotificationEmail(p: {
  claimId: string;
  brandName: string;
  brandSlug: string;
  claimantName: string;
  role: string;
  businessEmail: string;
  instagramHandle: string | null;
  documentFilename: string | null;
}): string {
  const reviewUrl = `https://slimelog.com/admin/brand-claims/${p.claimId}`;
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111;">
  <h2 style="margin:0 0 16px;">Brand Claim — Review Needed</h2>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
    <tr><td><strong>Brand</strong></td><td>${escapeHtml(p.brandName)} (${escapeHtml(p.brandSlug)})</td></tr>
    <tr><td><strong>Claimant</strong></td><td>${escapeHtml(p.claimantName)}</td></tr>
    <tr><td><strong>Role</strong></td><td>${escapeHtml(p.role)}</td></tr>
    <tr><td><strong>Business email</strong></td><td>${escapeHtml(p.businessEmail)}</td></tr>
    <tr><td><strong>Instagram</strong></td><td>${p.instagramHandle ? "@" + escapeHtml(p.instagramHandle) : "—"}</td></tr>
    <tr><td><strong>Document</strong></td><td>${p.documentFilename ? escapeHtml(p.documentFilename) : "—"}</td></tr>
    <tr><td><strong>Claim ID</strong></td><td><code>${escapeHtml(p.claimId)}</code></td></tr>
  </table>
  <p style="margin:24px 0 0;font-size:14px;">
    <a href="${reviewUrl}" style="color:#0A66C2;">Open admin review →</a>
  </p>
</body>
</html>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
