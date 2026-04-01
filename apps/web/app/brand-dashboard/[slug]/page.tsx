import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProGate from "@/components/dashboard/ProGate";
import LogsOverTimeChart from "@/components/dashboard/charts/LogsOverTimeChart";
import RatingsRadarChart from "@/components/dashboard/charts/RatingsRadarChart";
import TopSlimesChart from "@/components/dashboard/charts/TopSlimesChart";
import DropPerformanceChart from "@/components/dashboard/charts/DropPerformanceChart";

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
      "id, name, slug, verification_tier, logo_url, total_logs, follower_count, avg_shipping",
    )
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  const isPro =
    brand.verification_tier === "verified" ||
    brand.verification_tier === "partner";

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

  if (isPro) {
    const [{ data: wl }, { data: dd }, { data: ts }, { data: dp }] =
      await Promise.all([
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

    dropPerformance = (dp ?? []).map((d) => ({
      name: d.name,
      log_count: 0,
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

      <ProGate isPro={isPro}>
        <div className="space-y-6">
          {/* Logs over time */}
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

          {/* Radar + Top Slimes */}
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

          {/* Drop Performance */}
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

          {/* Coming soon placeholders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["Rating Trend Over Time", "Follower Growth"].map((label) => (
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
            ))}
          </div>

          {/* Export */}
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
            <div className="flex flex-wrap gap-3">
              <button
                className="px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                }}
              >
                Export Slime Ratings CSV
              </button>
              <button
                className="px-4 py-2 rounded-full text-sm font-bold"
                style={{
                  background: "rgba(45,10,78,0.4)",
                  border: "1px solid rgba(45,10,78,0.8)",
                  color: "rgba(245,245,245,0.7)",
                }}
              >
                Export Community Logs CSV
              </button>
            </div>
          </div>
        </div>
      </ProGate>
    </DashboardLayout>
  );
}
