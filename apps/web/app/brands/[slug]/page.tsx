// apps/web/app/brands/[slug]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import FollowBrandButton from "@/components/FollowBrandButton";
import { SLIME_TYPE_LABELS } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Brand {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  shopify_url: string | null;
  is_verified: boolean | null;
  follower_count: number | null;
  created_at: string;
}

interface BrandSlimeRow {
  id: string;
  user_id: string;
  slime_name: string | null;
  slime_type: string | null;
  rating_overall: number | null;
  image_url: string | null;
  created_at: string;
  // [Change 1 — #35] Profile join swapped to profiles_public.
  profiles_public:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
}

interface UpcomingDrop {
  id: string;
  drop_name: string;
  description: string | null;
  drop_date: string;
  status: string | null;
  cover_image_url: string | null;
}

// ─── Server Supabase ──────────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );
}

async function fetchBrand(slug: string): Promise<Brand | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Brand | null) ?? null;
}

// ─── Profile normaliser ───────────────────────────────────────────────────────

function normaliseProfile(
  raw:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null,
): { username: string | null; avatar_url: string | null } | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

// ─── Metadata (#35) ───────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrand(slug);

  if (!brand) {
    return {
      title: "Brand not found — SlimeLog",
      description: "This brand isn't on SlimeLog.",
    };
  }

  const title = `${brand.name} — SlimeLog`;
  const description =
    brand.bio?.trim() ||
    `See what slimers are saying about ${brand.name} on SlimeLog. Rate, log, and discover slime products from ${brand.name}.`;

  const url = `https://slimelog.com/brands/${brand.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "SlimeLog",
      ...(brand.banner_url
        ? { images: [{ url: brand.banner_url }] }
        : brand.logo_url
          ? { images: [{ url: brand.logo_url }] }
          : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(brand.banner_url
        ? { images: [brand.banner_url] }
        : brand.logo_url
          ? { images: [brand.logo_url] }
          : {}),
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

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);

  if (!brand) {
    notFound();
  }

  const supabase = await getSupabase();

  // Avg rating + log count for the brand
  const { data: ratingRows } = await supabase
    .from("collection_logs")
    .select("rating_overall")
    .eq("brand_name_raw", brand.name)
    .eq("is_public", true)
    .not("rating_overall", "is", null);

  const ratings = (ratingRows ?? [])
    .map((r) => r.rating_overall as number | null)
    .filter((r): r is number => r !== null);
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;
  const logCount = ratings.length;

  // [Change 2 — #35] Recent community logs query — ADDED is_public = true
  // filter (was missing — pre-existing privacy bug). Profile join swapped
  // to profiles_public.
  const { data: communityRows } = await supabase
    .from("collection_logs")
    .select(
      `id, user_id, slime_name, slime_type, rating_overall, image_url, created_at,
       profiles_public!collection_logs_user_id_fkey ( username, avatar_url )`,
    )
    .eq("brand_name_raw", brand.name)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const communityLogs = (communityRows ?? []) as unknown as BrandSlimeRow[];

  // Upcoming drops (only active / scheduled, not cancelled)
  const { data: dropRows } = await supabase
    .from("drops")
    .select("id, drop_name, description, drop_date, status, cover_image_url")
    .eq("brand_id", brand.id)
    .neq("status", "cancelled")
    .gte("drop_date", new Date().toISOString())
    .order("drop_date", { ascending: true })
    .limit(3);

  const upcomingDrops = (dropRows ?? []) as UpcomingDrop[];

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-14 pb-24 max-w-2xl mx-auto">
        {/* Banner */}
        <div
          className="relative w-full h-40 sm:h-56"
          style={{
            background: brand.banner_url
              ? undefined
              : "linear-gradient(135deg, rgba(45,10,78,0.5), rgba(0,240,255,0.15))",
          }}
        >
          {brand.banner_url && (
            <Image
              src={brand.banner_url}
              alt={`${brand.name} banner`}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          )}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(10,10,10,0.85) 100%)",
            }}
          />
        </div>

        {/* Header section */}
        <section className="px-4 -mt-10 relative z-10">
          <div className="flex items-end gap-4">
            {/* Logo */}
            <div
              className="relative w-20 h-20 rounded-2xl border-2 overflow-hidden shrink-0"
              style={{
                borderColor: "#0A0A0A",
                background: "rgba(45,10,78,0.6)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
              }}
            >
              {brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt={brand.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-3xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                    fontFamily: "Montserrat, Inter, sans-serif",
                  }}
                  aria-hidden="true"
                >
                  {brand.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <FollowBrandButton
                brandId={brand.id}
                brandSlug={brand.slug}
                initialFollowerCount={brand.follower_count ?? 0}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <h1
              className="text-2xl font-black"
              style={{
                color: "#fff",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              {brand.name}
            </h1>
            {brand.is_verified && (
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
          </div>

          {brand.bio && (
            <p className="mt-2 text-sm leading-relaxed text-slime-text/80">
              {brand.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-6">
            {avgRating !== null && (
              <div className="flex flex-col">
                <span
                  className="text-xl font-black leading-none"
                  style={{
                    color: "#39FF14",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {avgRating.toFixed(1)}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold mt-1">
                  Avg Rating
                </span>
              </div>
            )}
            <div className="flex flex-col">
              <span
                className="text-xl font-black leading-none"
                style={{
                  color: "#00F0FF",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {logCount}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold mt-1">
                Logs
              </span>
            </div>
            <div className="flex flex-col">
              <span
                className="text-xl font-black leading-none"
                style={{
                  color: "#FF00E5",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {brand.follower_count ?? 0}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold mt-1">
                Followers
              </span>
            </div>
          </div>

          {/* Social links — [Boyscout #35] Replaced emoji with SVG icons.
              Was: 🌐 🛍️ 📸 🎵
              Now: globe / shopping bag / camera-square / music-note */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {brand.website_url && (
              <a
                href={brand.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slime-muted hover:text-slime-cyan transition-colors flex items-center gap-1.5 text-xs"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                Website
              </a>
            )}
            {brand.shopify_url && (
              <a
                href={brand.shopify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slime-muted hover:text-slime-accent transition-colors flex items-center gap-1.5 text-xs"
              >
                <svg
                  width="14"
                  height="14"
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
                Shop
              </a>
            )}
            {brand.instagram_handle && (
              <a
                href={`https://instagram.com/${brand.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slime-muted hover:text-slime-magenta transition-colors flex items-center gap-1.5 text-xs"
              >
                <svg
                  width="14"
                  height="14"
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
                Instagram
              </a>
            )}
            {brand.tiktok_handle && (
              <a
                href={`https://tiktok.com/@${brand.tiktok_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slime-muted hover:text-slime-cyan transition-colors flex items-center gap-1.5 text-xs"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.21 16.74a6.34 6.34 0 0 0 10.86-4.43V8.93a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.24-.36z" />
                </svg>
                TikTok
              </a>
            )}
          </div>
        </section>

        {/* Upcoming drops */}
        {upcomingDrops.length > 0 && (
          <section className="px-4 mt-8">
            <h2
              className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: "#39FF14", fontFamily: "Montserrat, sans-serif" }}
            >
              {/* [Boyscout #35] Replaced 📦 emoji with package SVG */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16.5 9.4l-9-5.19" />
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              Upcoming Drops
            </h2>
            <div className="flex flex-col gap-3">
              {upcomingDrops.map((drop) => (
                <Link
                  key={drop.id}
                  href={`/drops/${drop.id}`}
                  className="rounded-xl overflow-hidden border border-slime-border bg-slime-card hover:border-slime-accent/50 transition-colors p-3 flex flex-row items-center gap-3"
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slime-surface">
                    {drop.cover_image_url ? (
                      <Image
                        src={drop.cover_image_url}
                        alt={drop.drop_name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          background:
                            "linear-gradient(135deg, rgba(57,255,20,0.2), rgba(0,240,255,0.2))",
                        }}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="rgba(255,255,255,0.4)"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slime-text line-clamp-1">
                      {drop.drop_name}
                    </p>
                    <p className="text-xs text-slime-muted line-clamp-1">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(drop.drop_date))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Community logs */}
        <section className="px-4 mt-8">
          <h2
            className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
            style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
          >
            {/* [Boyscout #35] Replaced 📋 emoji with clipboard SVG */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 2h6a2 2 0 0 1 2 2v2H7V4a2 2 0 0 1 2-2z" />
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            </svg>
            Recent Community Logs
          </h2>
          {communityLogs.length === 0 ? (
            <p className="text-sm text-slime-muted text-center py-12">
              No public logs for {brand.name} yet. Be the first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {communityLogs.map((row) => {
                const profile = normaliseProfile(row.profiles_public);
                const typeLabel = row.slime_type
                  ? (SLIME_TYPE_LABELS[
                      row.slime_type as keyof typeof SLIME_TYPE_LABELS
                    ] ?? row.slime_type.replace(/_/g, " "))
                  : null;
                return (
                  <Link
                    key={row.id}
                    href={`/slimes/${row.id}`}
                    className="block rounded-xl overflow-hidden border border-slime-border bg-slime-card hover:border-slime-accent/50 transition-colors"
                  >
                    <div className="relative w-full aspect-square bg-slime-surface">
                      {row.image_url ? (
                        <Image
                          src={row.image_url}
                          alt={row.slime_name ?? "Slime"}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(45,10,78,0.4), rgba(0,240,255,0.1))",
                          }}
                        >
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.3)"
                            strokeWidth="1.5"
                            aria-hidden="true"
                          >
                            <path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" />
                          </svg>
                        </div>
                      )}
                      {typeof row.rating_overall === "number" && (
                        <span
                          className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background: "rgba(10,10,10,0.7)",
                            color: "#39FF14",
                          }}
                        >
                          {row.rating_overall}/5
                        </span>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-slime-text line-clamp-1">
                        {row.slime_name ?? "Unnamed"}
                      </p>
                      {typeLabel && (
                        <p className="text-[10px] text-slime-muted line-clamp-1 capitalize">
                          {typeLabel}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0 bg-slime-surface">
                          {profile?.avatar_url ? (
                            <Image
                              src={profile.avatar_url}
                              alt=""
                              fill
                              sizes="16px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="text-[10px] text-slime-magenta truncate">
                          @{profile?.username ?? "unknown"}
                        </span>
                        <span className="text-[10px] text-slime-muted ml-auto shrink-0">
                          {formatRelativeTime(row.created_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </PageWrapper>
  );
}
