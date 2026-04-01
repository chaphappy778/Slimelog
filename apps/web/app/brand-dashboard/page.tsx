import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function BrandDashboardRootPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: brands } = await supabase
    .from("brands")
    .select(
      "id, slug, name, verification_tier, logo_url, total_logs, follower_count",
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  if (!brands || brands.length === 0) redirect("/brands");
  if (brands.length === 1) redirect(`/brand-dashboard/${brands[0].slug}`);

  // Multiple brands — show picker
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
          >
            Brand Dashboard
          </p>
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Select a Brand
          </h1>
          <p
            className="text-sm mt-1"
            style={{
              color: "rgba(245,245,245,0.4)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            You manage {brands.length} brands. Choose one to continue.
          </p>
        </div>

        <div className="space-y-3">
          {brands.map((brand) => {
            const isPro =
              brand.verification_tier === "verified" ||
              brand.verification_tier === "partner";
            const initials = brand.name.slice(0, 2).toUpperCase();
            return (
              <Link
                key={brand.id}
                href={`/brand-dashboard/${brand.slug}`}
                className="flex items-center gap-4 p-4 rounded-xl transition-all group"
                style={{
                  background: "rgba(45,10,78,0.25)",
                  border: "1px solid rgba(45,10,78,0.7)",
                }}
              >
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(45,10,78,0.9), rgba(20,4,40,0.9))",
                      border: "1px solid rgba(57,255,20,0.2)",
                      color: "#39FF14",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {initials}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold text-white truncate"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    {brand.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span
                      className="text-[10px] font-bold tracking-widest"
                      style={{
                        color: isPro ? "#39FF14" : "rgba(245,245,245,0.3)",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      {isPro
                        ? "★ VERIFIED"
                        : (brand.verification_tier?.toUpperCase() ??
                          "COMMUNITY")}
                    </span>
                    {brand.total_logs !== null && brand.total_logs > 0 && (
                      <span
                        className="text-[10px]"
                        style={{
                          color: "rgba(245,245,245,0.3)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {brand.total_logs.toLocaleString()} logs
                      </span>
                    )}
                  </div>
                </div>

                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                  style={{ color: "rgba(245,245,245,0.3)" }}
                >
                  <path
                    d="M6 3l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
