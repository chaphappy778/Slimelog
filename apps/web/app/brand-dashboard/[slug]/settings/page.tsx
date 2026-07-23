// apps/web/app/brand-dashboard/[slug]/settings/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BrandImageryEditor from "@/components/dashboard/BrandImageryEditor";
import BrandSettingsForm from "@/components/dashboard/BrandSettingsForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: PageProps) {
  const { slug } = await params;
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

        <BrandImageryEditor brand={imageryBrand} userId={user.id} />

        <div
          className="my-7"
          style={{ height: 1, background: "rgba(45,10,78,0.7)" }}
          aria-hidden="true"
        />

        <BrandSettingsForm brand={brand} userId={user.id} />
      </div>
    </DashboardLayout>
  );
}
