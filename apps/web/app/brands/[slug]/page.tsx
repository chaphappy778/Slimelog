// apps/web/app/brands/[slug]/page.tsx
// [Change 1–10 — Drops Overhaul D1] Banner lightbox, BrandWithBanner type,
// updated UpcomingDrop interface, removed catalog query/section, updated drops
// query, hero banner upgrade (200px), -mt-12 logo offset, catalog pill,
// section reorder, DropCard replacement
// [T86] Added canClaim server-side computation

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import FollowBrandButton from "@/components/FollowBrandButton";
import ClaimBrandButton from "@/components/brand/ClaimBrandButton";
import BannerLightbox from "./components/BannerLightbox";
import DropCard from "./components/DropCard";
import { SLIME_BASE_TYPE_LABELS } from "@/lib/types";
import type { Brand, SlimeBaseType, BrandClaimStatus } from "@/lib/types";
import { validateBusinessEmail } from "@/lib/brand-claims";

// ─── Local interfaces ─────────────────────────────────────────────────────────

interface BrandWithBanner extends Brand {
  banner_url: string | null;
}

interface BrandSlimeRow {
  id: string;
  user_id: string;
  slime_name: string | null;
  base_type: string | null;
  subtype: { name: string } | { name: string }[] | null;
  rating_overall: number | null;
  image_url: string | null;
  created_at: string;
  profiles_public:
    | { username: string | null; avatar_url: string | null }
    | { username: string | null; avatar_url: string | null }[]
    | null;
}

