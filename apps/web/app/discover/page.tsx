// apps/web/app/discover/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { Trophy, CalendarDays } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import FloatingPills from "@/components/FloatingPills";

type TopRatedSlime = {
  id: string;
  name: string | null;
  brand_name: string | null;
  slime_type: string | null;
  avg_overall: number | null;
  total_ratings: number | null;
};

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
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RatingBar({ avg }: { avg: number | null }) {
  const pct = avg ? ((avg - 1) / 4) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slime-border overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #39FF14, #00F0FF)",
          }}
        />
      </div>
      <span className="text-xs font-semibold text-slime-accent tabular-nums w-7 text-right">
        {avg ? avg.toFixed(1) : "—"}
      </span>
    </div>
  );
}

function TopRatedCard({ slime, rank }: { slime: TopRatedSlime; rank: number }) {
  const isTop3 = rank <= 3;
  const rankEmoji = ["🥇", "🥈", "🥉"][rank - 1] ?? null;

  return (
    <article
      className="rounded-2xl p-4 flex items-center gap-3 transition-all duration-150 hover:scale-[1.01] active:scale-[0.98]"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
      }}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${isTop3 ? "text-slime-bg" : "bg-slime-surface text-slime-muted"}`}
        style={
          isTop3
            ? { background: "linear-gradient(135deg, #39FF14, #00F0FF)" }
            : undefined
        }
        aria-label={`Rank ${rank}`}
      >
        {rankEmoji ?? rank}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slime-text truncate leading-tight">
          {slime.name ?? "Unnamed slime"}
        </p>
        <p className="text-xs text-slime-magenta truncate">
          {slime.brand_name ?? "Unknown brand"}
        </p>
        <RatingBar avg={slime.avg_overall} />
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-slime-muted">{slime.total_ratings ?? 0}</p>
        <p className="text-[10px] text-slime-muted/60">ratings</p>
      </div>
    </article>
  );
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
    supabase
      .from("top_rated_slimes")
      .select("id, name, brand_name, slime_type, avg_overall, total_ratings")
      .order("avg_overall", { ascending: false })
      .limit(10),
    supabase
      .from("upcoming_drops")
      .select("id, name, drop_at, status, brand_name")
      .in("status", ["announced", "live"])
      .order("drop_at", { ascending: true })
      .limit(15),
  ]);

  const topSlimes: TopRatedSlime[] = topRatedResult.error
    ? []
    : (topRatedResult.data ?? []);
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
            Some data couldn't load — try refreshing.
          </div>
        )}

        {/* Top Rated */}
        <section className="px-4 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-slime-bg"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              }}
              aria-hidden="true"
            >
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <p className="section-label">Top Rated Slimes</p>
              <p className="text-xs text-slime-muted">
                Minimum 3 community ratings
              </p>
            </div>
          </div>
          {topSlimes.length === 0 ? (
            <div className="text-center py-10 text-slime-muted text-sm">
              No highly-rated slimes yet — go log some!
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {topSlimes.map((slime, i) => (
                <TopRatedCard key={slime.id} slime={slime} rank={i + 1} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Drops */}
        <section className="px-4 pb-24">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-slime-bg"
              style={{
                background: "linear-gradient(135deg, #FF00E5, #00F0FF)",
              }}
              aria-hidden="true"
            >
              <CalendarDays className="w-4 h-4" />
            </div>
            <div>
              <p className="section-label" style={{ color: "#FF00E5" }}>
                Upcoming Drops
              </p>
              <p className="text-xs text-slime-muted">
                Tap a drop to see what's included
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
