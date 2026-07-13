// apps/web/lib/slime-actions.ts
// Server Actions for Slimelog collection logging.
// Every insert into collection_logs now requires an authenticated session.
// user_id is read from the validated session — never trusted from the client.
// Updated: Bundle T72+T73+T75 — keywords + scent_strength added; scent + rating_scent removed
// Updated: [scent_notes] + [T64] purchase_price fix
// Updated: [T98] rating columns now numeric 0–5 in 0.25 increments

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  SlimeBaseType,
  ScentStrength,
  SlimeCondition,
} from "@/lib/types";
import {
  moderateText,
  type ModerationField,
  type ModerationResult,
} from "@/lib/moderation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LogSlimeInput {
  // Catalog references — both optional for free-form entry
  slime_id?: string;
  brand_id?: string;

  // Free-form fallbacks (used before catalog matching)
  slime_name?: string;
  brand_name_raw?: string;
  collection_name?: string;

  // [G2] Hierarchical taxonomy: base_type is required, subtype_id is optional
  base_type: SlimeBaseType;
  subtype_id?: string | null;

  // Status flags
  in_collection?: boolean;
  in_wishlist?: boolean;
  is_public?: boolean;

  // [Change 2 — T98] Ratings — all optional, numeric 0–5 in 0.25 increments
  rating_texture?: number;
  rating_sound?: number;
  rating_drizzle?: number;
  rating_creativity?: number;
  rating_sensory_fit?: number;
  rating_overall?: number;

  // Details
  scent_strength?: ScentStrength | null;
  // [Change 1 — scent_notes]
  scent_notes?: string | null;
  // 2026-07-12: physical condition of the slime. Optional. Serves
  // personal-shelf tracking today; feeds marketplace listing form later.
  condition?: SlimeCondition | null;
  keywords?: string[];
  colors?: string[];
  image_url?: string;

  // Free-form notes
  notes?: string;
  purchase_price?: number;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required. Please sign in to log slimes.");
  }

  return user.id;
}

// ─── Moderation helpers (T111) ────────────────────────────────────────────────
//
// 2026-07-12: switched from throw-on-fail to a sentinel-based pattern.
// Next.js server actions strip Error messages in production ("An error
// occurred in the Server Components render. The specific message is
// omitted..."), so throwing our friendly copy from moderateOrThrow
// showed up as an ugly generic error to the user. We now collect
// moderation failures on the caller side and return them as a
// {ok:false, error} result the client can surface directly.

class ModerationValidationError extends Error {
  readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "ModerationValidationError";
    this.userMessage = userMessage;
  }
}

function moderateOrThrow(
  raw: string | null | undefined,
  field: ModerationField,
): string {
  const result: ModerationResult = moderateText(raw, field);
  if (!result.ok) {
    throw new ModerationValidationError(result.message);
  }
  return result.cleaned;
}

