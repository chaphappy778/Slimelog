// apps/web/app/brand-dashboard/[slug]/subscription/page.tsx
//
// 2026-07-09: added to resolve 404 from BrandSettingsForm.tsx:1008 which
// linked here without a page ever existing. Mirrors the user
// subscription page (/settings/subscription) but scoped to a specific
// brand: reads from public.brands, upgrades via mode: "brand", opens
// Stripe portal in brand mode, and displays brand_pro instead of pro.

"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
import UpgradeButton from "@/components/UpgradeButton";

// Module-level Supabase client — matches the pattern used elsewhere.
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

export default function BrandSubscriptionPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [authChecked, setAuthChecked] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      supabase
        .from("brands")
        .select(
          "id, name, owner_id, subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end",
        )
        .eq("slug", slug)
        .maybeSingle()
        .then(({ data: brand }) => {
          if (!brand || brand.owner_id !== data.user!.id) {
            router.replace("/brand-dashboard");
            return;
          }
          setBrandId(brand.id);
          setBrandName(brand.name ?? "");
          setSubscriptionTier(brand.subscription_tier ?? "free");
          setPeriodEnd(brand.subscription_current_period_end ?? null);
          setCancelAtPeriodEnd(
            brand.subscription_cancel_at_period_end ?? false,
          );
          setAuthChecked(true);
        });
    });
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleManage() {
    if (portalLoading || !brandId) return;
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          return_url: window.location.href,
          mode: "brand",
          brand_id: brandId,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      const message =
        data.error ||
        "Could not open the subscription portal. Please try again or reload the page.";
      setPortalError(message);

      // If the server self-healed the brand's stale customer_id, re-fetch
      // brand row so UI switches to Upgrade CTAs.
      if (
        brandId &&
        typeof message === "string" &&
        message.toLowerCase().includes("out of sync")
      ) {
        const { data: refreshed } = await supabase
          .from("brands")
          .select(
            "subscription_tier, subscription_current_period_end, subscription_cancel_at_period_end",
          )
          .eq("id", brandId)
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
      console.error("Brand portal error:", err);
      setPortalError("Network error. Please check your connection and retry.");
    } finally {
      setPortalLoading(false);
    }
  }

  const formattedDate = formatPeriodEnd(periodEnd);
  const isPro = subscriptionTier === "brand_pro";

  if (!authChecked || !brandId) {
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
          href={`/brand-dashboard/${slug}/settings`}
          className="w-8 h-8 rounded-xl bg-slime-surface border border-slime-border flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back to brand settings"
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
            Brand Subscription
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Manage the {brandName || "brand"} plan
          </p>
        </div>
      </header>

      <div className="px-4 pb-28">
        <section className="rounded-2xl p-4 space-y-4" style={sectionStyle}>
          {isPro ? (
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
                  BRAND PRO
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
              <p className="text-xs text-slime-muted leading-relaxed">
                Upgrade this brand to Brand Pro for full analytics, drop tools,
                a verified badge, and priority in discovery.
              </p>
              <div className="flex flex-wrap gap-3">
                <UpgradeButton
                  priceId={
                    process.env.NEXT_PUBLIC_STRIPE_BRAND_PRO_PRICE_ID!
                  }
                  label="Upgrade to Brand Pro"
                  mode="brand"
                  brandId={brandId}
                  currentPath={`/brand-dashboard/${slug}/subscription`}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
