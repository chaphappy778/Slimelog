// apps/web/app/api/brand-claims/verify-email/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { constantTimeEqual, hashVerificationCode } from "@/lib/brand-claims";
import { checkRateLimit } from "@/lib/rate-limit";
// Audit HP-25 (2026-07-10): shared HTML entity escaper.
import { escapeHtml } from "@/lib/escape-html";

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

  // Audit hp-14 (2026-07-06): 3 verification attempts per hour per user.
  // Every success fires TWO Resend emails (claimant confirmation +
  // admin notification) — a modest attempt loop is disproportionately
  // expensive on Resend quota. Also constrains brute-force on the
  // 6-digit code: 3 attempts/hr against a 10^6 keyspace makes chance
  // per user negligible.
  const rateResult = await checkRateLimit({
    key: `verify-email:user:${user.id}`,
    limit: 3,
    windowSeconds: 3600,
  });
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateResult.retryAfterSeconds) },
      },
    );
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
  // 2026-07-17 T39-M1a: also select `requires_manual_review` so the
  // post-verification step can decide between the historic
  // pending_review path and the auto-approve fast path (only when the
  // brand has a website_url AND the email domain already matched at
  // submit time — both conditions are captured by the flag).
  const { data: claim, error: claimErr } = await admin
    .from("brand_claims")
    .select(
      `id, user_id, brand_id, status, full_legal_name, role, business_email,
       instagram_handle, document_filename, document_uploaded_at,
       email_verification_code, email_verification_expires_at,
       requires_manual_review`,
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

  // 9. Fetch brand up-front — needed for BOTH the auto-approve path
  // (owner_id assignment, verified badge, approval email) and the
  // regular pending_review path (notification context).
  const now = new Date().toISOString();
  const { data: brandRow } = await admin
    .from("brands")
    .select("name, slug, owner_id")
    .eq("id", claim.brand_id)
    .maybeSingle();
  const brandName = brandRow?.name ?? "your brand";
  const brandSlug = brandRow?.slug ?? "";

  // 2026-07-17 T39-M1a: auto-approve path. Fires only when:
  //   (a) `requires_manual_review` is false → brand has a website_url
  //       AND the email domain matched it at submit time (both checked
  //       by the submit route), AND
  //   (b) the brand still has NO owner_id (defense in depth — a race
  //       where two people submit + verify against the same domain
  //       shouldn't double-approve).
  //
  // This skips admin review entirely for the strongest domain-match
  // signal. Reviewer_by stays null on the row so the audit trail
  // implicitly marks the approval as automated. Cuts brand-claim
  // resolution from 3-5 days to instant for the common case where
  // the brand owner has a matching business email.
  const autoApprove =
    claim.requires_manual_review === false && (brandRow?.owner_id ?? null) === null;

  if (autoApprove && brandRow) {
    // 9A. Update brand — claim wins, owner assigned, verified badge.
    const { error: brandUpdateErr } = await admin
      .from("brands")
      .update({
        owner_id: claim.user_id,
        is_verified: true,
        verified_at: now,
        verification_tier: "verified",
        updated_at: now,
      })
      .eq("id", claim.brand_id);

    if (brandUpdateErr) {
      // Loud log; fall back to the manual-review path so the claim
      // isn't stuck. Admin notification below still fires and the
      // status transition below still happens as pending_review.
      console.error(
        "[brand-claims/verify-email] auto-approve brand update failed, falling back to pending_review:",
        brandUpdateErr.message,
      );
    } else {
      // 9B. Transition claim to approved.
      const { error: claimUpdateErr } = await admin
        .from("brand_claims")
        .update({
          status: "approved",
          email_verified_at: now,
          email_verification_code: null,
          reviewed_at: now,
          // reviewed_by intentionally left null so we can tell
          // human-approved from auto-approved rows in the admin queue.
          updated_at: now,
        })
        .eq("id", claim_id);

      if (claimUpdateErr) {
        console.error(
          "[brand-claims/verify-email] auto-approve claim update failed:",
          claimUpdateErr.message,
        );
        return NextResponse.json(
          { error: "Could not update claim. Try again." },
          { status: 500 },
        );
      }

      // 9C. Auto-reject competing pending claims for this brand.
      const { data: autoRejected, error: autoRejectErr } = await admin
        .from("brand_claims")
        .update({
          status: "auto_rejected",
          reviewed_at: now,
          updated_at: now,
        })
        .eq("brand_id", claim.brand_id)
        .neq("id", claim.id)
        .in("status", ["pending_review", "pending_email_verification"])
        .select("id, business_email");

      if (autoRejectErr) {
        console.error(
          "[brand-claims/verify-email] auto-approve auto-reject cascade failed:",
          autoRejectErr.message,
        );
      }

      // 9D. Send approval email to claimant. Best-effort.
      try {
        await resend.emails.send({
          from: FROM_ADDRESS,
          to: claim.business_email,
          replyTo: REPLY_TO,
          subject: "Your SlimeLog brand claim was approved",
          html: buildAutoApprovalEmail(brandName, brandSlug),
        });
      } catch (e) {
        console.error(
          "[brand-claims/verify-email] auto-approve email failed:",
          e,
        );
      }

      // 9E. Auto-rejection emails to competing claimants. Best-effort.
      for (const row of autoRejected ?? []) {
        try {
          await resend.emails.send({
            from: FROM_ADDRESS,
            to: row.business_email as string,
            replyTo: REPLY_TO,
            subject: "Update on your SlimeLog brand claim",
            html: buildAutoRejectionEmail(brandName),
          });
        } catch (e) {
          console.error(
            "[brand-claims/verify-email] auto-reject email failed:",
            e,
          );
        }
      }

      return NextResponse.json({ status: "approved", auto_approved: true });
    }
  }

  // 10. Legacy path: transition to pending_review + clear code. This
  // remains the default when auto-approve is not eligible OR when the
  // brand update failed above (fall-back).
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

// 2026-07-17 T39-M1a: email bodies for the auto-approve path. These are
// separate from the pending_review email above so the copy makes it
// obvious the claim was already approved without a manual review step.

function buildAutoApprovalEmail(
  brandName: string,
  brandSlug: string,
): string {
  const safeBrandName = escapeHtml(brandName);
  const dashboardUrl = brandSlug
    ? `https://slimelog.com/brand-dashboard/${brandSlug}`
    : "https://slimelog.com/brand-dashboard";
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#100020;border:1px solid #2D0A4E;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#39FF14;font-weight:700;">SlimeLog</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#39FF14;font-weight:800;">Your brand claim was approved</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            Your business email matched <strong>${safeBrandName}</strong>'s website domain, so we approved the claim right away. Welcome aboard.
          </p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            You now have access to the brand dashboard. From there you can manage your brand profile, schedule drops, and see how the community is engaging with your slimes.
          </p>
          <p style="margin:0 0 24px;">
            <a href="${dashboardUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#39FF14,#00F0FF);color:#0A0A0A;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;font-family:Montserrat,sans-serif;">
              Open Brand Dashboard
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #2D0A4E;margin:24px 0;" />
          <p style="margin:0;font-size:11px;color:#ffffff;opacity:0.5;line-height:1.6;">
            ChapHaus LLC &middot; 310R Flanders Rd #447, East Lyme, CT 06333 &middot; Reply to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> for help.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
}

function buildAutoRejectionEmail(brandName: string): string {
  const safeBrandName = escapeHtml(brandName);
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#100020;border:1px solid #2D0A4E;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00F0FF;font-weight:700;">SlimeLog</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;font-weight:800;">Update on your SlimeLog brand claim</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            Thanks for submitting a claim for <strong>${safeBrandName}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            Another claim for this brand was approved, so we've closed yours. If you believe the wrong person was approved, please reach out to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> and we'll review the situation.
          </p>
          <hr style="border:none;border-top:1px solid #2D0A4E;margin:24px 0;" />
          <p style="margin:0;font-size:11px;color:#ffffff;opacity:0.5;line-height:1.6;">
            ChapHaus LLC &middot; 310R Flanders Rd #447, East Lyme, CT 06333.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
  `.trim();
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
            ChapHaus LLC &middot; 310R Flanders Rd #447, East Lyme, CT 06333 &middot; Reply to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> for help.
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

// Audit HP-25 (2026-07-10): escapeHtml moved to lib/escape-html.ts;
// import at the top of the file.
