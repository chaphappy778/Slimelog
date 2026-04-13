// apps/web/app/age-verify/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import FloatingPills from "@/components/FloatingPills";

// [Change 1] Module-level Supabase client — not inside component body
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// [Change 2] Age calculation helper — inline, no date-fns
function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AgeVerifyPage() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [parentalConsent, setParentalConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Derived age — computed live as user types
  const age = dob ? calculateAge(dob) : null;
  const isUnder13 = age !== null && age < 13;
  const isTeen = age !== null && age >= 13 && age < 18;
  const isAdult = age !== null && age >= 18;

  // Max date = today (can't be born in the future)
  const today = new Date().toISOString().split("T")[0];
  // Min date = 120 years ago (sanity bound)
  const minDate = `${new Date().getFullYear() - 120}-01-01`;

  async function handleSignOutAndReturn() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (isUnder13) {
      setError("SlimeLog requires users to be at least 13 years old.");
      return;
    }
    if (isTeen && !parentalConsent) {
      setError(
        "You must have your parent or guardian's permission to continue.",
      );
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/age-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date_of_birth: dob, age_verified: true }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/");
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
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
          >
            {/* [Change 3] SVG slime blob icon — no emoji */}
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
            Quick check
          </h1>
          <p className="mt-1 text-sm text-slime-muted">
            Enter your date of birth to get started
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl backdrop-blur-sm p-6 shadow-2xl"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.8)",
            boxShadow:
              "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Under-13 block screen */}
          {isUnder13 ? (
            <div className="space-y-5 text-center">
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-4">
                <p className="text-sm text-red-300 font-semibold mb-1">
                  Age requirement not met
                </p>
                <p className="text-xs text-red-200/80 leading-relaxed">
                  SlimeLog requires users to be at least 13 years old. We are
                  not able to create an account at this time.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOutAndReturn}
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Date of birth input */}
              <div>
                <label
                  htmlFor="dob"
                  className="block text-xs font-semibold text-slime-muted uppercase tracking-widest mb-2"
                >
                  Date of Birth
                </label>
                <input
                  id="dob"
                  type="date"
                  required
                  min={minDate}
                  max={today}
                  value={dob}
                  onChange={(e) => {
                    setDob(e.target.value);
                    setError(null);
                    setParentalConsent(false);
                  }}
                  className="w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text focus:border-slime-accent/60 focus:outline-none focus:ring-1 focus:ring-slime-accent/40 transition"
                  style={{ colorScheme: "dark" }}
                />
              </div>

              {/* Parental consent — only shown for teens 13–17 */}
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

              {/* Info notice for adults */}
              {isAdult && (
                <p className="text-xs text-slime-muted text-center">
                  You&apos;re all set — tap below to continue.
                </p>
              )}

              <button
                type="submit"
                disabled={
                  isPending || !dob || isUnder13 || (isTeen && !parentalConsent)
                }
                className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-slime-bg shadow-glow-green hover:shadow-glow-green-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    Saving…
                  </span>
                ) : (
                  "Continue to SlimeLog"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slime-muted leading-relaxed">
          Your date of birth is used for age verification only and is stored
          securely. See our{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2 hover:text-slime-text transition-colors"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
