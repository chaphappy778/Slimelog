// apps/web/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ValidationError,
  requireEnum,
  requireString,
  requireUuid,
} from "@/lib/api-validation";
import { moderateText } from "@/lib/moderation";

// Audit hp-15 (2026-07-07): allowed content_type values, promoted
// from the previous inline .includes check into a typed enum so
// requireEnum can narrow the type for the downstream FK lookup.
const CONTENT_TYPES = ["log", "comment", "profile"] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

// Table names for FK existence checks per content_type.
// (comment → 'comments', which is the current table; audit item 27
// still tracks the legacy log_comments/log_likes drop.)
const CONTENT_TABLE: Record<ContentType, string> = {
  log: "collection_logs",
  comment: "comments",
  profile: "profiles",
};

// Audit hp-14 (2026-07-06): cap the details field before it lands in a
// Resend email body. The details field is attacker-controlled — a
// megabyte of arbitrary text becomes a support-inbox nuisance and eats
// Resend's per-email size limits.
const MAX_DETAILS_LENGTH = 2000;

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  // Verify authenticated user
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const {
    data: { user },
  } = await anonClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Audit hp-14 (2026-07-06): 5 reports per hour per authenticated user.
  // Report endpoint is a spam-relay vector — attacker-controlled
  // `details` gets embedded in the Resend email to support@slimelog.com
  // (see line 100). Rate limit here is the first line of defense; the
  // truncation on MAX_DETAILS_LENGTH is the second.
  const rateResult = await checkRateLimit({
    key: `report:user:${user.id}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many reports. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(rateResult.retryAfterSeconds) },
      },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // Audit hp-15 (2026-07-07): validate every field before hitting the
  // DB or the Resend email. Previously accepted any string for
  // content_id — attackers could submit reports referencing nothing,
  // flooding the support inbox with dead references.
  let content_type: ContentType;
  let content_id: string;
  let reason: string;
  try {
    content_type = requireEnum(body.content_type, "content_type", CONTENT_TYPES);
    content_id = requireUuid(body.content_id, "content_id");
    reason = requireString(body.reason, "reason", { maxLength: 200 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  // T111 (2026-07-12): moderation gate for the free-text reason.
  // Admin-visible only, but the value gets echoed into the Resend
  // alert email — no reason to let profanity through.
  const reasonCheck = moderateText(reason, "report_reason");
  if (!reasonCheck.ok) {
    return NextResponse.json(
      { error: reasonCheck.message, field: "reason" },
      { status: 400 },
    );
  }
  reason = reasonCheck.cleaned;

  // Audit hp-14 (2026-07-06): hard-truncate the details field.
  // Attacker-supplied text lands in the Resend email body below.
  const rawDetails = body.details;
  const safeDetails =
    typeof rawDetails === "string" && rawDetails.length > 0
      ? rawDetails.slice(0, MAX_DETAILS_LENGTH)
      : null;

  // Write report using service role client
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Audit hp-15 (2026-07-07): FK existence check. The reports table
  // stores content_id as text (polymorphic across content_type), so
  // there's no DB-level FK to catch a bad reference. Verify the row
  // exists in the appropriate table before inserting the report.
  const table = CONTENT_TABLE[content_type];
  const { data: target, error: targetErr } = await adminClient
    .from(table)
    .select("id")
    .eq("id", content_id)
    .maybeSingle();
  if (targetErr) {
    console.error(`Report target lookup error (${table}):`, targetErr);
    return NextResponse.json(
      { error: "Failed to verify content" },
      { status: 500 },
    );
  }
  if (!target) {
    return NextResponse.json(
      {
        error: `content_id: no ${content_type} exists with that id`,
      },
      { status: 400 },
    );
  }

  const { error: insertError } = await adminClient.from("reports").insert({
    reporter_id: user.id,
    content_type,
    content_id,
    reason,
    details: safeDetails,
  });

  if (insertError) {
    console.error("Report insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 },
    );
  }

  // Send email alert via Resend — skip silently if env vars not set
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;

  if (resendApiKey && resendFrom) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: resendFrom,
          to: "support@slimelog.com",
          subject: `[SlimeLog] New report: ${content_type} / ${reason}`,
          text: [
            `Reporter: ${user.id}`,
            `Content type: ${content_type}`,
            `Content ID: ${content_id}`,
            `Reason: ${reason}`,
            safeDetails ? `Details: ${safeDetails}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
    } catch (emailErr) {
      // Email failure is non-fatal — report already saved
      console.error("Resend email error:", emailErr);
    }
  }

  return NextResponse.json({ success: true });
}
