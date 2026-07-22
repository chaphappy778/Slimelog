// apps/web/app/brand-dashboard/[slug]/slimes/page.tsx
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
  // Audit hp-21 (2026-07-07): login route is /login, not /auth/login.
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/brand-dashboard/${slug}/slimes`)}`,
    );
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, slug, verification_tier, logo_url")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  // [Change 1] — base_type replaces slime_type in select string
  const { data: slimes } = await supabase
    .from("slimes")
    .select(
      "id, name, base_type, description, colors, scent, retail_price, is_limited, is_discontinued, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, avg_overall, total_ratings, image_url",
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
      {/* [T137 Batch 2a] Small-caps cyan section label — the app bar carries
          brand identity, so no large page h1 here. */}
      <div className="mb-5">
        <p
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
        >
          Slimes
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
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
