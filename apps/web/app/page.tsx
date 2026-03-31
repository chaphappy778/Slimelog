// apps/web/app/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import FeedTabs from "@/components/FeedTabs";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";

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

type ActivityFeedRow = {
  id: string;
  created_at: string;
  actor_id: string;
  activity_type: string;
  log_id: string | null;
  metadata: {
    slime_name?: string | null;
    slime_type?: string | null;
    brand_name_raw?: string | null;
    rating_overall?: number | null;
  } | null;
  profiles: { username: string | null } | { username: string | null }[] | null;
};

// ─── Type badge palette ───────────────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; text: string; label: string }> =
  {
    butter: {
      bg: "bg-yellow-900/40",
      text: "text-yellow-300",
      label: "Butter",
    },
    clear: { bg: "bg-sky-900/40", text: "text-sky-300", label: "Clear" },
    cloud: { bg: "bg-slate-800", text: "text-slate-300", label: "Cloud" },
    icee: { bg: "bg-cyan-900/40", text: "text-cyan-300", label: "Icee" },
    fluffy: { bg: "bg-pink-900/40", text: "text-pink-300", label: "Fluffy" },
    floam: { bg: "bg-lime-900/40", text: "text-lime-300", label: "Floam" },
    snow_fizz: {
      bg: "bg-blue-900/40",
      text: "text-blue-300",
      label: "Snow Fizz",
    },
    thick_and_glossy: {
      bg: "bg-fuchsia-900/40",
      text: "text-fuchsia-300",
      label: "Thick & Glossy",
    },
    jelly: { bg: "bg-violet-900/40", text: "text-violet-300", label: "Jelly" },
    beaded: {
      bg: "bg-orange-900/40",
      text: "text-orange-300",
      label: "Beaded",
    },
    clay: { bg: "bg-amber-900/40", text: "text-amber-300", label: "Clay" },
    cloud_cream: {
      bg: "bg-rose-900/40",
      text: "text-rose-300",
      label: "Cloud Cream",
    },
    magnetic: { bg: "bg-zinc-800", text: "text-zinc-300", label: "Magnetic" },
    thermochromic: {
      bg: "bg-purple-900/40",
      text: "text-purple-300",
      label: "Thermochromic",
    },
    avalanche: {
      bg: "bg-indigo-900/40",
      text: "text-indigo-300",
      label: "Avalanche",
    },
    slay: { bg: "bg-red-900/40", text: "text-red-300", label: "Slay" },
  };

