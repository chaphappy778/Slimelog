// apps/web/app/api/admin/variant-suggestions/[id]/approve/route.ts
//
// T158 (2026-07-16) Commit B-admin: admin approves a community
// variant suggestion. Mirrors the brand-suggestions approve endpoint
// (T110), scaled to two shapes of approval:
//
//  * link - { subtype_id, brand_display_name?, notes? }
//   Admin picks an existing subtype under the same base_type. We
//   create the brand_variants row linking (brand_id, subtype_id),
//   mark the suggestion approved, notify the submitter.
//
//  * create - { new_subtype: { name, slug, aliases }, brand_display_name?, notes? }
//   Admin creates a brand new canonical subtype under the
//   suggestion's base_type, then wires up brand_variants + resolves
//   the suggestion. Used when the submitted variant is genuinely
//   new to the whole taxonomy (not just to this brand).
//
// The submitter contribution counter is bumped by the DB trigger from
// mig 078 on the status transition to 'approved' - this route does
// NOT touch profiles.approved_variant_contributions directly.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import {
 optionalString,
 requireString,
 requireUuid,
 ValidationError,
} from "@/lib/api-validation";
import { moderateText } from "@/lib/moderation";
import type { SlimeBaseType } from "@/lib/types";

// Lowercase alnum + hyphens. Same shape check used elsewhere.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface Body {
 subtype_id?: unknown;
 new_subtype?: unknown;
 brand_display_name?: unknown;
 notes?: unknown;
}

interface NewSubtypeInput {
 name: string;
 slug: string;
 aliases: string[];
}

function parseNewSubtype(raw: unknown): NewSubtypeInput {
 if (!raw || typeof raw !== "object") {
  throw new ValidationError(
   "new_subtype",
   "must be an object { name, slug, aliases }",
  );
 }
 const obj = raw as Record<string, unknown>;
 const name = requireString(obj.name, "new_subtype.name", {
  minLength: 2,
  maxLength: 60,
 });
 const slug = requireString(obj.slug, "new_subtype.slug", {
  minLength: 2,
  maxLength: 80,
 }).toLowerCase();
 if (!SLUG_RE.test(slug)) {
  throw new ValidationError(
   "new_subtype.slug",
   "must be lowercase letters, numbers, and hyphens",
  );
 }

 const rawAliases = obj.aliases;
 let aliases: string[] = [];
 if (rawAliases !== undefined && rawAliases !== null) {
  if (!Array.isArray(rawAliases)) {
   throw new ValidationError("new_subtype.aliases", "must be an array");
  }
  if (rawAliases.length > 10) {
   throw new ValidationError(
    "new_subtype.aliases",
    "at most 10 aliases allowed",
   );
  }
  aliases = rawAliases.map((a, i) => {
   if (typeof a !== "string") {
    throw new ValidationError(
     `new_subtype.aliases[${i}]`,
     "must be a string",
    );
   }
   const trimmed = a.trim();
   if (trimmed.length < 2 || trimmed.length > 60) {
    throw new ValidationError(
     `new_subtype.aliases[${i}]`,
     "must be 2 to 60 characters",
    );
   }
   return trimmed;
  });
 }

 return { name, slug, aliases };
}