/** Moderate every keyword and return the cleaned list, capped at 10. */
function moderateKeywords(raw: string[] | undefined): string[] {
  if (!raw || raw.length === 0) return [];
  const out: string[] = [];
  for (const k of raw) {
    const trimmed = (k ?? "").trim();
    if (!trimmed) continue;
    const check = moderateText(trimmed, "keyword");
    if (!check.ok) {
      // Surface the offending keyword so the user knows which one to fix.
      throw new ModerationValidationError(
        `Keyword "${trimmed}": ${check.message}`,
      );
    }
    out.push(check.cleaned.toLowerCase());
  }
  // Match prior behavior — cap at 10 keywords per log.
  return out.slice(0, 10);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

// 2026-07-12: return a result union so moderation failures don't get
// stripped by Next.js server-action error handling ("The specific message
// is omitted in production builds..."). The wizard uses .ok to branch
// between success + redirect and inline error.
export type LogSlimeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function logSlime(
  input: LogSlimeInput,
): Promise<LogSlimeResult> {
  try {
    return await logSlimeInner(input);
  } catch (err) {
    if (err instanceof ModerationValidationError) {
      return { ok: false, error: err.userMessage };
    }
    throw err;
  }
}

async function logSlimeInner(input: LogSlimeInput): Promise<LogSlimeResult> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  // [Change 1 — T98] Validate ratings are 0–5 in 0.25 increments
  const ratingFields = [
    "rating_texture",
    "rating_sound",
    "rating_drizzle",
    "rating_creativity",
    "rating_sensory_fit",
    "rating_overall",
  ] as const;

  for (const field of ratingFields) {
    const val = input[field];
    if (
      val !== undefined &&
      (val < 0 || val > 5 || Math.round(val * 4) / 4 !== val)
    ) {
      throw new Error(`${field} must be between 0 and 5 in 0.25 increments.`);
    }
  }

  // T111 (2026-07-12): moderation gate for every user-authored text field.
  // Cleaned values replace the raw input on the way into the INSERT. Empty
  // strings are treated as "not provided" and stored as null — the log
  // wizard can save a catalog-linked slime with only slime_id + brand_id
  // and no free-form names.
  const cleanedSlimeName =
    input.slime_name && input.slime_name.trim() !== ""
      ? moderateOrThrow(input.slime_name, "slime_name")
      : null;
  const cleanedBrandNameRaw =
    input.brand_name_raw && input.brand_name_raw.trim() !== ""
      ? moderateOrThrow(input.brand_name_raw, "brand_name")
      : null;
  const cleanedCollectionName =
    input.collection_name && input.collection_name.trim() !== ""
      ? moderateOrThrow(input.collection_name, "collection_name")
      : null;
  const cleanedNotes =
    input.notes && input.notes.trim() !== ""
      ? moderateOrThrow(input.notes, "slime_notes")
      : null;
  const cleanedKeywords = moderateKeywords(input.keywords);

  const { data, error } = await supabase
    .from("collection_logs")
    .insert({
      user_id: userId,
      slime_id: input.slime_id ?? null,
      brand_id: input.brand_id ?? null,
      slime_name: cleanedSlimeName,
      brand_name_raw: cleanedBrandNameRaw,
      collection_name: cleanedCollectionName,
      base_type: input.base_type,
      subtype_id: input.subtype_id ?? null,
      in_collection: input.in_collection ?? true,
      in_wishlist: input.in_wishlist ?? false,
      is_public: input.is_public ?? true,
      rating_texture: input.rating_texture ?? null,
      rating_sound: input.rating_sound ?? null,
      rating_drizzle: input.rating_drizzle ?? null,
      rating_creativity: input.rating_creativity ?? null,
      rating_sensory_fit: input.rating_sensory_fit ?? null,
      rating_overall: input.rating_overall ?? null,
      scent_strength: input.scent_strength ?? null,
      // [Change 2 — scent_notes]
      scent_notes: input.scent_notes ?? null,
      condition: input.condition ?? null,
      colors: input.colors ?? null,
      image_url: input.image_url ?? null,
      notes: cleanedNotes,
      purchase_price: input.purchase_price ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[logSlime] insert error:", error.message);
    throw new Error(`Failed to log slime: ${error.message}`);
  }

  // Wire keywords — upsert tags, insert log_tags
  if (cleanedKeywords.length > 0) {
    const normalized = cleanedKeywords;

    const { data: tagRows, error: tagError } = await supabase
      .from("tags")
      .upsert(
        normalized.map((name) => ({ name })),
        { onConflict: "name", ignoreDuplicates: false },
      )
      .select("id, name");

    if (tagError) {
      console.error("[logSlime] tag upsert error:", tagError.message);
      // Non-fatal — log proceeds without tags
    } else if (tagRows && tagRows.length > 0) {
      const { error: ltError } = await supabase
        .from("log_tags")
        .insert(tagRows.map((t) => ({ log_id: data.id, tag_id: t.id })));
      if (ltError) {
        console.error("[logSlime] log_tags insert error:", ltError.message);
      }
    }
  }

  revalidatePath("/collection");
  revalidatePath("/");

  return { ok: true, id: data.id };
}

// Same result-wrap treatment for edit so the edit wizard can surface
// moderation copy inline instead of getting the generic Next.js error.
export type UpdateSlimeLogResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateSlimeLog(
  logId: string,
  input: Partial<LogSlimeInput>,
): Promise<UpdateSlimeLogResult> {
  try {
    await updateSlimeLogInner(logId, input);
    return { ok: true };
  } catch (err) {
    if (err instanceof ModerationValidationError) {
      return { ok: false, error: err.userMessage };
    }
    throw err;
  }
}

async function updateSlimeLogInner(
  logId: string,
  input: Partial<LogSlimeInput>,
): Promise<void> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  // T111 (2026-07-12): moderate every user-authored text field before
  // it lands in the update payload. Only fields the caller actually
  // touched (input.X !== undefined) go through the gate, so partial
  // updates stay partial. An empty-string edit (user clearing the
  // field) is written as null — even for the "required" slime_name /
  // brand_name paths, since the UI's own required-checks are the
  // source of truth for what an "empty" state means at the row level.
  let cleanedSlimeName: string | null | undefined;
  if (input.slime_name !== undefined) {
    cleanedSlimeName =
      input.slime_name && input.slime_name.trim() !== ""
        ? moderateOrThrow(input.slime_name, "slime_name")
        : null;
  }
  let cleanedBrandNameRaw: string | null | undefined;
  if (input.brand_name_raw !== undefined) {
    cleanedBrandNameRaw =
      input.brand_name_raw && input.brand_name_raw.trim() !== ""
        ? moderateOrThrow(input.brand_name_raw, "brand_name")
        : null;
  }
  let cleanedCollectionName: string | null | undefined;
  if (input.collection_name !== undefined) {
    cleanedCollectionName =
      input.collection_name && input.collection_name.trim() !== ""
        ? moderateOrThrow(input.collection_name, "collection_name")
        : null;
  }
  let cleanedNotes: string | null | undefined;
  if (input.notes !== undefined) {
    cleanedNotes =
      input.notes && input.notes.trim() !== ""
        ? moderateOrThrow(input.notes, "slime_notes")
        : null;
  }
  const cleanedKeywords =
    input.keywords !== undefined ? moderateKeywords(input.keywords) : undefined;

  // Audit hp-19 (2026-07-07): add `.select("id")` and throw when the
  // returned array is empty. Previously .update().eq(...).eq(...)
  // returned `{success:true}` even when zero rows matched — so a bad
  // logId, someone else's logId, or an RLS-blocked write all looked
  // like a successful save to the UI. That hides both UX bugs (user
  // sees "saved" but their edit went nowhere) and data-integrity
  // blind spots (any future RLS mis-config becomes silent).
  const { data: updated, error } = await supabase
    .from("collection_logs")
    .update({
      ...(input.slime_id !== undefined && { slime_id: input.slime_id }),
      ...(input.brand_id !== undefined && { brand_id: input.brand_id }),
      ...(input.slime_name !== undefined && { slime_name: cleanedSlimeName }),
      ...(input.brand_name_raw !== undefined && {
        brand_name_raw: cleanedBrandNameRaw,
      }),
      ...(input.collection_name !== undefined && {
        collection_name: cleanedCollectionName,
      }),
      ...(input.base_type !== undefined && { base_type: input.base_type }),
      ...(input.subtype_id !== undefined && { subtype_id: input.subtype_id }),
      ...(input.in_collection !== undefined && {
        in_collection: input.in_collection,
      }),
      ...(input.in_wishlist !== undefined && {
        in_wishlist: input.in_wishlist,
      }),
      ...(input.is_public !== undefined && { is_public: input.is_public }),
      ...(input.rating_texture !== undefined && {
        rating_texture: input.rating_texture,
      }),
      ...(input.rating_sound !== undefined && {
        rating_sound: input.rating_sound,
      }),
      ...(input.rating_drizzle !== undefined && {
        rating_drizzle: input.rating_drizzle,
      }),
      ...(input.rating_creativity !== undefined && {
        rating_creativity: input.rating_creativity,
      }),
      ...(input.rating_sensory_fit !== undefined && {
        rating_sensory_fit: input.rating_sensory_fit,
      }),
      ...(input.rating_overall !== undefined && {
        rating_overall: input.rating_overall,
      }),
      ...(input.scent_strength !== undefined && {
        scent_strength: input.scent_strength,
      }),
      // [Change 3 — scent_notes]
      ...(input.scent_notes !== undefined && {
        scent_notes: input.scent_notes,
      }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.notes !== undefined && { notes: cleanedNotes }),
      ...(input.purchase_price !== undefined && {
        purchase_price: input.purchase_price,
      }),
      ...(input.image_url !== undefined && { image_url: input.image_url }),
      ...(input.colors !== undefined && { colors: input.colors }),
    })
    .eq("id", logId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[updateSlimeLog] update error:", error.message);
    throw new Error(`Failed to update log: ${error.message}`);
  }
  if (!updated || updated.length === 0) {
    // No rows matched — logId doesn't belong to this user, doesn't exist,
    // or RLS silently blocked the write.
    console.error(
      "[updateSlimeLog] zero rows affected — logId does not belong to user or does not exist",
      { logId, userId },
    );
    throw new Error("Log not found or you do not have permission to edit it.");
  }

  // Keywords: full replace strategy. cleanedKeywords was moderated + capped
  // at 10 above.
  if (cleanedKeywords !== undefined) {
    await supabase.from("log_tags").delete().eq("log_id", logId);

    if (cleanedKeywords.length > 0) {
      const normalized = cleanedKeywords;

      const { data: tagRows } = await supabase
        .from("tags")
        .upsert(
          normalized.map((name) => ({ name })),
          { onConflict: "name", ignoreDuplicates: false },
        )
        .select("id");

      if (tagRows && tagRows.length > 0) {
        await supabase
          .from("log_tags")
          .insert(tagRows.map((t) => ({ log_id: logId, tag_id: t.id })));
      }
    }
  }

  revalidatePath("/collection");
  revalidatePath("/");
}

