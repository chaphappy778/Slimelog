// apps/web/app/discover/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";

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
    bg: "bg-violet-100",
    text: "text-violet-700",
  },
  live: { label: "🔴 Live", bg: "bg-green-100", text: "text-green-700" },
  sold_out: { label: "Sold Out", bg: "bg-gray-100", text: "text-gray-500" },
  restocked: { label: "Restocked", bg: "bg-sky-100", text: "text-sky-700" },
  cancelled: { label: "Cancelled", bg: "bg-red-50", text: "text-red-400" },
} as const;

type StatusBadge = { label: string; bg: string; text: string };

function getStatusBadge(status: string | null): StatusBadge {
  if (status && status in DROP_STATUS) {
    return DROP_STATUS[status as keyof typeof DROP_STATUS];
  }
  return {
    label: status ?? "Unknown",
    bg: "bg-gray-100",
    text: "text-gray-600",
  };
}

function formatDropDate(dateStr: string | null): string {
  if (!dateStr) return "TBA";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RatingBar({ avg }: { avg: number | null }) {
  const pct = avg ? ((avg - 1) / 4) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-pink-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #f472b6, #a855f7)",
          }}
        />
      </div>
      <span className="text-xs font-semibold text-pink-600 tabular-nums w-7 text-right">
        {avg ? avg.toFixed(1) : "—"}
      </span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

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
        className="w-9 h-9 rounded-2xl flex items-center justify-center text-lg shrink-0"
        style={{ background: "linear-gradient(135deg, #fce7f3, #f3e8ff)" }}
        aria-hidden="true"
      >
        {emoji}
      </div>
      <div>
        <h2 className="text-base font-bold text-gray-900 leading-tight">
          {title}
        </h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptySection({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-gray-400 text-sm">{message}</div>
  );
}

// ─── Top-rated card ───────────────────────────────────────────────────────────

function TopRatedCard({ slime, rank }: { slime: TopRatedSlime; rank: number }) {
  const isTop3 = rank <= 3;
  const rankEmoji = ["🥇", "🥈", "🥉"][rank - 1] ?? null;

  return (
    <article className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4 flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black
          ${isTop3 ? "text-white" : "bg-gray-50 text-gray-400"}`}
        style={
          isTop3
            ? { background: "linear-gradient(135deg, #f472b6, #a855f7)" }
            : undefined
        }
        aria-label={`Rank ${rank}`}
      >
        {rankEmoji ?? rank}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
          {slime.name ?? "Unnamed slime"}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {slime.brand_name ?? "Unknown brand"}
        </p>
        <RatingBar avg={slime.avg_overall} />
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-gray-400">{slime.total_ratings ?? 0}</p>
        <p className="text-[10px] text-gray-300">ratings</p>
      </div>
    </article>
  );
}

// ─── Drop card ────────────────────────────────────────────────────────────────
// UPDATED: wrapped in Link to /drops/[id]

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
        className="bg-white rounded-2xl border shadow-sm p-4 flex items-center justify-between gap-3 transition-all duration-150 group-active:scale-[0.98]"
        style={{
          borderColor: isLive ? "#bbf7d0" : "#fce7f3",
          boxShadow: isLive
            ? "0 1px 3px 0 rgba(16, 185, 129, 0.08)"
            : "0 1px 3px 0 rgba(244, 114, 182, 0.08)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight group-hover:text-pink-600 transition-colors">
            {drop.name ?? "Unnamed drop"}
          </p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {drop.brand_name ?? "Unknown brand"}
          </p>
          <p className="text-xs text-gray-500 mt-1 font-medium">
            {formatDropDate(drop.drop_at)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text}`}
          >
            {statusBadge.label}
          </span>
          {/* Chevron affordance */}
          <span
            className="text-gray-300 text-xs group-hover:text-pink-400 transition-colors"
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
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
      },
    },
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
    <main
      className="min-h-screen pb-24"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      <header className="px-4 pt-10 pb-6">
        <h1
          className="text-2xl font-black tracking-tight"
          style={{
            background: "linear-gradient(90deg, #ec4899, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Discover
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Top-rated slimes & upcoming drops
        </p>
      </header>

      {hasErrors && (
        <div className="mx-4 mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-500">
          Some data couldn't load — try refreshing.
        </div>
      )}

      {/* ── Top rated ──────────────────────────────────────────────────── */}
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

      {/* ── Upcoming drops ─────────────────────────────────────────────── */}
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
    </main>
  );
}
