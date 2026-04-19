// apps/web/app/users/[username]/page.tsx
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import FollowUserButton from "@/components/FollowUserButton";
import ReportButton from "@/components/ReportButton";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import Avatar from "@/components/profile/Avatar";
import PublicFeaturedSlimes from "@/components/profile/PublicFeaturedSlimes";
// [Change 1] Import SLIME_TYPE_LABELS from authoritative types module — no local map
import { SLIME_TYPE_LABELS, type SlimeType } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type FeaturedLog = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  slime_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  colors: string[] | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// [Change 10] Inline relative time — no date-fns
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

  // [Change 6][Change 7] Added featured_log_ids, instagram_handle, tiktok_handle, shop_url to select
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, bio, avatar_url, location, website_url, is_premium, is_verified, featured_log_ids, instagram_handle, tiktok_handle, shop_url",
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

  // [Change 6] Fetch featured log rows, preserving the order of featured_log_ids
  const rawFeaturedIds: string[] = profile.featured_log_ids ?? [];
  const featuredIds = rawFeaturedIds.filter((id): id is string => !!id);
  let featuredLogs: FeaturedLog[] = [];

  if (featuredIds.length > 0) {
    const { data: featuredData } = await supabase
      .from("collection_logs")
      .select(
        "id, slime_name, brand_name_raw, slime_type, rating_overall, image_url, colors",
      )
      .in("id", featuredIds)
      .eq("is_public", true);

    const byId: Record<string, FeaturedLog> = {};
    for (const row of featuredData ?? []) {
      byId[row.id] = row as FeaturedLog;
    }
    featuredLogs = featuredIds.map((id) => byId[id]).filter(Boolean);
  }

  const showReport = currentUserId !== null && currentUserId !== profile.id;

  // [Change 7] Build social link visibility — null-safe
  const hasSocialLinks =
    !!profile.instagram_handle || !!profile.tiktok_handle || !!profile.shop_url;

  // [Change 9] PageWrapper + PageHeader replace plain "Back to feed" link
  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <div className="pt-14">
        {/* Profile card */}
        <header className="px-4 pt-6 pb-4">
          {/* [Change 8] position:relative on card so absolute-positioned ReportButton
              in top-right doesn't clip. No overflow:hidden on this container so the
              ReportButton dropdown (which uses openUpward viewport detection internally)
              can render beyond the card edge if needed. */}
          <div
            className="relative rounded-3xl p-5"
            style={{
              background: "rgba(45,10,78,0.25)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            {/* [Change 8] Report button — absolute top-right of card */}
            {showReport && (
              <div className="absolute top-3 right-3 z-10">
                <ReportButton
                  contentType="profile"
                  contentId={profile.id}
                  currentUserId={currentUserId}
                />
              </div>
            )}

            <div className="flex items-start gap-4">
              {/* [Change 2] Avatar extracted to client component with onError fallback */}
              <Avatar
                avatarUrl={profile.avatar_url}
                username={profile.username}
                size={64}
              />

              <div className="flex-1 min-w-0 pr-16">
                {/* [Change 12] Username in slime-cyan, font-black */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-black text-lg text-slime-cyan tracking-tight">
                    {profile.username}
                  </h1>
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

                {/* [Change 4] Location with SVG pin icon */}
                {profile.location && (
                  <p className="text-xs text-slime-muted mt-0.5 flex items-center gap-1">
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

                {/* [Change 3] Bio rendered with dark-theme styling */}
                {profile.bio && (
                  <p className="text-sm text-slime-text mt-2 leading-snug">
                    {profile.bio}
                  </p>
                )}

                {/* [Change 5] Website link, new tab, rel=noopener noreferrer */}
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

            {/* [Change 7] Social links row — icon-only 36x36 circular pill buttons */}
            {hasSocialLinks && (
              <div className="flex items-center gap-2 mt-4">
                {profile.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Instagram profile: @${profile.instagram_handle}`}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:text-slime-accent"
                    style={{
                      background: "rgba(45,10,78,0.25)",
                      border: "1px solid rgba(45,10,78,0.7)",
                      color: "#00F0FF",
                    }}
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
                      aria-hidden="true"
                    >
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                )}
                {profile.tiktok_handle && (
                  <a
                    href={`https://www.tiktok.com/@${profile.tiktok_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`TikTok profile: @${profile.tiktok_handle}`}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:text-slime-accent"
                    style={{
                      background: "rgba(45,10,78,0.25)",
                      border: "1px solid rgba(45,10,78,0.7)",
                      color: "#00F0FF",
                    }}
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
                      aria-hidden="true"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </a>
                )}
                {profile.shop_url && (
                  <a
                    href={profile.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Shop: ${profile.shop_url}`}
                    className="flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:text-slime-accent"
                    style={{
                      background: "rgba(45,10,78,0.25)",
                      border: "1px solid rgba(45,10,78,0.7)",
                      color: "#00F0FF",
                    }}
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
                      aria-hidden="true"
                    >
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* [Change 8] Follow counts + Follow button only — Report button moved to top-right */}
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
              <FollowUserButton
                targetUserId={profile.id}
                currentUserId={currentUserId}
                initialIsFollowing={initialIsFollowing}
              />
            </div>
          </div>
        </header>

        {/* [Change 6] Featured Slimes — read-only, returns null when empty */}
        <PublicFeaturedSlimes featuredLogs={featuredLogs} />

        {/* [Change 12] Stats row — dark neon styling */}
        <section className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2">
            <div
              className="rounded-2xl p-3 text-center"
              style={{
                background: "rgba(45,10,78,0.25)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <p className="text-2xl font-black text-slime-accent">
                {totalLogged}
              </p>
              <p className="text-[10px] text-slime-muted uppercase tracking-wider mt-0.5">
                Slimes logged
              </p>
            </div>
            <div
              className="rounded-2xl p-3 text-center"
              style={{
                background: "rgba(45,10,78,0.25)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <p className="text-2xl font-black text-slime-cyan">
                {avgRating ?? "—"}
              </p>
              <p className="text-[10px] text-slime-muted uppercase tracking-wider mt-0.5">
                Avg rating
              </p>
            </div>
            <div
              className="rounded-2xl p-3 text-center flex flex-col items-center justify-center gap-1"
              style={{
                background: "rgba(45,10,78,0.25)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              {favoriteType ? (
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255,0,229,0.12)",
                    color: "#FF00E5",
                    border: "1px solid rgba(255,0,229,0.3)",
                  }}
                >
                  {/* [Change 1] SLIME_TYPE_LABELS from @/lib/types */}
                  {SLIME_TYPE_LABELS[favoriteType as SlimeType] ?? favoriteType}
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

          {/* [Change 11] SVG-only icons — no emoji anywhere */}
          {!logs || logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(45,10,78,0.25)",
                  border: "1px solid rgba(45,10,78,0.7)",
                }}
              >
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
                const brandName =
                  (log.brands as { name: string | null }[] | null)?.[0]?.name ??
                  log.brand_name_raw ??
                  "Unknown brand";
                // [Change 1] SLIME_TYPE_LABELS from @/lib/types
                const typeLabel =
                  (log.slime_type &&
                    SLIME_TYPE_LABELS[log.slime_type as SlimeType]) ??
                  log.slime_type ??
                  null;
                return (
                  <Link
                    key={log.id}
                    href={`/slimes/${log.id}`}
                    className="block group"
                  >
                    {/* [Hover fix] Border moved from inline style to Tailwind arbitrary-value
                        class so group-hover:border-slime-accent/30 can actually override it.
                        Inline style keeps background only. */}
                    <article
                      className="rounded-2xl p-4 border border-[rgba(45,10,78,0.7)] transition-all duration-100 group-hover:border-slime-accent/30 group-active:scale-[0.98]"
                      style={{ background: "rgba(45,10,78,0.25)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slime-text text-sm truncate">
                            {log.slime_name ?? "Untitled slime"}
                          </p>
                          <p className="text-xs text-slime-muted truncate mt-0.5">
                            {brandName}
                          </p>
                        </div>
                        {typeLabel && log.slime_type && (
                          <span
                            className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: "rgba(255,0,229,0.12)",
                              color: "#FF00E5",
                              border: "1px solid rgba(255,0,229,0.3)",
                            }}
                          >
                            {typeLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Stars rating={log.rating_overall} />
                        {/* [Change 10] Inline formatRelativeTime helper */}
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
    </PageWrapper>
  );
}
