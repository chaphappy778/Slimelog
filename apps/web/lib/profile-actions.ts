// apps/web/lib/profile-actions.ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateProfileInput = {
  username: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website_url?: string;
  instagram_handle?: string;
  tiktok_handle?: string;
  shop_url?: string;
  youtube_handle?: string;
  pinterest_handle?: string;
  twitter_handle?: string;
  background_url?: string;
  favorite_brand_id?: string;
};

type UpdateProfileResult = {
  success: boolean;
  error?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
const INSTAGRAM_RE = /^[a-zA-Z0-9._]{1,30}$/;
const TIKTOK_RE = /^[a-zA-Z0-9._]{1,24}$/;
const SHOP_URL_RE = /^https?:\/\/.+/;
const YOUTUBE_RE = /^[a-zA-Z0-9_.-]{1,50}$/;
const PINTEREST_RE = /^[a-zA-Z0-9_.+-]{1,30}$/;
const TWITTER_RE = /^[a-zA-Z0-9_]{1,15}$/;

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  // ── 1. Validate input server-side ──
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

  let instagramHandle: string | undefined = input.instagram_handle;
  if (instagramHandle !== undefined && instagramHandle !== "") {
    if (instagramHandle.startsWith("@"))
      instagramHandle = instagramHandle.slice(1);
    if (!INSTAGRAM_RE.test(instagramHandle)) {
      return { success: false, error: "Invalid Instagram handle." };
    }
  }

  let tiktokHandle: string | undefined = input.tiktok_handle;
  if (tiktokHandle !== undefined && tiktokHandle !== "") {
    if (tiktokHandle.startsWith("@")) tiktokHandle = tiktokHandle.slice(1);
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

  let youtubeHandle: string | undefined = input.youtube_handle;
  if (youtubeHandle !== undefined && youtubeHandle !== "") {
    if (youtubeHandle.startsWith("@")) youtubeHandle = youtubeHandle.slice(1);
    if (!YOUTUBE_RE.test(youtubeHandle)) {
      return { success: false, error: "Invalid YouTube handle." };
    }
  }

  let pinterestHandle: string | undefined = input.pinterest_handle;
  if (pinterestHandle !== undefined && pinterestHandle !== "") {
    if (pinterestHandle.startsWith("@"))
      pinterestHandle = pinterestHandle.slice(1);
    if (!PINTEREST_RE.test(pinterestHandle)) {
      return { success: false, error: "Invalid Pinterest handle." };
    }
  }

  let twitterHandle: string | undefined = input.twitter_handle;
  if (twitterHandle !== undefined && twitterHandle !== "") {
    if (twitterHandle.startsWith("@")) twitterHandle = twitterHandle.slice(1);
    if (!TWITTER_RE.test(twitterHandle)) {
      return { success: false, error: "Invalid Twitter/X handle." };
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

  // ── 3. Username uniqueness check ──
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

  if (input.bio !== undefined) payload.bio = input.bio || null;
  if (input.avatar_url !== undefined)
    payload.avatar_url = input.avatar_url || null;
  if (input.location !== undefined) payload.location = input.location || null;
  if (input.website_url !== undefined)
    payload.website_url = input.website_url || null;
  if (input.instagram_handle !== undefined)
    payload.instagram_handle = instagramHandle || null;
  if (input.tiktok_handle !== undefined)
    payload.tiktok_handle = tiktokHandle || null;
  if (input.shop_url !== undefined) payload.shop_url = shopUrl || null;
  if (input.youtube_handle !== undefined)
    payload.youtube_handle = youtubeHandle || null;
  if (input.pinterest_handle !== undefined)
    payload.pinterest_handle = pinterestHandle || null;
  if (input.twitter_handle !== undefined)
    payload.twitter_handle = twitterHandle || null;
  if (input.background_url !== undefined)
    payload.background_url = input.background_url || null;
  if (input.favorite_brand_id !== undefined)
    payload.favorite_brand_id = input.favorite_brand_id || null;

  // ── 5. Persist ──
  const { error: updateError } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (updateError) {
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
    console.error("[checkUsernameAvailable]", error.message);
    return false;
  }

  return data === null;
}
