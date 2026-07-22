import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
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

// Card treatments pulled straight from the redesign mockup.
const CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(150,110,240,0.16)",
  borderRadius: 16,
} as const;
const KPI_CARD = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(150,110,240,0.14)",
  borderRadius: 14,
} as const;

const CYAN = "#22d3ee";
const MUTED = "#8f83b0";
const RING_COLORS = ["#34e89e", "#22d3ee", "#ff2bd6", "#a855f7", "#4488FF"];

// Small-caps cyan section eyebrow used throughout the mockup.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-black uppercase tracking-wider"
      style={{ color: CYAN, fontFamily: "Montserrat, sans-serif" }}
    >
      {children}
    </p>
  );
}

// Server-rendered SVG sparkline. The full LogsOverTimeChart carries a range
// toggle + axes it can't shed without a Batch-3 change, so the Overview draws
// its own axis-less trend line from the same brand_weekly_logs series.
function Sparkline({ values }: { values: number[] }) {
  const w = 300;
  const h = 44;
  const pad = 3;
  if (values.length < 2) {
    return (
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <line
          x1={pad}
          y1={h / 2}
          x2={w - pad}
          y2={h / 2}
          stroke="rgba(150,110,240,0.3)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
      </svg>
    );
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / range) * (h - 2 * pad);
    return [x, y] as const;
  });
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${pts[0][0].toFixed(1)},${h} ${line} ${pts[pts.length - 1][0].toFixed(1)},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#34e89e" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(52,232,158,0.28)" />
          <stop offset="100%" stopColor="rgba(52,232,158,0)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <polyline
        points={line}
        fill="none"
        stroke="url(#sparkStroke)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function BrandOverviewPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  // dimensionData is fetched here to keep the Overview's query set intact; the
  // radar it fed now lives on the Analytics surface (Batch 3).
  void dimensionData;

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

  // ── Hero number + 30-day delta, derived from brand_weekly_logs ──
  const wl = weeklyLogs ?? [];
  const DAY = 86_400_000;
  const nowMs = Date.now();
  let recent30 = 0;
  let prior30 = 0;
  for (const r of wl) {
    const age = nowMs - new Date(r.week).getTime();
    if (age < 30 * DAY) recent30 += r.log_count ?? 0;
    else if (age < 60 * DAY) prior30 += r.log_count ?? 0;
  }
  const has30d = wl.length > 0;
  const heroCount = has30d ? recent30 : (brand.total_logs ?? 0);
  const heroLabel = has30d ? "logs in 30 days" : "total logs";
  const delta = recent30 - prior30;
  const showDelta = has30d && (recent30 > 0 || prior30 > 0);
  const sparkValues = wl.slice(-12).map((r) => r.log_count ?? 0);

  const kpis = [
    { label: "Total slimes", value: slimeCount ?? 0, color: "#FFFFFF" },
    { label: "Avg rating", value: brand.avg_shipping ? Number(brand.avg_shipping).toFixed(1) : "-", color: "#34e89e" },
    { label: "Followers", value: brand.follower_count ?? 0, color: "#FFFFFF" },
    { label: "Drops upcoming", value: upcomingDrops?.length ?? 0, color: "#ff2bd6" },
  ];

  const quickActions = [
    { label: "Create drop", href: `/brand-dashboard/${slug}/drops` },
    { label: "Edit brand", href: `/brand-dashboard/${slug}/settings` },
    { label: "View public page", href: `/brands/${slug}` },
  ];

  const maxTopLogs = Math.max(...(topSlimes ?? []).map((s) => s.total_logs ?? 0), 1);

  return (
    <DashboardLayout brand={layoutBrand} active="overview" isPro={isPro}>
      {/* Page title */}
      <div className="mb-5">
        <h1
          className="text-2xl lg:text-[27px] font-black text-white leading-tight"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Overview
        </h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: "#b3a7d0" }}>
          {brand.name} · performance at a glance
        </p>
      </div>

      {/* Hero: logs over time */}
      <section className="p-5 mb-4" style={CARD}>
        <div className="flex items-center justify-between mb-1">
          <SectionLabel>Logs over time</SectionLabel>
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full"
            style={{ color: "#07130d", background: "linear-gradient(135deg,#34e89e,#22d3ee)" }}
          >
            30D
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span
            className="text-[32px] leading-none font-black text-white"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            {heroCount.toLocaleString()}
          </span>
          <span className="text-xs font-bold" style={{ color: MUTED }}>
            {heroLabel}
          </span>
          {showDelta && (
            <span
              className="text-[11px] font-black px-2 py-1 rounded-full"
              style={{
                color: delta >= 0 ? "#34e89e" : "#ff5f7a",
                background: delta >= 0 ? "rgba(52,232,158,0.12)" : "rgba(255,95,122,0.12)",
                border: `1px solid ${delta >= 0 ? "rgba(52,232,158,0.3)" : "rgba(255,95,122,0.3)"}`,
              }}
            >
              {delta >= 0 ? "+" : "-"}
              {Math.abs(delta).toLocaleString()} vs last 30d
            </span>
          )}
        </div>
        <Sparkline values={sparkValues} />
      </section>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="p-4" style={KPI_CARD}>
            <p
              className="text-[10px] font-black uppercase tracking-wider leading-tight"
              style={{ color: CYAN, fontFamily: "Montserrat, sans-serif", minHeight: 24 }}
            >
              {k.label}
            </p>
            <p
              className="text-[30px] leading-none font-black mt-1.5"
              style={{ color: k.color, fontFamily: "Montserrat, sans-serif" }}
            >
              {typeof k.value === "number" ? k.value.toLocaleString() : k.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-6">
        <div className="mb-3">
          <SectionLabel>Quick actions</SectionLabel>
        </div>
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex-none flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-bold transition-colors"
              style={{
                color: "#cdbdf2",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(150,110,240,0.2)",
              }}
            >
              {a.label}
              <span style={{ color: "#ff2bd6" }}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Top slimes + recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Top slimes by logs */}
        <section className="p-5" style={CARD}>
          <div className="mb-4">
            <SectionLabel>Top slimes by logs</SectionLabel>
          </div>
          {!topSlimes || topSlimes.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
              No logged slimes yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3.5">
              {topSlimes.map((s) => {
                const pct = Math.round(((s.total_logs ?? 0) / maxTopLogs) * 100);
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-[13px] font-bold mb-1.5">
                      <span className="text-white truncate pr-2">{s.name}</span>
                      <span style={{ color: MUTED }}>{s.total_logs ?? 0}</span>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg,#34e89e,#22d3ee)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent community activity */}
        <section className="p-5" style={CARD}>
          <div className="mb-4">
            <SectionLabel>Recent community activity</SectionLabel>
          </div>
          {!recentLogs || recentLogs.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: MUTED }}>
              No community logs yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {recentLogs.map((log, i) => {
                const profile = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles;
                const username = profile?.username ?? "unknown";
                const initials = username.slice(0, 2).toUpperCase();
                const ring = RING_COLORS[i % RING_COLORS.length];
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(150,110,240,0.14)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex-none flex items-center justify-center text-[11px] font-black"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: `2px solid ${ring}`,
                        color: ring,
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold truncate text-white">
                        <span style={{ color: CYAN }}>Logged</span> {log.slime_name}
                      </p>
                      <p className="text-[11px] font-semibold" style={{ color: MUTED }}>
                        @{username} · {timeAgo(log.created_at)}
                      </p>
                    </div>
                    {log.rating_overall != null && (
                      <span
                        className="flex-none text-xs font-black"
                        style={{ color: "#34e89e" }}
                      >
                        {log.rating_overall}/5
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Upcoming drops */}
      <section className="p-5" style={CARD}>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>Upcoming drops</SectionLabel>
          <Link
            href={`/brand-dashboard/${slug}/drops`}
            className="text-xs font-black px-3 py-1.5 rounded-full"
            style={{ background: "linear-gradient(135deg,#34e89e,#22d3ee)", color: "#07130d" }}
          >
            + New Drop
          </Link>
        </div>
        {!upcomingDrops || upcomingDrops.length === 0 ? (
          <Link
            href={`/brand-dashboard/${slug}/drops`}
            className="block text-sm py-6 text-center font-semibold rounded-xl"
            style={{ color: MUTED, background: "rgba(255,255,255,0.02)" }}
          >
            No drops scheduled. Create one →
          </Link>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
            {upcomingDrops.map((drop) => {
              const c = statusColors[drop.status] ?? "#9B8AAE";
              return (
                <div
                  key={drop.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(150,110,240,0.14)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-black text-white truncate"
                      style={{ fontFamily: "Montserrat, sans-serif" }}
                    >
                      {drop.name}
                    </p>
                    <p className="text-xs mt-0.5 font-semibold" style={{ color: MUTED }}>
                      {formatDropDate(drop.drop_at)}
                    </p>
                  </div>
                  <span
                    className="flex-none text-[11px] font-black px-2.5 py-1 rounded-full"
                    style={{ color: c, background: `${c}18`, border: `1px solid ${c}40` }}
                  >
                    {drop.status === "live" ? "● LIVE" : drop.status.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
