// apps/web/app/brands/page.tsx
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import FloatingPills from "@/components/FloatingPills";
import BrandsClient from "@/components/BrandsClient";

export const metadata = {
  title: "Brands — SlimeLog",
  description: "Discover and explore verified slime brands.",
};

export default async function BrandsPage() {
  const supabase = await createClient();

  const { data: brands, error } = await supabase
    .from("brands")
    .select(
      "id, name, slug, location, verification_tier, restock_schedule, total_logs, avg_shipping, logo_url, owner_name",
    )
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) console.error("Failed to load brands:", error.message);

  const list = brands ?? [];
  const verifiedCount = list.filter(
    (b) => b.verification_tier === "verified",
  ).length;

  return (
    <PageWrapper dots>
      <PageHeader />

      <div className="pt-14">
        {/* Hero */}
        <div className="relative max-w-[390px] mx-auto px-4 pt-6 pb-4 overflow-hidden">
          <FloatingPills area="section" density="low" zIndex={0} />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h1
                className="text-xl font-black tracking-tight"
                style={{
                  background:
                    "linear-gradient(90deg, #39FF14 0%, #00F0FF 40%, #FF00E5 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Brands
              </h1>
              <p className="text-xs text-slime-muted mt-0.5">
                {list.length} shop{list.length !== 1 ? "s" : ""} ·{" "}
                <span className="text-slime-accent font-medium">
                  {verifiedCount} verified
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* All interactive UI lives in BrandsClient */}
        <BrandsClient brands={list} />
      </div>
    </PageWrapper>
  );
}
