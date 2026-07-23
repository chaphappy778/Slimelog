// apps/web/app/brand-dashboard/[slug]/settings/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BrandImageryEditor from "@/components/dashboard/BrandImageryEditor";
import BrandSettingsForm from "@/components/dashboard/BrandSettingsForm";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

// T137 Batch 6a (2026-07-23): the two editors are tabs now, not stacked
// sections. The active tab lives in the URL (`?tab=imagery`) rather than in
// client state so the view is linkable and each tab remounts with a fresh
// server render of the row. That remount is also a second line of defense
// behind the clobber rule in docs/error-tracker.md: the two forms are never
// mounted at the same time, and neither one can hold a stale copy of the
// other's columns.
type SettingsTab = "profile" | "imagery";

const TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "Brand profile" },
  { id: "imagery", label: "Brand imagery" },
];

export default async function SettingsPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { tab: tabParam } = await searchParams;
  const activeTab: SettingsTab = tabParam === "imagery" ? "imagery" : "profile";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Audit hp-21 (2026-07-07): login route is /login, not /auth/login.
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/brand-dashboard/${slug}/settings`)}`,
    );
  }

  // [Change 1] Added youtube_handle, pinterest_handle, twitter_handle to select
  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, bio, description, website_url, shop_url, instagram_handle, tiktok_handle, youtube_handle, pinterest_handle, twitter_handle, contact_email, location, founded_year, restock_schedule, logo_url, banner_url, slug, verification_tier",
    )
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  const layoutBrand = {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: brand.logo_url,
    verification_tier: brand.verification_tier ?? "community",
  };

  // T137 Batch 5 (2026-07-23): imagery got its own component and its own save
  // path. The page owns the header now so both sections read as one screen.
  const imageryBrand = {
    id: brand.id,
    name: brand.name,
    logo_url: brand.logo_url,
    banner_url: brand.banner_url,
    slug: brand.slug,
    verification_tier: brand.verification_tier,
  };

  // BrandSettingsForm renders a scaled-down public hero in its live preview,
  // so it needs the current imagery to look right. It gets them read only,
  // under different key names, so they can never reach its update payload.
  // BrandImageryEditor stays the only writer of those two columns.
  const settingsBrand = {
    id: brand.id,
    name: brand.name,
    bio: brand.bio,
    description: brand.description,
    website_url: brand.website_url,
    shop_url: brand.shop_url,
    instagram_handle: brand.instagram_handle,
    tiktok_handle: brand.tiktok_handle,
    youtube_handle: brand.youtube_handle,
    pinterest_handle: brand.pinterest_handle,
    twitter_handle: brand.twitter_handle,
    contact_email: brand.contact_email,
    location: brand.location,
    founded_year: brand.founded_year,
    restock_schedule: brand.restock_schedule,
    slug: brand.slug,
    verification_tier: brand.verification_tier,
  };

  const settingsPreview = {
    bannerSrc: brand.banner_url,
    logoSrc: brand.logo_url,
  };

  return (
    <DashboardLayout brand={layoutBrand} active="settings">
      <div className="pb-20 w-full overflow-hidden">
        {/* Page header */}
        <div className="flex items-center gap-3 pt-1 pb-5">
          <Link
            href={`/brand-dashboard/${brand.slug}`}
            className="flex items-center justify-center rounded-lg"
            style={{ color: "rgba(245,245,245,0.5)" }}
            aria-label="Back to dashboard"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 15l-5-5 5-5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
            >
              Brand Profile
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              Manage your brand&apos;s public presence
            </p>
          </div>
        </div>

        {/* Sub-nav. Later batches add Featured variants and Team here. */}
        <nav
          className="flex gap-2 overflow-x-auto pb-4 mb-5"
          style={{ borderBottom: "1px solid rgba(45,10,78,0.7)" }}
          aria-label="Brand profile sections"
        >
          {TABS.map((t) => {
            const isActive = t.id === activeTab;
            return (
              <Link
                key={t.id}
                href={`/brand-dashboard/${brand.slug}/settings?tab=${t.id}`}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className="flex-shrink-0 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  background: isActive
                    ? "rgba(0,240,255,0.12)"
                    : "rgba(45,10,78,0.35)",
                  border: isActive
                    ? "1px solid rgba(0,240,255,0.45)"
                    : "1px solid rgba(45,10,78,0.7)",
                  color: isActive ? "#00F0FF" : "rgba(245,245,245,0.5)",
                }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        {activeTab === "imagery" ? (
          <BrandImageryEditor brand={imageryBrand} userId={user.id} />
        ) : (
          <BrandSettingsForm
            brand={settingsBrand}
            userId={user.id}
            preview={settingsPreview}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
