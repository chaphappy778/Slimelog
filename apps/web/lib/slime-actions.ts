// apps/web/lib/slime-actions.ts
// Server Actions for Slimelog collection logging.
// Every insert into collection_logs now requires an authenticated session.
// user_id is read from the validated session — never trusted from the client.

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────────

// Matches the slime_type enum defined in the schema.
export type SlimeType =
  | "butter"
  | "clear"
  | "cloud"
  | "icee"
  | "fluffy"
  | "floam"
  | "snow_fizz"
  | "thick_and_glossy"
  | "jelly"
  | "beaded"
  | "clay"
  | "cloud_cream"
  | "magnetic"
  | "thermochromic"
  | "avalanche"
  | "slay";

export interface LogSlimeInput {
  // Catalog references — both optional for free-form entry
  slime_id?: string;
  brand_id?: string;

  // Free-form fallbacks (used before catalog matching)
  slime_name?: string;
  brand_name_raw?: string;

  slime_type: SlimeType;

  // Status flags
  in_collection?: boolean;
  in_wishlist?: boolean;

  // Ratings — all optional, smallint 1–5
  rating_texture?: number;
  rating_scent?: number;
  rating_sound?: number;
  rating_drizzle?: number;
  rating_creativity?: number;
  rating_sensory_fit?: number;
  rating_overall?: number;

  // Details
  scent?: string;
  colors?: string[];

  // Shipping / fulfillment dates — ISO 8601 date strings (YYYY-MM-DD)
  order_date?: string;
  ship_date?: string;
  received_date?: string;

  // Free-form notes
  notes?: string;
  purchase_price?: number;
  purchase_currency?: string;
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's id, or throws if no session exists.
 * Called at the top of every mutating action — never trust user_id from args.
 */
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

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Inserts a new collection_logs row for the authenticated user.
 * Throws if unauthenticated or if the insert fails.
 */
export async function logSlime(input: LogSlimeInput): Promise<{ id: string }> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  // Validate ratings are in range 1–5 if provided
  const ratingFields = [
    "rating_texture",
    "rating_scent",
    "rating_sound",
    "rating_drizzle",
    "rating_creativity",
    "rating_sensory_fit",
    "rating_overall",
  ] as const;

  for (const field of ratingFields) {
    const val = input[field];
    if (val !== undefined && (val < 1 || val > 5 || !Number.isInteger(val))) {
      throw new Error(`${field} must be an integer between 1 and 5.`);
    }
  }

  const { data, error } = await supabase
    .from("collection_logs")
    .insert({
      user_id: userId, // ← always from session, never from client input
      slime_id: input.slime_id ?? null,
      brand_id: input.brand_id ?? null,
      slime_name: input.slime_name ?? null,
      brand_name_raw: input.brand_name_raw ?? null,
      slime_type: input.slime_type,
      in_collection: input.in_collection ?? true,
      in_wishlist: input.in_wishlist ?? false,
      rating_texture: input.rating_texture ?? null,
      rating_scent: input.rating_scent ?? null,
      rating_sound: input.rating_sound ?? null,
      rating_drizzle: input.rating_drizzle ?? null,
      rating_creativity: input.rating_creativity ?? null,
      rating_sensory_fit: input.rating_sensory_fit ?? null,
      rating_overall: input.rating_overall ?? null,
      scent: input.scent ?? null,
      colors: input.colors ?? null,
      order_date: input.order_date ?? null,
      ship_date: input.ship_date ?? null,
      received_date: input.received_date ?? null,
      notes: input.notes ?? null,
      purchase_price: input.purchase_price ?? null,
      purchase_currency: input.purchase_currency ?? "USD",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[logSlime] insert error:", error.message);
    throw new Error(`Failed to log slime: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath("/");

  return { id: data.id };
}

/**
 * Updates an existing collection_logs row.
 * Enforces ownership — RLS will reject if user_id doesn't match, and we
 * double-check by filtering on user_id in the UPDATE query.
 */
export async function updateSlimeLog(
  logId: string,
  input: Partial<LogSlimeInput>,
): Promise<void> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("collection_logs")
    .update({
      ...(input.slime_id !== undefined && { slime_id: input.slime_id }),
      ...(input.brand_id !== undefined && { brand_id: input.brand_id }),
      ...(input.slime_name !== undefined && { slime_name: input.slime_name }),
      ...(input.brand_name_raw !== undefined && {
        brand_name_raw: input.brand_name_raw,
      }),
      ...(input.slime_type !== undefined && { slime_type: input.slime_type }),
      ...(input.in_collection !== undefined && {
        in_collection: input.in_collection,
      }),
      ...(input.in_wishlist !== undefined && {
        in_wishlist: input.in_wishlist,
      }),
      ...(input.rating_texture !== undefined && {
        rating_texture: input.rating_texture,
      }),
      ...(input.rating_scent !== undefined && {
        rating_scent: input.rating_scent,
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
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.purchase_price !== undefined && {
        purchase_price: input.purchase_price,
      }),
      ...(input.colors !== undefined && { colors: input.colors }),
      ...(input.order_date !== undefined && { order_date: input.order_date }),
      ...(input.ship_date !== undefined && { ship_date: input.ship_date }),
      ...(input.received_date !== undefined && {
        received_date: input.received_date,
      }),
    })
    .eq("id", logId)
    .eq("user_id", userId); // ownership guard in addition to RLS

  if (error) {
    console.error("[updateSlimeLog] update error:", error.message);
    throw new Error(`Failed to update log: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath("/");
}

/**
 * Deletes a collection_logs row owned by the authenticated user.
 */
export async function deleteSlimeLog(logId: string): Promise<void> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("collection_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId); // ownership guard in addition to RLS

  if (error) {
    console.error("[deleteSlimeLog] delete error:", error.message);
    throw new Error(`Failed to delete log: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath("/");
}

/**
 * Fetches collection_logs for the authenticated user.
 */
export async function getUserCollectionLogs() {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("collection_logs")
    .select(
      `
      id, slime_type, slime_name, brand_name_raw,
      in_collection, in_wishlist,
      rating_overall, rating_texture, rating_scent,
      rating_sound, rating_drizzle, rating_creativity, rating_sensory_fit,
      notes, purchase_price, purchase_currency,
      colors, order_date, ship_date, received_date,
      created_at, updated_at,
      slimes ( id, name, colors, scent ),
      brands ( id, name, slug )
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
