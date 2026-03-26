"use server";
// apps/web/lib/slime-actions.ts

import { createClient } from "@/lib/supabase/client";
import type { CollectionLog, LogFormData } from "@/lib/types";

// ─── Helper: get the browser Supabase client ──────────────────────────────────
// NOTE: Using browser client per spec (auth workstream TBD).
// Switch to server client + session when auth is wired.
function getClient() {
  return createClient();
}

// ─── insertCollectionLog ──────────────────────────────────────────────────────
//
// Writes one row to collection_logs with all form fields merged.
// Ratings and metadata are written in a single INSERT (no second round-trip).
//
// Column names aligned to migration 20260324000001:
//   slime_name, brand_name_raw, slime_type, colors (array),
//   scent, cost_paid, notes, in_wishlist, in_collection,
//   rating_texture, rating_scent, rating_sound, rating_drizzle,
//   rating_creativity, rating_sensory_fit, rating_overall
//
// user_id is currently omitted — RLS is relaxed for anon testing.
// Add `user_id: (await supabase.auth.getUser()).data.user?.id` when auth lands.

export async function insertCollectionLog(
  form: LogFormData,
): Promise<{ data: CollectionLog | null; error: string | null }> {
  const supabase = getClient();

  const payload = {
    // Identity
    slime_name: form.slime_name.trim() || null,
    brand_name_raw: form.brand_name_raw.trim() || null,
    slime_type: form.slime_type || null,

    // Details
    colors: form.colors.length > 0 ? form.colors : null,
    scent: form.scent.trim() || null,
    cost_paid: form.cost_paid !== "" ? parseFloat(form.cost_paid) : null,
    notes: form.notes.trim() || null,

    // Status — correct column names from schema
    in_wishlist: form.in_wishlist,
    in_collection: form.in_collection,

    // Ratings (null = not rated)
    rating_texture: form.rating_texture,
    rating_scent: form.rating_scent,
    rating_sound: form.rating_sound,
    rating_drizzle: form.rating_drizzle,
    rating_creativity: form.rating_creativity,
    rating_sensory_fit: form.rating_sensory_fit,
    rating_overall: form.rating_overall,
  };

  const { data, error } = await supabase
    .from("collection_logs")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[insertCollectionLog]", error);
    return { data: null, error: error.message };
  }

  return { data: data as CollectionLog, error: null };
}

// ─── fetchCollectionLogs ──────────────────────────────────────────────────────
//
// Returns all collection_logs rows, newest first.
// When auth is wired, RLS will automatically scope to the session user.
// Until then returns all rows visible to anon (per current RLS policy).

export async function fetchCollectionLogs(): Promise<{
  data: CollectionLog[];
  error: string | null;
}> {
  const supabase = getClient();

  const { data, error } = await supabase
    .from("collection_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchCollectionLogs]", error);
    return { data: [], error: error.message };
  }

  return { data: (data ?? []) as CollectionLog[], error: null };
}
