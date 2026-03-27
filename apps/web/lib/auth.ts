// apps/web/lib/auth.ts
// Server-side auth helpers for Slimelog.
// createClient() from server.ts already awaits cookies() internally —
// we just await createClient() itself here.

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlimelogProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_premium: boolean;
  is_verified: boolean;
  created_at: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Returns the current Supabase session or null.
 * Prefer getUser() for access-control decisions — sessions can be stale.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Returns the validated auth.users row from Supabase Auth (re-validates JWT).
 * Returns null when unauthenticated.
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Like getUser() but server-redirects to /login if there is no session.
 * Use at the top of any page that must be authenticated.
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

/**
 * Returns the profiles row for the authenticated user.
 *
 * The profiles table is a 1-to-1 extension of auth.users, auto-created by
 * handle_new_user() on signup — it will exist for every valid session.
 * Returns null if unauthenticated or on query error.
 */
export async function getUserProfile(): Promise<SlimelogProfile | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, username, full_name, avatar_url, bio, is_premium, is_verified, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getUserProfile] query error:", error.message);
    return null;
  }

  return data as SlimelogProfile | null;
}

/**
 * Like getUserProfile() but redirects to /login if no profile is returned.
 * Combine with requireUser() on fully-protected pages.
 */
export async function requireProfile(): Promise<SlimelogProfile> {
  const profile = await getUserProfile();
  if (!profile) redirect("/login");
  return profile;
}
