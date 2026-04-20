// apps/web/lib/profile-actions.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Types ────────────────────────────────────────────────────────────────────

// [Change 8] — UpdateProfileInput extended with instagram_handle, tiktok_handle, shop_url
type UpdateProfileInput = {
  username: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website_url?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  shop_url?: string;
};

type UpdateProfileResult = {
  success: boolean;
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a Supabase server client using the request cookies.
 * Next.js 16: cookies() must be awaited.
 */
async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// [Change 8] — Server-side validation regexes mirror the client
const INSTAGRAM_RE = /^[a-zA-Z0-9._]{1,30}$/;
const TIKTOK_RE = /^[a-zA-Z0-9._]{1,24}$/;
const SHOP_URL_RE = /^https?:\/\/.+/;

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Updates the current user's profile row.
 *
 * RLS note: The profiles table must have an UPDATE policy that restricts
 * writes to rows where `auth.uid() = id`. This action relies on that
 * policy — it does NOT enforce auth.uid() manually here, so if RLS is
 * misconfigured (or the anon key is used without RLS), a user could
 * overwrite another user's profile. Ensure RLS is enabled and the
 * policy is set before using this in production.
 *
 * Recommended RLS policy for profiles UPDATE:
 *   CREATE POLICY "users can update own profile"
 *   ON profiles FOR UPDATE
 *   USING (auth.uid() = id)
 *   WITH CHECK (auth.uid() = id);
 */
export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  // ── 1. Validate input server-side (never trust client-only validation) ──
  if (!USERNAME_RE.test(input.username)) {
    return {
      success: false,
      error:
        "Invalid username: 3–20 characters, letters, numbers, and underscores only.",
    };
  }
  if (input.bio && input.bio.length > 150) {
    return { success: false, error: "Bio must be 150 characters or fewer." };
  }

  // [Change 8] — Server-side validation for the three new social fields.
  // Strip leading @ on handles as defense-in-depth (the client already does this).
  let instagramHandle: string | undefined = input.instagram_handle;
  if (instagramHandle !== undefined && instagramHandle !== "") {
    if (instagramHandle.startsWith("@")) {
      instagramHandle = instagramHandle.slice(1);
    }
    if (!INSTAGRAM_RE.test(instagramHandle)) {
      return { success: false, error: "Invalid Instagram handle." };
    }
  }

  let tiktokHandle: string | undefined = input.tiktok_handle;
  if (tiktokHandle !== undefined && tiktokHandle !== "") {
    if (tiktokHandle.startsWith("@")) {
      tiktokHandle = tiktokHandle.slice(1);
    }
    if (!TIKTOK_RE.test(tiktokHandle)) {
      return { success: false, error: "Invalid TikTok handle." };
    }
  }

  const shopUrl: string | undefined = input.shop_url;
  if (shopUrl !== undefined && shopUrl !== "") {
    if (!SHOP_URL_RE.test(shopUrl)) {
      return {
        success: false,
        error: "Shop URL must start with http:// or https://.",
      };
    }
  }

  // ── 2. Auth check ──
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "You must be logged in to update your profile.",
    };
  }

  // ── 3. Username uniqueness check (double-check server-side) ──
  // We only check if username is being changed — profile page passes current
  // username on save, so we check anyway; a unique constraint on the column
  // is the real source of truth.
  const { data: existing, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", input.username)
    .neq("id", user.id)
    .maybeSingle();

  if (lookupError) {
    return {
      success: false,
      error: "Could not verify username availability. Please try again.",
    };
  }
  if (existing) {
    return { success: false, error: "That username is already taken." };
  }

  // ── 4. Build update payload ──
  const payload: Record<string, unknown> = {
    username: input.username,
    updated_at: new Date().toISOString(),
  };

  // Only include optional fields if provided so we don't accidentally null them
  if (input.bio !== undefined) payload.bio = input.bio || null;
  if (input.avatar_url !== undefined)
    payload.avatar_url = input.avatar_url || null;
  if (input.location !== undefined) payload.location = input.location || null;
  if (input.website_url !== undefined)
    payload.website_url = input.website_url || null;

  // [Change 8] — Persist the three new social fields with null-coalesce for empty strings
  if (input.instagram_handle !== undefined)
    payload.instagram_handle = instagramHandle || null;
  if (input.tiktok_handle !== undefined)
    payload.tiktok_handle = tiktokHandle || null;
  if (input.shop_url !== undefined) payload.shop_url = shopUrl || null;

  // ── 5. Persist — RLS ensures user can only update their own row ──
  const { error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (updateError) {
    // Surface a readable error for common Postgres violations
    if (updateError.code === "23505") {
      return { success: false, error: "That username is already taken." };
    }
    return {
      success: false,
      error: "Failed to save profile. Please try again.",
    };
  }

  return { success: true };
}

/**
 * Checks whether a given username is available (not already in profiles).
 *
 * Called from the client component via server action — avoids an extra
 * Supabase client round-trip from the browser and keeps the profiles
 * table unexposed to direct browser queries on the username column.
 *
 * Returns true if available, false if taken or on error.
 */
export async function checkUsernameAvailable(
  username: string,
): Promise<boolean> {
  if (!USERNAME_RE.test(username)) return false;

  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (error) {
    // On error, conservatively treat as unavailable so the user retries
    console.error("[checkUsernameAvailable]", error.message);
    return false;
  }

  return data === null; // null = no row found = username is free
}