const fallbackType = {
  bg: "bg-slime-surface",
  text: "text-slime-muted",
  label: "Unknown",
};

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number | null }) {
  if (!rating)
    return <span className="text-xs text-slime-muted">No rating</span>;
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`text-sm leading-none ${n <= rating ? "text-slime-accent" : "text-slime-border"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Feed card ────────────────────────────────────────────────────────────────

function FeedCard({ log }: { log: FeedLog }) {
  const typeStyle =
    (log.slime_type && TYPE_STYLE[log.slime_type]) || fallbackType;
  const brandName =
    log.brands?.[0]?.name ?? log.brand_name_raw ?? "Unknown brand";
  const slimeName = log.slime_name ?? "Untitled slime";
  const username = log.profiles?.[0]?.username ?? null;
  const timeAgo = formatDistanceToNow(new Date(log.created_at), {
    addSuffix: true,
  });

  return (
    <Link href={`/slimes/${log.id}`} className="block group">
      <article
        className="relative rounded-2xl overflow-hidden transition-all duration-150 group-hover:shadow-card-purple group-active:scale-[0.98]"
        style={{
          background: "rgba(45,10,78,0.25)",
          border: "1px solid rgba(45,10,78,0.7)",
          backdropFilter: "blur(8px)",
          boxShadow: "inset 0 0 20px rgba(45,10,78,0.1)",
        }}
      >
        {/* inner glow orb */}
        <div
          className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 blur-2xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #39FF14, #00F0FF)" }}
          aria-hidden="true"
        />

        <div className="p-4 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slime-text text-sm leading-tight truncate">
                {slimeName}
              </p>
              <p className="text-xs text-slime-muted truncate mt-0.5">
                {brandName}
              </p>
            </div>
            <span
              className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${typeStyle.bg} ${typeStyle.text}`}
            >
              {typeStyle.label}
            </span>
          </div>

          <Stars rating={log.rating_overall} />

          <div className="flex items-center justify-between pt-1 border-t border-slime-border/50">
            {username ? (
              <Link
                href={`/users/${username}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 group/user"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slime-bg text-[9px] font-bold shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  }}
                  aria-hidden="true"
                >
                  {username.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-slime-magenta group-hover/user:text-slime-accent transition-colors">
                  @{username}
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slime-bg text-[9px] font-bold"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  }}
                  aria-hidden="true"
                >
                  ?
                </div>
                <span className="text-xs text-slime-magenta">@anonymous</span>
              </div>
            )}
            <time
              className="text-[11px] text-slime-muted"
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

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-slime-surface border border-slime-border">
        🫧
      </div>
      <p className="text-slime-text font-semibold">No logs yet</p>
      <p className="text-sm text-slime-muted max-w-xs">
        Be the first to log a slime and get this feed poppin'.
      </p>
    </div>
  );
}

function EmptyFollowingFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-slime-surface border border-slime-border">
        👀
      </div>
      <p className="text-slime-text font-semibold">Nothing here yet</p>
      <p className="text-sm text-slime-muted max-w-xs">
        Follow some slimers to see their logs here.
      </p>
    </div>
  );
}

function LoginPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-slime-surface border border-slime-border">
        🔒
      </div>
      <p className="text-slime-text font-semibold">
        Sign in to see your Following feed
      </p>
      <p className="text-sm text-slime-muted max-w-xs">
        Log in to follow slimers and see their latest ratings here.
      </p>
      <Link
        href="/login"
        className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-slime-bg shadow-glow-green"
        style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      >
        Sign in
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "community";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  if (!isLoggedIn) {
    redirect("/landing");
  }

  let communityLogs: FeedLog[] = [];
  let communityError = false;

  if (activeTab === "community") {
    const { data, error } = await supabase
      .from("collection_logs")
      .select(
        `id, created_at, slime_name, brand_name_raw, slime_type, rating_overall,
         profiles!collection_logs_user_id_fkey ( username ),
         brands ( name )`,
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(20);

    communityLogs = (error ? [] : (data ?? [])) as unknown as FeedLog[];
    communityError = !!error;
  }

  let followingLogs: FeedLog[] = [];
  let followingError = false;

  if (activeTab === "following" && user) {
    const { data: followRows, error: followsErr } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);

    if (followsErr) {
      followingError = true;
    } else {
      const followingIds = (followRows ?? []).map(
        (r) => r.following_id as string,
      );

      if (followingIds.length > 0) {
        const { data: activityRows, error: activityErr } = await supabase
          .from("activity_feed")
          .select(
            `id, created_at, actor_id, log_id, metadata, profiles!activity_feed_actor_id_fkey ( username )`,
          )
          .eq("activity_type", "log_created")
          .in("actor_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(20);

        if (activityErr) {
          followingError = true;
        } else {
          followingLogs = (
            (activityRows ?? []) as unknown as ActivityFeedRow[]
          ).map((row): FeedLog => {
            const meta = row.metadata ?? {};
            const profileObj = Array.isArray(row.profiles)
              ? ((row.profiles as { username: string | null }[])[0] ?? null)
              : (row.profiles as { username: string | null } | null);

            return {
              id: row.log_id ?? row.id,
              created_at: row.created_at,
              slime_name: meta.slime_name ?? null,
              brand_name_raw: meta.brand_name_raw ?? null,
              slime_type: meta.slime_type ?? null,
              rating_overall:
                meta.rating_overall != null
                  ? Number(meta.rating_overall)
                  : null,
              profiles: profileObj ? [{ username: profileObj.username }] : null,
              brands: null,
            };
          });
        }
      }
    }
  }

  const displayLogs = activeTab === "following" ? followingLogs : communityLogs;
  const displayError =
    activeTab === "following" ? followingError : communityError;

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14">
        {/* Feed hero label */}
        <div className="px-4 pt-6 pb-2">
          <p className="section-label">Community Feed</p>
          <p className="text-sm text-slime-muted mt-1">
            What the community is logging
          </p>
        </div>

        <div className="px-4 pb-4">
          <FeedTabs activeTab={activeTab} isLoggedIn={isLoggedIn} />
        </div>

        <section className="px-4 pb-24">
          {activeTab === "following" && !isLoggedIn ? (
            <LoginPrompt />
          ) : (
            <>
              {displayError && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  Couldn't load the feed right now — try refreshing.
                </div>
              )}
              {displayLogs.length === 0 && !displayError ? (
                activeTab === "following" ? (
                  <EmptyFollowingFeed />
                ) : (
                  <EmptyFeed />
                )
              ) : (
                <>
                  <p className="text-xs text-slime-muted mb-4 font-medium uppercase tracking-wider">
                    {activeTab === "following"
                      ? "From people you follow"
                      : "Recent logs"}{" "}
                    · {displayLogs.length} shown
                  </p>
                  <div className="flex flex-col gap-3">
                    {displayLogs.map((log) => (
                      <FeedCard key={log.id} log={log} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </PageWrapper>
  );
}
