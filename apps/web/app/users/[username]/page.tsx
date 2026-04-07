// apps/web/app/users/[username]/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowUserButton from "@/components/FollowUserButton";
import ReportButton from "@/components/ReportButton"; // [Change 1] Import ReportButton
// [Change 2] Removed: import { formatDistanceToNow } from "date-fns"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  butter: "Butter",
  clear: "Clear",
  cloud: "Cloud",
  icee: "Icee",
  fluffy: "Fluffy",
  floam: "Floam",
  snow_fizz: "Snow Fizz",
  thick_and_glossy: "Thick & Glossy",
  jelly: "Jelly",
  beaded: "Beaded",
  clay: "Clay",
  cloud_cream: "Cloud Cream",
  magnetic: "Magnetic",
  thermochromic: "Thermochromic",
  avalanche: "Avalanche",
  slay: "Slay",
};

const TYPE_STYLE: Record<string, { bg: string; text: string }> = {
  butter: { bg: "bg-yellow-900/40", text: "text-yellow-300" },
  clear: { bg: "bg-sky-900/40", text: "text-sky-300" },
  cloud: { bg: "bg-slate-800", text: "text-slate-300" },
  icee: { bg: "bg-cyan-900/40", text: "text-cyan-300" },
  fluffy: { bg: "bg-pink-900/40", text: "text-pink-300" },
  floam: { bg: "bg-lime-900/40", text: "text-lime-300" },
  snow_fizz: { bg: "bg-blue-900/40", text: "text-blue-300" },
  thick_and_glossy: { bg: "bg-fuchsia-900/40", text: "text-fuchsia-300" },
  jelly: { bg: "bg-violet-900/40", text: "text-violet-300" },
  beaded: { bg: "bg-orange-900/40", text: "text-orange-300" },
  clay: { bg: "bg-amber-900/40", text: "text-amber-300" },
  cloud_cream: { bg: "bg-rose-900/40", text: "text-rose-300" },
  magnetic: { bg: "bg-zinc-800", text: "text-zinc-300" },
  thermochromic: { bg: "bg-purple-900/40", text: "text-purple-300" },
  avalanche: { bg: "bg-indigo-900/40", text: "text-indigo-300" },
  slay: { bg: "bg-red-900/40", text: "text-red-300" },
};

