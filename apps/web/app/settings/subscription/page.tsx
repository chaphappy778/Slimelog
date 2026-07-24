// apps/web/app/settings/subscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import UpgradeButton from "@/components/UpgradeButton";
// Audit hp-24 (2026-07-09): use the shared browser singleton
// (lib/supabase/client.ts) instead of instantiating a fresh
// createBrowserClient here. Prevents duplicate auth listeners and
// GoTrue memory leaks when the user navigates across settings pages.
import { createClient } from "@/lib/supabase/client";

// Module-level client. Absolute rule. Singleton internally.
const supabase = createClient();

const cardStyle = {
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
} as const;

// Feature copy mirrors the real Pro entitlement set. Do not add features
// that are not actually gated. [T171 anchor-pricing 2026-07-19]
const FREE_FEATURES = [
  "Log unlimited slimes",
  "Rate across all 6 axes",
  "Build your shelf and wishlist",
  "Follow collectors and brands",
  "Drop notifications",
];
const PRO_FEATURES = [
  "Ad-free browsing",
  "Personalized activator reminders for your shelf",
  "Private logs",
  "How to Rate a Slime guide, downloadable PDF",
];

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}

// ─── Small presentational helpers ───────────────────────────────────────────

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, marginTop: 1 }}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function StatusPill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const palette = {
    success: { bg: "rgba(57,255,20,0.12)", border: "rgba(57,255,20,0.45)", fg: "#6DFF4D" },
    warning: { bg: "rgba(255,174,59,0.12)", border: "rgba(255,174,59,0.45)", fg: "#FFBE57" },
    error: { bg: "rgba(255,61,110,0.12)", border: "rgba(255,61,110,0.45)", fg: "#FF6187" },
  }[tone];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.fg }}
    >
      {children}
    </span>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  // T205 (2026-07-24): read subscription_status too (existing column, no
  // migration) so we can surface the past-due state from the mockup. The
  // Stripe portal is still the only place these actually get resolved.
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [portalLoading, setPortalLoading] = useState(false);
  // 2026-07-09: surface portal errors instead of swallowing them.
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const uid = data.user.id;
      setUserId(uid);

      supabase
        .from("profiles")
        .select(
          "subscription_tier, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end",
        )
        .eq("id", uid)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) {
            setSubscriptionTier(profile.subscription_tier ?? "free");
            setSubscriptionStatus(profile.subscription_status ?? null);
            setPeriodEnd(profile.subscription_current_period_end ?? null);
            setCancelAtPeriodEnd(
              profile.subscription_cancel_at_period_end ?? false,
            );
          }
          setAuthChecked(true);
        });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleManage() {
    if (portalLoading) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_url: window.location.href,
          mode: "user",
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      // 2026-07-09: surface the server error to the user instead of
      // silently no-oping. The portal route may 400 when the customer
      // was cleared for a stale record (self-heal path in
      // /api/stripe/portal), so the user needs to know they should
      // re-subscribe.
      const message =
        data.error ||
        "Could not open the subscription portal. Please try again or reload the page.";
      setPortalError(message);

      // If the server signaled the customer was reset, re-fetch profile
      // so the UI switches to the upgrade CTAs on next click.
      if (
        userId &&
        typeof message === "string" &&
        message.toLowerCase().includes("out of sync")
      ) {
        const { data: refreshed } = await supabase
          .from("profiles")
          .select(
            "subscription_tier, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end",
          )
          .eq("id", userId)
          .maybeSingle();
        if (refreshed) {
          setSubscriptionTier(refreshed.subscription_tier ?? "free");
          setSubscriptionStatus(refreshed.subscription_status ?? null);
          setPeriodEnd(refreshed.subscription_current_period_end ?? null);
          setCancelAtPeriodEnd(
            refreshed.subscription_cancel_at_period_end ?? false,
          );
        }
      }
    } catch (err) {
      console.error("Portal error:", err);
      setPortalError("Network error. Please check your connection and retry.");
    } finally {
      setPortalLoading(false);
    }
  }

  const formattedDate = formatPeriodEnd(periodEnd);
  const isPro = subscriptionTier === "pro";
  const isPastDue = isPro && subscriptionStatus === "past_due";
  const isCanceling = isPro && !isPastDue && cancelAtPeriodEnd;
  const isActive = isPro && !isPastDue && !isCanceling;

  if (!authChecked || !userId) {
    return (
      <PageWrapper>
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-6 w-40 bg-slime-surface rounded-xl" />
          <div className="h-32 rounded-2xl" style={cardStyle} />
        </div>
      </PageWrapper>
    );
  }

  // State-dependent hero copy. No fabricated "member since" date or plan
  // name, since neither is stored on the profile.
  const heroSubtitle = !isPro
    ? "You've got the essentials. Pro adds a few nice extras whenever you want them."
    : isPastDue
      ? "There's one payment we couldn't run. Sort it out to keep Pro."
      : isCanceling
        ? "Your plan is set to end, but you can undo that any time."
        : "Thanks for keeping SlimeLog going. Manage your plan any time.";

  // Contextual primary button for the Pro management card. Every variant
  // routes to the same Stripe customer portal (handleManage), which is
  // where cancel / resubscribe / update-card actually happen.
  const manageLabel = isPastDue
    ? "Update payment"
    : isCanceling
      ? "Resubscribe"
      : "Manage in Stripe portal";

  return (
    <PageWrapper dots glow="magenta">
      <header className="px-4 pt-10 pb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="w-8 h-8 rounded-xl bg-slime-surface border border-slime-border flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back to settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            width={16}
            height={16}
            className="text-slime-muted"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-slime-cyan leading-tight">
            Subscription
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Manage your SlimeLog plan
          </p>
        </div>
      </header>

      <div className="px-4 pb-28 max-w-3xl mx-auto">
        {/* Hero: tier pill + gradient headline + state subtitle. */}
        <div className="mb-6">
          <div className="mb-3">
            {isPro ? (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                style={{
                  background: "rgba(255,0,229,0.14)",
                  border: "1px solid rgba(255,0,229,0.45)",
                  color: "#E4A3FF",
                }}
              >
                Pro member
              </span>
            ) : (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                style={{
                  background: "rgba(0,240,255,0.12)",
                  border: "1px solid rgba(0,240,255,0.4)",
                  color: "#7DF6FF",
                }}
              >
                Free plan
              </span>
            )}
          </div>
          <h2
            className="text-3xl font-black tracking-tight"
            style={{
              fontFamily: "Montserrat, sans-serif",
              background: "linear-gradient(120deg, #00F0FF, #FF00E5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {isPro ? "You're on Pro" : "You're on Free"}
          </h2>
          <p
            className="mt-2 max-w-[52ch] text-[15px] leading-relaxed"
            style={{ color: "rgba(245,245,245,0.65)" }}
          >
            {heroSubtitle}
          </p>
        </div>

        {/* Pro management card. */}
        {isPro && (
          <section
            className="rounded-2xl p-5 mb-6"
            style={{
              ...cardStyle,
              boxShadow:
                "inset 0 0 16px rgba(45,10,78,0.1), 0 8px 28px rgba(255,0,229,0.1)",
            }}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div
                className="text-lg font-extrabold"
                style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
              >
                SlimeLog Pro
              </div>
              <StatusPill
                tone={isActive ? "success" : isCanceling ? "warning" : "error"}
              >
                {isActive ? "Active" : isCanceling ? "Canceling" : "Past due"}
              </StatusPill>
            </div>

            <div
              className="flex items-start gap-2.5 py-3 text-[15px] leading-relaxed"
              style={{
                borderTop: "1px solid rgba(45,10,78,0.7)",
                color: "rgba(245,245,245,0.85)",
              }}
            >
              {isActive && (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#3DF2FF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>
                    {formattedDate
                      ? `Renews ${formattedDate}.`
                      : "Your plan renews automatically."}
                  </span>
                </>
              )}
              {isCanceling && (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FFBE57"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <span>
                    {formattedDate
                      ? `Your Pro access runs until ${formattedDate}, then you move to Free. Nothing else to do.`
                      : "Your Pro access ends at the close of the current period, then you move to Free."}
                  </span>
                </>
              )}
              {isPastDue && (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FF6187"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  >
                    <path d="M10.3 3.9L1.8 18a1.5 1.5 0 0 0 1.3 2.2h17.8a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0z" />
                    <path d="M12 9v4M12 17h.01" />
                  </svg>
                  <span>
                    We couldn&apos;t process your last payment. Update your card
                    in the Stripe portal to keep Pro.
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleManage}
              disabled={portalLoading}
              className="w-full mt-1 rounded-full py-3 text-sm font-bold transition active:scale-[0.99]"
              style={{
                background: portalLoading
                  ? "rgba(255,0,229,0.4)"
                  : "linear-gradient(135deg, #FF00E5, #00F0FF)",
                color: "#FFFFFF",
                opacity: portalLoading ? 0.7 : 1,
                cursor: portalLoading ? "not-allowed" : "pointer",
                boxShadow: portalLoading
                  ? "none"
                  : "0 8px 24px rgba(255,0,229,0.28)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {portalLoading ? "Loading..." : manageLabel}
            </button>

            {portalError && (
              <p
                role="alert"
                className="text-xs mt-2.5"
                style={{
                  color: "#FF6187",
                  background: "rgba(255,61,110,0.08)",
                  border: "1px solid rgba(255,61,110,0.25)",
                  padding: "8px 10px",
                  borderRadius: "10px",
                }}
              >
                {portalError}
              </p>
            )}

            <p
              className="mt-3 flex items-center gap-2 text-[12px] leading-relaxed"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Billing, invoices, and cancellation are handled securely in the
              Stripe customer portal.
            </p>
          </section>
        )}

        {/* Plan comparison: Free vs Pro. Row on desktop, stacked on mobile. */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch">
          {/* Free */}
          <div className="flex-1 rounded-2xl p-6" style={cardStyle}>
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xl font-extrabold"
                style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
              >
                Free
              </span>
              {!isPro && (
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1"
                  style={{
                    color: "#7DF6FF",
                    background: "rgba(0,240,255,0.12)",
                    border: "1px solid rgba(0,240,255,0.4)",
                  }}
                >
                  Your plan
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mb-5">
              <span
                className="text-4xl font-black"
                style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
              >
                $0
              </span>
              <span className="text-sm" style={{ color: "rgba(245,245,245,0.4)" }}>
                forever
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {FREE_FEATURES.map((f) => (
                <div
                  key={f}
                  className="flex items-start gap-2.5 text-sm leading-snug"
                  style={{ color: "rgba(245,245,245,0.85)" }}
                >
                  <CheckIcon color="#6DFF4D" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <p
              className="mt-5 text-[13px] leading-relaxed"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              Includes ads. Your logs are public.
            </p>
          </div>

          {/* Pro */}
          <div
            className="flex-1 rounded-2xl p-6"
            style={{
              background: "rgba(255,0,229,0.06)",
              border: "1px solid rgba(255,0,229,0.45)",
              boxShadow: "0 8px 28px rgba(255,0,229,0.12)",
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-xl font-black"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  background: "linear-gradient(135deg, #FF00E5, #00F0FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Pro
              </span>
              {isPro ? (
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1"
                  style={{
                    color: "#E4A3FF",
                    background: "rgba(255,0,229,0.14)",
                    border: "1px solid rgba(255,0,229,0.45)",
                  }}
                >
                  Your plan
                </span>
              ) : (
                <span
                  className="text-[11px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1 text-white"
                  style={{ background: "linear-gradient(135deg, #FF00E5, #00F0FF)" }}
                >
                  Most popular
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span
                className="text-4xl font-black"
                style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
              >
                $4.99
              </span>
              <span className="text-sm" style={{ color: "rgba(245,245,245,0.4)" }}>
                /mo, or $29.99/yr
              </span>
            </div>

            {!isPro && (
              <div
                className="inline-flex items-center gap-1.5 mb-4 rounded-full px-3 py-1.5 text-[12px] font-bold"
                style={{
                  background: "rgba(57,255,20,0.1)",
                  border: "1px solid rgba(57,255,20,0.45)",
                  color: "#A0FF85",
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
                </svg>
                $2.99/mo for your first 6 months
              </div>
            )}

            <div
              className="text-[13px] font-bold mb-3"
              style={{ color: "rgba(245,245,245,0.65)" }}
            >
              Everything in Free, plus:
            </div>
            <div className="flex flex-col gap-3">
              {PRO_FEATURES.map((f) => (
                <div
                  key={f}
                  className="flex items-start gap-2.5 text-sm leading-snug"
                  style={{ color: "rgba(245,245,245,0.85)" }}
                >
                  <CheckIcon color="#D976FF" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            {!isPro && (
              <div className="flex flex-col gap-2.5 mt-6">
                <UpgradeButton
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!}
                  label="Go Pro for $2.99/mo"
                  mode="user"
                  currentPath="/settings/subscription"
                  variant="magenta"
                  fullWidth
                />
                <UpgradeButton
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!}
                  label="Save with annual, $19.99 first year"
                  mode="user"
                  currentPath="/settings/subscription"
                  variant="secondary"
                  fullWidth
                />
                <p
                  className="mt-1 text-[12px] leading-relaxed"
                  style={{ color: "rgba(245,245,245,0.4)" }}
                >
                  Monthly renews at $4.99/mo after 6 months. Annual renews at
                  $29.99/yr after the first year. Cancel anytime.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Trust row. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="flex flex-col gap-2 rounded-2xl p-4" style={cardStyle}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3DF2FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            <div
              className="text-sm font-bold"
              style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
            >
              Cancel anytime
            </div>
            <div className="text-[12px] leading-snug" style={{ color: "rgba(245,245,245,0.4)" }}>
              One tap in the Stripe portal. No hoops.
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl p-4" style={cardStyle}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6DFF4D"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
            </svg>
            <div
              className="text-sm font-bold"
              style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
            >
              Instant activation
            </div>
            <div className="text-[12px] leading-snug" style={{ color: "rgba(245,245,245,0.4)" }}>
              Pro perks unlock the second you pay.
            </div>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl p-4" style={cardStyle}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#D976FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div
              className="text-sm font-bold"
              style={{ fontFamily: "Montserrat, sans-serif", color: "#FFFFFF" }}
            >
              Secure Stripe payment
            </div>
            <div className="text-[12px] leading-snug" style={{ color: "rgba(245,245,245,0.4)" }}>
              We never see your card details.
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
