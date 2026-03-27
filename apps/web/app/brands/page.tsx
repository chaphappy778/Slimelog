// apps/web/app/brands/page.tsx

import { createClient } from "@/lib/supabase/server";
import { BrandCard } from "@/components/BrandCard";

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
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-fuchsia-50/30 to-white pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 pt-safe-top">
        <div className="max-w-[390px] mx-auto py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-pink-500 via-fuchsia-500 to-violet-500 bg-clip-text text-transparent">
                Brands
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {list.length} shop{list.length !== 1 ? "s" : ""} ·{" "}
                <span className="text-fuchsia-600 font-medium">
                  {verifiedCount} verified
                </span>
              </p>
            </div>
            {/* Filter pill placeholder */}
            <button className="flex items-center gap-1.5 text-xs font-semibold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 px-3 py-1.5 rounded-full active:bg-fuchsia-100 transition-colors">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-fuchsia-500">
                <path d="M1 3h14v1.5L9.5 9v5l-3-1.5V9L1 4.5V3z" />
              </svg>
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="max-w-[390px] mx-auto px-4 pt-4 pb-2">
        <div className="relative">
          <svg
            viewBox="0 0 20 20"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 fill-gray-400 pointer-events-none"
          >
            <path d="M12.9 11.5a7 7 0 1 0-1.4 1.4l4.3 4.3 1.4-1.4-4.3-4.3zM8 13A5 5 0 1 1 8 3a5 5 0 0 1 0 10z" />
          </svg>
          <input
            type="search"
            placeholder="Search brands…"
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-pink-100 rounded-xl shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-300 focus:border-fuchsia-300 transition"
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
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="text-5xl mb-4">🫧</div>
      <h3 className="text-base font-bold text-gray-700 mb-1">No brands yet</h3>
      <p className="text-sm text-gray-400">
        Brands will appear here once they're added to the catalog.
      </p>
    </div>
  );
}
