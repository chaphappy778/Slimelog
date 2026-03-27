// apps/web/app/signup/page.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match — give it another go.");
      return;
    }
    if (password.length < 8) {
      setError("Password needs to be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    });
  }

  async function handleGoogleSignup() {
    setError(null);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) setError(error.message);
  }

  // ── Email-sent confirmation screen ────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0a1e] flex flex-col items-center justify-center px-5 py-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-pink-500/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm text-center space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/30">
            <span className="text-4xl" role="img" aria-label="mail">
              📬
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Check your inbox</h2>
            <p className="mt-2 text-sm text-purple-300/70 leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-pink-400 font-medium">{email}</span>. Click
              it to activate your account and start logging slimes.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-pink-400 hover:text-pink-300 transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0f0a1e] flex flex-col items-center justify-center px-5 py-12">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-pink-500/10 blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/30 mb-4">
            <span className="text-3xl" role="img" aria-label="slime sparkle">
              ✨
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Start your collection
          </h1>
          <p className="mt-1 text-sm text-purple-300/70">
            Track, rate, and discover slimes you'll love
          </p>
        </div>

        {/* Slime type teaser pills */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-6 opacity-60">
          {["🧈 Butter", "☁️ Cloud", "🧊 Icee", "🫧 Clear", "✨ Slay"].map(
            (label) => (
              <span
                key={label}
                className="rounded-full bg-white/8 border border-white/10 px-3 py-1 text-xs text-purple-200"
              >
                {label}
              </span>
            ),
          )}
          <span className="rounded-full bg-white/8 border border-white/10 px-3 py-1 text-xs text-purple-300/50">
            +11 more
          </span>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 shadow-2xl space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/8 px-4 py-3 text-sm font-medium text-white hover:bg-white/15 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-purple-300/50 uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-purple-300/70 uppercase tracking-widest mb-2"
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
                className="w-full rounded-xl bg-white/8 border border-white/12 px-4 py-3 text-sm text-white placeholder-purple-300/30 focus:border-fuchsia-500/60 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40 transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-purple-300/70 uppercase tracking-widest mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl bg-white/8 border border-white/12 px-4 py-3 text-sm text-white placeholder-purple-300/30 focus:border-fuchsia-500/60 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40 transition"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-purple-300/70 uppercase tracking-widest mb-2"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-white/8 border border-white/12 px-4 py-3 text-sm text-white placeholder-purple-300/30 focus:border-fuchsia-500/60 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/40 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:brightness-110 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  Creating account…
                </span>
              ) : (
                "Create my account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-purple-300/40 leading-relaxed">
            By signing up you agree to our{" "}
            <Link
              href="/terms"
              className="text-purple-300/60 underline underline-offset-2 hover:text-purple-300 transition-colors"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-purple-300/60 underline underline-offset-2 hover:text-purple-300 transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-purple-300/50">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-pink-400 hover:text-pink-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
