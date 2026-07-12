// apps/web/app/api/comments/route.ts
//
// T111 (2026-07-12): server route for posting comments. Previously the
// browser wrote to `comments` directly via the anon-key client, which
// left no seam for server-side moderation. This route enforces the
// moderation gate before the INSERT hits Postgres.
//
// Flow
// ----
//   1. Auth via cookie session.
//   2. Validate + moderate body (1..500 chars, no profanity).
//   3. Validate log_id (UUID) and confirm the target log exists.
//   4. INSERT through the anon-key server client so RLS still runs —
//      the existing `comments` policy already gates writes on
//      `user_id = auth.uid()`.
//   5. Return the freshly inserted row for optimistic UI hydration.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  requireUuid,
  ValidationError,
} from "@/lib/api-validation";
import { moderateText } from "@/lib/moderation";

interface CommentBody {
  log_id?: unknown;
  body?: unknown;
}

interface CommentRow {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let body: CommentBody;
  try {
    body = (await req.json()) as CommentBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 3. Validate log_id
  let logId: string;
  try {
    logId = requireUuid(body.log_id, "log_id");
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json(
        { error: err.message, field: "log_id" },
        { status: 400 },
      );
    }
    throw err;
  }

  // 4. Moderate body
  const rawBody = typeof body.body === "string" ? body.body : "";
  const bodyCheck = moderateText(rawBody, "comment_body");
  if (!bodyCheck.ok) {
    return NextResponse.json(
      { error: bodyCheck.message, field: "body" },
      { status: 400 },
    );
  }
  const cleanedBody = bodyCheck.cleaned;

  // 5. Confirm the log exists so we don't insert against a stale/bogus id.
  //    RLS on collection_logs allows public reads for is_public=true rows;
  //    for private rows the user won't be able to see the parent anyway,
  //    so we treat "not visible" the same as "not found".
  const { data: targetLog, error: targetErr } = await supabase
    .from("collection_logs")
    .select("id")
    .eq("id", logId)
    .maybeSingle();

  if (targetErr) {
    console.error("[POST /api/comments] target lookup failed:", targetErr);
    return NextResponse.json(
      { error: "Could not verify log. Try again shortly." },
      { status: 500 },
    );
  }
  if (!targetLog) {
    return NextResponse.json(
      { error: "Log not found." },
      { status: 404 },
    );
  }

  // 6. INSERT through the anon-key client so RLS actually runs.
  const { data: inserted, error: insertErr } = await supabase
    .from("comments")
    .insert({
      log_id: logId,
      user_id: user.id,
      body: cleanedBody,
    })
    .select("id, user_id, body, created_at")
    .single();

  if (insertErr || !inserted) {
    console.error("[POST /api/comments] insert failed:", insertErr);
    return NextResponse.json(
      { error: "Could not post comment. Try again shortly." },
      { status: 500 },
    );
  }

  const row = inserted as CommentRow;

  return NextResponse.json(
    {
      ok: true,
      comment: {
        id: row.id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
      },
    },
    { status: 200 },
  );
}
