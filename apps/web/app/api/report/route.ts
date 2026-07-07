// apps/web/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { checkRateLimit } from "@/lib/rate-limit";

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

  let body: {
    content_type?: string;
    content_id?: string;
    reason?: string;
    details?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { content_type, content_id, reason, details } = body;

  // Audit hp-14 (2026-07-06): hard-truncate the details field.
  // Attacker-supplied text lands in the Resend email body below.
  const safeDetails =
    typeof details === "string" && details.length > 0
      ? details.slice(0, MAX_DETAILS_LENGTH)
      : null;

  if (!content_type || !content_id || !reason) {
    return NextResponse.json(
      { error: "content_type, content_id, and reason are required" },
      { status: 400 },
    );
  }

  if (!["log", "comment", "profile"].includes(content_type)) {
    return NextResponse.json(
      { error: "Invalid content_type" },
      { status: 400 },
    );
  }

  // Write report using service role client
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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
