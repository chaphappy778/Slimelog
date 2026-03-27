// apps/web/lib/slime-actions.ts
// Server Actions for Slimelog collection logging.
// Every insert into collection_logs now requires an authenticated session.
// user_id is read from the validated session — never trusted from the client.

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  slime_id?: string;
  brand_id?: string;
  slime_name?: string;
  brand_name_raw?: string;
  slime_type: SlimeType;
  in_collection?: boolean;
  in_wishlist?: boolean;
  rating_texture?: number;
  rating_scent?: number;
  rating_sound?: number;
  rating_drizzle?: number;
  rating_creativity?: number;
  rating_sensory_fit?: number;
  rating_overall?: number;
  scent?: string;
  notes?: string;
  purchase_price?: number;
  purchase_currency?: string;
}

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

export async function logSlime(input: LogSlimeInput): Promise<{ id: string }> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

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
      user_id: userId,
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

export async function updateSlimeLog(
  logId: string,
  input: Partial<LogSlimeInput>,
): Promise<void> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("collection_logs")
    .update({
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
    })
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    console.error("[updateSlimeLog] update error:", error.message);
    throw new Error(`Failed to update log: ${error.message}`);
  }

  revalidatePath("/collection");
  revalidatePath("/");
}

export async function deleteSlimeLog(logId: string): Promise<void> {
  const userId = await requireAuthUserId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("collection_logs")
    .delete()
    .eq("id", logId)
    .eq("user_id", userId);

  if (error) {
    console.error("[deleteSlimeLog] delete error:", error.message);
    throw new Error(`Failed to delete log: ${error.message}`);
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
      id, slime_type, slime_name, brand_name_raw,
      in_collection, in_wishlist,
      rating_overall, rating_texture, rating_scent,
      rating_sound, rating_drizzle, rating_creativity, rating_sensory_fit,
      notes, purchase_price, purchase_currency,
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
