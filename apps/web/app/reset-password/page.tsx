// apps/web/app/reset-password/page.tsx
"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent } from "@supabase/supabase-js";
import FloatingPills from "@/components/FloatingPills";

function ResetPasswordPageInner() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(true);
      }
    });

    // If no recovery event fires within 3 seconds, assume the link is bad.
    const timeoutId = setTimeout(() => {
      setRecoveryReady((ready) => {
        if (!ready) setTokenError(true);
        return ready;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password.length > 72) {
      setError("Password must be 72 characters or fewer.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
        return;
      }

      router.push("/login?reset=success");
    });
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-5 py-12 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
    >
      <FloatingPills area="hero" density="medium" zIndex={0} />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-glow-green"
            style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
          >
            <svg
              viewBox="0 0 32 32"
              width="32"
              height="32"
              fill="none"
              aria-hidden="true"
            >
              <ellipse
                cx="16"
                cy="18"
                rx="12"
                ry="10"
                fill="#0A0A0A"
                opacity="0.85"
              />
              <ellipse
                cx="10"
                cy="12"
                rx="5"
                ry="4"
                fill="#0A0A0A"
                opacity="0.85"
              />
              <ellipse
                cx="22"
                cy="11"
                rx="4"
                ry="3.5"
                fill="#0A0A0A"
                opacity="0.85"
              />
              <ellipse
                cx="16"
                cy="16"
                rx="8"
                ry="7"
                fill="#0A0A0A"
                opacity="0.7"
              />
            </svg>
          </div>

          {tokenError ? (
            <>
              <h1 className="text-2xl font-bold text-slime-cyan tracking-tight">
                Link invalid or expired
              </h1>
              <p className="mt-1 text-sm text-slime-muted">
                Recovery links expire after 1 hour. Request a new one to
                continue.
              </p>
            </>
          ) : recoveryReady ? (
            <>
              <h1 className="text-2xl font-bold text-slime-cyan tracking-tight">
                Set a new password
              </h1>
              <p className="mt-1 text-sm text-slime-muted">
                Choose something you&apos;ll remember.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slime-cyan tracking-tight">
                Verifying your link…
              </h1>
              <p className="mt-1 text-sm text-slime-muted">Just a moment.</p>
            </>
          )}
        </div>

        {/* Card */}
        <div
          className="rounded-3xl backdrop-blur-sm p-6 shadow-2xl space-y-5"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.8)",
            boxShadow:
              "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {tokenError ? (
            <Link
              href="/forgot-password"
              className="w-full block text-center rounded-2xl px-4 py-3.5 text-sm font-bold text-slime-bg shadow-glow-green hover:shadow-glow-green-lg active:scale-[0.98] transition-all duration-150"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              }}
            >
              Request a new link
            </Link>
          ) : recoveryReady ? (
            <>
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2"
                  >
                    New password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder-slime-muted focus:border-slime-accent/60 focus:outline-none focus:ring-1 focus:ring-slime-accent/40 transition"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2"
                  >
                    Confirm password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={72}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder-slime-muted focus:border-slime-accent/60 focus:outline-none focus:ring-1 focus:ring-slime-accent/40 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-slime-bg shadow-glow-green hover:shadow-glow-green-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  }}
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Updating…
                    </span>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center py-6">
              <svg
                className="animate-spin h-8 w-8 text-slime-cyan"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-slime-muted">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-slime-magenta hover:text-slime-accent transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slime-bg" />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
