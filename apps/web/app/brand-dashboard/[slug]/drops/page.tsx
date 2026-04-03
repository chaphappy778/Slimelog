import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DropsSplitPanel from "@/components/dashboard/DropsSplitPanel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DropsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, slug, verification_tier, logo_url")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  const { data: drops } = await supabase
    .from("drops")
    .select("id, name, description, drop_at, status, shop_url, cover_image_url, recurrence_pattern, parent_drop_id")
    .eq("brand_id", brand.id)
    .order("drop_at", { ascending: false, nullsFirst: false });

  const layoutBrand = {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: brand.logo_url,
    verification_tier: brand.verification_tier ?? "community",
  };

  return (
    <DashboardLayout brand={layoutBrand} active="drops">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Drops
        </h1>
        <p
          className="text-sm mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Schedule and manage your product drops
        </p>
      </div>
      <DropsSplitPanel
        brandId={brand.id}
        userId={user.id}
        initialDrops={drops ?? []}
      />
    </DashboardLayout>
  );
}
