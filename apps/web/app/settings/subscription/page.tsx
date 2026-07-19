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

// Module-level client — absolute rule. Singleton internally.
const supabase = createClient();

const sectionStyle = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

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

export default function SubscriptionPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
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
          "subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end",
        )
        .eq("id", uid)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) {
            setSubscriptionTier(profile.subscription_tier ?? "free");
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
      // /api/stripe/portal) — the user needs to know they should
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
            "subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end",
          )
          .eq("id", userId)
          .maybeSingle();
        if (refreshed) {
          setSubscriptionTier(refreshed.subscription_tier ?? "free");
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

  if (!authChecked || !userId) {
    return (
      <PageWrapper>
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-6 w-40 bg-slime-surface rounded-xl" />
          <div className="h-32 rounded-2xl" style={sectionStyle} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper dots>
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

      <div className="px-4 pb-28">
        <section className="rounded-2xl p-4 space-y-4" style={sectionStyle}>
          {subscriptionTier === "pro" ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                    fontSize: "11px",
                    fontWeight: 800,
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    fontFamily: "Montserrat, sans-serif",
                    letterSpacing: "0.04em",
                  }}
                >
                  PRO
                </span>
                {formattedDate && (
                  <span className="text-xs text-slime-muted font-medium">
                    {cancelAtPeriodEnd ? "Ends" : "Renews"} {formattedDate}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleManage}
                disabled={portalLoading}
                className="w-full"
                style={{
                  background: "rgba(45,10,78,0.5)",
                  border: "1px solid rgba(45,10,78,0.9)",
                  color: portalLoading
                    ? "rgba(245,245,245,0.4)"
                    : "rgba(245,245,245,0.85)",
                  opacity: portalLoading ? 0.5 : 1,
                  cursor: portalLoading ? "not-allowed" : "pointer",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 700,
                  transition: "all 0.15s ease",
                }}
              >
                {portalLoading ? "Loading..." : "Manage Subscription"}
              </button>
              {portalError && (
                <p
                  role="alert"
                  className="text-xs mt-1"
                  style={{
                    color: "#FF5A6A",
                    background: "rgba(255,90,106,0.08)",
                    border: "1px solid rgba(255,90,106,0.25)",
                    padding: "8px 10px",
                    borderRadius: "10px",
                  }}
                >
                  {portalError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* [T171 / anchor-pricing 2026-07-19] Old copy sold
                  features that don't exist yet (unlimited logging is
                  already free; "advanced stats" isn't built). New
                  copy leads with the actual Pro feature set and
                  displays the intro pricing. Renewal rates disclosed
                  under each button so we're not selling a hidden
                  price jump — Apple + Stripe both require this. */}
              <p className="text-xs text-slime-muted leading-relaxed">
                SlimeLog Pro: ad-free browsing, personalized activator
                reminders for your shelf, private logs, and the How to
                Rate a Slime guide as a downloadable PDF. Cancel anytime.
              </p>
              <div className="flex flex-wrap gap-3">
                <UpgradeButton
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!}
                  label="Go Pro — $2.99/mo for 3 months"
                  mode="user"
                  currentPath="/settings/subscription"
                />
                <UpgradeButton
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!}
                  label="Go Pro — $19.99 first year"
                  mode="user"
                  currentPath="/settings/subscription"
                />
              </div>
              <p
                className="text-[11px] leading-relaxed"
                style={{ color: "rgba(245,245,245,0.5)" }}
              >
                Monthly renews at $4.99/mo after the first 3 months.
                Annual renews at $29.99/yr after the first year. Cancel
                anytime from Settings.
              </p>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
