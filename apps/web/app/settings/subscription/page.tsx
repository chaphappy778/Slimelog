// apps/web/app/settings/subscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import UpgradeButton from "@/components/UpgradeButton";

// Module-level client — absolute rule
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

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
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_url: window.location.href,
          mode: "user",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Portal error:", err);
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
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slime-muted leading-relaxed">
                Upgrade to Pro for unlimited logging, advanced stats, ad-free
                experience, and a Pro badge.
              </p>
              <div className="flex flex-wrap gap-3">
                <UpgradeButton
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID!}
                  label="Go Pro — $2.99/mo"
                  mode="user"
                  currentPath="/settings/subscription"
                />
                <UpgradeButton
                  priceId={process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID!}
                  label="Go Pro — $14.99/yr"
                  mode="user"
                  currentPath="/settings/subscription"
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
