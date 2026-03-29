// apps/web/app/discover/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Drop status config ───────────────────────────────────────────────────────

const DROP_STATUS = {
  announced: {
    label: "Announced",
    bg: "bg-violet-900/40",
    text: "text-violet-300",
  },
  live: { label: "🔴 Live", bg: "bg-green-900/40", text: "text-green-300" },
  sold_out: {
    label: "Sold Out",
    bg: "bg-slime-surface",
    text: "text-slime-muted",
  },
  restocked: { label: "Restocked", bg: "bg-sky-900/40", text: "text-sky-300" },
  cancelled: { label: "Cancelled", bg: "bg-red-900/40", text: "text-red-400" },
} as const;

type StatusBadge = { label: string; bg: string; text: string };

function getStatusBadge(status: string | null): StatusBadge {
  if (status && status in DROP_STATUS)
    return DROP_STATUS[status as keyof typeof DROP_STATUS];
  return {
    label: status ?? "Unknown",
    bg: "bg-slime-surface",
    text: "text-slime-muted",
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

function SectionHeader({
  emoji,
  title,
  subtitle,
}: {
  emoji: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0 bg-slime-surface border border-slime-border"
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div>
        <h2 className="text-base font-bold text-slime-text leading-tight">
          {title}
        </h2>
        <p className="text-xs text-slime-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-slime-muted text-sm">{message}</div>
  );
}

function TopRatedCard({ slime, rank }: { slime: TopRatedSlime; rank: number }) {
  const isTop3 = rank <= 3;
  const rankEmoji = ["🥇", "🥈", "🥉"][rank - 1] ?? null;

  return (
    <article className="bg-slime-card rounded-2xl border border-slime-border p-4 flex items-center gap-3 hover:border-slime-accent/30 transition-colors">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${
          isTop3 ? "text-slime-bg" : "bg-slime-surface text-slime-muted"
        }`}
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
        <p className="text-xs text-slime-muted truncate">
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
        className="bg-slime-card rounded-2xl border p-4 flex items-center justify-between gap-3 transition-all duration-150 group-active:scale-[0.98] group-hover:border-slime-accent/30"
        style={{
          borderColor: isLive ? "rgba(57,255,20,0.3)" : "rgba(42,42,42,1)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slime-text truncate leading-tight group-hover:text-slime-accent transition-colors">
            {drop.name ?? "Unnamed drop"}
          </p>
          <p className="text-xs text-slime-muted truncate mt-0.5">
            {drop.brand_name ?? "Unknown brand"}
          </p>
          <p className="text-xs text-slime-muted mt-1 font-medium">
            {formatDropDate(drop.drop_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text}`}
          >
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

// ─── Page ─────────────────────────────────────────────────────────────────────

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
    <main className="min-h-screen pb-24 bg-slime-bg">
      <PageHeader />

      <div className="pt-14">
        <div className="px-4 pt-6 pb-6">
          <h1 className="text-2xl font-black tracking-tight text-holo">
            Discover
          </h1>
          <p className="text-sm text-slime-muted mt-0.5">
            Top-rated slimes & upcoming drops
          </p>
        </div>

        {hasErrors && (
          <div className="mx-4 mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            Some data couldn't load — try refreshing.
          </div>
        )}

        <section className="px-4 mb-8">
          <SectionHeader
            emoji="🏆"
            title="Top Rated Slimes"
            subtitle="Minimum 3 community ratings"
          />
          {topSlimes.length === 0 ? (
            <EmptySection message="No highly-rated slimes yet — go log some!" />
          ) : (
            <div className="flex flex-col gap-3">
              {topSlimes.map((slime, i) => (
                <TopRatedCard key={slime.id} slime={slime} rank={i + 1} />
              ))}
            </div>
          )}
        </section>

        <section className="px-4">
          <SectionHeader
            emoji="📅"
            title="Upcoming Drops"
            subtitle="Tap a drop to see what's included"
          />
          {drops.length === 0 ? (
            <EmptySection message="No drops announced yet — check back soon." />
          ) : (
            <div className="flex flex-col gap-3">
              {drops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
