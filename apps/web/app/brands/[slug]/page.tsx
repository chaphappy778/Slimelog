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
import ShareButton from "@/components/ShareButton";
import ClaimBrandButton from "@/components/brand/ClaimBrandButton";
import BannerLightbox from "./components/BannerLightbox";
import DropCard from "./components/DropCard";
// T107 part (b) 2026-07-11: top collectors strip closes the discovery
// loop — brand page → leaderboard → back. See docs/SlimeLog_Tracker.md.
import TopCollectorsStrip from "@/components/brand/TopCollectorsStrip";
import type { TopCollector } from "@/components/brand/TopCollectorsStrip";
import {
  SLIME_BASE_TYPE_LABELS,
  SLIME_SKILL_LEVEL_LABELS,
  SLIME_SKILL_LEVEL_COLORS,
} from "@/lib/types";
import type {
  Brand,
  SlimeBaseType,
  BrandClaimStatus,
  SlimeSkillLevel,
} from "@/lib/types";
import { validateBusinessEmail } from "@/lib/brand-claims";
// T29 (2026-07-12): formatRelativeTime moved to a shared lib so the
// notification feed can share it. Same behavior — see the `{ long: true }`
// call sites below.
import { formatRelativeTime as sharedFormatRelativeTime } from "@/lib/format-time";

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
  // [T38 2026-07-13] Optional inventory hint. Brand-set via the
  // dashboard; null when unmanaged.
  tubs_available: number | null;
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
  // T29 (2026-07-12): delegate to the shared helper. Keeps the local
  // name so all downstream call sites in this file don't have to change.
  return sharedFormatRelativeTime(isoString, { long: true });
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