export async function POST(
 req: NextRequest,
 context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
 // 1. Auth gate.
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

 // 2. Parse + validate body. Two shapes.
 let body: Body;
 try {
  body = (await req.json()) as Body;
 } catch {
  return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
 }

 const hasSubtypeId =
  body.subtype_id !== undefined &&
  body.subtype_id !== null &&
  body.subtype_id !== "";
 const hasNewSubtype =
  body.new_subtype !== undefined && body.new_subtype !== null;

 if (hasSubtypeId === hasNewSubtype) {
  return NextResponse.json(
   {
    error:
     "Provide exactly one of subtype_id (link mode) or new_subtype (create mode).",
   },
   { status: 400 },
  );
 }

 let linkSubtypeId: string | null = null;
 let newSubtype: NewSubtypeInput | null = null;
 let brandDisplayName: string | null;
 let notes: string | null;

 try {
  if (hasSubtypeId) {
   linkSubtypeId = requireUuid(body.subtype_id, "subtype_id");
  } else {
   newSubtype = parseNewSubtype(body.new_subtype);
  }
  brandDisplayName = optionalString(
   body.brand_display_name,
   "brand_display_name",
   { maxLength: 80 },
  );
  notes = optionalString(body.notes, "notes", { maxLength: 500 });
 } catch (err) {
  if (err instanceof ValidationError) {
   return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json({ error: "Invalid input" }, { status: 400 });
 }

 const admin = createAdminClient();

 // 3. Load suggestion. Must be pending.
 const { data: suggestion, error: loadErr } = await admin
  .from("variant_suggestions")
  .select(
   "id, submitter_id, brand_id, base_type, proposed_name, status",
  )
  .eq("id", suggestionId)
  .maybeSingle();

 if (loadErr) {
  console.error("[variant-suggestions/approve] load failed:", loadErr);
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

 const suggestionBaseType = suggestion.base_type as SlimeBaseType;
 const suggestionBrandId = suggestion.brand_id as string;
 const proposedName = suggestion.proposed_name as string;

 // 4. Resolve the target subtype id.
 let subtypeCreated = false;
 let resolvedSubtypeId: string;

 if (linkSubtypeId) {
  // Link mode - verify the subtype exists and its base_type matches.
  const { data: existingSubtype, error: subtypeErr } = await admin
   .from("subtypes")
   .select("id, base_type")
   .eq("id", linkSubtypeId)
   .maybeSingle();

  if (subtypeErr) {
   console.error(
    "[variant-suggestions/approve] subtype lookup failed:",
    subtypeErr,
   );
   return NextResponse.json(
    { error: "Could not verify subtype" },
    { status: 500 },
   );
  }
  if (!existingSubtype) {
   return NextResponse.json(
    { error: "subtype_id does not match any subtype" },
    { status: 404 },
   );
  }
  if (existingSubtype.base_type !== suggestionBaseType) {
   return NextResponse.json(
    {
     error: `Subtype base_type (${String(existingSubtype.base_type)}) does not match suggestion base_type (${suggestionBaseType}).`,
    },
    { status: 409 },
   );
  }
  resolvedSubtypeId = existingSubtype.id as string;
 } else if (newSubtype) {
  // Create mode - moderate name + aliases, uniqueness checks, insert.
  const nameCheck = moderateText(newSubtype.name, "slime_name");
  if (!nameCheck.ok) {
   return NextResponse.json(
    { error: nameCheck.message, field: "new_subtype.name" },
    { status: 400 },
   );
  }
  const cleanedName = nameCheck.cleaned.trim();

  const cleanedAliases: string[] = [];
  for (const alias of newSubtype.aliases) {
   const aliasCheck = moderateText(alias, "slime_name");
   if (!aliasCheck.ok) {
    return NextResponse.json(
     { error: aliasCheck.message, field: "new_subtype.aliases" },
     { status: 400 },
    );
   }
   cleanedAliases.push(aliasCheck.cleaned.trim().toLowerCase());
  }

  // Slug uniqueness - global, not per base_type (subtypes.slug is
  // globally unique in the schema).
  const { data: slugCollision, error: slugCheckErr } = await admin
   .from("subtypes")
   .select("id, name, base_type")
   .eq("slug", newSubtype.slug)
   .maybeSingle();

  if (slugCheckErr) {
   console.error(
    "[variant-suggestions/approve] slug lookup failed:",
    slugCheckErr,
   );
   return NextResponse.json(
    { error: "Could not verify slug uniqueness" },
    { status: 500 },
   );
  }
  if (slugCollision) {
   return NextResponse.json(
    {
     error: `Slug '${newSubtype.slug}' is already taken by another subtype (${String(slugCollision.name)}).`,
     collision: {
      id: slugCollision.id as string,
      name: slugCollision.name as string,
      base_type: slugCollision.base_type as string,
     },
    },
    { status: 409 },
   );
  }

  // Case-insensitive name uniqueness within the same base_type. If a
  // match exists, tell the admin to switch to link mode instead.
  const { data: nameCollision, error: nameCheckErr } = await admin
   .from("subtypes")
   .select("id, name, slug")
   .eq("base_type", suggestionBaseType)
   .ilike("name", cleanedName)
   .limit(1)
   .maybeSingle();

  if (nameCheckErr) {
   console.error(
    "[variant-suggestions/approve] name lookup failed:",
    nameCheckErr,
   );
   return NextResponse.json(
    { error: "Could not verify subtype name uniqueness" },
    { status: 500 },
   );
  }
  if (nameCollision) {
   return NextResponse.json(
    {
     error: `A subtype named '${String(nameCollision.name)}' already exists under this base type. Switch to link mode to reuse it.`,
     existing_subtype: {
      id: nameCollision.id as string,
      name: nameCollision.name as string,
      slug: nameCollision.slug as string,
     },
    },
    { status: 409 },
   );
  }

  // Insert.
  const { data: insertedSubtype, error: subtypeInsertErr } = await admin
   .from("subtypes")
   .insert({
    base_type: suggestionBaseType,
    name: cleanedName,
    slug: newSubtype.slug,
    aliases: cleanedAliases,
    is_admin_approved: true,
    created_by: adminUser.id,
   })
   .select("id")
   .single();

  if (subtypeInsertErr || !insertedSubtype) {
   console.error(
    "[variant-suggestions/approve] subtype insert failed:",
    subtypeInsertErr,
   );
   return NextResponse.json(
    {
     error: `Could not create subtype: ${subtypeInsertErr?.message ?? "unknown"}`,
    },
    { status: 500 },
   );
  }
  resolvedSubtypeId = insertedSubtype.id as string;
  subtypeCreated = true;
 } else {
  // Unreachable - one of link/create is enforced above.
  return NextResponse.json(
   { error: "Missing approval mode" },
   { status: 400 },
  );
 }

 // 5. Safety-net: is there already a brand_variants row for this
 // (brand_id, subtype_id) combo? If yes, either the admin missed it
 // in the picker or another admin approved the same suggestion between
 // page render and now.
 const { data: existingBrandVariant, error: bvLookupErr } = await admin
  .from("brand_variants")
  .select("id, brand_display_name")
  .eq("brand_id", suggestionBrandId)
  .eq("subtype_id", resolvedSubtypeId)
  .maybeSingle();

 if (bvLookupErr) {
  console.error(
   "[variant-suggestions/approve] brand_variants lookup failed:",
   bvLookupErr,
  );
  return NextResponse.json(
   { error: "Could not verify brand_variants uniqueness" },
   { status: 500 },
  );
 }
 if (existingBrandVariant) {
  return NextResponse.json(
   {
    error:
     "That brand + subtype combo is already tracked. Mark this suggestion duplicate instead.",
    existing_brand_variant_id: existingBrandVariant.id as string,
   },
   { status: 409 },
  );
 }

 // 6. Insert the brand_variants row.
 const finalDisplayName =
  brandDisplayName && brandDisplayName.length > 0
   ? brandDisplayName
   : proposedName;

 const { data: brandVariant, error: bvInsertErr } = await admin
  .from("brand_variants")
  .insert({
   brand_id: suggestionBrandId,
   subtype_id: resolvedSubtypeId,
   brand_display_name: finalDisplayName,
   created_by: adminUser.id,
   is_admin_approved: true,
  })
  .select("id")
  .single();

 if (bvInsertErr || !brandVariant) {
  console.error(
   "[variant-suggestions/approve] brand_variants insert failed:",
   bvInsertErr,
   { subtypeCreated, resolvedSubtypeId, brandId: suggestionBrandId },
  );
  return NextResponse.json(
   {
    error: `Could not create brand_variants row: ${bvInsertErr?.message ?? "unknown"}`,
   },
   { status: 500 },
  );
 }
 const brandVariantId = brandVariant.id as string;

 const nowIso = new Date().toISOString();

 // 7. Resolve the suggestion. The trigger from mig 078 fires on this
 // transition and bumps profiles.approved_variant_contributions.
 const { error: suggestionUpdateErr } = await admin
  .from("variant_suggestions")
  .update({
   status: "approved",
   resolved_subtype_id: resolvedSubtypeId,
   resolved_brand_variant_id: brandVariantId,
   resolved_by: adminUser.id,
   resolved_at: nowIso,
   admin_notes: notes,
  })
  .eq("id", suggestion.id);

 if (suggestionUpdateErr) {
  console.error(
   "[variant-suggestions/approve] suggestion update failed after brand_variants insert:",
   suggestionUpdateErr,
   {
    brandVariantId,
    resolvedSubtypeId,
    suggestionId: suggestion.id,
   },
  );
  return NextResponse.json(
   {
    error:
     "Brand variant created but suggestion status update failed. Contact engineering.",
    brand_variant_id: brandVariantId,
    subtype_id: resolvedSubtypeId,
   },
   { status: 500 },
  );
 }

 // 8. Notify submitter (best-effort - a failed notification insert
 // shouldn't fail the whole approve op).
 if (suggestion.submitter_id) {
  const { error: notificationErr } = await admin
   .from("notifications")
   .insert({
    recipient_id: suggestion.submitter_id,
    notification_type: "variant_suggestion_approved",
    actor_id: adminUser.id,
    brand_id: suggestionBrandId,
   });
  if (notificationErr) {
   console.error(
    "[variant-suggestions/approve] notification insert failed:",
    notificationErr,
   );
  }
 }

 return NextResponse.json({
  ok: true,
  subtype_id: resolvedSubtypeId,
  brand_variant_id: brandVariantId,
  subtype_created: subtypeCreated,
 });
}
