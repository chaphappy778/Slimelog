// apps/web/app/brand-dashboard/[slug]/drops/page.tsx
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
  // Audit hp-21 (2026-07-07): login route is /login, not /auth/login.
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/brand-dashboard/${slug}/drops`)}`,
    );
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, slug, verification_tier, logo_url")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  // [Change 1] Updated select to include new fields
  const { data: drops } = await supabase
    .from("drops")
    .select(
      "id, name, description, drop_at, status, shop_url, cover_image_url, recurrence_pattern, parent_drop_id, drop_type, discount_code, free_shipping_threshold",
    )
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
      {/* [T137 Batch 2b] Small-caps cyan section label — the app bar carries
          brand identity, so no large page h1 here. */}
      <div className="mb-5">
        <p
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
        >
          Drops
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
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