// [Change 2] Inline relative time — replaces formatDistanceToNow from date-fns
function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-slime-muted">—</span>;
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={n <= rating ? "#39FF14" : "rgba(57,255,20,0.15)"}
          aria-hidden="true"
        >
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, bio, avatar_url, location, website_url, is_premium, is_verified",
    )
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  let initialIsFollowing = false;
  if (currentUserId && currentUserId !== profile.id) {
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", profile.id)
      .maybeSingle();
    initialIsFollowing = !!existingFollow;
  }

  const [{ count: followerCount }, { count: followingCount }] =
    await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

  const { data: logs } = await supabase
    .from("collection_logs")
    .select(
      "id, created_at, slime_name, brand_name_raw, slime_type, rating_overall, brands ( name )",
    )
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: allLogs } = await supabase
    .from("collection_logs")
    .select("slime_type, rating_overall")
    .eq("user_id", profile.id)
    .eq("is_public", true);

  const totalLogged = allLogs?.length ?? 0;
  const ratingsOnly = (allLogs ?? []).filter((l) => l.rating_overall != null);
  const avgRating =
    ratingsOnly.length > 0
      ? (
          ratingsOnly.reduce((sum, l) => sum + (l.rating_overall ?? 0), 0) /
          ratingsOnly.length
        ).toFixed(1)
      : null;

  const typeCounts: Record<string, number> = {};
  for (const l of allLogs ?? []) {
    if (l.slime_type)
      typeCounts[l.slime_type] = (typeCounts[l.slime_type] ?? 0) + 1;
  }
  const favoriteType =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const avatarInitial = (profile.username ?? "?").charAt(0).toUpperCase();

  // [Change 1] Show report for logged-in users viewing other profiles
  const showReport = currentUserId !== null && currentUserId !== profile.id;

  return (
    <div className="min-h-screen bg-slime-bg">
      {/* Back link */}
      <div className="px-4 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slime-muted hover:text-slime-accent transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 12L6 8l4-4" />
          </svg>
          Back to feed
        </Link>
      </div>

      {/* Profile card */}
      <header className="px-4 pt-6 pb-4">
        <div className="bg-slime-card rounded-3xl border border-slime-border p-5">
          <div className="flex items-start gap-4">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={`${profile.username}'s avatar`}
                className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-slime-accent/30"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-slime-bg text-xl font-black shrink-0 ring-2 ring-slime-accent/30"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                }}
                aria-hidden="true"
              >
                {avatarInitial}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-lg text-slime-cyan tracking-tight">
                  {profile.username}
                </h1>
                {/* [Change 3] Replaced ✓ character with SVG checkmark */}
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slime-accent/20 text-slime-accent px-2 py-0.5 rounded-full">
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verified
                  </span>
                )}
                {/* [Change 4] Replaced ✦ character with SVG star */}
                {profile.is_premium && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slime-cyan/20 text-slime-cyan px-2 py-0.5 rounded-full">
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                    Pro
                  </span>
                )}
              </div>
              {profile.location && (
                <p className="text-xs text-slime-muted mt-0.5 flex items-center gap-1">
                  {/* [Change 5] Replace pin emoji with SVG */}
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {profile.location}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-slime-text mt-2 leading-snug">
                  {profile.bio}
                </p>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slime-accent hover:text-slime-cyan mt-1 inline-block truncate max-w-full transition-colors"
                >
                  {profile.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>

          {/* Follow counts + button + report */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slime-border">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="font-black text-slime-text text-base">
                  {followerCount ?? 0}
                </p>
                <p className="text-[10px] text-slime-muted uppercase tracking-wider">
                  Followers
                </p>
              </div>
              <div className="text-center">
                <p className="font-black text-slime-text text-base">
                  {followingCount ?? 0}
                </p>
                <p className="text-[10px] text-slime-muted uppercase tracking-wider">
                  Following
                </p>
              </div>
              <div className="text-center">
                <p className="font-black text-slime-text text-base">
                  {totalLogged}
                </p>
                <p className="text-[10px] text-slime-muted uppercase tracking-wider">
                  Logged
                </p>
              </div>
            </div>
            {/* [Change 1] Follow button + Report button side by side */}
            <div className="flex items-center gap-2">
              <FollowUserButton
                targetUserId={profile.id}
                currentUserId={currentUserId}
                initialIsFollowing={initialIsFollowing}
              />
              {showReport && (
                <ReportButton
                  contentType="profile"
                  contentId={profile.id}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <section className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slime-card rounded-2xl border border-slime-border p-3 text-center">
            <p className="text-2xl font-black text-slime-accent">
              {totalLogged}
            </p>
            <p className="text-[10px] text-slime-muted uppercase tracking-wider mt-0.5">
              Slimes logged
            </p>
          </div>
          <div className="bg-slime-card rounded-2xl border border-slime-border p-3 text-center">
            <p className="text-2xl font-black text-slime-cyan">
              {avgRating ?? "—"}
            </p>
            <p className="text-[10px] text-slime-muted uppercase tracking-wider mt-0.5">
              Avg rating
            </p>
          </div>
          <div className="bg-slime-card rounded-2xl border border-slime-border p-3 text-center flex flex-col items-center justify-center gap-1">
            {favoriteType ? (
              <span className="bg-slime-purple text-slime-cyan text-xs font-bold px-2 py-0.5 rounded-full">
                {TYPE_LABELS[favoriteType] ?? favoriteType}
              </span>
            ) : (
              <span className="text-xl font-black text-slime-text">—</span>
            )}
            <p className="text-[10px] text-slime-muted uppercase tracking-wider">
              Fav type
            </p>
          </div>
        </div>
      </section>

      {/* Recent logs */}
      <section className="px-4 pb-24">
        <h2 className="text-xs text-slime-muted font-semibold uppercase tracking-wider mb-3">
          Recent logs
        </h2>

        {/* [Change 5] Replaced bubble emoji with SVG icon in empty state */}
        {!logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-slime-surface border border-slime-border">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <circle
                  cx="8"
                  cy="9"
                  r="1.5"
                  fill="rgba(255,255,255,0.25)"
                  stroke="none"
                />
                <circle
                  cx="15"
                  cy="9"
                  r="1.5"
                  fill="rgba(255,255,255,0.25)"
                  stroke="none"
                />
                <path d="M8 15s1.5 2 4 2 4-2 4-2" />
              </svg>
            </div>
            <p className="text-sm text-slime-muted">No public logs yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {(
              logs as unknown as Array<{
                id: string;
                created_at: string;
                slime_name: string | null;
                brand_name_raw: string | null;
                slime_type: string | null;
                rating_overall: number | null;
                brands: { name: string | null }[] | null;
              }>
            ).map((log) => {
              const typeStyle = log.slime_type
                ? TYPE_STYLE[log.slime_type]
                : null;
              const brandName =
                (log.brands as { name: string | null }[] | null)?.[0]?.name ??
                log.brand_name_raw ??
                "Unknown brand";
              return (
                <Link
                  key={log.id}
                  href={`/slimes/${log.id}`}
                  className="block group"
                >
                  <article className="bg-slime-card rounded-2xl border border-slime-border p-4 transition-all duration-100 group-hover:border-slime-accent/30 group-hover:shadow-slime-sm group-active:scale-[0.98]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slime-text text-sm truncate">
                          {log.slime_name ?? "Untitled slime"}
                        </p>
                        <p className="text-xs text-slime-muted truncate mt-0.5">
                          {brandName}
                        </p>
                      </div>
                      {typeStyle && log.slime_type && (
                        <span className="shrink-0 bg-slime-purple text-slime-cyan text-xs font-bold px-2 py-0.5 rounded-full">
                          {TYPE_LABELS[log.slime_type] ?? log.slime_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Stars rating={log.rating_overall} />
                      {/* [Change 2] Inline relative time replaces formatDistanceToNow */}
                      <time
                        className="text-[11px] text-slime-muted"
                        dateTime={log.created_at}
                      >
                        {formatRelativeTime(log.created_at)}
                      </time>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