export async function deleteSlimeLog(logId: string): Promise<void> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  // Audit hp-19 (2026-07-07): same fix as updateSlimeLog. Without
  // `.select("id")` the delete returns success even when zero rows
  // matched, so a bad logId, someone else's log, or an RLS-blocked
  // delete all look identical to a real successful delete.
  const { data: deleted, error } = await supabase
    .from("collection_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[deleteSlimeLog] delete error:", error.message);
    throw new Error(`Failed to delete log: ${error.message}`);
  }
  if (!deleted || deleted.length === 0) {
    console.error(
      "[deleteSlimeLog] zero rows affected — logId does not belong to user or does not exist",
      { logId, userId },
    );
    throw new Error(
      "Log not found or you do not have permission to delete it.",
    );
  }

  revalidatePath("/collection");
  revalidatePath("/");
}

export async function getUserCollectionLogs() {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collection_logs")
    .select(
      `
      id, base_type, subtype_id, slime_name, brand_name_raw, collection_name,
      in_collection, in_wishlist,
      rating_overall, rating_texture,
      rating_sound, rating_drizzle, rating_creativity, rating_sensory_fit,
      scent_strength, scent_notes, condition,
      notes, purchase_price,
      colors, image_url,
      created_at, updated_at,
      slimes ( id, name, colors ),
      subtype:subtypes ( id, name ),
      brands ( id, name, slug ),
      log_tags ( tag_id, tags ( name ) )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getUserCollectionLogs] query error:", error.message);
    throw new Error(`Failed to fetch collection: ${error.message}`);
  }

  return data;
}
