// apps/web/app/brand-dashboard/[slug]/settings/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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
  if (!user) redirect("/auth/login");

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

  return (
    <DashboardLayout brand={layoutBrand} active="settings">
      <BrandSettingsForm brand={brand} userId={user.id} />
    </DashboardLayout>
  );
}
