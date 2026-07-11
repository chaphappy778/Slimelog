// apps/web/app/invite/page.tsx
// The user-facing referral dashboard.
//
// Shows the user's 6-character referral code, a copy-link button, a
// native Web Share API trigger (falls back to copy on desktop), and
// progress toward the next milestone reward.
//
// Milestones mirror the DB trigger in mig 63:
//   5 activated  -> +1 month Pro credit
//   25 activated -> +6 months
//   100 activated -> +12 months
//
// Activation = referred user's first slime log. Number here is a
// read-through of profiles.referral_activations, which the trigger
// keeps up to date.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
// T104 (2026-07-10): user + referral_code come from AuthProvider so we
// avoid a duplicate getUser + profile hit. We still fetch
// referral_activations + pro_credit_months separately because they can
// change while the user is on this page (the activation trigger fires
// when someone we referred logs their first slime), and we want the
// dashboard to reflect the current DB state — not whatever was cached
// at page-load time.
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const supabase = createClient();

type ReferralState = {
  username: string;
  referralCode: string;
  activations: number;
  proCreditMonths: number;
};

// Milestone thresholds — matched to the SQL trigger in mig 63. If we ever
// change the tiers, update both places at once (there is no single source
// of truth for milestone shape; the trigger owns the reward math, the UI
// owns the progress presentation).
const MILESTONES: {
  threshold: number;
  reward: string;
  months: number;
}[] = [
  { threshold: 5, reward: "1 month Pro", months: 1 },
  { threshold: 25, reward: "6 months Pro", months: 6 },
  { threshold: 100, reward: "12 months Pro", months: 12 },
];

function nextMilestone(activations: number) {
  return MILESTONES.find((m) => m.threshold > activations) ?? null;
}

function totalEarnedMonths(activations: number): number {
  return MILESTONES.filter((m) => activations >= m.threshold).reduce(
    (sum, m) => sum + m.months,
    0,
  );
}

