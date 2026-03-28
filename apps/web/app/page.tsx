// apps/web/app/page.tsx
// Updated: FeedCard is now wrapped in a Link to /slimes/[id]

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeedLog = {
  id: string;
  created_at: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
  rating_overall: number | null;
  profiles: { username: string | null }[] | null;
  brands: { name: string | null }[] | null;
};

// ─── Type badge palette (all 16 types) ───────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> =
  {
    butter: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Butter" },
    clear: { bg: "bg-sky-100", text: "text-sky-700", label: "Clear" },
    cloud: { bg: "bg-slate-100", text: "text-slate-600", label: "Cloud" },
    icee: { bg: "bg-cyan-100", text: "text-cyan-700", label: "Icee" },
    fluffy: { bg: "bg-pink-100", text: "text-pink-600", label: "Fluffy" },
    floam: { bg: "bg-lime-100", text: "text-lime-700", label: "Floam" },
    snow_fizz: { bg: "bg-blue-50", text: "text-blue-500", label: "Snow Fizz" },
    thick_and_glossy: {
      bg: "bg-fuchsia-100",
      text: "text-fuchsia-700",
      label: "Thick & Glossy",
    },
    jelly: { bg: "bg-violet-100", text: "text-violet-700", label: "Jelly" },
    beaded: { bg: "bg-orange-100", text: "text-orange-600", label: "Beaded" },
    clay: { bg: "bg-amber-100", text: "text-amber-700", label: "Clay" },
    cloud_cream: {
      bg: "bg-rose-50",
      text: "text-rose-500",
      label: "Cloud Cream",
    },
    magnetic: { bg: "bg-zinc-200", text: "text-zinc-700", label: "Magnetic" },
    thermochromic: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      label: "Thermochromic",
    },
    avalanche: {
      bg: "bg-indigo-100",
      text: "text-indigo-600",
      label: "Avalanche",
    },
    slay: { bg: "bg-red-100", text: "text-red-600", label: "Slay" },
  };

const fallbackType = {
  bg: "bg-gray-100",
  text: "text-gray-500",
  label: "Unknown",
};

// ─── Stars renderer ───────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-gray-400">No rating</span>;
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`text-sm leading-none ${n <= rating ? "text-pink-500" : "text-gray-200"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Feed card — now tappable ─────────────────────────────────────────────────

function FeedCard({ log }: { log: FeedLog }) {
  const typeStyle =
    (log.slime_type && TYPE_STYLE[log.slime_type]) || fallbackType;
  const brandName =
    log.brands?.[0]?.name ?? log.brand_name_raw ?? "Unknown brand";
  const slimeName = log.slime_name ?? "Untitled slime";
  const username = log.profiles?.[0]?.username ?? "anonymous";
  const timeAgo = formatDistanceToNow(new Date(log.created_at), {
    addSuffix: true,
  });

  return (
    // ↓ Wrap entire card in a Link — tapping anywhere navigates to detail page
    <Link href={`/slimes/${log.id}`} className="block group">
      <article className="relative bg-white rounded-3xl shadow-sm border border-pink-50 overflow-hidden transition-all duration-100 group-hover:shadow-md group-active:scale-[0.98]">
        {/* Decorative gel blob */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #f472b6, #a855f7)" }}
          aria-hidden="true"
        />

        <div className="p-4 flex flex-col gap-2.5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                {slimeName}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {brandName}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${typeStyle.bg} ${typeStyle.text}`}
            >
              {typeStyle.label}
            </span>
          </div>

          {/* Rating */}
          <Stars rating={log.rating_overall} />

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-pink-50">
            <div className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                style={{
                  background: "linear-gradient(135deg, #f472b6, #a855f7)",
                }}
                aria-hidden="true"
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-gray-500">@{username}</span>
            </div>
            <time
              className="text-[11px] text-gray-400"
              dateTime={log.created_at}
            >
              {timeAgo}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
        style={{ background: "linear-gradient(135deg, #fce7f3, #f3e8ff)" }}
      >
        🫧
      </div>
      <p className="text-gray-700 font-semibold">No logs yet</p>
      <p className="text-sm text-gray-400 max-w-xs">
        Be the first to log a slime and get this feed poppin'.
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  // Next.js 16: cookies() must be awaited before passing to createServerClient
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

  const { data: logs, error } = await supabase
    .from("collection_logs")
    .select(
      `
      id,
      created_at,
      slime_name,
      brand_name_raw,
      slime_type,
      rating_overall,
      profiles!collection_logs_user_id_fkey ( username ),
      brands ( name )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const feedLogs = (error ? [] : (logs ?? [])) as unknown as FeedLog[];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <header className="px-4 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl" aria-hidden="true">
            🫧
          </span>
          <h1
            className="text-2xl font-black tracking-tight"
            style={{
              background: "linear-gradient(90deg, #ec4899, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            SlimeLog
          </h1>
        </div>
        <p className="text-sm text-gray-500 pl-9">
          What the community is logging
        </p>
      </header>

      {/* ── Feed ────────────────────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-500">
            Couldn't load the feed right now — try refreshing.
          </div>
        )}

        {feedLogs.length === 0 && !error ? (
          <EmptyFeed />
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4 font-medium uppercase tracking-wider">
              Recent logs · {feedLogs.length} shown
            </p>
            <div className="flex flex-col gap-3">
              {feedLogs.map((log) => (
                <FeedCard key={log.id} log={log} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