// T158 (2026-07-16) — normalize the `?skill=` query param. Anything
// outside the enum is dropped (returns null) so we don't ship a bad
// value to Postgres.
function normalizeSkillSlug(
  raw: string | undefined,
): SlimeSkillLevel | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (
    lower === "beginner" ||
    lower === "intermediate" ||
    lower === "advanced"
  ) {
    return lower;
  }
  return null;
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ skill?: string }>;
}) {
  const { slug } = await params;
  const { skill: skillParam } = await searchParams;
  // T158 (2026-07-16) — optional skill_level filter for the community
  // logs section. Same UX pattern as /discover: chip row above the
  // section, clicking the active chip clears the filter.
  const skillFilter = normalizeSkillSlug(skillParam);
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

  // T158 (2026-07-16) — build the community-logs query in a variable so
  // the optional `.eq("skill_level", ...)` can be conditionally chained.
  let communityQuery = supabase
    .from("collection_logs")
    .select(
      `id, user_id, slime_name, base_type, rating_overall, image_url, created_at,
       subtype:subtypes ( name ),
       profiles_public!collection_logs_user_id_fkey ( username, avatar_url )`,
    )
    .eq("brand_id", brand.id)
    .eq("is_public", true);
  if (skillFilter) {
    communityQuery = communityQuery.eq("skill_level", skillFilter);
  }
  const { data: communityRows } = await communityQuery
    .order("created_at", { ascending: false })
    .limit(12);

  const communityLogs = (communityRows ?? []) as unknown as BrandSlimeRow[];

  // ─── Top collectors (T107 part b) ──────────────────────────────────────────
  // Pulls every public log for this brand (name ILIKE so we catch logs
  // where brand_id was never linked), aggregates by user_id, takes the
  // top 5, then joins to profiles_public for username + avatar. Cheap
  // at our scale; see docs/cost-tracker.md for scaling notes.
  const topCollectors: TopCollector[] = await (async () => {
    const { data: logRows, error } = await supabase
      .from("collection_logs")
      .select("user_id")
      .eq("is_public", true)
      .ilike("brand_name_raw", brand.name);
    if (error) {
      console.warn(
        "[brand top-collectors] fetch failed",
        brand.name,
        error.message,
      );
      return [];
    }
    const counts = new Map<string, number>();
    for (const row of (logRows ?? []) as Array<{ user_id: string | null }>) {
      if (!row.user_id) continue;
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }
    const ranked = Array.from(counts.entries())
      .map(([user_id, count]) => ({ user_id, count }))
      .sort((a, b) =>
        b.count !== a.count
          ? b.count - a.count
          : a.user_id.localeCompare(b.user_id),
      )
      .slice(0, 5);
    if (ranked.length === 0) return [];

    const { data: profileRows } = await supabase
      .from("profiles_public")
      .select("id, username, avatar_url")
      .in(
        "id",
        ranked.map((r) => r.user_id),
      );
    const profiles = new Map<
      string,
      { username: string | null; avatar_url: string | null }
    >();
    for (const p of (profileRows ?? []) as Array<{
      id: string;
      username: string | null;
      avatar_url: string | null;
    }>) {
      profiles.set(p.id, {
        username: p.username,
        avatar_url: p.avatar_url,
      });
    }
    return ranked
      .map((r, i): TopCollector | null => {
        const p = profiles.get(r.user_id);
        if (!p?.username) return null;
        return {
          rank: i + 1,
          username: p.username,
          avatar_url: p.avatar_url,
          count: r.count,
        };
      })
      .filter((r): r is TopCollector => r !== null);
  })();

  const { data: dropRows } = await supabase
    .from("drops")
    .select(
      `id, name, description, drop_at, status, cover_image_url,
       drop_type, discount_code, free_shipping_threshold, tubs_available,
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

  const isPro = brand.subscription_tier === "brand_pro";
  const proAccent = "#FF7BEB";
  const brandTint = isPro ? proAccent : "#7BF5FF";

  // T-minus pill logic — mirrors Discover's FeaturedDropsCarousel.
  // "LIVE" wins over any countdown; unscheduled drops render no pill.
  function computeTminus(
    status: string | null,
    dateStr: string | null,
  ): { label: string; variant: "live" | "soon" | "far" } | null {
    if (status === "live") return { label: "LIVE", variant: "live" };
    if (!dateStr) return null;
    const dropMs = new Date(dateStr).getTime();
    if (Number.isNaN(dropMs)) return null;
    const deltaMs = dropMs - Date.now();
    if (deltaMs <= 0) return null;
    const hours = deltaMs / (1000 * 60 * 60);
    const days = hours / 24;
    const weeks = days / 7;
    if (hours < 24)
      return {
        label: `T-${Math.max(1, Math.round(hours))}h`,
        variant: "soon",
      };
    if (days < 7)
      return { label: `T-${Math.round(days)}d`, variant: "soon" };
    return { label: `T-${Math.max(1, Math.round(weeks))}w`, variant: "far" };
  }

  function tminusStyle(variant: "live" | "soon" | "far"): React.CSSProperties {
    if (variant === "live") {
      return {
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
        color: "#04110A",
        border: "1px solid transparent",
        boxShadow: "0 0 14px rgba(57,255,20,0.6)",
      };
    }
    if (variant === "soon") {
      return {
        background: "rgba(0,240,255,0.10)",
        color: "#7DF6FF",
        border: "1px solid rgba(0,240,255,0.4)",
      };
    }
    return {
      background: "rgba(45,10,78,0.4)",
      color: "rgba(245,245,245,0.6)",
      border: "1px solid rgba(120,60,180,0.5)",
    };
  }

  // T137 Batch 6c: the location pill prefers the owner's free-text override
  // (`brands.display_location_override`, migration 20260723000092) and falls
  // back to the derived "City, ST" in `brands.location`. Display only. Nothing
  // that filters or ships by geography may read either one: country_code /
  // state / city are the authoritative parts.
  //
  // fetchBrand selects "*", so before the migration lands the key is simply
  // absent and this collapses to `brand.location`. No migration-lag guard
  // needed here.
  const displayLocation = brand.display_location_override || brand.location;

  return (
    <PageWrapper dots orbs>
      <PageHeader />
      <main className="pt-14 pb-24 max-w-[440px] mx-auto">
        {/* ── Hero banner ────────────────────────────────────────────
            200px cover photo (or signature purple radial fallback for
            new brands). Bottom scrim keeps the logo edge readable on
            any photo. Brand-pro gets a magenta 3px hairline at the
            top of the banner as their signature reward. */}
        <div
          className="relative w-full overflow-hidden"
          style={{ height: 200 }}
        >
          {isPro && (
            <div
              className="absolute inset-x-0 top-0"
              aria-hidden="true"
              style={{
                height: 3,
                background:
                  "linear-gradient(90deg, #FF7BEB, #CC44FF, #FF7BEB)",
                zIndex: 4,
              }}
            />
          )}
          {brand.banner_url ? (
            <Image
              src={brand.banner_url}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 440px) 100vw, 440px"
              priority
            />
          ) : (
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(120% 130% at 72% 10%, rgba(204,68,255,0.55), rgba(71,15,96,0.7) 55%, rgba(16,0,32,1))",
              }}
            />
          )}
          {/* Scrim */}
          <div
            className="absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "linear-gradient(180deg, rgba(16,0,32,0) 30%, rgba(16,0,32,0.55) 78%, rgba(16,0,32,0.9) 100%)",
            }}
          />
          {brand.banner_url && (
            <div className="absolute inset-0 z-[3]">
              <BannerLightbox
                bannerUrl={brand.banner_url}
                brandName={brand.name}
              />
            </div>
          )}
        </div>

        {/* ── Overlapping logo ─────────────────────────────────────── */}
        <div className="px-4">
          <div
            className="flex items-center justify-center rounded-2xl relative overflow-hidden"
            style={{
              width: 72,
              height: 72,
              marginTop: -30,
              border: "3px solid #0F0018",
              background: brand.logo_url
                ? "#0F0018"
                : "linear-gradient(135deg, #39FF14, #00F0FF)",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 25,
              color: "#04140A",
              boxShadow: isPro
                ? `0 0 22px ${proAccent}88, 0 8px 24px rgba(0,0,0,0.5)`
                : "0 0 18px rgba(57,255,20,0.4), 0 8px 24px rgba(0,0,0,0.5)",
              position: "relative",
              zIndex: 5,
            }}
          >
            {brand.logo_url ? (
              <Image
                src={brand.logo_url}
                alt={brand.name}
                fill
                className="object-cover"
                sizes="72px"
              />
            ) : (
              initials
            )}
          </div>
        </div>

        {/* ── Header block ────────────────────────────────────────── */}
        <div className="px-4 pt-3">
          {/* Name row: name + verify check on left, Follow/Manage on right */}
          <div className="flex items-start justify-between gap-3">
            <h1
              className="flex items-center gap-2 flex-wrap"
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 900,
                fontSize: 25,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: "#FFFFFF",
                margin: 0,
              }}
            >
              {brand.name}
              {brand.is_verified && (
                <span
                  className="inline-flex items-center justify-center rounded-full flex-none"
                  style={{
                    width: 21,
                    height: 21,
                    background: "#39FF14",
                    boxShadow: "0 0 12px rgba(57,255,20,0.5)",
                  }}
                  aria-label="Verified brand"
                >
                  <svg
                    width={12}
                    height={12}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#04140A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
              )}
            </h1>
            {/* 2026-07-13: Share icon moved above the Manage / Follow
                action. Reads better than the two-button action row
                below when the primary CTA is the shop catalog and
                Share is secondary. */}
            <div className="shrink-0 flex flex-col items-end gap-2">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 40,
                  height: 40,
                  background: "rgba(45,10,78,0.5)",
                  border: "1px solid rgba(120,60,180,0.5)",
                  color: "#FFFFFF",
                }}
              >
                <ShareButton
                  path={`/brands/${brand.slug}`}
                  title={`${brand.name} on SlimeLog`}
                  text={`Check out ${brand.name} on SlimeLog.`}
                />
              </div>
              {isVerifiedOwner ? (
                <Link
                  href={`/brand-dashboard/${brand.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full transition-transform active:scale-[0.98]"
                  style={{
                    padding: "8px 14px",
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#04140A",
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 800,
                    fontSize: 13,
                    textDecoration: "none",
                    boxShadow: "0 0 14px rgba(57,255,20,0.4)",
                  }}
                >
                  <svg
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 6h16M7 12h10M10 18h4" />
                  </svg>
                  Manage
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

          {/* Meta row: location + restock schedule */}
          {(displayLocation || brand.restock_schedule) && (
            <div
              className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5"
              style={{
                fontSize: 12.5,
                color: "rgba(245,245,245,0.55)",
              }}
            >
              {displayLocation && (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    width={13}
                    height={13}
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
                  {displayLocation}
                </span>
              )}
              {brand.restock_schedule && (
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  {brand.restock_schedule}
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {brand.bio && (
            <p
              className="mt-3.5"
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "rgba(245,245,245,0.85)",
                margin: "14px 0 0",
              }}
            >
              {brand.bio}
            </p>
          )}

          {/* Inline stats row, top/bottom hairline rules */}
          <div
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 py-3.5"
            style={{
              borderTop: "1px solid rgba(120,60,180,0.42)",
              borderBottom: "1px solid rgba(120,60,180,0.42)",
              fontSize: 12,
              color: "rgba(245,245,245,0.6)",
            }}
          >
            <span className="inline-flex items-baseline gap-1.5">
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="#39FF14"
                aria-hidden="true"
                style={{ transform: "translateY(2px)" }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 19,
                  color: avgRating != null ? "#FFFFFF" : "rgba(245,245,245,0.5)",
                }}
              >
                {avgRating != null ? avgRating.toFixed(1) : "—"}
              </span>{" "}
              {avgRating != null && logCount > 0 ? (
                <span>{logCount} ratings</span>
              ) : (
                <span>no ratings</span>
              )}
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <svg
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00F0FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ transform: "translateY(2px)" }}
              >
                <path d="M12 2 2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              <span
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 19,
                  color: "#FFFFFF",
                }}
              >
                {(brand.total_logs ?? 0).toLocaleString()}
              </span>{" "}
              <span>logs</span>
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <svg
                width={13}
                height={13}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FF00E5"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ transform: "translateY(2px)" }}
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              </svg>
              <span
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 19,
                  color: "#FFFFFF",
                }}
              >
                {(brand.follower_count ?? 0).toLocaleString()}
              </span>{" "}
              <span>followers</span>
            </span>
          </div>

          {/* Socials — brand-pro gets magenta signature; free gets cyan */}
          {hasSocialLinks && (
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {brand.website_url && (
                <SocialIconLink
                  href={brand.website_url}
                  label="Website"
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
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
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </SocialIconLink>
              )}
              {brand.instagram_handle && (
                <SocialIconLink
                  href={`https://instagram.com/${brand.instagram_handle}`}
                  label="Instagram"
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle
                      cx="17.5"
                      cy="6.5"
                      r="1"
                      style={{ fill: "currentColor", stroke: "none" }}
                    />
                  </svg>
                </SocialIconLink>
              )}
              {brand.tiktok_handle && (
                <SocialIconLink
                  href={`https://tiktok.com/@${brand.tiktok_handle}`}
                  label="TikTok"
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 18V5l10-2v11" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="16" cy="14" r="3" />
                  </svg>
                </SocialIconLink>
              )}
              {brandExtended.youtube_handle && (
                <SocialIconLink
                  href={`https://youtube.com/@${brandExtended.youtube_handle}`}
                  label="YouTube"
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="2" y="6" width="20" height="12" rx="3" />
                    <path d="M10 9l5 3-5 3z" />
                  </svg>
                </SocialIconLink>
              )}
              {brandExtended.pinterest_handle && (
                <SocialIconLink
                  href={`https://pinterest.com/${brandExtended.pinterest_handle}`}
                  label="Pinterest"
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 7v10M9 12l3 3 3-3" />
                  </svg>
                </SocialIconLink>
              )}
              {brandExtended.twitter_handle && (
                <SocialIconLink
                  href={`https://twitter.com/${brandExtended.twitter_handle}`}
                  label="Twitter"
                  color={brandTint}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 4s-.9 2.6-2 3.6C21 15.5 12.7 22 3 18c2.4.3 4.8-.5 6-1.4-6-.2-8-4.2-8-7 1 1 3 1 3 1-4-2-4-6-2-8 3 4 7 7 12 7 0-4 4-6 7-3 1.3 0 3-1 3-1z" />
                  </svg>
                </SocialIconLink>
              )}
            </div>
          )}

          {/* Action row: catalog CTA (Share moved above Manage/Follow
              in the name row on 2026-07-13). */}
          <div className="mt-4">
            <Link
              href={`/brands/${brand.slug}/catalog`}
              className="w-full flex items-center justify-center gap-2 rounded-2xl transition-transform active:scale-[0.98]"
              style={{
                minHeight: 46,
                padding: "0 16px",
                background: "rgba(45,10,78,0.5)",
                border: "1px solid rgba(120,60,180,0.5)",
                color: "#FFFFFF",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              View slime catalog
              <svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>

          {/* Claim brand button — component itself handles the
              rendering gate; passing canClaim + user context lets it
              decide whether to show the primary CTA, a pending
              badge, or nothing. */}
          {user && (
            <div className="mt-3">
              <ClaimBrandButton
                brandSlug={brand.slug}
                brandOwnerId={brand.owner_id ?? null}
                currentUserId={user.id}
                existingClaim={latestClaim}
                canClaim={canClaim}
              />
            </div>
          )}
        </div>

        {/* ── Section: Upcoming drops ────────────────────────────── */}
        <section className="px-4 mt-8">
          <p className="section-label mb-3">Upcoming drops</p>
          {upcomingDrops.length === 0 ? (
            <div
              className="rounded-2xl text-center flex flex-col items-center gap-2"
              style={{
                padding: "26px 20px",
                background: "rgba(45,10,78,0.28)",
                border: "1px solid rgba(120,60,180,0.42)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 44,
                  height: 44,
                  background: "rgba(45,10,78,0.4)",
                  border: "1px solid rgba(0,240,255,0.35)",
                  color: "#7DF6FF",
                  marginBottom: 4,
                }}
                aria-hidden="true"
              >
                <svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                No drops announced yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(245,245,245,0.55)",
                  lineHeight: 1.5,
                  maxWidth: 240,
                }}
              >
                Follow to get a heads-up the moment {brand.name} announces
                their first drop.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingDrops.map((drop) => {
                const tminus = computeTminus(drop.status, drop.drop_at);
                const isLive = drop.status === "live";
                return (
                  <div
                    key={drop.id}
                    className="rounded-2xl flex gap-3 items-center"
                    style={{
                      padding: 12,
                      background: "rgba(45,10,78,0.28)",
                      border: isLive
                        ? "1px solid rgba(255,0,229,0.5)"
                        : "1px solid rgba(120,60,180,0.42)",
                      boxShadow: isLive
                        ? "0 0 22px rgba(255,0,229,0.28)"
                        : "0 0 12px rgba(0,240,255,0.06)",
                    }}
                  >
                    <div
                      className="rounded-xl relative overflow-hidden shrink-0"
                      style={{
                        width: 78,
                        height: 78,
                        background: drop.cover_image_url
                          ? "#0F0018"
                          : "linear-gradient(135deg, #100020, #470F60, #CC44FF)",
                      }}
                    >
                      {drop.cover_image_url && (
                        <Image
                          src={drop.cover_image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="78px"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {tminus && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full uppercase"
                          style={{
                            padding: "3px 9px",
                            fontSize: 10.5,
                            fontWeight: 800,
                            letterSpacing: "0.05em",
                            ...tminusStyle(tminus.variant),
                          }}
                        >
                          {tminus.label}
                        </span>
                      )}
                      <div
                        className="truncate"
                        style={{
                          fontFamily: "Montserrat, sans-serif",
                          fontWeight: 800,
                          fontSize: 16,
                          color: "#FFFFFF",
                          margin: "6px 0 2px",
                        }}
                      >
                        {drop.name}
                      </div>
                      <div
                        className="text-[12px]"
                        style={{ color: "rgba(245,245,245,0.55)" }}
                      >
                        {drop.drop_at &&
                          new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(drop.drop_at))}
                        {typeof drop.tubs_available === "number" && (
                          <>
                            {drop.drop_at ? " · " : ""}
                            {drop.tubs_available}{" "}
                            {drop.tubs_available === 1 ? "tub" : "tubs"}{" "}
                            available
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Section: Community logs ────────────────────────────── */}
        <section className="px-4 mt-8">
          <p className="section-label mb-3">
            Community logs
            {logCount > 0 && (
              <span
                className="ml-2"
                style={{
                  color: "rgba(245,245,245,0.45)",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {logCount.toLocaleString()}
              </span>
            )}
          </p>

          {/* T158 (2026-07-16): skill_level filter chips. Same UX as
              /discover — chip is a Link that swaps the ?skill= param,
              clicking the active chip clears the filter. */}
          <div className="mb-4">
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              Filter by skill
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                Object.entries(SLIME_SKILL_LEVEL_LABELS) as [
                  SlimeSkillLevel,
                  string,
                ][]
              ).map(([level, label]) => {
                const active = skillFilter === level;
                const tint = SLIME_SKILL_LEVEL_COLORS[level];
                const href = active
                  ? `/brands/${brand.slug}`
                  : `/brands/${brand.slug}?skill=${level}`;
                return (
                  <Link
                    key={level}
                    href={href}
                    scroll={false}
                    className="inline-flex items-center rounded-full transition-all"
                    style={{
                      padding: "7px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      fontFamily: "system-ui, sans-serif",
                      background: active ? tint.bg : "rgba(45,10,78,0.3)",
                      color: active ? tint.text : "rgba(245,245,245,0.55)",
                      border: active
                        ? `1px solid ${tint.border}`
                        : "1px solid rgba(45,10,78,0.55)",
                      boxShadow: active ? `0 0 10px ${tint.text}44` : "none",
                      textDecoration: "none",
                    }}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
          {communityLogs.length === 0 ? (
            <div
              className="rounded-2xl text-center flex flex-col items-center gap-2"
              style={{
                padding: "26px 20px",
                background: "rgba(45,10,78,0.28)",
                border: "1px solid rgba(120,60,180,0.42)",
              }}
            >
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 44,
                  height: 44,
                  background: "rgba(45,10,78,0.4)",
                  border: "1px solid rgba(0,240,255,0.35)",
                  color: "#7DF6FF",
                  marginBottom: 4,
                }}
                aria-hidden="true"
              >
                <svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2 2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "#FFFFFF",
                }}
              >
                No public logs for {brand.name} yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(245,245,245,0.55)",
                  lineHeight: 1.5,
                  maxWidth: 240,
                }}
              >
                Be the first to log a {brand.name} slime and put them on the
                map.
              </div>
              <Link
                href="/log"
                className="inline-flex items-center gap-1.5 rounded-full mt-2"
                style={{
                  padding: "9px 16px",
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#04140A",
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  textDecoration: "none",
                  boxShadow: "0 0 14px rgba(57,255,20,0.4)",
                }}
              >
                Log a slime
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {communityLogs.slice(0, 6).map((log) => {
                const profile = normaliseProfile(log.profiles_public);
                const rating =
                  typeof log.rating_overall === "number"
                    ? log.rating_overall.toFixed(1)
                    : null;
                return (
                  <Link
                    key={log.id}
                    href={`/slimes/${log.id}`}
                    className="block rounded-2xl overflow-hidden transition-transform active:scale-[0.985]"
                    style={{
                      background: "rgba(45,10,78,0.28)",
                      border: "1px solid rgba(120,60,180,0.42)",
                      textDecoration: "none",
                    }}
                  >
                    <div
                      className="relative w-full"
                      style={{
                        height: 172,
                        background: log.image_url
                          ? "#0F0018"
                          : "linear-gradient(135deg, rgba(45,10,78,0.6), rgba(16,0,32,0.6))",
                      }}
                    >
                      {log.image_url && (
                        <Image
                          src={log.image_url}
                          alt={log.slime_name ?? "Slime photo"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 440px) 100vw, 400px"
                        />
                      )}
                      {rating && (
                        <span
                          className="absolute inline-flex items-center gap-1"
                          style={{
                            top: 10,
                            right: 10,
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                            color: "#04110A",
                            fontFamily: "Montserrat, sans-serif",
                            fontWeight: 900,
                            fontSize: 13,
                            boxShadow: "0 0 14px rgba(57,255,20,0.45)",
                          }}
                        >
                          <svg
                            width={12}
                            height={12}
                            viewBox="0 0 24 24"
                            fill="#04110A"
                            aria-hidden="true"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          {rating}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 px-3 py-2.5">
                      <div
                        className="rounded-full overflow-hidden shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          background:
                            "linear-gradient(135deg, #39FF14, #00F0FF)",
                        }}
                      >
                        {profile?.avatar_url && (
                          <Image
                            src={profile.avatar_url}
                            alt=""
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="truncate"
                          style={{
                            fontFamily: "system-ui, sans-serif",
                            fontWeight: 700,
                            fontSize: 13.5,
                            color: "#FFFFFF",
                            lineHeight: 1.2,
                          }}
                        >
                          @{profile?.username ?? "unknown"}
                        </div>
                        <div
                          className="truncate text-[11.5px]"
                          style={{ color: "rgba(245,245,245,0.55)" }}
                        >
                          {log.slime_name ?? "Untitled"}
                          {log.base_type
                            ? ` · ${SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType] ?? log.base_type}`
                            : ""}
                        </div>
                      </div>
                      <span
                        className="text-[11px]"
                        style={{
                          color: "rgba(245,245,245,0.4)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatRelativeTime(log.created_at)}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {communityLogs.length > 6 && (
                <div className="text-center pt-2">
                  <span
                    style={{
                      color: "rgba(245,245,245,0.4)",
                      fontSize: 12,
                    }}
                  >
                    Showing 6 of {communityLogs.length} recent logs
                  </span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Section: Top collectors ─────────────────────────────
            T107 (b) discovery-loop — closes brand → leaderboard →
            back. Only renders when we actually have collectors. */}
        {topCollectors.length > 0 && (
          <section className="px-4 mt-8">
            <p className="section-label mb-3">Top collectors</p>
            <TopCollectorsStrip
              collectors={topCollectors}
              brandName={brand.name}
              brandSlug={brand.slug}
            />
          </section>
        )}
      </main>
    </PageWrapper>
  );
}
