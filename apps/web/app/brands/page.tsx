// apps/web/app/brands/page.tsx
import { createClient } from "@/lib/supabase/server";
import { BrandCard } from "@/components/BrandCard";
import PageHeader from "@/components/PageHeader";

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

  if (error) {
    console.error("Failed to load brands:", error.message);
  }

  const list = brands ?? [];
  const verifiedCount = list.filter(
    (b) => b.verification_tier === "verified",
  ).length;

  return (
    <div className="min-h-screen bg-slime-bg pb-28">
      <PageHeader />

      <div className="pt-14">
        {/* Page sub-header */}
        <div className="max-w-[390px] mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-holo">
              Brands
            </h1>
            <p className="text-xs text-slime-muted mt-0.5">
              {list.length} shop{list.length !== 1 ? "s" : ""} ·{" "}
              <span className="text-slime-accent font-medium">
                {verifiedCount} verified
              </span>
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-semibold text-slime-accent bg-slime-surface border border-slime-border px-3 py-1.5 rounded-full hover:border-slime-accent/50 transition-colors">
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-slime-accent">
              <path d="M1 3h14v1.5L9.5 9v5l-3-1.5V9L1 4.5V3z" />
            </svg>
            Filter
          </button>
        </div>

        {/* Search bar */}
        <div className="max-w-[390px] mx-auto px-4 pt-2 pb-2">
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fill-slime-muted pointer-events-none"
            >
              <path d="M12.9 11.5a7 7 0 1 0-1.4 1.4l4.3 4.3 1.4-1.4-4.3-4.3zM8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10z" />
            </svg>
            <input
              type="search"
              placeholder="Search brands…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slime-surface border border-slime-border rounded-xl placeholder:text-slime-muted text-slime-text focus:outline-none focus:ring-2 focus:ring-slime-accent/50 focus:border-slime-accent/50 transition"
            />
          </div>
        </div>

        {/* Brand list */}
        <div className="max-w-[390px] mx-auto px-4 pt-2 space-y-3">
          {list.length === 0 ? (
            <EmptyState />
          ) : (
            list.map((brand) => (
              <BrandCard
                key={brand.id}
                name={brand.name}
                slug={brand.slug}
                location={brand.location}
                verificationTier={brand.verification_tier}
                restockSchedule={brand.restock_schedule}
                totalLogs={brand.total_logs ?? 0}
                avgShipping={brand.avg_shipping}
                logoUrl={brand.logo_url}
                ownerName={brand.owner_name}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="text-5xl mb-4">🫧</div>
      <h3 className="text-base font-bold text-slime-text mb-1">
        No brands yet
      </h3>
      <p className="text-sm text-slime-muted">
        Brands will appear here once they're added to the catalog.
      </p>
    </div>
  );
}
