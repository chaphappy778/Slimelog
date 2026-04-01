import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import SlimesSplitPanel from "@/components/dashboard/SlimesSplitPanel";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SlimesPage({ params }: PageProps) {
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

  const { data: slimes } = await supabase
    .from("slimes")
    .select(
      "id, name, slime_type, description, colors, scent, retail_price, is_limited, is_discontinued, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, avg_overall, total_ratings, image_url",
    )
    .eq("brand_id", brand.id)
    .eq("is_brand_official", true)
    .order("created_at", { ascending: false });

  const layoutBrand = {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: brand.logo_url,
    verification_tier: brand.verification_tier ?? "community",
  };

  return (
    <DashboardLayout brand={layoutBrand} active="slimes">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Slimes
        </h1>
        <p
          className="text-sm mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Manage your official product catalog
        </p>
      </div>
      <SlimesSplitPanel
        brandId={brand.id}
        userId={user.id}
        initialSlimes={slimes ?? []}
      />
    </DashboardLayout>
  );
}
