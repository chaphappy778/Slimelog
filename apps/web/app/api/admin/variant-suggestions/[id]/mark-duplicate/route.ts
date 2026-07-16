// apps/web/app/api/admin/variant-suggestions/[id]/mark-duplicate/route.ts
//
// T158 (2026-07-16) Commit B-admin: admin marks a variant suggestion
// as a duplicate. Two shapes:
//
//  1. Duplicate of another pending / resolved suggestion - admin
//   passes duplicate_of_suggestion_id. We prefix the admin_notes
//   with "Duplicate of {id}" so the trail is preserved. No
//   notification fires (matches brand-suggestions pattern for the
//   silent-dedupe path).
//
//  2. Silent dedupe - no id provided. We just set status='duplicate'
//   with whatever notes the admin supplied. No notification either
//   way.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import {
 optionalString,
 optionalUuid,
 ValidationError,
} from "@/lib/api-validation";

interface Body {
 duplicate_of_suggestion_id?: unknown;
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

 let duplicateOfId: string | null;
 let notes: string | null;
 try {
  duplicateOfId = optionalUuid(
   body.duplicate_of_suggestion_id,
   "duplicate_of_suggestion_id",
  );
  notes = optionalString(body.notes, "notes", { maxLength: 500 });
 } catch (err) {
  if (err instanceof ValidationError) {
   return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
 }

 if (duplicateOfId && duplicateOfId === suggestionId) {
  return NextResponse.json(
   { error: "A suggestion cannot be a duplicate of itself." },
   { status: 400 },
  );
 }

 const admin = createAdminClient();

 // 1. Load suggestion.
 const { data: suggestion, error: loadErr } = await admin
  .from("variant_suggestions")
  .select("id, submitter_id, status")
  .eq("id", suggestionId)
  .maybeSingle();

 if (loadErr) {
  console.error(
   "[variant-suggestions/mark-duplicate] load failed:",
   loadErr,
  );
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

 // 2. If a peer id was passed, verify it exists (any status).
 if (duplicateOfId) {
  const { data: peer, error: peerErr } = await admin
   .from("variant_suggestions")
   .select("id")
   .eq("id", duplicateOfId)
   .maybeSingle();
  if (peerErr) {
   console.error(
    "[variant-suggestions/mark-duplicate] peer lookup failed:",
    peerErr,
   );
   return NextResponse.json(
    { error: "Could not verify duplicate_of_suggestion_id" },
    { status: 500 },
   );
  }
  if (!peer) {
   return NextResponse.json(
    {
     error:
      "duplicate_of_suggestion_id does not match any variant suggestion",
    },
    { status: 404 },
   );
  }
 }

 const nowIso = new Date().toISOString();

 // 3. Prefix admin_notes with the peer id when we have one so the
 // trail is legible in later audits.
 const dupPrefix = duplicateOfId
  ? `Duplicate of ${duplicateOfId}`
  : null;
 const finalNotes: string | null =
  dupPrefix && notes
   ? `${dupPrefix}. ${notes}`
   : (dupPrefix ?? notes);

 const { error: updateErr } = await admin
  .from("variant_suggestions")
  .update({
   status: "duplicate",
   resolved_by: adminUser.id,
   resolved_at: nowIso,
   admin_notes: finalNotes,
  })
  .eq("id", suggestion.id);

 if (updateErr) {
  console.error(
   "[variant-suggestions/mark-duplicate] update failed:",
   updateErr,
  );
  return NextResponse.json(
   { error: `Could not update suggestion: ${updateErr.message}` },
   { status: 500 },
  );
 }

 // 4. No notification - matches brand-suggestions silent-dedupe
 // pattern. The peer suggestion will notify its own submitter on its
 // own resolution.

 return NextResponse.json({ ok: true });
}
