// apps/web/app/forgot-password/page.tsx
"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FloatingPills from "@/components/FloatingPills";

function ForgotPasswordPageInner() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        setError(error.message);
        return;
      }

      // Always show neutral success state — never reveal whether the
      // email exists in the system (prevents account enumeration).
      setSubmitted(true);
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
          <h1 className="text-2xl font-bold text-slime-cyan tracking-tight">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-slime-muted">
            We&apos;ll email you a link to reset it.
          </p>
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
          {submitted ? (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slime-cyan">
                Check your email
              </h2>
              <p className="text-sm text-slime-muted">
                If an account exists for that email, we&apos;ve sent a recovery
                link. The link expires in 1 hour.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                      Sending…
                    </span>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            </>
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slime-bg" />}>
      <ForgotPasswordPageInner />
    </Suspense>
  );
}
