// apps/web/app/api/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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
    details: details ?? null,
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
            details ? `Details: ${details}` : null,
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
