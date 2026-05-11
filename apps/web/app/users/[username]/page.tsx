// apps/web/app/users/[username]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import FollowUserButton from "@/components/FollowUserButton";
import PublicFeaturedSlimes from "@/components/profile/PublicFeaturedSlimes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website_url: string | null;
  is_verified: boolean | null;
  is_brand: boolean | null;
  featured_log_ids: string[] | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  shop_url: string | null;
  is_premium: boolean | null;
  created_at: string;
}

interface RecentLog {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  base_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  created_at: string;
  in_wishlist: boolean | null;
}

// ─── Server-side Supabase helper ──────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );
}

// ─── Profile fetch — uses profiles_public view (#35) ──────────────────────────
// [Change 1 — #35] Profile fetch swapped from `profiles` table to
// `profiles_public` view. The view filters out `profile_visibility = 'private'`
// rows automatically and exposes only safe columns. Owner self-reads
// elsewhere in the app keep using the base table.

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles_public")
    .select(
      "id, username, display_name, avatar_url, bio, location, website_url, is_verified, is_brand, featured_log_ids, instagram_handle, tiktok_handle, shop_url, is_premium, created_at",
    )
    .eq("username", username)
    .maybeSingle();

  return (data as PublicProfile | null) ?? null;
}

// ─── Metadata (#35) ───────────────────────────────────────────────────────────
// [Change 2 — #35] Added generateMetadata for OG / Twitter cards.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchProfile(username);

  if (!profile) {
    return {
      title: "Profile not found — SlimeLog",
      description: "This SlimeLog profile doesn't exist.",
    };
  }

  const displayName =
    profile.display_name ?? profile.username ?? "SlimeLog user";
  const title = `${displayName} (@${profile.username}) — SlimeLog`;
  const description =
    profile.bio ??
    `Check out ${displayName}'s slime collection on SlimeLog — rate, log, and discover slime products.`;

  const url = `https://slimelog.com/users/${profile.username}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      title,
      description,
      siteName: "SlimeLog",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UserPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await getSupabase();

  // [Change 3 — #35] Fetch via profiles_public.
  const profile = await fetchProfile(username);
  if (!profile) {
    notFound();
  }

  // Current viewer (may be null for logged-out)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  // Follow state — only meaningful when logged in
  let initialIsFollowing = false;
  if (currentUserId && currentUserId !== profile.id) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", profile.id)
      .maybeSingle();
    initialIsFollowing = !!followRow;
  }

  // Stats — counts from public-readable tables
  const [
    { count: collectionCount },
    { count: followerCount },
    { count: followingCount },
  ] = await Promise.all([
    supabase
      .from("collection_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .eq("in_collection", true),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profile.id),
  ]);

  // Featured logs — fetch real log rows for the IDs the owner picked.
  // Preserves owner's chosen display order.
  let featuredLogs: Array<{
    id: string;
    slime_name: string | null;
    brand_name_raw: string | null;
    base_type: string | null;
    rating_overall: number | null;
    image_url: string | null;
    colors: string[] | null;
  }> = [];

  if (profile.featured_log_ids && profile.featured_log_ids.length > 0) {
    const { data: featuredRows } = await supabase
      .from("collection_logs")
      .select(
        "id, slime_name, brand_name_raw, base_type, rating_overall, image_url, colors",
      )
      .in("id", profile.featured_log_ids)
      .eq("is_public", true);

    if (featuredRows) {
      // Restore owner's display order (the .in() query doesn't guarantee order)
      const byId = new Map(
        (featuredRows as typeof featuredLogs).map((r) => [r.id, r]),
      );
      featuredLogs = profile.featured_log_ids
        .map((id) => byId.get(id))
        .filter((r): r is (typeof featuredLogs)[number] => r != null);
    }
  }

  // Recent logs — already filters is_public = true (preserved).
  const { data: recentRows } = await supabase
    .from("collection_logs")
    .select(
      "id, slime_name, brand_name_raw, base_type, rating_overall, image_url, created_at, in_wishlist",
    )
    .eq("user_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const recentLogs = (recentRows ?? []) as RecentLog[];

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <main className="pt-14 pb-24 px-4 max-w-2xl mx-auto">
        {/* Profile header */}
        <section className="mt-6 mb-6 flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div
            className="relative w-24 h-24 rounded-full overflow-hidden border-2"
            style={{ borderColor: "rgba(57,255,20,0.4)" }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name ?? profile.username ?? "Profile"}
                fill
                sizes="96px"
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                  fontSize: 36,
                  fontWeight: 900,
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
                aria-hidden="true"
              >
                {(profile.display_name ?? profile.username ?? "?")
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}
          </div>

          {/* Name + handle */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-black"
                style={{
                  fontFamily: "Montserrat, Inter, sans-serif",
                  color: "#fff",
                }}
              >
                {profile.display_name ?? profile.username}
              </h1>
              {profile.is_verified && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="#00F0FF"
                  aria-label="Verified"
                >
                  <path d="M12 0l3.09 5.26L21 6l-4.5 4.39L17.18 17 12 14.27 6.82 17l.68-6.61L3 6l5.91-.74L12 0z" />
                </svg>
              )}
              {profile.is_premium && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(57,255,20,0.15)",
                    color: "#39FF14",
                    border: "1px solid rgba(57,255,20,0.4)",
                    letterSpacing: "0.05em",
                  }}
                >
                  PRO
                </span>
              )}
            </div>
            <p className="text-sm text-slime-muted">@{profile.username}</p>
          </div>

          {/* Bio + location + website */}
          {profile.bio && (
            <p className="text-sm text-slime-text/80 max-w-md leading-relaxed mt-1">
              {profile.bio}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slime-muted">
            {profile.location && <span>{profile.location}</span>}
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slime-cyan hover:underline"
              >
                {profile.website_url.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-3">
            <div className="flex flex-col items-center">
              <span
                className="text-lg font-black"
                style={{
                  color: "#39FF14",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {collectionCount ?? 0}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                Logs
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span
                className="text-lg font-black"
                style={{
                  color: "#00F0FF",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {followerCount ?? 0}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                Followers
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span
                className="text-lg font-black"
                style={{
                  color: "#FF00E5",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {followingCount ?? 0}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                Following
              </span>
            </div>
          </div>

          {/* Follow button — renders for logged-out too (routes to signup). */}
          <div className="mt-2">
            <FollowUserButton
              targetUserId={profile.id}
              currentUserId={currentUserId}
              initialIsFollowing={initialIsFollowing}
            />
          </div>

          {/* Social links */}
          {(profile.instagram_handle ||
            profile.tiktok_handle ||
            profile.shop_url) && (
            <div className="flex items-center gap-3 mt-2">
              {profile.instagram_handle && (
                <a
                  href={`https://instagram.com/${profile.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-slime-muted hover:text-slime-magenta transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
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
                  href={`https://tiktok.com/@${profile.tiktok_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok"
                  className="text-slime-muted hover:text-slime-cyan transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.21 16.74a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.24-.36z" />
                  </svg>
                </a>
              )}
              {profile.shop_url && (
                <a
                  href={profile.shop_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Shop"
                  className="text-slime-muted hover:text-slime-accent transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
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
        </section>

        {/* Featured slimes */}
        {featuredLogs.length > 0 && (
          <section className="mb-8">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-3"
              style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
            >
              Featured
            </h2>
            <PublicFeaturedSlimes featuredLogs={featuredLogs} />
          </section>
        )}

        {/* Recent logs grid */}
        <section>
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#39FF14", fontFamily: "Montserrat, sans-serif" }}
          >
            Recent Logs
          </h2>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-slime-muted text-center py-12">
              No public logs yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentLogs.map((log) => (
                <Link
                  key={log.id}
                  href={`/slimes/${log.id}`}
                  className="block rounded-xl overflow-hidden border border-slime-border bg-slime-card hover:border-slime-accent/50 transition-colors"
                >
                  <div
                    className="relative w-full aspect-square bg-slime-surface"
                    style={{ background: "rgba(45,10,78,0.3)" }}
                  >
                    {log.image_url ? (
                      <Image
                        src={log.image_url}
                        alt={log.slime_name ?? "Slime"}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slime-muted">
                        <svg
                          width="32"
                          height="32"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
                        </svg>
                      </div>
                    )}
                    {log.in_wishlist && (
                      <span
                        className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background: "rgba(204,68,255,0.85)",
                          color: "#0A0A0A",
                        }}
                      >
                        WISH
                      </span>
                    )}
                    {typeof log.rating_overall === "number" && (
                      <span
                        className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background: "rgba(10,10,10,0.7)",
                          color: "#39FF14",
                        }}
                      >
                        {log.rating_overall}/5
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold text-slime-text line-clamp-1">
                      {log.slime_name ?? "Unnamed"}
                    </p>
                    {log.brand_name_raw && (
                      <p className="text-[10px] text-slime-cyan line-clamp-1">
                        {log.brand_name_raw}
                      </p>
                    )}
                    <p className="text-[10px] text-slime-muted mt-0.5">
                      {formatRelativeTime(log.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </PageWrapper>
  );
}
