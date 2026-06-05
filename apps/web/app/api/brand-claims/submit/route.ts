// apps/web/app/api/brand-claims/submit/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  countRecentClaimAttempts,
  emailMatchesBrandDomain,
  generateVerificationCode,
  hashVerificationCode,
  validateBusinessEmail,
} from "@/lib/brand-claims";
import type { BrandClaimRole } from "@/lib/types";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "SlimeLog <noreply@slimelog.com>";
const REPLY_TO = "support@slimelog.com";

const VALID_ROLES: BrandClaimRole[] = ["owner", "authorized_representative"];

interface SubmitBody {
  brand_id?: string;
  full_legal_name?: string;
  role?: string;
  business_email?: string;
  instagram_handle?: string | null;
  additional_notes?: string | null;
  claim_id?: string;
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
  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const {
    brand_id,
    full_legal_name,
    role,
    business_email,
    instagram_handle,
    additional_notes,
    claim_id,
  } = body;

  if (!brand_id || typeof brand_id !== "string") {
    return NextResponse.json(
      { error: "brand_id is required." },
      { status: 400 },
    );
  }
  if (!full_legal_name || full_legal_name.trim().length < 2) {
    return NextResponse.json(
      { error: "Enter your full legal name." },
      { status: 400 },
    );
  }
  if (!role || !VALID_ROLES.includes(role as BrandClaimRole)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (!business_email) {
    return NextResponse.json(
      { error: "Business email is required." },
      { status: 400 },
    );
  }
  const emailCheck = validateBusinessEmail(business_email);
  if (!emailCheck.valid) {
    return NextResponse.json({ error: emailCheck.error }, { status: 400 });
  }
  if (additional_notes && additional_notes.length > 1000) {
    return NextResponse.json(
      { error: "Notes are limited to 1000 characters." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // 3. Verify brand exists & is unclaimed.
  const { data: brandRow, error: brandErr } = await admin
    .from("brands")
    .select("id, name, slug, website_url, owner_id")
    .eq("id", brand_id)
    .maybeSingle();

  if (brandErr || !brandRow) {
    return NextResponse.json({ error: "Brand not found." }, { status: 404 });
  }
  if (brandRow.owner_id) {
    return NextResponse.json(
      { error: "This brand has already been claimed." },
      { status: 409 },
    );
  }

  // Domain match — soft warning baked into validation. If brand has a
  // website_url and the email domain doesn't match, reject with a clear
  // message so the user knows why.
  if (
    brandRow.website_url &&
    !emailMatchesBrandDomain(business_email, brandRow.website_url)
  ) {
    return NextResponse.json(
      {
        error:
          "Email domain doesn't match the brand's website. Use an email at the brand's domain.",
      },
      { status: 400 },
    );
  }

  // 4. Rate limit.
  const recentCount = await countRecentClaimAttempts(user.id, brand_id, 30);
  if (recentCount >= 3) {
    return NextResponse.json(
      { error: "Too many recent attempts. Try again in 30 minutes." },
      { status: 429 },
    );
  }

  // 5. Generate code (plaintext for email, hash for DB).
  const code = generateVerificationCode();
  const codeHash = await hashVerificationCode(code);
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + 15 * 60 * 1000);

  let claimRowId: string;

  if (claim_id) {
    // Resend / email-edit path — verify ownership and state.
    const { data: existing } = await admin
      .from("brand_claims")
      .select("id, user_id, status")
      .eq("id", claim_id)
      .maybeSingle();

    if (!existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: "Claim not found." }, { status: 404 });
    }
    if (existing.status !== "pending_email_verification") {
      return NextResponse.json(
        { error: "This claim is no longer pending verification." },
        { status: 409 },
      );
    }

    // [Change 2 — patch-claim-fields] persist edited step-1 fields alongside the code refresh
    const { error: updateErr } = await admin
      .from("brand_claims")
      .update({
        full_legal_name: full_legal_name.trim(),
        role,
        business_email: business_email.trim().toLowerCase(),
        instagram_handle: instagram_handle
          ? instagram_handle.toString().trim().replace(/^@/, "") || null
          : null,
        additional_notes: additional_notes
          ? additional_notes.trim() || null
          : null,
        email_verification_code: codeHash,
        email_verification_sent_at: sentAt.toISOString(),
        email_verification_expires_at: expiresAt.toISOString(),
        updated_at: sentAt.toISOString(),
      })
      .eq("id", claim_id);

    if (updateErr) {
      return NextResponse.json(
        { error: "Could not refresh code. Try again." },
        { status: 500 },
      );
    }
    claimRowId = claim_id;
  } else {
    // New claim path.
    const handleClean = instagram_handle
      ? instagram_handle.toString().trim().replace(/^@/, "")
      : null;

    const { data: inserted, error: insertErr } = await admin
      .from("brand_claims")
      .insert({
        brand_id,
        user_id: user.id,
        status: "pending_email_verification",
        full_legal_name: full_legal_name.trim(),
        role,
        business_email: business_email.trim().toLowerCase(),
        instagram_handle: handleClean,
        additional_notes: additional_notes ? additional_notes.trim() : null,
        email_verification_code: codeHash,
        email_verification_sent_at: sentAt.toISOString(),
        email_verification_expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return NextResponse.json(
        { error: "Could not create claim. Try again." },
        { status: 500 },
      );
    }
    claimRowId = inserted.id;
  }

  // 6. Send the code email.
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: business_email.trim().toLowerCase(),
      replyTo: REPLY_TO,
      subject: "Your SlimeLog brand verification code",
      html: buildCodeEmail(code, brandRow.name),
    });
  } catch {
    // Don't roll back the row — user can resend. But surface an error.
    return NextResponse.json(
      { error: "Could not send verification email. Try resend." },
      { status: 502 },
    );
  }

  return NextResponse.json({ claim_id: claimRowId, code_sent: true });
}

// ─── Email body ─────────────────────────────────────────────────────────────

function buildCodeEmail(code: string, brandName: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A0A0A;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#100020;border:1px solid #2D0A4E;border-radius:12px;padding:32px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00F0FF;font-weight:700;">SlimeLog</p>
          <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;font-weight:800;">Verify your brand claim</h1>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#ffffff;opacity:0.85;">
            Use the code below to verify your business email and continue claiming
            <strong>${escapeHtml(brandName)}</strong> on SlimeLog.
          </p>
          <div style="background:rgba(45,10,78,0.4);border:1px solid #2D0A4E;border-radius:10px;padding:24px;text-align:center;margin:0 0 24px;">
            <p style="margin:0;font-size:32px;font-weight:800;letter-spacing:8px;color:#39FF14;font-family:monospace;">${code}</p>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#ffffff;opacity:0.7;">
            This code expires in 15 minutes. If you didn't request it, you can ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #2D0A4E;margin:24px 0;" />
          <p style="margin:0;font-size:11px;color:#ffffff;opacity:0.5;line-height:1.6;">
            SlimeLog &middot; ChapHaus LLC &middot; 310R Flanders Rd #447, East Lyme, CT 06333 &middot; This is a transactional email related to your brand verification request.
            <br />Reply to <a href="mailto:support@slimelog.com" style="color:#00F0FF;">support@slimelog.com</a> for help.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
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
