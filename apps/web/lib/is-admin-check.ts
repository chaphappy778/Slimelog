// apps/web/lib/is-admin-check.ts
//
// Audit high-priority #9 (2026-07-06). Central helper for admin
// authorization checks in server components, API routes, and admin
// client contexts.
//
// Prior behavior (deprecated): every admin gate ran
//   user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL
// which (a) inlined the admin's email into every browser bundle via
// the NEXT_PUBLIC_ prefix — a precise phishing target — and (b) trusted
// the email alone with no email_confirmed_at check, so any future
// OAuth provider that handed back an unverified-email user would
// collapse admin escalation to "sign up with that email".
//
// New model:
//   - profiles.role text NOT NULL DEFAULT 'user' — mutable only by
//     service_role (protected by the profiles_protect_billing_columns
//     trigger, migration 20260706000051).
//   - auth.users.email_confirmed_at must be non-null.
//
// isAdminUser() enforces both. Use this helper in every place that
// used to compare against NEXT_PUBLIC_ADMIN_EMAIL.
//
// Usage — server component / API route:
//
//   import { createClient } from "@/lib/supabase/server";
//   import { isAdminUser } from "@/lib/is-admin-check";
//
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!(await isAdminUser(supabase, user))) redirect("/");
//
// Usage — client component (best-effort UI gate only; real
// authorization is enforced server-side + RLS):
//
//   import { createClient } from "@/lib/supabase/client";
//   import { isAdminUser } from "@/lib/is-admin-check";
//   const supabase = createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//   setIsAdmin(await isAdminUser(supabase, user));

import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function isAdminUser(
  supabase: SupabaseClient,
  user: User | null | undefined,
): Promise<boolean> {
  if (!user) return false;

  // Reject unverified emails. Supabase's auth.getUser() returns
  // email_confirmed_at on the user object; OAuth providers that don't
  // require verification would leave this null.
  if (!user.email_confirmed_at) return false;

  // Look up the role column. This read is RLS-scoped: a user can only
  // read their own profile row (or public columns), so callers passing
  // in an arbitrary user object won't leak other users' roles through
  // this helper — they'd just get false back.
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return false;
  return data.role === "admin";
}