export default function InvitePage() {
  const router = useRouter();
  const { user, profile: authProfile, loading: authLoading } = useAuth();
  const [state, setState] = useState<ReferralState | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/invite");
      return;
    }
    // Just fetch the two counters that aren't in AuthProvider.
    supabase
      .from("profiles")
      .select("referral_activations, pro_credit_months")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data: counters }) => {
        setState({
          username: authProfile?.username ?? "",
          referralCode: authProfile?.referral_code ?? "",
          activations: counters?.referral_activations ?? 0,
          proCreditMonths: counters?.pro_credit_months ?? 0,
        });
        setLoading(false);
      });
  }, [authLoading, user, authProfile, router]);

  const shareUrl =
    state && typeof window !== "undefined"
      ? `${window.location.origin}/signup?ref=${state.referralCode}`
      : "";

  const shareText = state
    ? `Join me on SlimeLog and rate the slimes you actually own. Use my invite: ${shareUrl}`
    : "";

  const handleShare = useCallback(async () => {
    if (!state) return;
    // Prefer native share on mobile; fall back to copy on desktop
    // (where navigator.share is missing or restricted to secure contexts).
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "Join me on SlimeLog",
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state, shareText, shareUrl]);

  const handleCopyCode = useCallback(async () => {
    if (!state) return;
    await navigator.clipboard.writeText(state.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [state]);

  if (loading) {
    return (
      <PageWrapper dots>
        <PageHeader />
        <div className="pt-16 px-4 space-y-4 animate-pulse">
          <div className="h-40 rounded-3xl bg-slime-surface" />
          <div className="h-24 rounded-2xl bg-slime-surface" />
          <div className="h-56 rounded-2xl bg-slime-surface" />
        </div>
      </PageWrapper>
    );
  }

  if (!state) {
    return (
      <PageWrapper dots>
        <PageHeader />
        <div className="pt-16 px-4 text-center text-slime-muted">
          <p>Couldn&apos;t load your invite info. Try refreshing.</p>
        </div>
      </PageWrapper>
    );
  }

  const next = nextMilestone(state.activations);
  const earnedMonths = totalEarnedMonths(state.activations);
  // Progress bar: fill from previous milestone to next
  const prevThreshold = next
    ? MILESTONES[MILESTONES.indexOf(next) - 1]?.threshold ?? 0
    : MILESTONES[MILESTONES.length - 1].threshold;
  const progressPct = next
    ? Math.round(
        ((state.activations - prevThreshold) / (next.threshold - prevThreshold)) *
          100,
      )
    : 100;

  return (
    <PageWrapper dots>
      <PageHeader />

      <div className="pt-16 px-4 pb-28 space-y-4">
        {/* Hero: code + share */}
        <div
          className="rounded-3xl p-6 text-center space-y-4"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.8)",
            boxShadow:
              "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          <div>
            <p
              className="text-[11px] font-black tracking-widest uppercase mb-2"
              style={{ color: "#00F0FF" }}
            >
              Your invite code
            </p>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-block px-6 py-3 rounded-2xl font-black tracking-widest text-2xl"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
                letterSpacing: "0.15em",
              }}
              aria-label="Copy referral code"
            >
              {state.referralCode}
            </button>
            <p className="mt-2 text-xs text-slime-muted">
              {copied ? "Copied!" : "Tap the code to copy"}
            </p>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="w-full py-3.5 rounded-2xl text-sm font-black transition-opacity active:opacity-80"
            style={{
              background: "rgba(45,10,78,0.6)",
              border: "1px solid rgba(0,240,255,0.5)",
              color: "#00F0FF",
            }}
          >
            Share invite link
          </button>
          <p className="text-[11px] text-slime-muted">
            Friends who sign up with your code and log their first slime count
            as activations.
          </p>
        </div>

        {/* Milestone progress */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: "rgba(45,10,78,0.25)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <div className="flex items-baseline justify-between">
            <p
              className="text-[11px] font-black tracking-widest uppercase"
              style={{ color: "#00F0FF" }}
            >
              Activations
            </p>
            <p
              className="text-3xl font-black"
              style={{
                color: "#39FF14",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {state.activations}
            </p>
          </div>

          {next ? (
            <div>
              <div className="flex justify-between text-xs text-slime-muted mb-1.5">
                <span>{state.activations} / {next.threshold}</span>
                <span>Next: {next.reward}</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: "rgba(10,0,20,0.6)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, progressPct))}%`,
                    background: "linear-gradient(90deg, #39FF14, #00F0FF)",
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slime-muted">
              All milestones unlocked — 19 months of Pro banked. You&apos;re a
              machine.
            </p>
          )}
        </div>

        {/* Pro credit bank */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: "rgba(45,10,78,0.25)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <div className="flex items-baseline justify-between">
            <div>
              <p
                className="text-[11px] font-black tracking-widest uppercase"
                style={{ color: "#00F0FF" }}
              >
                Banked Pro credit
              </p>
              <p className="text-xs text-slime-muted mt-0.5">
                Redeems automatically when your paid Pro isn&apos;t active.
              </p>
            </div>
            <p
              className="text-2xl font-black"
              style={{
                color: "#FF00E5",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {state.proCreditMonths} mo
            </p>
          </div>
          {earnedMonths > state.proCreditMonths && (
            <p className="text-[11px] text-slime-muted mt-3">
              You&apos;ve earned {earnedMonths} months total — {earnedMonths -
                state.proCreditMonths}{" "}
              consumed.
            </p>
          )}
        </div>

        {/* Tier ladder for context */}
        <div
          className="rounded-2xl p-5 space-y-3"
          style={{
            background: "rgba(45,10,78,0.15)",
            border: "1px solid rgba(45,10,78,0.5)",
          }}
        >
          <p
            className="text-[11px] font-black tracking-widest uppercase"
            style={{ color: "#00F0FF" }}
          >
            Milestone ladder
          </p>
          {MILESTONES.map((m) => {
            const hit = state.activations >= m.threshold;
            return (
              <div
                key={m.threshold}
                className="flex items-center justify-between text-sm"
              >
                <span
                  className="font-semibold"
                  style={{
                    color: hit ? "#39FF14" : "rgba(255,255,255,0.6)",
                  }}
                >
                  {m.threshold} activations
                </span>
                <span
                  className="text-xs"
                  style={{ color: hit ? "#39FF14" : "rgba(255,255,255,0.4)" }}
                >
                  {hit ? "unlocked" : "→"} {m.reward}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </PageWrapper>
  );
}
