// apps/web/components/AuthProvider.tsx
//
// T104 (2026-07-10): DevTools profiling on /slimes/[id] revealed three
// separate supabase.auth.getUser() calls per page load (from ShareButton,
// SlimeMenu, ClientComments, etc.) plus three separate profiles queries
// each selecting different columns. This provider fetches both once and
// shares them across every consumer client component.
//
// Design
// ------
// * One getUser call on mount, plus an onAuthStateChange subscription so
//   signout / login events keep the shared state fresh.
// * One profiles query pulling every column any current consumer needs
//   (referral_code, username, avatar_url, display_name, role,
//   onboarding_completed_at). If a future consumer needs a new column,
//   add it here rather than fanning out a new query.
// * Exposed via useAuth() hook — returns { user, profile, loading }.
//
// Consumers can trust that when loading === false, both user and profile
// reflect the current state (profile is null for signed-out users, not
// stale from a previous session).

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

// Add fields here as new consumers need them; do not fan out separate
// profile queries in other components.
export type AuthProfile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  role: string | null;
  referral_code: string | null;
  onboarding_completed_at: string | null;
  subscription_tier: string | null;
  is_premium: boolean | null;
  marketing_consent: boolean | null;
};

type AuthContextValue = {
  user: User | null;
  profile: AuthProfile | null;
  loading: boolean;
  // Force a re-fetch — useful after actions that mutate the profile
  // (username change, avatar upload, marketing consent toggle, etc.)
  // so the shared state doesn't lag the DB.
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PROFILE_COLUMNS =
  "id, username, avatar_url, display_name, role, referral_code, onboarding_completed_at, subscription_tier, is_premium, marketing_consent";

async function loadProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[AuthProvider] profile load failed:", error.message);
    return null;
  }
  return (data as AuthProfile | null) ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 2026-07-11: bootstrap now uses getSession() (reads from cookies, no
  // network round-trip) rather than getUser() (which validates the token
  // against Supabase's auth server and can hang on slow networks or
  // just-completed OAuth handoffs, leaving PageHeader + SlimeMenu +
  // BottomNavWrapper stuck showing "nothing on the right" because
  // loading never flips to false). onAuthStateChange still fires
  // INITIAL_SESSION so freshness is preserved across the app.
  //
  // Also guarded by a 6-second safety timeout: if neither the initial
  // getSession nor onAuthStateChange has resolved by then, force
  // loading=false and let the tree render with whatever we've got
  // (worst case: user renders as null and hits the "Log In" state, which
  // is recoverable via refresh — infinitely better than a frozen page).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (sessionUser) {
        const p = await loadProfile(sessionUser.id);
        if (!cancelled) setProfile(p);
      }
      if (!cancelled) setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        const p = await loadProfile(nextUser.id);
        if (!cancelled) setProfile(p);
      } else {
        setProfile(null);
      }
      if (!cancelled) setLoading(false);
    });

    const failSafeTimer = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 6000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      clearTimeout(failSafeTimer);
    };
  }, []);

  const refresh = useMemo(
    () =>
      async function () {
        const { data } = await supabase.auth.getSession();
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        setProfile(sessionUser ? await loadProfile(sessionUser.id) : null);
      },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, refresh }),
    [user, profile, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
