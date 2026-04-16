// apps/web/app/brand-dashboard/[slug]/analytics/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProGate from "@/components/dashboard/ProGate";
import LogsOverTimeChart from "@/components/dashboard/charts/LogsOverTimeChart";
import RatingsRadarChart from "@/components/dashboard/charts/RatingsRadarChart";
import TopSlimesChart from "@/components/dashboard/charts/TopSlimesChart";
import DropPerformanceChart from "@/components/dashboard/charts/DropPerformanceChart";
import BrandExportButtons from "@/components/dashboard/BrandExportButtons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface DimensionData {
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  avg_overall: number | null;
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, slug, verification_tier, subscription_tier, subscription_status, logo_url, total_logs, follower_count, avg_shipping",
    )
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  const isPro =
    brand.subscription_tier === "brand_pro" &&
    brand.subscription_status === "active";

  const layoutBrand = {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: brand.logo_url,
    verification_tier: brand.verification_tier ?? "community",
  };

  let weeklyLogs: { week: string; log_count: number }[] = [];
  let dimensionData: DimensionData[] = [];
  let topSlimes: {
    name: string;
    total_logs: number;
    avg_overall: number | null;
  }[] = [];
  let dropPerformance: { name: string; log_count: number }[] = [];
  let communityLogs: {
    slime_name: string;
    slime_type: string | null;
    overall: number | null;
    texture: number | null;
    scent: number | null;
    sound: number | null;
    drizzle: number | null;
    creativity: number | null;
    sensory_fit: number | null;
    logged_at: string;
    username: string | null;
  }[] = [];
  let slimeAggregates: {
    name: string;
    slime_type: string | null;
    avg_overall: number | null;
    avg_texture: number | null;
    avg_scent: number | null;
    avg_sound: number | null;
    avg_drizzle: number | null;
    avg_creativity: number | null;
    avg_sensory_fit: number | null;
    total_logs: number;
  }[] = [];

  if (isPro) {
    const [
      { data: wl },
      { data: dd },
      { data: ts },
      { data: dp },
      { data: cl },
      { data: sa },
    ] = await Promise.all([
      supabase
        .from("brand_weekly_logs")
        .select("week, log_count")
        .eq("brand_id", brand.id)
        .order("week", { ascending: true }),
      supabase
        .from("slimes")
        .select(
          "avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, avg_overall",
        )
        .eq("brand_id", brand.id)
        .eq("is_brand_official", true)
        .not("avg_overall", "is", null),
      supabase
        .from("brand_top_slimes")
        .select("name, total_logs, avg_overall")
        .eq("brand_id", brand.id)
        .order("total_logs", { ascending: false })
        .limit(5),
      supabase
        .from("drops")
        .select("name")
        .eq("brand_id", brand.id)
        .order("drop_at", { ascending: false, nullsFirst: false })
        .limit(6),
      supabase
        .from("collection_logs")
        .select(
          `slimes!inner(name, slime_type, brand_id),
           rating_overall,
           rating_texture,
           rating_scent,
           rating_sound,
           rating_drizzle,
           rating_creativity,
           rating_sensory_fit,
           logged_at,
           profiles!collection_logs_user_id_fkey(username)`,
        )
        .eq("slimes.brand_id", brand.id)
        .eq("in_wishlist", false)
        .order("logged_at", { ascending: false })
        .limit(500),
      supabase
        .from("slimes")
        .select(
          "name, slime_type, avg_overall, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, total_ratings",
        )
        .eq("brand_id", brand.id)
        .eq("is_brand_official", true)
        .not("avg_overall", "is", null),
    ]);

    weeklyLogs = (wl ?? []).map((r) => ({
      week: new Date(r.week).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      log_count: r.log_count,
    }));
    dimensionData = (dd ?? []).map((d) => ({
      avg_texture: d.avg_texture,
      avg_scent: d.avg_scent,
      avg_sound: d.avg_sound,
      avg_drizzle: d.avg_drizzle,
      avg_creativity: d.avg_creativity,
      avg_sensory_fit: d.avg_sensory_fit,
      avg_overall: d.avg_overall,
    }));
    topSlimes = (ts ?? []).map((s) => ({
      name: s.name,
      total_logs: s.total_logs ?? 0,
      avg_overall: s.avg_overall,
    }));
    dropPerformance = (dp ?? []).map((d) => ({ name: d.name, log_count: 0 }));
    communityLogs = (cl ?? []).map((row: Record<string, unknown>) => {
      const slime = row.slimes as Record<string, unknown> | null;
      const profile = row.profiles as Record<string, unknown> | null;
      return {
        slime_name: (slime?.name as string) ?? "",
        slime_type: (slime?.slime_type as string) ?? null,
        overall: (row.rating_overall as number) ?? null,
        texture: (row.rating_texture as number) ?? null,
        scent: (row.rating_scent as number) ?? null,
        sound: (row.rating_sound as number) ?? null,
        drizzle: (row.rating_drizzle as number) ?? null,
        creativity: (row.rating_creativity as number) ?? null,
        sensory_fit: (row.rating_sensory_fit as number) ?? null,
        logged_at: row.logged_at as string,
        username: (profile?.username as string) ?? null,
      };
    });
    slimeAggregates = (sa ?? []).map((s) => ({
      name: s.name,
      slime_type: s.slime_type ?? null,
      avg_overall: s.avg_overall ?? null,
      avg_texture: s.avg_texture ?? null,
      avg_scent: s.avg_scent ?? null,
      avg_sound: s.avg_sound ?? null,
      avg_drizzle: s.avg_drizzle ?? null,
      avg_creativity: s.avg_creativity ?? null,
      avg_sensory_fit: s.avg_sensory_fit ?? null,
      total_logs: s.total_ratings ?? 0,
    }));
  }

  return (
    <DashboardLayout brand={layoutBrand} active="analytics">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Analytics
        </h1>
        <p
          className="text-sm mt-1"
          style={{
            color: "rgba(245,245,245,0.4)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Deep performance insights for your brand
        </p>
      </div>
      <ProGate isPro={isPro} brandId={brand.id} brandSlug={brand.slug}>
        <div className="space-y-6">
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(45,10,78,0.25)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#00F0FF" }}
            >
              Logs Over Time
            </p>
            <LogsOverTimeChart data={weeklyLogs} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(45,10,78,0.25)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "#00F0FF" }}
              >
                Community Ratings Breakdown
              </p>
              <RatingsRadarChart data={dimensionData} />
            </div>
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(45,10,78,0.25)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-4"
                style={{ color: "#00F0FF" }}
              >
                Top Slimes by Logs
              </p>
              <TopSlimesChart data={topSlimes} />
            </div>
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(45,10,78,0.25)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#00F0FF" }}
            >
              Drop Performance
            </p>
            <DropPerformanceChart data={dropPerformance} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(["Rating Trend Over Time", "Follower Growth"] as const).map(
              (label) => (
                <div
                  key={label}
                  className="rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px]"
                  style={{
                    background: "rgba(45,10,78,0.25)",
                    border: "1px solid rgba(45,10,78,0.7)",
                  }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-3"
                    style={{ color: "#00F0FF" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: "rgba(245,245,245,0.35)" }}
                  >
                    Coming soon
                  </p>
                </div>
              ),
            )}
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(45,10,78,0.25)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-4"
              style={{ color: "#00F0FF" }}
            >
              Export Data
            </p>
            <BrandExportButtons
              brandName={brand.name}
              brandSlug={brand.slug}
              communityLogs={communityLogs}
              slimeAggregates={slimeAggregates}
            />
          </div>
        </div>
      </ProGate>
    </DashboardLayout>
  );
}
