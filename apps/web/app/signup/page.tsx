// apps/web/app/signup/page.tsx
"use client";

import { useMemo, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeRedirect } from "@/lib/safe-redirect"; // [Change 1 — #35]

// Age calculation helper — inline, no date-fns
function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Static month options.
const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function SignupPageInner() {
  const searchParams = useSearchParams();

  // [Change 2 — #35] Read and validate the optional `next` param so a
  // logged-out user clicking an action button gets routed back to the
  // page they came from after signup confirms. Validated to prevent
  // open-redirect.
  const rawNext = searchParams.get("next");
  const next = safeRedirect(rawNext, "/");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [dobMonth, setDobMonth] = useState<string>("");
  const [dobDay, setDobDay] = useState<string>("");
  const [dobYear, setDobYear] = useState<string>("");

  const [parentalConsent, setParentalConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 120; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const maxDay = useMemo(() => {
    if (!dobMonth || !dobYear) return 31;
    return daysInMonth(parseInt(dobYear, 10), parseInt(dobMonth, 10));
  }, [dobMonth, dobYear]);

  const dayOptions = useMemo(() => {
    const days: string[] = [];
    for (let d = 1; d <= maxDay; d++) {
      days.push(pad2(d));
    }
    return days;
  }, [maxDay]);

  const dob = useMemo(() => {
    if (!dobMonth || !dobDay || !dobYear) return "";
    const dayNum = parseInt(dobDay, 10);
    if (dayNum > maxDay) return "";
    return `${dobYear}-${dobMonth}-${dobDay}`;
  }, [dobMonth, dobDay, dobYear, maxDay]);

  const age = dob ? calculateAge(dob) : null;
  const isUnder13 = age !== null && age < 13;
  const isTeen = age !== null && age >= 13 && age < 18;

  const selectClasses =
    "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text focus:border-slime-cyan/60 focus:outline-none focus:ring-1 focus:ring-slime-cyan/40 transition appearance-none";

  function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please enter your full date of birth.");
      return;
    }
    if (isUnder13) {
      setError("You must be at least 13 years old to use SlimeLog.");
      return;
    }
    if (isTeen && !parentalConsent) {
      setError(
        "You must have your parent or guardian's permission to continue.",
      );
      return;
    }
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
      // [Change 3 — #35] Thread `next` through the email confirmation
      // callback URL so the post-confirm landing respects the source page.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
    });
  }

  async function handleGoogleSignup() {
    setError(null);
    const supabase = createClient();

    // [Change 4 — #35] Thread `next` into Google OAuth callback URL.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) setError(error.message);
  }

  // Email-sent confirmation screen
  if (success) {
    return (
      <div className="min-h-screen bg-slime-bg flex flex-col items-center justify-center px-5 py-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-slime-cyan/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-slime-violet/15 blur-3xl" />
        </div>

        <div className="relative w-full max-w-sm text-center space-y-5">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-glow-green"
            style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
          >
            <svg
              viewBox="0 0 32 32"
              width="36"
              height="36"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="7"
                width="26"
                height="18"
                rx="2"
                stroke="#0A0A0A"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M3 9l13 9 13-9"
                stroke="#0A0A0A"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slime-cyan">
              Check your inbox
            </h2>
            <p className="mt-2 text-sm text-slime-muted leading-relaxed">
              We sent a confirmation link to{" "}
              <span className="text-slime-magenta font-medium">{email}</span>.
              Click it to activate your account and start logging slimes.
            </p>
          </div>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slime-magenta hover:text-slime-accent transition-colors"
          >
            <svg
              viewBox="0 0 16 16"
              width="14"
              height="14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M10 3L5 8l5 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Under-13 block screen
  if (isUnder13 && dob) {
    return (
      <div className="min-h-screen bg-slime-bg flex flex-col items-center justify-center px-5 py-12">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-slime-magenta/8 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-slime-violet/15 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-slime-cyan/8 blur-2xl" />
        </div>

        <div className="relative w-full max-w-sm">
          <div className="mb-8 text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-glow-cyan"
              style={{
                background: "linear-gradient(135deg, #00F0FF, #39FF14)",
              }}
            >
              <svg
                viewBox="0 0 32 32"
                width="30"
                height="30"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M16 3 L17.5 13 L27 16 L17.5 19 L16 29 L14.5 19 L5 16 L14.5 13 Z"
                  fill="#0A0A0A"
                  opacity="0.85"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slime-cyan tracking-tight">
              Thanks for your interest
            </h1>
          </div>

          <div
            className="rounded-3xl backdrop-blur-sm p-6 shadow-2xl space-y-5"
            style={{
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.8)",
              boxShadow:
                "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-4 text-center">
              <p className="text-sm text-red-200/90 leading-relaxed">
                You&apos;ll need to be at least 13 to create a SlimeLog account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold"
              style={{
                background: "rgba(45,10,78,0.5)",
                border: "1px solid rgba(45,10,78,0.9)",
                color: "#00F0FF",
              }}
            >
              Return to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signup form
  return (
    <div className="min-h-screen bg-slime-bg flex flex-col items-center justify-center px-5 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-slime-magenta/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-slime-violet/15 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-slime-cyan/8 blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-glow-cyan"
            style={{ background: "linear-gradient(135deg, #00F0FF, #39FF14)" }}
          >
            <svg
              viewBox="0 0 32 32"
              width="30"
              height="30"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M16 3 L17.5 13 L27 16 L17.5 19 L16 29 L14.5 19 L5 16 L14.5 13 Z"
                fill="#0A0A0A"
                opacity="0.85"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slime-cyan tracking-tight">
            Start your collection
          </h1>
          <p className="mt-1 text-sm text-slime-muted">
            Track, rate, and discover slimes you&apos;ll love
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5 justify-center mb-6 opacity-60">
          {["Butter", "Cloud", "Icee", "Clear", "Slay"].map((label) => (
            <span
              key={label}
              className="rounded-full bg-slime-surface border border-slime-border px-3 py-1 text-xs text-slime-muted"
            >
              {label}
            </span>
          ))}
          <span className="rounded-full bg-slime-surface border border-slime-border px-3 py-1 text-xs text-slime-muted">
            +46 more
          </span>
        </div>

        <div className="rounded-3xl bg-slime-card border border-slime-border backdrop-blur-sm p-6 shadow-2xl space-y-5">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slime-border bg-slime-surface px-4 py-3 text-sm font-medium text-slime-text hover:bg-slime-surface/80 active:scale-[0.98] transition-all duration-150 disabled:opacity-50"
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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slime-border" />
            <span className="text-xs text-slime-muted uppercase tracking-widest">
              or
            </span>
            <div className="flex-1 h-px bg-slime-border" />
          </div>

          <form onSubmit={handleEmailSignup} className="space-y-4">
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
                className="w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder-slime-muted focus:border-slime-cyan/60 focus:outline-none focus:ring-1 focus:ring-slime-cyan/40 transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2"
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
                className="w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder-slime-muted focus:border-slime-cyan/60 focus:outline-none focus:ring-1 focus:ring-slime-cyan/40 transition"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2"
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
                className="w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder-slime-muted focus:border-slime-cyan/60 focus:outline-none focus:ring-1 focus:ring-slime-cyan/40 transition"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2">
                Date of Birth
              </span>
              <div className="flex gap-3">
                <div className="flex-[3] min-w-0">
                  <label
                    htmlFor="dob-month"
                    className="block text-[10px] font-medium text-slime-muted mb-1.5"
                  >
                    Month
                  </label>
                  <select
                    id="dob-month"
                    required
                    value={dobMonth}
                    onChange={(e) => {
                      setDobMonth(e.target.value);
                      setError(null);
                      setParentalConsent(false);
                    }}
                    className={selectClasses}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" disabled>
                      Month
                    </option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-[2] min-w-0">
                  <label
                    htmlFor="dob-day"
                    className="block text-[10px] font-medium text-slime-muted mb-1.5"
                  >
                    Day
                  </label>
                  <select
                    id="dob-day"
                    required
                    value={dobDay}
                    onChange={(e) => {
                      setDobDay(e.target.value);
                      setError(null);
                      setParentalConsent(false);
                    }}
                    className={selectClasses}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" disabled>
                      Day
                    </option>
                    {dayOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-[3] min-w-0">
                  <label
                    htmlFor="dob-year"
                    className="block text-[10px] font-medium text-slime-muted mb-1.5"
                  >
                    Year
                  </label>
                  <select
                    id="dob-year"
                    required
                    value={dobYear}
                    onChange={(e) => {
                      setDobYear(e.target.value);
                      setError(null);
                      setParentalConsent(false);
                    }}
                    className={selectClasses}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" disabled>
                      Year
                    </option>
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {isTeen && (
              <div
                className="rounded-xl px-4 py-4 space-y-3"
                style={{
                  background: "rgba(57,255,20,0.06)",
                  border: "1px solid rgba(57,255,20,0.2)",
                }}
              >
                <p className="text-xs text-slime-muted leading-relaxed">
                  Because you are under 18, we need a parent or guardian to
                  confirm your use of SlimeLog.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentalConsent}
                    onChange={(e) => setParentalConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slime-border bg-slime-surface accent-slime-accent shrink-0"
                  />
                  <span className="text-xs text-slime-text leading-relaxed">
                    I have my parent or guardian&apos;s permission to use
                    SlimeLog.
                  </span>
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || isUnder13 || (isTeen && !parentalConsent)}
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
                  Creating account…
                </span>
              ) : (
                "Create my account"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slime-muted leading-relaxed">
            By signing up you agree to our{" "}
            <Link
              href="/terms"
              className="text-slime-muted underline underline-offset-2 hover:text-slime-text transition-colors"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-slime-muted underline underline-offset-2 hover:text-slime-text transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slime-muted">
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-semibold text-slime-magenta hover:text-slime-accent transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// [Change 5 — #35] Wrap inner component in Suspense per absolute rule 5
// (useSearchParams requires a Suspense boundary).
export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slime-bg" />}>
      <SignupPageInner />
    </Suspense>
  );
}
