// apps/web/app/age-verify/page.tsx
"use client";

import { useMemo, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FloatingPills from "@/components/FloatingPills";
import { safeRedirect } from "@/lib/safe-redirect";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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

function AgeVerifyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirect(searchParams.get("next"), "/");

  const [dobMonth, setDobMonth] = useState<string>("");
  const [dobDay, setDobDay] = useState<string>("");
  const [dobYear, setDobYear] = useState<string>("");

  const [parentalConsent, setParentalConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const isAdult = age !== null && age >= 18;

  async function handleSignOutAndReturn() {
    if (dob) {
      try {
        await fetch("/api/age-verify/reject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date_of_birth: dob }),
        });
      } catch (err) {
        console.error("[age-verify] reject call failed:", err);
      }
    }
    await supabase.auth.signOut();
    router.push("/");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!dob) {
      setError("Please enter your full date of birth.");
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

      // [T96] Always route through /welcome — it self-dismisses if username is already set.
      router.push(`/welcome?next=${encodeURIComponent(next)}`);
    });
  }

  const selectClasses =
    "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text focus:border-slime-accent/60 focus:outline-none focus:ring-1 focus:ring-slime-accent/40 transition appearance-none";

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
            {isUnder13 ? "Thanks for your interest" : "Quick check"}
          </h1>
          {!isUnder13 && (
            <p className="mt-1 text-sm text-slime-muted">
              Enter your date of birth to get started
            </p>
          )}
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
          {isUnder13 ? (
            <div className="space-y-5 text-center">
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-4">
                <p className="text-sm text-red-200/90 leading-relaxed">
                  You&apos;ll need to be at least 13 to create a SlimeLog
                  account.
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

        {!isUnder13 && (
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
        )}
      </div>
    </div>
  );
}

export default function AgeVerifyPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen"
          style={{
            background:
              "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
          }}
        />
      }
    >
      <AgeVerifyPageInner />
    </Suspense>
  );
}
