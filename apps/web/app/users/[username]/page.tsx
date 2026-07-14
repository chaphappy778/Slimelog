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
import ShareButton from "@/components/ShareButton";
import PublicFeaturedSlimes from "@/components/profile/PublicFeaturedSlimes";

// ─── Types ────────────────────────────────────────────────────────────────────

// [Change 1] — display_name removed; background_url and favorite_brand_id added
interface PublicProfile {
  id: string;
  username: string | null;
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
  youtube_handle: string | null;
  pinterest_handle: string | null;
  twitter_handle: string | null;
  is_premium: boolean | null;
  created_at: string;
  background_url: string | null;
  favorite_brand_id: string | null;
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

interface FavoriteBrand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface ProfileLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
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

// ─── Profile fetch — uses profiles_public view ────────────────────────────────

async function fetchProfile(username: string): Promise<PublicProfile | null> {
  const supabase = await getSupabase();
  // [Change 1] — display_name removed; background_url and favorite_brand_id added
  const { data } = await supabase
    .from("profiles_public")
    .select(
      "id, username, avatar_url, bio, location, website_url, is_verified, is_brand, featured_log_ids, instagram_handle, tiktok_handle, shop_url, youtube_handle, pinterest_handle, twitter_handle, is_premium, created_at, background_url, favorite_brand_id",
    )
    .eq("username", username)
    .maybeSingle();

  return (data as PublicProfile | null) ?? null;
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

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

  // [Change 1] — use username only, no display_name
  const title = `@${profile.username ?? "SlimeLog user"} — SlimeLog`;
  const description =
    profile.bio ??
    `Check out @${profile.username}'s slime collection on SlimeLog — rate, log, and discover slime products.`;

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
      const byId = new Map(
        (featuredRows as typeof featuredLogs).map((r) => [r.id, r]),
      );
      featuredLogs = profile.featured_log_ids
        .map((id) => byId.get(id))
        .filter((r): r is (typeof featuredLogs)[number] => r != null);
    }
  }

  // Recent logs
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

  // [Change 3] — Fetch favorite brand if set
  let favoriteBrand: FavoriteBrand | null = null;
  if (profile.favorite_brand_id) {
    const { data: brandRow } = await supabase
      .from("brands")
      .select("id, name, slug, logo_url")
      .eq("id", profile.favorite_brand_id)
      .maybeSingle();
    favoriteBrand = (brandRow as FavoriteBrand | null) ?? null;
  }

  // [Change 4] — Fetch affiliate links
  const { data: linksRows } = await supabase
    .from("profile_links")
    .select("id, label, url, sort_order")
    .eq("user_id", profile.id)
    .order("sort_order", { ascending: true })
    .limit(5);

  const profileLinks = (linksRows ?? []) as ProfileLink[];

  return (
    <PageWrapper dots glow="cyan">
      <PageHeader />

      <main className="pt-14 pb-24 px-4 max-w-2xl mx-auto">
        {/* [Change 2] — Profile header with optional background banner */}
        <div className="relative mt-6 mb-6 rounded-2xl overflow-hidden">
          {profile.background_url && (
            <>
              <div className="absolute inset-0 z-0">
                <Image
                  src={profile.background_url}
                  alt=""
                  fill
                  sizes="(max-width: 672px) 100vw, 672px"
                  className="object-cover"
                  aria-hidden="true"
                />
              </div>
              {/* Dark gradient overlay for readability */}
              <div
                className="absolute inset-0 z-10"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(10,0,20,0.55) 0%, rgba(10,0,20,0.85) 100%)",
                }}
                aria-hidden="true"
              />
            </>
          )}

          <section
            className={`relative z-20 flex flex-col items-center text-center gap-3 ${profile.background_url ? "py-8 px-4" : ""}`}
          >
            {/* Avatar */}
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden border-2"
              style={{ borderColor: "rgba(57,255,20,0.4)" }}
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username ?? "Profile"}
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
                  {/* [Change 1] — initials fallback uses username only */}
                  {(profile.username ?? "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* [Change 1] — h1 shows @username in magenta only; separate handle line removed */}
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <h1
                  className="text-2xl font-black"
                  style={{
                    fontFamily: "Montserrat, Inter, sans-serif",
                    color: "#FF00E5",
                  }}
                >
                  @{profile.username}
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
              <Link
                href={`/users/${profile.username}/followers`}
                className="flex flex-col items-center transition-transform active:scale-[0.96]"
                style={{ textDecoration: "none" }}
              >
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
              </Link>
              <Link
                href={`/users/${profile.username}/following`}
                className="flex flex-col items-center transition-transform active:scale-[0.96]"
                style={{ textDecoration: "none" }}
              >
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
              </Link>
            </div>

            {/* Follow + Share buttons */}
            <div className="mt-2 flex items-center gap-2">
              <FollowUserButton
                targetUserId={profile.id}
                currentUserId={currentUserId}
                initialIsFollowing={initialIsFollowing}
              />
              <ShareButton
                path={`/users/${profile.username}`}
                title={`@${profile.username} on SlimeLog`}
                text={`Check out @${profile.username}'s slime collection on SlimeLog.`}
                label="Share"
              />
            </div>

            {/* Social links */}
            {(profile.instagram_handle ||
              profile.tiktok_handle ||
              profile.shop_url ||
              profile.youtube_handle ||
              profile.pinterest_handle ||
              profile.twitter_handle) && (
              <div className="flex items-center gap-4 mt-2">
                {profile.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="transition-opacity active:opacity-70"
                    style={{ color: "#E1306C" }}
                  >
                    <svg
                      width="20"
                      height="20"
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
                    className="transition-opacity active:opacity-70"
                    style={{ color: "#ffffff" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.21 16.74a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.24-.36z" />
                    </svg>
                  </a>
                )}
                {profile.youtube_handle && (
                  <a
                    href={`https://youtube.com/@${profile.youtube_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="transition-opacity active:opacity-70"
                    style={{ color: "#FF0000" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                )}
                {profile.pinterest_handle && (
                  <a
                    href={`https://pinterest.com/${profile.pinterest_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Pinterest"
                    className="transition-opacity active:opacity-70"
                    style={{ color: "#E60023" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                    </svg>
                  </a>
                )}
                {profile.twitter_handle && (
                  <a
                    href={`https://x.com/${profile.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter / X"
                    className="transition-opacity active:opacity-70"
                    style={{ color: "#ffffff" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {profile.shop_url && (
                  <a
                    href={profile.shop_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Shop"
                    className="transition-opacity active:opacity-70"
                    style={{ color: "#39FF14" }}
                  >
                    <svg
                      width="20"
                      height="20"
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

            {/* [Change 3] — Favorite shop pill */}
            {favoriteBrand && (
              <div className="mt-4 w-full">
                <p
                  className="text-[11px] font-black tracking-widest uppercase mb-2"
                  style={{ color: "#00F0FF" }}
                >
                  Favorite Shop
                </p>
                <Link
                  href={`/brands/${favoriteBrand.slug}`}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-full transition-opacity active:opacity-70"
                  style={{
                    background: "rgba(45,10,78,0.4)",
                    border: "1px solid rgba(45,10,78,0.8)",
                  }}
                >
                  {favoriteBrand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={favoriteBrand.logo_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                      style={{
                        background: "#2D0A4E",
                        color: "#39FF14",
                        border: "1px solid rgba(57,255,20,0.3)",
                      }}
                    >
                      {favoriteBrand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-semibold text-slime-text">
                    {favoriteBrand.name}
                  </span>
                </Link>
              </div>
            )}

            {/* [Change 4] — Affiliate links */}
            {/* [Change 6] — Label renamed from "Links" to "Affiliate Links" */}
            {profileLinks.length > 0 && (
              <div className="mt-4 w-full">
                <p
                  className="text-[11px] font-black tracking-widest uppercase mb-2"
                  style={{ color: "#00F0FF" }}
                >
                  Affiliate Links
                </p>
                <div className="flex flex-col gap-2">
                  {profileLinks.map((link) => (
                    <a
                      key={link.id}
                      // Audit blocker #2 (2026-07-06): render-side scheme
                      // guard. The migration
                      // 20260706000048_audit_blocker_2_profile_links_url_check.sql
                      // adds a DB CHECK that rejects non-http(s) URLs at
                      // insert/update time, but any historical row that
                      // predates the constraint (or slips through via
                      // future privileged writes) needs a fallback.
                      // Anything not matching http(s):// falls through to
                      // '#' so a javascript: or data: URL cannot execute.
                      href={/^https?:\/\//i.test(link.url) ? link.url : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl transition-opacity active:opacity-70"
                      style={{
                        background: "rgba(45,10,78,0.3)",
                        border: "1px solid rgba(45,10,78,0.7)",
                      }}
                    >
                      <span className="text-sm text-slime-text font-medium">
                        {link.label}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* [Change 5 — T88a verify] — Featured slimes: no owner gate present.
            PublicFeaturedSlimes receives featuredLogs for all visitors unconditionally. */}
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
                        {(log.rating_overall as number).toFixed(1)}/5
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
