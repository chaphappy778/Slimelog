// ============================================================
// File: apps/web/app/users/[username]/page.tsx
// Public user profile — no auth required to VIEW.
// Shows avatar, bio, stats, recent public logs, follow button.
// ============================================================

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowUserButton from "@/components/FollowUserButton";
import { formatDistanceToNow } from "date-fns";

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
  butter: { bg: "bg-yellow-100", text: "text-yellow-700" },
  clear: { bg: "bg-sky-100", text: "text-sky-700" },
  cloud: { bg: "bg-slate-100", text: "text-slate-600" },
  icee: { bg: "bg-cyan-100", text: "text-cyan-700" },
  fluffy: { bg: "bg-pink-100", text: "text-pink-600" },
  floam: { bg: "bg-lime-100", text: "text-lime-700" },
  snow_fizz: { bg: "bg-blue-50", text: "text-blue-500" },
  thick_and_glossy: { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  jelly: { bg: "bg-violet-100", text: "text-violet-700" },
  beaded: { bg: "bg-orange-100", text: "text-orange-600" },
  clay: { bg: "bg-amber-100", text: "text-amber-700" },
  cloud_cream: { bg: "bg-rose-50", text: "text-rose-500" },
  magnetic: { bg: "bg-zinc-200", text: "text-zinc-700" },
  thermochromic: { bg: "bg-purple-100", text: "text-purple-700" },
  avalanche: { bg: "bg-indigo-100", text: "text-indigo-600" },
  slay: { bg: "bg-red-100", text: "text-red-600" },
};

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`text-xs ${n <= rating ? "text-pink-500" : "text-gray-200"}`}
        >
          ★
        </span>
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
  // Next.js 16 — params is async
  const { username } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { get: (name) => cookieStore.get(name)?.value },
    },
  );

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, bio, avatar_url, location, website_url, is_premium, is_verified",
    )
    .eq("username", username)
    .single();

  if (!profile) notFound();

  // ── Current user (for follow button) ─────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  // ── Is current user already following this profile? ───────────────────────
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

  // ── Follower / following counts ───────────────────────────────────────────
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

  // ── Recent public logs (last 6) ───────────────────────────────────────────
  const { data: logs } = await supabase
    .from("collection_logs")
    .select(
      "id, created_at, slime_name, brand_name_raw, slime_type, rating_overall, brands ( name )",
    )
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(6);

  // ── Collection stats ──────────────────────────────────────────────────────
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

  // Favorite slime type — most logged
  const typeCounts: Record<string, number> = {};
  for (const l of allLogs ?? []) {
    if (l.slime_type)
      typeCounts[l.slime_type] = (typeCounts[l.slime_type] ?? 0) + 1;
  }
  const favoriteType =
    Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteTypeStyle = favoriteType ? TYPE_STYLE[favoriteType] : null;

  const avatarInitial = (profile.username ?? "?").charAt(0).toUpperCase();

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      {/* ── Back link ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-pink-500 transition-colors"
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

      {/* ── Profile card ────────────────────────────────────────────────── */}
      <header className="px-4 pt-6 pb-4">
        <div className="bg-white rounded-3xl border border-pink-50 shadow-sm p-5">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={`${profile.username}'s avatar`}
                className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-pink-100"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black shrink-0 ring-2 ring-pink-100"
                style={{
                  background: "linear-gradient(135deg, #f472b6, #a855f7)",
                }}
                aria-hidden="true"
              >
                {avatarInitial}
              </div>
            )}

            {/* Name + actions */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-lg text-gray-900 tracking-tight">
                  @{profile.username}
                </h1>
                {profile.is_verified && (
                  <span className="text-[10px] font-semibold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                )}
                {profile.is_premium && (
                  <span className="text-[10px] font-semibold bg-pink-100 text-pink-500 px-2 py-0.5 rounded-full">
                    ✦ Pro
                  </span>
                )}
              </div>
              {profile.location && (
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {profile.location}
                </p>
              )}
              {profile.bio && (
                <p className="text-sm text-gray-600 mt-2 leading-snug">
                  {profile.bio}
                </p>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-pink-400 hover:text-pink-500 mt-1 inline-block truncate max-w-full"
                >
                  {profile.website_url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>

          {/* Follow counts + button */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-pink-50">
            <div className="flex gap-4">
              <div className="text-center">
                <p className="font-black text-gray-900 text-base">
                  {followerCount ?? 0}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Followers
                </p>
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 text-base">
                  {followingCount ?? 0}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Following
                </p>
              </div>
              <div className="text-center">
                <p className="font-black text-gray-900 text-base">
                  {totalLogged}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                  Logged
                </p>
              </div>
            </div>
            <FollowUserButton
              targetUserId={profile.id}
              currentUserId={currentUserId}
              initialIsFollowing={initialIsFollowing}
            />
          </div>
        </div>
      </header>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <section className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          {/* Total logged */}
          <div className="bg-white rounded-2xl border border-pink-50 shadow-sm p-3 text-center">
            <p className="text-2xl font-black text-gray-900">{totalLogged}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
              Slimes logged
            </p>
          </div>
          {/* Avg rating */}
          <div className="bg-white rounded-2xl border border-pink-50 shadow-sm p-3 text-center">
            <p className="text-2xl font-black text-gray-900">
              {avgRating ?? "—"}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
              Avg rating
            </p>
          </div>
          {/* Fav type */}
          <div className="bg-white rounded-2xl border border-pink-50 shadow-sm p-3 text-center flex flex-col items-center justify-center gap-1">
            {favoriteType && favoriteTypeStyle ? (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${favoriteTypeStyle.bg} ${favoriteTypeStyle.text}`}
              >
                {TYPE_LABELS[favoriteType] ?? favoriteType}
              </span>
            ) : (
              <span className="text-xl font-black text-gray-900">—</span>
            )}
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">
              Fav type
            </p>
          </div>
        </div>
      </section>

      {/* ── Recent logs ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <h2 className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3">
          Recent logs
        </h2>

        {!logs || logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
              style={{
                background: "linear-gradient(135deg, #fce7f3, #f3e8ff)",
              }}
            >
              🫧
            </div>
            <p className="text-sm text-gray-500">No public logs yet</p>
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
                  <article className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4 transition-all duration-100 group-hover:shadow-md group-active:scale-[0.98]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {log.slime_name ?? "Untitled slime"}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {brandName}
                        </p>
                      </div>
                      {typeStyle && log.slime_type && (
                        <span
                          className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeStyle.bg} ${typeStyle.text}`}
                        >
                          {TYPE_LABELS[log.slime_type] ?? log.slime_type}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Stars rating={log.rating_overall} />
                      <time
                        className="text-[11px] text-gray-400"
                        dateTime={log.created_at}
                      >
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                        })}
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
