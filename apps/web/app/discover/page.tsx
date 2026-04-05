// app/discover/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import FloatingPills from "@/components/FloatingPills";
import DiscoverSlimesClient from "@/components/discover/DiscoverSlimesClient";
import type { TopRatedSlime } from "@/components/discover/DiscoverSlimesClient";

// TopRatedSlime type now lives in DiscoverSlimesClient — imported above

type UpcomingDrop = {
  id: string;
  name: string | null;
  drop_at: string | null;
  status: string | null;
  brand_name: string | null;
};

const DROP_STATUS = {
  announced: {
    label: "Announced",
    bg: "bg-slime-purple",
    text: "text-white",
    dot: "bg-slime-magenta",
  },
  live: {
    label: "Live",
    bg: "bg-green-900/40",
    text: "text-green-300",
    dot: "bg-green-400",
  },
  sold_out: {
    label: "Sold Out",
    bg: "bg-slime-surface",
    text: "text-slime-muted",
    dot: "bg-slime-muted",
  },
  restocked: {
    label: "Restocked",
    bg: "bg-sky-900/40",
    text: "text-sky-300",
    dot: "bg-sky-400",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-red-900/40",
    text: "text-red-400",
    dot: "bg-red-400",
  },
} as const;

type StatusBadge = { label: string; bg: string; text: string; dot?: string };

function getStatusBadge(status: string | null): StatusBadge {
  if (status && status in DROP_STATUS)
    return DROP_STATUS[status as keyof typeof DROP_STATUS];
  return {
    label: status ?? "Unknown",
    bg: "bg-slime-surface",
    text: "text-slime-muted",
    dot: "bg-slime-muted",
  };
}

function formatDropDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

function DropCard({ drop }: { drop: UpcomingDrop }) {
  const statusBadge = getStatusBadge(drop.status);
  const isLive = drop.status === "live";

  return (
    <Link
      href={`/drops/${drop.id}`}
      className="block group"
      aria-label={`View drop: ${drop.name ?? "Unnamed drop"}`}
    >
      <article
        className="rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-150 group-active:scale-[0.98]"
        style={{
          background: isLive ? "rgba(57,255,20,0.06)" : "rgba(45,10,78,0.2)",
          border: isLive
            ? "1px solid rgba(57,255,20,0.3)"
            : "1px solid rgba(45,10,78,0.6)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slime-text truncate leading-tight group-hover:text-slime-accent transition-colors">
            {drop.name ?? "Unnamed drop"}
          </p>
          <p className="text-xs text-slime-magenta truncate mt-0.5">
            {drop.brand_name ?? "Unknown brand"}
          </p>
          <p className="text-xs text-slime-muted mt-1 font-medium">
            {formatDropDate(drop.drop_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text}`}
          >
            {statusBadge.dot && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBadge.dot}`}
              />
            )}
            {statusBadge.label}
          </span>
          <span
            className="text-slime-muted text-xs group-hover:text-slime-accent transition-colors"
            aria-hidden="true"
          >
            ›
          </span>
        </div>
      </article>
    </Link>
  );
}

export default async function DiscoverPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const [topRatedResult, dropsResult] = await Promise.all([
    // [Fix 1] — Bypass top_rated_slimes view (requires >= 3 ratings, too strict for dev).
    // Query slimes table directly joined to brands. Threshold: >= 1 rating.
    // TODO before launch: raise total_ratings threshold to >= 3 or >= 5 once community data exists.
    supabase
      .from("slimes")
      .select(
        "id, name, slime_type, image_url, avg_overall, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, total_ratings, brand_id, brands(name, slug)",
      )
      .not("avg_overall", "is", null)
      .gte("total_ratings", 1)
      .order("avg_overall", { ascending: false })
      .order("total_ratings", { ascending: false })
      .limit(20),
    supabase
      .from("upcoming_drops")
      .select("id, name, drop_at, status, brand_name")
      .in("status", ["announced", "live"])
      .order("drop_at", { ascending: true })
      .limit(15),
  ]);

  // [Fix 1] — Normalize brands join: PostgREST may return array or object
  const rawSlimes = topRatedResult.error ? [] : (topRatedResult.data ?? []);
  const topSlimes: TopRatedSlime[] = rawSlimes.map((s) => ({
    ...s,
    brands: Array.isArray(s.brands) ? (s.brands[0] ?? null) : s.brands,
  }));

  const drops: UpcomingDrop[] = dropsResult.error
    ? []
    : (dropsResult.data ?? []);
  const hasErrors = topRatedResult.error || dropsResult.error;

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14">
        {/* Hero with floating pills */}
        <div className="relative px-4 pt-6 pb-6 overflow-hidden">
          <FloatingPills area="section" density="low" zIndex={0} />
          <div className="relative z-10">
            <h1
              className="text-2xl font-black tracking-tight"
              style={{
                background:
                  "linear-gradient(90deg, #39FF14 0%, #00F0FF 40%, #FF00E5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Discover
            </h1>
            <p className="text-sm text-slime-muted mt-0.5">
              Top-rated slimes &amp; upcoming drops
            </p>
          </div>
        </div>

        {hasErrors && (
          <div className="mx-4 mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            Some data couldn&apos;t load — try refreshing.
          </div>
        )}

        {/* Top Rated */}
        <section className="px-4 mb-8">
          <div className="flex items-center gap-3 mb-4">
            {/* [Fix 3] — Trophy inline SVG replacing lucide Trophy */}
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
              }}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div>
              <p className="section-label">Top Rated Slimes</p>
              <p className="text-xs text-slime-muted">Community ratings</p>
            </div>
          </div>

          {/* [Fix 2] — Client component handles filters */}
          <DiscoverSlimesClient initialSlimes={topSlimes} />
        </section>

        {/* Upcoming Drops */}
        <section className="px-4 pb-24">
          <div className="flex items-center gap-3 mb-4">
            {/* [Fix 3] — CalendarDays inline SVG replacing lucide CalendarDays */}
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #FF00E5, #00F0FF)",
                color: "#0A0A0A",
              }}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
                <path d="M8 14h.01" />
                <path d="M12 14h.01" />
                <path d="M16 14h.01" />
                <path d="M8 18h.01" />
                <path d="M12 18h.01" />
                <path d="M16 18h.01" />
              </svg>
            </div>
            <div>
              <p className="section-label" style={{ color: "#FF00E5" }}>
                Upcoming Drops
              </p>
              <p className="text-xs text-slime-muted">
                Tap a drop to see what&apos;s included
              </p>
            </div>
          </div>
          {drops.length === 0 ? (
            <div className="text-center py-10 text-slime-muted text-sm">
              No drops announced yet — check back soon.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {drops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
