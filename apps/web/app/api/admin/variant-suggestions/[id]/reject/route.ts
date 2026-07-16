// apps/web/app/api/admin/variant-suggestions/[id]/reject/route.ts
//
// T158 (2026-07-16) Commit B-admin: admin rejects a community variant
// suggestion. Sets status='rejected', resolved_by, resolved_at,
// admin_notes. Fires a variant_suggestion_rejected notification linked
// to the suggestion's brand (so the row can deep-link the submitter
// to the brand page for context).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import { optionalString, ValidationError } from "@/lib/api-validation";

interface Body {
 notes?: unknown;
}

export async function POST(
 req: NextRequest,
 context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
 const supabase = await createClient();
 const {
  data: { user: adminUser },
 } = await supabase.auth.getUser();

 if (!adminUser || !(await isAdminUser(supabase, adminUser))) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
 }

 const { id: suggestionId } = await context.params;
 if (!suggestionId) {
  return NextResponse.json(
   { error: "Missing suggestion id" },
   { status: 400 },
  );
 }

 let body: Body;
 try {
  body = (await req.json()) as Body;
 } catch {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
 }

 let notes: string | null;
 try {
  notes = optionalString(body.notes, "notes", { maxLength: 500 });
 } catch (err) {
  if (err instanceof ValidationError) {
   return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
 }

 const admin = createAdminClient();

 // 1. Load suggestion.
 const { data: suggestion, error: loadErr } = await admin
  .from("variant_suggestions")
  .select("id, submitter_id, brand_id, status")
  .eq("id", suggestionId)
  .maybeSingle();

 if (loadErr) {
  console.error("[variant-suggestions/reject] load failed:", loadErr);
  return NextResponse.json(
   { error: "Could not load suggestion" },
   { status: 500 },
  );
 }
 if (!suggestion) {
  return NextResponse.json(
   { error: "Suggestion not found" },
   { status: 404 },
  );
 }
 if (suggestion.status !== "pending") {
  return NextResponse.json(
   {
    error: `Suggestion is already resolved (status: ${String(suggestion.status)}).`,
   },
   { status: 409 },
  );
 }

 const nowIso = new Date().toISOString();

 // 2. Resolve.
 const { error: updateErr } = await admin
  .from("variant_suggestions")
  .update({
   status: "rejected",
   resolved_by: adminUser.id,
   resolved_at: nowIso,
   admin_notes: notes,
  })
  .eq("id", suggestion.id);

 if (updateErr) {
  console.error("[variant-suggestions/reject] update failed:", updateErr);
  return NextResponse.json(
   { error: `Could not update suggestion: ${updateErr.message}` },
   { status: 500 },
  );
 }

 // 3. Notify submitter (best-effort). brand_id lets the notification
 // row deep-link to /brands/{slug} - the submitter can still see the
 // brand's currently tracked variants for context.
 if (suggestion.submitter_id) {
  const { error: notificationErr } = await admin
   .from("notifications")
   .insert({
    recipient_id: suggestion.submitter_id,
    notification_type: "variant_suggestion_rejected",
    actor_id: adminUser.id,
    brand_id: suggestion.brand_id as string,
   });
  if (notificationErr) {
   console.error(
    "[variant-suggestions/reject] notification insert failed:",
    notificationErr,
   );
  }
 }

 return NextResponse.json({ ok: true });
}
