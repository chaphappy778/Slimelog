// apps/web/components/onboarding/OnboardingModal.tsx
//
// First-login walkthrough per Claude Design spec (tracker #31, PDF
// received 2026-07-10). Full-screen modal over the feed, 4 screens,
// swipeable, step dots, Skip at any time.
//
// Gating: rendered by <OnboardingGate>, which checks
// profiles.onboarding_completed_at and hides the modal for users who
// already dismissed or completed it. Both Skip and Complete post to
// /api/account/onboarding-complete to stamp the timestamp.
//
// Progress persistence: current step is written to localStorage under
// SLIMELOG_ONBOARDING_STEP_KEY so a partial completion survives a
// refresh and resumes in place. Key is cleared on completion / skip.
//
// No AI-generated art: all visuals are geometric (blob mark, radar,
// number chips) or line icons.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const SLIMELOG_ONBOARDING_STEP_KEY = "slimelog:onboarding_step";
const TOTAL_SCREENS = 4;

type ReferralInfo = {
  referralCode: string | null;
};

// ─── Root ──────────────────────────────────────────────────────────────────

export default function OnboardingModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [step, setStep] = useState<number>(0);
  const [dismissing, setDismissing] = useState(false);
  const [referral, setReferral] = useState<ReferralInfo>({
    referralCode: null,
  });

  // Restore progress on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SLIMELOG_ONBOARDING_STEP_KEY);
      if (saved) {
        const n = parseInt(saved, 10);
        if (Number.isFinite(n) && n >= 0 && n < TOTAL_SCREENS) setStep(n);
      }
    } catch {
      // localStorage unavailable — first-launch defaults are fine.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SLIMELOG_ONBOARDING_STEP_KEY,
        String(step),
      );
    } catch {
      // ignore
    }
  }, [step]);

  // Fetch referral code for screen 4
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.referral_code) {
        setReferral({ referralCode: profile.referral_code });
      }
    });
  }, []);

  const finish = useCallback(async () => {
    setDismissing(true);
    try {
      window.localStorage.removeItem(SLIMELOG_ONBOARDING_STEP_KEY);
    } catch {
      // ignore
    }
    // Best-effort completion stamp; failure doesn't block the user.
    try {
      await fetch("/api/account/onboarding-complete", { method: "POST" });
    } catch {
      // ignore — user can still use the app; worst case they see the
      // walkthrough again on next login (uncommon).
    }
    onComplete();
  }, [onComplete]);

  // Swipe handling — track initial X on touchstart, threshold 40px
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    if (start === null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const dx = end - start;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && step < TOTAL_SCREENS - 1) setStep(step + 1);
    if (dx > 0 && step > 0) setStep(step - 1);
    touchStartX.current = null;
  };

  const goNext = useCallback(() => {
    if (step < TOTAL_SCREENS - 1) setStep(step + 1);
    else finish();
  }, [step, finish]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to SlimeLog"
    >
      {/* Ambient blur orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: "#39FF14" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{ background: "#00F0FF" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/2 w-72 h-72 rounded-full opacity-10 blur-3xl"
        style={{ background: "#FF00E5" }}
      />

      {/* Skip (top-right) */}
      <button
        type="button"
        onClick={finish}
        disabled={dismissing}
        className="absolute top-5 right-5 z-10 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity active:opacity-70 disabled:opacity-50"
        style={{
          color: "rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        Skip
      </button>

      {/* Step dots (top-center) */}
      <div className="absolute top-5 left-0 right-0 flex justify-center gap-2 z-10 pointer-events-none">
        {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
          <span
            key={i}
            className="block rounded-full transition-all"
            style={{
              width: i === step ? "16px" : "6px",
              height: "6px",
              background:
                i === step
                  ? "linear-gradient(90deg, #39FF14, #00F0FF)"
                  : "rgba(255,255,255,0.2)",
              boxShadow:
                i === step ? "0 0 12px rgba(57,255,20,0.5)" : "none",
            }}
          />
        ))}
      </div>

      {/* Screen content */}
      <div className="relative z-[1] h-full flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-sm">
          {step === 0 && <ScreenWelcome onNext={goNext} onSkip={finish} />}
          {step === 1 && <ScreenLogFirst onNext={goNext} />}
          {step === 2 && <ScreenRateAxes onNext={goNext} />}
          {step === 3 && (
            <ScreenInvite
              referralCode={referral.referralCode}
              onFinish={finish}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 1: Welcome ────────────────────────────────────────────────────

function ScreenWelcome({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="text-center space-y-8">
      {/* Slime blob mark */}
      <div className="flex justify-center">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-glow-green"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          }}
          aria-hidden="true"
        >
          <svg width="52" height="52" viewBox="0 0 36 36" fill="none">
            <ellipse cx="18" cy="14" rx="10" ry="10" fill="#0A0A0A" />
            <ellipse cx="12" cy="22" rx="7" ry="7" fill="#0A0A0A" />
            <ellipse cx="24" cy="22" rx="7" ry="7" fill="#0A0A0A" />
            <ellipse cx="18" cy="26" rx="6" ry="6" fill="#0A0A0A" />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        <h1
          className="text-4xl font-black leading-tight"
          style={{
            color: "#00F0FF",
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome to
          <br />
          SlimeLog.
        </h1>
        <p
          className="text-base leading-relaxed max-w-xs mx-auto"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          Rate every slime, log your collection, and discover what to buy
          next, with the slime community that gets it.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-2xl px-4 py-3.5 text-sm font-black"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            color: "#0A0A0A",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Let&apos;s go
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="w-full py-2 text-sm font-medium transition-opacity active:opacity-70"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: Log your first slime ───────────────────────────────────────

function ScreenLogFirst({ onNext }: { onNext: () => void }) {
  const steps: [string, string][] = [
    ["Photograph it", "Your own shot of the tub"],
    ["Pick the brand", "Search makers or add a new one"],
    ["Rate what matters", "Poke, stretch, scent, and more"],
    ["Log it", "It lands on your shelf and feed"],
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-black leading-tight"
          style={{
            color: "#00F0FF",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Log your first slime
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          The core loop takes about 20 seconds. Snap it, tag the maker, rate
          it, done.
        </p>
      </div>

      {/* Numbered steps */}
      <div className="space-y-3">
        {steps.map(([title, sub], i) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-bold"
                style={{ color: "rgba(255,255,255,0.9)" }}
              >
                {title}
              </p>
              <p
                className="text-xs leading-snug"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                {sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p
        className="text-xs text-center leading-relaxed max-w-xs mx-auto"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Every slime you log builds your collection and helps other slimers
        decide what to try.
      </p>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-2xl px-4 py-3.5 text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Next
      </button>
    </div>
  );
}

// ─── Screen 3: Rate what matters ──────────────────────────────────────────

function ScreenRateAxes({ onNext }: { onNext: () => void }) {
  // 5 axes arranged around a pentagon (approximate positions via absolute
  // positioning inside a fixed-size square container).
  const axes = ["Poke feel", "Glossy", "Stretch", "Holo", "Scent"];
  const baseTypes = ["Butter", "Cloud", "Floam", "Clear", "Jelly"];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-black leading-tight"
          style={{
            color: "#00F0FF",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Rate what matters
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Slime isn&apos;t one number. Score the things slimers actually
          argue about, and we average them into your rating.
        </p>
      </div>

      {/* Radar-ish axis chip cluster */}
      <div
        className="relative w-64 h-64 mx-auto"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,240,255,0.08), transparent 65%)",
        }}
      >
        {/* Center blob */}
        <div
          className="absolute left-1/2 top-1/2 w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            boxShadow: "0 0 40px rgba(57,255,20,0.4)",
          }}
        />

        {axes.map((axis, i) => {
          // Distribute 5 chips evenly around the ring
          const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 100;
          const x = 50 + (radius * Math.cos(angle)) / 2;
          const y = 50 + (radius * Math.sin(angle)) / 2;
          return (
            <span
              key={axis}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                background: "rgba(45,10,78,0.8)",
                border: "1px solid rgba(0,240,255,0.35)",
                color: "#00F0FF",
              }}
            >
              {axis}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 justify-center">
        {baseTypes.map((t) => (
          <span
            key={t}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {t}
          </span>
        ))}
      </div>

      <p
        className="text-xs text-center leading-relaxed max-w-xs mx-auto"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        Pick your base type, then dial each axis 1–5. Your profile builds a
        taste map over time.
      </p>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-2xl px-4 py-3.5 text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Next
      </button>
    </div>
  );
}

// ─── Screen 4: Invite friends, earn Pro ───────────────────────────────────

function ScreenInvite({
  referralCode,
  onFinish,
}: {
  referralCode: string | null;
  onFinish: () => void;
}) {
  const milestones = useMemo(
    () => [
      { threshold: 5, reward: "1 month Pro free" },
      { threshold: 25, reward: "6 months Pro free" },
      { threshold: 100, reward: "12 months Pro free" },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-2xl font-black leading-tight"
          style={{
            color: "#00F0FF",
            fontFamily: "Montserrat, sans-serif",
          }}
        >
          Invite friends, earn Pro
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Share your code. Every friend who joins and logs their first slime
          counts as one activation.
        </p>
      </div>

      {/* Invite code */}
      <div
        className="rounded-2xl p-5 text-center"
        style={{
          background: "rgba(45,10,78,0.4)",
          border: "1px solid rgba(45,10,78,0.9)",
        }}
      >
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-2"
          style={{ color: "#00F0FF" }}
        >
          Your invite code
        </p>
        <p
          className="text-3xl font-black tracking-widest"
          style={{
            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            fontFamily: "Montserrat, sans-serif",
            letterSpacing: "0.2em",
          }}
        >
          {referralCode ?? "······"}
        </p>
      </div>

      {/* Milestone ladder */}
      <div className="space-y-2">
        {milestones.map((m) => (
          <div
            key={m.threshold}
            className="flex items-center justify-between rounded-2xl px-4 py-3"
            style={{
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="text-2xl font-black"
                style={{
                  color: "#39FF14",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {m.threshold}
              </span>
              <span
                className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                activations
              </span>
            </div>
            <span
              className="text-xs font-bold"
              style={{ color: "#00F0FF" }}
            >
              {m.reward}
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onFinish}
        className="w-full rounded-2xl px-4 py-3.5 text-sm font-black"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        Start logging
      </button>
    </div>
  );
}
