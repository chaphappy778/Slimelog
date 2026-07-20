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
  // T125 (2026-07-20) — global aging reminders toggle. When false the
  // nightly cron skips this user entirely. Default true (opt-out UX
  // per Jenn's decision).
  aging_reminders_enabled: boolean | null;
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
  "id, username, avatar_url, display_name, role, referral_code, onboarding_completed_at, subscription_tier, is_premium, marketing_consent, aging_reminders_enabled";

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

  // 2026-07-12: split "know who the user is" from "have their profile
  // hydrated." Previously `loading` stayed true until BOTH the session
  // check AND `loadProfile()` had resolved — which meant a slow /
  // stuck profile query left the whole app sitting on the auth-gated
  // skeleton (settings page, collection, etc). Now we flip
  // `loading=false` the moment `getSession()` returns, so pages that
  // only need `user` render immediately. The profile fetch continues
  // in the background and populates `profile` when it lands.
  //
  // getSession() reads from cookies with no network round-trip, so this
  // path is fast. The 6-second failsafe stays as a hard backstop.
  useEffect(() => {
    let cancelled = false;

    const hydrateProfile = (uid: string) => {
      // Fire-and-forget — do NOT block loading on this.
      loadProfile(uid)
        .then((p) => {
          if (!cancelled) setProfile(p);
        })
        .catch((err) => {
          console.warn("[AuthProvider] profile hydrate failed:", err);
        });
    };

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        // Release the app immediately; profile fills in behind the scenes.
        setLoading(false);
        if (sessionUser) hydrateProfile(sessionUser.id);
      } catch (err) {
        console.warn("[AuthProvider] getSession threw:", err);
        if (!cancelled) setLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      // Same rule on session change: unblock UI first, refresh profile
      // in the background.
      setLoading(false);
      if (nextUser) {
        hydrateProfile(nextUser.id);
      } else {
        setProfile(null);
      }
    });

    // Absolute backstop.
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
