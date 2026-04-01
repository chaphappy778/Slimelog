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

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, bio, description, website_url, shop_url, instagram_handle, tiktok_handle, contact_email, location, founded_year, restock_schedule, logo_url, slug, verification_tier",
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
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Settings
        </h1>
        <p
          className="text-sm mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Manage your brand profile and public information
        </p>
      </div>

      <div className="max-w-xl">
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(45,10,78,0.25)",
            border: "1px solid rgba(45,10,78,0.7)",
          }}
        >
          <BrandSettingsForm brand={brand} userId={user.id} />
        </div>
      </div>
    </DashboardLayout>
  );
}
