import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import LogsOverTimeChart from "@/components/dashboard/charts/LogsOverTimeChart";
import RatingsRadarChart from "@/components/dashboard/charts/RatingsRadarChart";
import TopSlimesChart from "@/components/dashboard/charts/TopSlimesChart";
import DropPerformanceChart from "@/components/dashboard/charts/DropPerformanceChart";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDropDate(dateStr: string | null) {
  if (!dateStr) return "TBA";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const statusColors: Record<string, string> = {
  announced: "#00F0FF",
  live: "#39FF14",
  sold_out: "#6B5A7E",
  restocked: "#4488FF",
  cancelled: "#FF4444",
};

function StarRating({ value }: { value: number | null }) {
  if (!value) return <span style={{ color: "#6B5A7E", fontSize: 12 }}>No ratings</span>;
  return <span style={{ color: "#39FF14", fontSize: 14, fontWeight: 700 }}>{value.toFixed(1)} ★</span>;
}

export default async function BrandOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  const [
    { count: slimeCount },
    { data: upcomingDrops },
    { data: topSlimes },
    { data: recentLogs },
    { data: weeklyLogs },
    { data: dimensionData },
  ] = await Promise.all([
    supabase.from("slimes").select("*", { count: "exact", head: true }).eq("brand_id", brand.id).eq("is_brand_official", true),
    supabase.from("drops").select("*").eq("brand_id", brand.id).in("status", ["announced", "live"]).order("drop_at", { ascending: true }).limit(3),
    supabase.from("brand_top_slimes").select("*").eq("brand_id", brand.id).order("total_logs", { ascending: false }).limit(3),
    supabase.from("collection_logs").select("id, slime_name, rating_overall, created_at, profiles!collection_logs_user_id_fkey(username)").eq("brand_id", brand.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("brand_weekly_logs").select("week, log_count").eq("brand_id", brand.id).order("week", { ascending: true }),
    supabase.from("slimes").select("avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, avg_overall").eq("brand_id", brand.id).eq("is_brand_official", true).not("avg_overall", "is", null),
  ]);

  const layoutBrand = {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: brand.logo_url,
    verification_tier: brand.verification_tier ?? "community",
  };

  const statsCards = [
    { label: "Total Logs", value: brand.total_logs ?? 0, color: "#39FF14" },
    { label: "Avg Rating", value: brand.avg_shipping ? brand.avg_shipping.toFixed(1) : "—", color: "#00F0FF" },
    { label: "Followers", value: brand.follower_count ?? 0, color: "#FF00E5" },
    { label: "Active Slimes", value: slimeCount ?? 0, color: "#FFFFFF" },
    { label: "Total Ratings", value: brand.total_brand_ratings ?? 0, color: "#00F0FF" },
  ];

  const chartWeeklyLogs = (weeklyLogs ?? []).map((r) => ({
    week: new Date(r.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    log_count: r.log_count,
  }));

  const chartDimensions = (dimensionData ?? []).map((d) => ({
    avg_texture: d.avg_texture,
    avg_scent: d.avg_scent,
    avg_sound: d.avg_sound,
    avg_drizzle: d.avg_drizzle,
    avg_creativity: d.avg_creativity,
    avg_sensory_fit: d.avg_sensory_fit,
    avg_overall: d.avg_overall,
  }));

  const chartTopSlimes = (topSlimes ?? []).map((s) => ({
    name: s.name,
    total_logs: s.total_logs ?? 0,
    avg_overall: s.avg_overall,
  }));

  return (
    <DashboardLayout brand={layoutBrand} active="overview">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Montserrat, sans-serif" }}>Overview</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(245,245,245,0.4)", fontFamily: "Inter, sans-serif" }}>
          {brand.name}— brand performance at a glance
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {statsCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color, fontFamily: "Montserrat, sans-serif" }}>
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2 rounded-2xl p-6" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00F0FF" }}>Logs Over Time</p>
          <LogsOverTimeChart data={chartWeeklyLogs} />
        </div>
        <div className="rounded-2xl p-6" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00F0FF" }}>Community Ratings</p>
          <RatingsRadarChart data={chartDimensions} />
        </div>
      </div>

      {/* Top slimes + recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl p-6" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00F0FF" }}>Top Slimes by Logs</p>
          <TopSlimesChart data={chartTopSlimes} />
        </div>
        <div className="rounded-2xl p-6" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00F0FF" }}>Recent Community Activity</p>
          {!recentLogs || recentLogs.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(245,245,245,0.3)" }}>No community logs yet</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => {
                const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                return (
                  <div key={log.id} className="flex items-center gap-3 py-2" style={{ borderBottom: "1px solid rgba(45,10,78,0.4)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{log.slime_name}</p>
                      <p className="text-xs mt-0.5">
                        <span style={{ color: "#FF00E5" }}>@{profile?.username ?? "unknown"}</span>
                        <span style={{ color: "#6B5A7E" }}> · {timeAgo(log.created_at)}</span>
                      </p>
                    </div>
                    {log.rating_overall && (
                      <span className="text-sm font-bold flex-shrink-0" style={{ color: "#39FF14" }}>{log.rating_overall}/5</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming drops */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="rounded-2xl p-6" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#00F0FF" }}>Upcoming Drops</p>
            <Link href={`/brand-dashboard/${slug}/drops`} className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)", color: "#0A0A0A" }}>
              + New Drop
            </Link>
          </div>
          {!upcomingDrops || upcomingDrops.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "rgba(245,245,245,0.3)" }}>No upcoming drops. Schedule one.</p>
          ) : (
            <div className="space-y-2">
              {upcomingDrops.map((drop) => (
                <div key={drop.id} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(45,10,78,0.3)", border: "1px solid rgba(45,10,78,0.6)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{drop.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#6B5A7E" }}>{formatDropDate(drop.drop_at)}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0" style={{ color: statusColors[drop.status] ?? "#9B8AAE", background: `${statusColors[drop.status] ?? "#9B8AAE"}18`, border: `1px solid ${statusColors[drop.status] ?? "#9B8AAE"}40` }}>
                    {drop.status === "live" ? "● LIVE" : drop.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(45,10,78,0.25)", border: "1px solid rgba(45,10,78,0.7)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#00F0FF" }}>Quick Actions</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Add Slime", href: `/brand-dashboard/${slug}/slimes` },
              { label: "New Drop", href: `/brand-dashboard/${slug}/drops` },
              { label: "Edit Profile", href: `/brand-dashboard/${slug}/settings` },
            ].map((action) => (
              <Link key={action.label} href={action.href} className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all" style={{ background: "rgba(45,10,78,0.3)", border: "1px solid rgba(45,10,78,0.6)" }}>
                <span className="text-xs font-semibold text-center" style={{ color: "rgba(245,245,245,0.6)", fontFamily: "Inter, sans-serif" }}>{action.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