interface UpcomingDrop {
  id: string;
  name: string;
  description: string | null;
  drop_at: string;
  status: string | null;
  cover_image_url: string | null;
  drop_type: "new_drop" | "restock" | null;
  discount_code: string | null;
  free_shipping_threshold: number | null;
  drop_slimes: Array<{
    id: string;
    name: string | null;
    base_type: string | null;
    price: number | null;
    slime_id: string | null;
  }>;
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

async function fetchBrand(slug: string): Promise<BrandWithBanner | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return (data as BrandWithBanner | null) ?? null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Social icon link — no event handlers, Tailwind hover only ────────────────

function SocialIconLink({
  href,
  label,
  color,
  children,
}: {
  href: string;
  label: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex items-center justify-center transition-opacity hover:opacity-80 active:opacity-60"
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.6)",
        color,
        textDecoration: "none",
        flexShrink: 0,
      }}
    >
      {children}
    </a>
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

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
      ...(brand.logo_url ? { images: [{ url: brand.logo_url }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(brand.logo_url ? { images: [brand.logo_url] } : {}),
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) notFound();

  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isVerifiedOwner = !!user && brand.owner_id === user.id;

  let latestClaim: { id: string; status: BrandClaimStatus } | null = null;
  if (user) {
    const { data: claimRow } = await supabase
      .from("brand_claims")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (claimRow) {
      latestClaim = {
        id: claimRow.id as string,
        status: claimRow.status as BrandClaimStatus,
      };
    }
  }

  // [T86] Determine whether the claim CTA should be shown at all.
  // Rules (all must pass for canClaim = true):
  //   1. User is logged in
  //   2. Brand is not already owned (brandOwnerId check is handled inside ClaimBrandButton, keep it)
  //   3. User's account email is not a freemail/consumer domain
  //   4. User has no approved claim anywhere in the system
  let canClaim = false;
  if (user) {
    const userEmail = user.email ?? "";
    const emailCheck = validateBusinessEmail(userEmail);
    if (emailCheck.valid) {
      // Check for any existing approved claim by this user across all brands
      const { count: approvedCount } = await supabase
        .from("brand_claims")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "approved");
      canClaim = (approvedCount ?? 0) === 0;
    }
  }

  const avgRating = brand.avg_slime_rating;
  const logCount = brand.total_slime_ratings;

  const brandExtended = brand as BrandWithBanner & {
    youtube_handle?: string | null;
    pinterest_handle?: string | null;
    twitter_handle?: string | null;
  };

  const { data: communityRows } = await supabase
    .from("collection_logs")
    .select(
      `id, user_id, slime_name, base_type, rating_overall, image_url, created_at,
       subtype:subtypes ( name ),
       profiles_public!collection_logs_user_id_fkey ( username, avatar_url )`,
    )
    .eq("brand_id", brand.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12);

  const communityLogs = (communityRows ?? []) as unknown as BrandSlimeRow[];

  const { data: dropRows } = await supabase
    .from("drops")
    .select(
      `id, name, description, drop_at, status, cover_image_url,
       drop_type, discount_code, free_shipping_threshold,
       drop_slimes ( id, name, base_type, price, slime_id )`,
    )
    .eq("brand_id", brand.id)
    .in("status", ["announced", "live"])
    .order("drop_at", { ascending: true })
    .limit(3);

  const upcomingDrops = (dropRows ?? []) as unknown as UpcomingDrop[];
  const initials = brand.name.slice(0, 2).toUpperCase();

  const hasSocialLinks =
    !!brand.website_url ||
    !!brand.shop_url ||
    !!brand.instagram_handle ||
    !!brand.tiktok_handle ||
    !!brandExtended.youtube_handle ||
    !!brandExtended.pinterest_handle ||
    !!brandExtended.twitter_handle;

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-14 pb-24 max-w-2xl mx-auto">
        {/* Hero banner */}
        <div className="relative w-full" style={{ height: 200 }}>
          {brand.banner_url ? (
            <Image
              src={brand.banner_url}
              alt={`${brand.name} banner`}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(45,10,78,0.9) 0%, rgba(0,240,255,0.08) 50%, rgba(255,0,229,0.08) 100%)",
              }}
            />
          )}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(57,255,20,0.3) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: 60,
              background: "linear-gradient(to bottom, transparent, #0A0A0A)",
            }}
          />
          {brand.banner_url && (
            <BannerLightbox
              bannerUrl={brand.banner_url}
              brandName={brand.name}
            />
          )}
        </div>

        {/* Header section */}
        <section className="px-4 -mt-12 relative z-10">
          <div className="flex items-end gap-4">
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
                  className="w-full h-full flex items-center justify-center text-2xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                    fontFamily: "Montserrat, Inter, sans-serif",
                  }}
                  aria-hidden="true"
                >
                  {initials}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isVerifiedOwner ? (
                <Link
                  href={`/brand-dashboard/${brand.slug}`}
                  className="inline-flex items-center gap-2 transition-transform active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                    fontWeight: 600,
                    padding: "12px 20px",
                    borderRadius: 10,
                    fontFamily: "Montserrat, Inter, sans-serif",
                    fontSize: 14,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="4" y1="6" x2="20" y2="6" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="18" x2="20" y2="18" />
                    <circle cx="9" cy="6" r="2" fill="#0A0A0A" />
                    <circle cx="15" cy="12" r="2" fill="#0A0A0A" />
                    <circle cx="7" cy="18" r="2" fill="#0A0A0A" />
                  </svg>
                  Manage Brand
                </Link>
              ) : (
                <FollowBrandButton
                  brandId={brand.id}
                  brandSlug={brand.slug}
                  initialFollowerCount={brand.follower_count ?? 0}
                />
              )}
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

          {/* Stats pills */}
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(45,10,78,0.4)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3 fill-current"
                style={{ color: "#39FF14" }}
              >
                <polygon points="6,1 7.5,4.5 11,4.5 8.5,7 9.5,11 6,9 2.5,11 3.5,7 1,4.5 4.5,4.5" />
              </svg>
              <div>
                <p
                  className="text-sm font-black leading-none"
                  style={{ color: "#39FF14" }}
                >
                  {avgRating != null ? avgRating.toFixed(1) : "—"}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-slime-muted font-semibold mt-0.5">
                  Rating
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(45,10,78,0.4)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3 fill-current"
                style={{ color: "#00F0FF" }}
              >
                <path d="M2 2h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm1 2v1h6V4H3zm0 2v1h4V6H3z" />
              </svg>
              <div>
                <p
                  className="text-sm font-black leading-none"
                  style={{ color: "#00F0FF" }}
                >
                  {logCount ?? 0}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-slime-muted font-semibold mt-0.5">
                  Logs
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: "rgba(45,10,78,0.4)",
                border: "1px solid rgba(45,10,78,0.7)",
              }}
            >
              <svg
                viewBox="0 0 12 12"
                className="w-3 h-3 fill-current"
                style={{ color: "#FF00E5" }}
              >
                <path d="M6 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm-4 5c0-2.2 1.8-4 4-4s4 1.8 4 4H2z" />
              </svg>
              <div>
                <p
                  className="text-sm font-black leading-none"
                  style={{ color: "#FF00E5" }}
                >
                  {(brand.follower_count ?? 0).toLocaleString()}
                </p>
                <p className="text-[9px] uppercase tracking-wider text-slime-muted font-semibold mt-0.5">
                  Followers
                </p>
              </div>
            </div>
          </div>

          {/* Social links — icon-only circles, always-on brand colors, no event handlers */}
          {hasSocialLinks && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {brand.website_url && (
                <SocialIconLink
                  href={brand.website_url}
                  label="Website"
                  color="#00F0FF"
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </SocialIconLink>
              )}
              {brand.shop_url && (
                <SocialIconLink
                  href={brand.shop_url}
                  label="Shop"
                  color="#39FF14"
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
                </SocialIconLink>
              )}
              {brand.instagram_handle && (
                <SocialIconLink
                  href={`https://instagram.com/${brand.instagram_handle}`}
                  label="Instagram"
                  color="#E1306C"
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
                </SocialIconLink>
              )}
              {brand.tiktok_handle && (
                <SocialIconLink
                  href={`https://tiktok.com/@${brand.tiktok_handle}`}
                  label="TikTok"
                  color="#ffffff"
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
                </SocialIconLink>
              )}
              {brandExtended.youtube_handle && (
                <SocialIconLink
                  href={`https://youtube.com/@${brandExtended.youtube_handle}`}
                  label="YouTube"
                  color="#FF0000"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </SocialIconLink>
              )}
              {brandExtended.pinterest_handle && (
                <SocialIconLink
                  href={`https://pinterest.com/${brandExtended.pinterest_handle}`}
                  label="Pinterest"
                  color="#E60023"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                  </svg>
                </SocialIconLink>
              )}
              {brandExtended.twitter_handle && (
                <SocialIconLink
                  href={`https://x.com/${brandExtended.twitter_handle}`}
                  label="Twitter / X"
                  color="#ffffff"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </SocialIconLink>
              )}
            </div>
          )}

          {/* Claim button */}
          <div className="mt-4">
            <ClaimBrandButton
              brandSlug={brand.slug}
              brandOwnerId={brand.owner_id}
              currentUserId={user?.id ?? null}
              existingClaim={latestClaim}
              canClaim={canClaim}
            />
          </div>

          {/* View Slime Catalog pill */}
          <div className="mt-4">
            <Link
              href={`/brands/${brand.slug}/catalog`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
              style={{
                border: "1px solid rgba(0,240,255,0.4)",
                color: "#00F0FF",
                background: "rgba(0,240,255,0.06)",
              }}
            >
              View Slime Catalog
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M3 7h8M7 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>
        </section>

        {/* Upcoming Drops */}
        {upcomingDrops.length > 0 && (
          <section className="px-4 mt-8">
            <p
              className="text-[11px] font-black tracking-widest uppercase mb-3"
              style={{ color: "#00F0FF" }}
            >
              Upcoming Drops
            </p>
            <div className="flex flex-col gap-4">
              {upcomingDrops.map((drop) => (
                <DropCard key={drop.id} drop={drop} />
              ))}
            </div>
          </section>
        )}

        {/* Community logs */}
        <section className="px-4 mt-8">
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-3"
            style={{ color: "#00F0FF" }}
          >
            Recent Community Logs
          </p>
          {communityLogs.length === 0 ? (
            <p className="text-sm text-slime-muted text-center py-12">
              No public logs for {brand.name} yet. Be the first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {communityLogs.map((row) => {
                const profile = normaliseProfile(row.profiles_public);
                const baseLabel = row.base_type
                  ? (SLIME_BASE_TYPE_LABELS[row.base_type as SlimeBaseType] ??
                    row.base_type.replace(/_/g, " "))
                  : null;
                const sub = Array.isArray(row.subtype)
                  ? row.subtype[0]
                  : row.subtype;
                const typeLabel =
                  baseLabel && sub?.name
                    ? `${baseLabel} \u00b7 ${sub.name}`
                    : baseLabel;
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
                          {row.rating_overall.toFixed(1)}
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
