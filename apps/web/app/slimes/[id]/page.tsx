// apps/web/app/slimes/[id]/page.tsx
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import LikeButton from "@/components/collection/LikeButton";
import ReportButton from "@/components/ReportButton";
import ClientComments from "@/components/collection/ClientComments";
import DeleteLogButton from "@/components/DeleteLogButton";
import ShareButton from "@/components/ShareButton";
import { safeRedirect } from "@/lib/safe-redirect";
import {
  SLIME_BASE_TYPE_COLORS,
  SLIME_BASE_TYPE_LABELS,
  SCENT_STRENGTH_LABELS,
  SLIME_CONDITION_LABELS,
  SLIME_SKILL_LEVEL_LABELS,
  SLIME_SKILL_LEVEL_COLORS,
} from "@/lib/types";
import type {
  CollectionLog,
  SlimeBaseType,
  ScentStrength,
  SlimeCondition,
  SlimeSkillLevel,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnerProfile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// [Change 1 — scent_notes] Added scent_notes to SlimeLogRecord
// 2026-07-12: condition inherited from CollectionLog base type.
type SlimeLogRecord = CollectionLog & {
  image_url: string | null;
  subtype: { name: string } | null;
  scent_strength: string | null;
  scent_notes: string | null;
  purchase_price: number | null;
  // 2026-07-16 Commit B-display: brand-scoped variant label. When the
  // log has both brand_id and subtype_id AND there's an approved
  // brand_variants row for that combo, `brand_display_name` overrides
  // the canonical subtype name in the detail-page chip.
  brand_variant_display_name: string | null;
};

// ─── Server-side Supabase ─────────────────────────────────────────────────────

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } },
  );
}

// [Change 2 — scent_notes] select("*") already includes scent_notes — no query change needed
//
// T101 (2026-07-10): wrapped in React `cache()` so generateMetadata and
// the page body share a single query result within one render pass.
// Without cache(), Supabase client calls aren't deduped by React
// automatically (only `fetch()` is), so the same log was being pulled
// twice on every /slimes/[id] load.
const fetchLog = cache(async (id: string): Promise<SlimeLogRecord | null> => {
  const supabase = await getSupabase();
  // 2026-07-17 T166 hotfix: previously we filtered `.eq("is_public",
  // true)` here, which made private logs 404 for their own owner too.
  // That regressed after T166 (T39-H1) started routing the post-log
  // wizard to `/slimes/{id}?justLogged=1`, since a private log lands
  // on this page and the owner needs to see it. RLS on collection_logs
  // is `USING (is_public = true OR auth.uid() = user_id)` (see mig 26,
  // fix_collection_logs_rls.sql) — so removing the explicit filter is
  // safe: public logs stay visible to everyone, private logs are only
  // returned when the caller is the owner. Non-owners still get null →
  // notFound() on private logs.
  const { data, error } = await supabase
    .from("collection_logs")
    .select("*, subtype:subtypes(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("[slimes/[id]] log fetch failed:", error.message);
    return null;
  }
  const log = (data as SlimeLogRecord | null) ?? null;
  if (!log) return null;

  // 2026-07-16 Commit B-display: pull brand-scoped variant label when
  // the log carries both a catalog brand and a resolved subtype. A
  // separate lookup (rather than a PostgREST join) because
  // brand_variants is keyed by the composite (brand_id, subtype_id)
  // and PostgREST can't express a compound foreign-join filter here.
  // React `cache()` already dedupes fetchLog across the render pass so
  // this second query only fires once.
  log.brand_variant_display_name = null;
  if (log.brand_id && log.subtype_id) {
    const { data: bvRow, error: bvErr } = await supabase
      .from("brand_variants")
      .select("brand_display_name")
      .eq("brand_id", log.brand_id)
      .eq("subtype_id", log.subtype_id)
      .eq("is_admin_approved", true)
      .maybeSingle();
    if (bvErr) {
      console.warn(
        "[slimes/[id]] brand_variants lookup failed:",
        bvErr.message,
      );
    } else if (bvRow?.brand_display_name) {
      log.brand_variant_display_name = bvRow.brand_display_name as string;
    }
  }

  return log;
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const log = await fetchLog(id);

  if (!log) {
    return {
      title: "Slime not found — SlimeLog",
      description: "This slime doesn't exist or isn't public on SlimeLog.",
    };
  }

  const slimeName = log.slime_name ?? "Unnamed slime";
  const brandPart = log.brand_name_raw ? ` from ${log.brand_name_raw}` : "";
  // [Change 1 — T98b] toFixed(1) on metadata rating string
  const ratingPart =
    typeof log.rating_overall === "number"
      ? ` — rated ${(log.rating_overall as number).toFixed(1)}/5`
      : "";

  const title = `${slimeName}${brandPart}${ratingPart} — SlimeLog`;
  const description =
    log.notes?.trim() ||
    `${slimeName}${brandPart} — see the full review and ratings on SlimeLog.`;

  const url = `https://slimelog.com/slimes/${log.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      siteName: "SlimeLog",
      ...(log.image_url ? { images: [{ url: log.image_url }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(log.image_url ? { images: [log.image_url] } : {}),
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RATING_DIMENSIONS: Array<{ key: keyof CollectionLog; label: string }> = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_sound", label: "Sound / ASMR" },
  { key: "rating_drizzle", label: "Aesthetic" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Quality" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SlimePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // 2026-07-17 T39-H1: read `?justLogged=1` so we can render the post-log
  // share CTA at the top. Any other value falls back to the normal
  // detail view.
  searchParams: Promise<{ justLogged?: string }>;
}) {
  const { id } = await params;
  const { justLogged: justLoggedParam } = await searchParams;
  const justLogged = justLoggedParam === "1";
  const log = await fetchLog(id);

  if (!log) {
    notFound();
  }

  const supabase = await getSupabase();

  // T101 (2026-07-10): parallelize the fan-out queries. Previously these
  // ran serially (getUser → owner → brand → likes → log_tags) even though
  // only the "user like" query actually depends on the current user, and
  // the rest depend only on log.id / log.user_id / log.brand_name_raw
  // which we already have from fetchLog.
  //
  // getUser stays outside the batch because the user-like query is
  // conditional on it, but everything else fires concurrently.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const [
    ownerRes,
    brandRes,
    likeCountRes,
    userLikeRes,
    logTagsRes,
  ] = await Promise.all([
    supabase
      .from("profiles_public")
      .select("username, display_name, avatar_url")
      .eq("id", log.user_id)
      .maybeSingle(),
    // 2026-07-11: use ilike so a brand_name_raw of "goo lagoon" matches
    // "Goo Lagoon" in the catalog. Previously used eq(), which failed
    // silently on any case mismatch and left the brand rendering as
    // plain text with no link — users couldn't navigate to the brand.
    // 2026-07-17 T39-H3: include `instagram_handle` so the share
    // caption can tag the brand's IG when the log is reshared. The
    // brand-owner notification queue only lights up when their handle
    // appears in the caption, so this is load-bearing for the growth
    // flywheel documented in the T39 audit.
    // 2026-07-17 T173: also pulls `logo_url` so the detail-page brand
    // row can render the round mark next to the name (matches the
    // T39-M2 OG treatment + the new feed-card treatment).
    log.brand_name_raw
      ? supabase
          .from("brands")
          .select("slug, instagram_handle, logo_url")
          .ilike("name", log.brand_name_raw)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("likes")
      .select("user_id", { count: "exact", head: true })
      .eq("log_id", log.id),
    currentUserId
      ? supabase
          .from("likes")
          .select("user_id")
          .eq("log_id", log.id)
          .eq("user_id", currentUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("log_tags").select("tag_id, tags(name)").eq("log_id", log.id),
  ]);

  const owner = (ownerRes.data as OwnerProfile | null) ?? null;
  const brandJoin =
    (brandRes as {
      data: {
        slug?: string;
        instagram_handle?: string | null;
        logo_url?: string | null;
      } | null;
    }).data ?? null;
  const brandSlug = (brandJoin?.slug as string | undefined) ?? null;
  const brandLogoUrl =
    (brandJoin?.logo_url as string | null | undefined) ?? null;
  // 2026-07-17 T39-H3: normalize the IG handle for the share caption.
  // Strip a leading @ if the DB row happens to include one (older
  // brand-suggestion rows accepted them).
  const brandInstagramHandle =
    typeof brandJoin?.instagram_handle === "string" &&
    brandJoin.instagram_handle.trim().length > 0
      ? brandJoin.instagram_handle.trim().replace(/^@+/, "")
      : null;
  const { count: likeCount } = likeCountRes;
  const { data: userLikeRow } = userLikeRes;
  const { data: logTagsData } = logTagsRes;

  const keywords = (logTagsData ?? [])
    .map((lt: any) => (lt.tags as { name: string } | null)?.name)
    .filter((n): n is string => Boolean(n));

  // T125 (2026-07-20) — community aging insights. Two tiers:
  //   Free: base-type-wide median ("collectors typically check
  //         butter every X days")
  //   Pro:  brand + base-type median ("Aloe Nightmares butter
  //         specifically runs Y days")
  // We fire both in parallel via fetchDualAgingInsights; the Pro
  // one skips when the viewer isn't a Pro subscriber to avoid
  // wasted queries.
  // Viewer profile — used for both the community-insights Pro gate
  // (via is_premium on profiles_public) AND the owner aging banner
  // (which respects the profile-level aging_reminders_enabled toggle
  // so the banner disappears when the user turns off reminders in
  // Settings).
  let viewerIsPro = false;
  let viewerAgingRemindersEnabled = true; // safe default (opt-out UX)
  if (currentUserId) {
    const [publicRes, privateRes] = await Promise.all([
      supabase
        .from("profiles_public")
        .select("is_premium")
        .eq("id", currentUserId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("aging_reminders_enabled")
        .eq("id", currentUserId)
        .maybeSingle(),
    ]);
    viewerIsPro = Boolean(publicRes.data?.is_premium);
    // profiles table isn't nullable on this column (DEFAULT true), but
    // guard for the "row missing" case just in case.
    viewerAgingRemindersEnabled =
      privateRes.data?.aging_reminders_enabled ?? true;
  }

  let agingInsights: {
    base: import("@/lib/aging-insights").AgingInsight | null;
    brand: import("@/lib/aging-insights").AgingInsight | null;
  } = { base: null, brand: null };
  if (log.base_type) {
    const { fetchDualAgingInsights } = await import("@/lib/aging-insights");
    agingInsights = await fetchDualAgingInsights(supabase, {
      base_type: log.base_type as SlimeBaseType,
      brand_id: log.brand_id ?? null,
      include_pro: viewerIsPro,
    });
  }

  const typeColor = log.base_type
    ? (SLIME_BASE_TYPE_COLORS[log.base_type as SlimeBaseType]?.text ??
      "#39FF14")
    : "#39FF14";

  const baseTypeLabel = log.base_type
    ? (SLIME_BASE_TYPE_LABELS[log.base_type as SlimeBaseType] ?? log.base_type)
    : null;

  const subtypeName = log.subtype?.name ?? null;
  // 2026-07-16 Commit B-display: prefer the brand-scoped display name
  // (e.g. "Fluffernutter") over the canonical subtype ("Butter Whip")
  // when we have one, so the chip reads the way the brand markets the
  // variant. Falls back to subtypeName for legacy logs.
  const variantLabel = log.brand_variant_display_name ?? subtypeName;

  const activeDimensions = RATING_DIMENSIONS.filter(
    ({ key }) => typeof log[key] === "number",
  );

  const showCTA = currentUserId !== log.user_id;
  const ctaNext = safeRedirect(`/slimes/${log.id}`, "/landing");
  const ctaHref = currentUserId
    ? `/log?prefill=${encodeURIComponent(log.slime_name ?? "")}&brand=${encodeURIComponent(log.brand_name_raw ?? "")}`
    : `/signup?next=${encodeURIComponent(ctaNext)}`;

  const isOwner = currentUserId === log.user_id;

  // T125 (2026-07-20) — aging status chip shown to the log owner
  // only. Non-owners see the community insights strip above but no
  // per-log status (that's the owner's context). Only renders when:
  //   - viewer is the log owner
  //   - log is on_shelf (archived + for_sale get no reminders)
  //   - per-log aging_enabled is true
  //   - viewer's profile aging_reminders_enabled is true (2026-07-20
  //     hotfix: was ignoring the global toggle so users who turned
  //     off reminders in Settings still saw the banner)
  let ownerAgingBanner: {
    label: string;
    accent: string;
    subtext: string;
  } | null = null;
  if (
    isOwner &&
    log.shelf_state === "on_shelf" &&
    log.aging_enabled &&
    viewerAgingRemindersEnabled
  ) {
    // Resolve effective interval (same logic as
    // get_effective_aging_interval helper in the migration).
    const baseDefault = 45; // hard fallback matches the SQL helper
    // We don't fetch the base-type default here to save a query —
    // the cron already resolved aging_state, and this banner only
    // uses aging_state for its color/label. The precise "X days"
    // is a nice-to-have; we compute it from anchor + interval below.
    const interval = log.aging_interval_days ?? baseDefault;
    const anchorMs = new Date(
      log.last_checked_at ?? log.created_at,
    ).getTime();
    const daysSince = Math.floor((Date.now() - anchorMs) / 86_400_000);
    const daysDelta = daysSince - interval;
    if (log.aging_state === "overdue") {
      ownerAgingBanner = {
        label: "Overdue",
        accent: "#FF3D6E",
        subtext: `Overdue by ${daysDelta} ${daysDelta === 1 ? "day" : "days"}. Tap to check in.`,
      };
    } else if (log.aging_state === "warning") {
      const dueIn = Math.max(0, -daysDelta);
      ownerAgingBanner = {
        label: "Coming up",
        accent: "#FFAE3B",
        subtext: `Aging in ${dueIn} ${dueIn === 1 ? "day" : "days"}. Tap when you check in.`,
      };
    } else {
      ownerAgingBanner = {
        label: "Fresh",
        accent: "#39FF14",
        subtext: `Checked ${daysSince} ${daysSince === 1 ? "day" : "days"} ago. Next check-in around day ${interval}.`,
      };
    }
  }

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-14 pb-32 max-w-2xl mx-auto">
        {/* Hero image */}
        {log.image_url && (
          <div className="relative w-full aspect-square">
            <Image
              src={log.image_url}
              alt={log.slime_name ?? "Slime photo"}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              priority
              className="object-cover"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0) 60%, rgba(10,10,10,0.85) 100%)",
              }}
            />
          </div>
        )}

        <div className="px-4 mt-4 flex flex-col gap-4">
          {/* 2026-07-17 T39-H1: Just-logged share CTA. Fires only when
              (a) the URL carries ?justLogged=1 (only set by the wizard's
              post-submit redirect), and (b) the viewer is the owner
              (isOwner). Placed above the owner row so the first thing
              on-screen after the hero photo is the invitation to share.
              This is the point of highest emotional peak — user JUST
              rated their slime; the reshare rate here dwarfs any other
              in-app share prompt.

              Deliberately no dismiss control. The banner only appears
              on the ?justLogged=1 URL, so revisiting /slimes/[id]
              without the param never shows it. If a user navigates
              back and forth they'll see it again, which is fine (the
              share flow is idempotent). */}
          {justLogged && isOwner && (
            <div
              className="rounded-2xl p-4 flex items-start gap-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,0,229,0.14), rgba(0,240,255,0.14))",
                border: "1px solid rgba(255,0,229,0.45)",
                boxShadow: "0 0 24px rgba(255,0,229,0.20)",
              }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-black uppercase tracking-widest mb-1"
                  style={{
                    color: "#FF00E5",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Your slime is logged
                </p>
                <p
                  className="text-sm font-bold text-white leading-snug"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Share it and tag the shop
                  {brandInstagramHandle ? ` (@${brandInstagramHandle})` : ""}.
                </p>
                <p
                  className="text-[12px] mt-1"
                  style={{ color: "rgba(245,245,245,0.72)" }}
                >
                  Post to Instagram or TikTok. Small shops love seeing
                  their slime rated, and every reshare brings new
                  collectors to SlimeLog.
                </p>
                <div className="mt-3">
                  <ShareButton
                    path={`/slimes/${log.id}?utm_source=share&utm_medium=post_log_cta`}
                    title={log.slime_name ?? "A slime on SlimeLog"}
                    text={(() => {
                      const parts: string[] = [
                        `Just logged this on SlimeLog: ${log.slime_name ?? "this slime"}`,
                      ];
                      if (typeof log.rating_overall === "number") {
                        parts.push(`${log.rating_overall.toFixed(1)}/5`);
                      }
                      if (brandInstagramHandle) {
                        parts.push(`@${brandInstagramHandle}`);
                      } else if (log.brand_name_raw) {
                        parts.push(`by ${log.brand_name_raw}`);
                      }
                      return parts.join(" · ");
                    })()}
                    label="Share now"
                    variant="primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Owner row */}
          {owner && (
            <Link
              href={`/users/${owner.username}`}
              className="flex items-center gap-3 group"
            >
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-slime-border shrink-0">
                {owner.avatar_url ? (
                  <Image
                    src={owner.avatar_url}
                    alt={owner.display_name ?? owner.username ?? "User"}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      color: "#0A0A0A",
                    }}
                    aria-hidden="true"
                  >
                    {(owner.display_name ?? owner.username ?? "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-semibold text-slime-text group-hover:text-slime-magenta transition-colors">
                  {owner.display_name ?? owner.username}
                </span>
                <span className="text-xs text-slime-muted">
                  @{owner.username}
                </span>
              </div>
            </Link>
          )}

          {/* Title + brand */}
          <header className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-3">
              <h1
                className="text-2xl font-black leading-tight flex-1 min-w-0"
                style={{
                  color: "#fff",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                {log.slime_name ?? "Unnamed Slime"}
              </h1>
              {/* 2026-07-17 T39-H3: caption rebuilt to tag the brand's
                  Instagram handle when available, surface the numeric
                  rating so people scanning IG stories immediately see
                  the score, and append UTM tracking so we can measure
                  share-driven signups against organic. Warmer intro
                  per T39-L1 ("Just logged this on SlimeLog" is more
                  community than "I rated this on"). Falls back
                  gracefully when brand/handle/rating are missing. */}
              <ShareButton
                path={`/slimes/${log.id}?utm_source=share&utm_medium=slime_log`}
                title={log.slime_name ?? "A slime on SlimeLog"}
                text={(() => {
                  const parts: string[] = [
                    `Just logged this on SlimeLog: ${log.slime_name ?? "this slime"}`,
                  ];
                  if (typeof log.rating_overall === "number") {
                    parts.push(`${log.rating_overall.toFixed(1)}/5`);
                  }
                  if (brandInstagramHandle) {
                    parts.push(`@${brandInstagramHandle}`);
                  } else if (log.brand_name_raw) {
                    parts.push(`by ${log.brand_name_raw}`);
                  }
                  return parts.join(" · ");
                })()}
              />
            </div>
            {log.brand_name_raw && (
              <div className="text-sm flex items-center gap-2">
                {/* 2026-07-17 T173: brand logo mark. Same 18px round tile
                    as the feed card treatment, sized up slightly for
                    the taller detail-page text. */}
                {brandLogoUrl && (
                  <Image
                    src={brandLogoUrl}
                    alt=""
                    width={18}
                    height={18}
                    className="rounded-full shrink-0"
                    style={{
                      objectFit: "cover",
                      border: "1px solid rgba(0,240,255,0.35)",
                    }}
                  />
                )}
                {brandSlug ? (
                  <Link
                    href={`/brands/${brandSlug}`}
                    className="font-semibold"
                    style={{ color: "#00F0FF" }}
                  >
                    {log.brand_name_raw}
                  </Link>
                ) : (
                  <span className="text-slime-muted font-medium">
                    {log.brand_name_raw}
                  </span>
                )}
              </div>
            )}
          </header>

          {/* Type + status badges */}
          <div className="flex flex-wrap gap-2 items-center">
            {baseTypeLabel && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: `${typeColor}20`,
                  color: typeColor,
                  borderColor: `${typeColor}50`,
                }}
              >
                {baseTypeLabel}
              </span>
            )}
            {/* 2026-07-16 Commit B-display: variant chip. Distinct
                magenta chip so brand-scoped naming ("Fluffernutter",
                "Cloud Puff") reads as its own signal rather than an
                afterthought on the base type badge. */}
            {variantLabel && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: "rgba(255,0,229,0.14)",
                  color: "#FF00E5",
                  borderColor: "rgba(255,0,229,0.45)",
                }}
              >
                {variantLabel}
              </span>
            )}
            {/* T158 (2026-07-16): subtle skill_level chip. Lighter tint
                than the base-type chip so the difficulty reads as an
                info tag rather than the primary identifier. */}
            {log.skill_level && (
              <span
                className="px-3 py-1 rounded-full text-[11px] font-semibold border"
                style={{
                  background:
                    SLIME_SKILL_LEVEL_COLORS[
                      log.skill_level as SlimeSkillLevel
                    ].bg,
                  color:
                    SLIME_SKILL_LEVEL_COLORS[
                      log.skill_level as SlimeSkillLevel
                    ].text,
                  borderColor:
                    SLIME_SKILL_LEVEL_COLORS[
                      log.skill_level as SlimeSkillLevel
                    ].border,
                }}
              >
                {
                  SLIME_SKILL_LEVEL_LABELS[
                    log.skill_level as SlimeSkillLevel
                  ]
                }
              </span>
            )}
            {log.in_wishlist ? (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: "rgba(204,68,255,0.15)",
                  color: "#CC44FF",
                  borderColor: "rgba(204,68,255,0.4)",
                }}
              >
                Wishlist
              </span>
            ) : log.in_collection ? (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: "rgba(57,255,20,0.15)",
                  color: "#39FF14",
                  borderColor: "rgba(57,255,20,0.4)",
                }}
              >
                In Collection
              </span>
            ) : null}
          </div>

          {/* [Change 4 — scent_notes] Keywords pills only (scent strength moved to ratings grid) */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    background: "rgba(0,240,255,0.08)",
                    color: "#00F0FF",
                    borderColor: "rgba(0,240,255,0.2)",
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Overall rating */}
          {typeof log.rating_overall === "number" && (
            <div className="flex items-center gap-4 mt-1">
              {/* [Change 2 — T98b] toFixed(1) on large rating number */}
              <span
                className="text-5xl font-black leading-none"
                style={{
                  color: "#39FF14",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                {(log.rating_overall as number).toFixed(1)}
              </span>
              <div className="flex flex-col gap-1.5">
                {/* [Change 3 — T98b] Replace star row with gradient fill bar */}
                <div
                  style={{
                    width: 90,
                    height: 6,
                    borderRadius: 3,
                    background: "rgba(45,10,78,0.5)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${((log.rating_overall ?? 0) / 5) * 100}%`,
                      background: "linear-gradient(90deg, #00F0FF, #39FF14)",
                      borderRadius: 3,
                    }}
                  />
                </div>
                <span className="text-xs text-slime-muted uppercase tracking-wider">
                  overall rating
                </span>
              </div>
            </div>
          )}

          {/* [T67a/b] Owner action row — Edit link + Delete button */}
          {isOwner && (
            <div className="flex gap-3 mb-3">
              <Link
                href={`/log/edit/${log.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </Link>
              <div className="flex-1 flex items-center justify-center">
                <DeleteLogButton logId={log.id} />
              </div>
            </div>
          )}

          {/* Action bar — Like + Report */}
          <div
            className="flex items-stretch border-y"
            style={{
              borderColor: "rgba(45,10,78,0.6)",
              marginTop: 4,
            }}
          >
            <div className="flex-1 flex items-center justify-center py-3">
              <LikeButton
                logId={log.id}
                initialCount={likeCount ?? 0}
                initialLiked={!!userLikeRow}
                currentUserId={currentUserId}
              />
            </div>
            {showCTA && (
              <>
                <div
                  className="w-px shrink-0"
                  style={{ background: "rgba(45,10,78,0.6)" }}
                />
                <div className="flex-1 flex items-center justify-center py-3">
                  <ReportButton
                    contentType="log"
                    contentId={log.id}
                    currentUserId={currentUserId}
                  />
                </div>
              </>
            )}
          </div>

          {/* [Change 4 — T98b + scent_notes] Dimension grid — fill bars + toFixed(1) */}
          {(activeDimensions.length > 0 ||
            log.scent_strength ||
            log.condition) && (
            <div
              className="grid grid-cols-2 gap-x-4 gap-y-2.5 p-4 rounded-xl border"
              style={{
                background: "rgba(45,10,78,0.25)",
                borderColor: "rgba(45,10,78,0.5)",
              }}
            >
              {activeDimensions.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                    {label}
                  </span>
                  {/* [Change 4 — T98b] Replace dot row with fill bar + toFixed(1) */}
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: 48,
                        height: 4,
                        borderRadius: 2,
                        background: "rgba(45,10,78,0.5)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: `${((log[key] as number) / 5) * 100}%`,
                          background: "#39FF14",
                          borderRadius: 2,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "#39FF14" }}
                    >
                      {(log[key] as number).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
              {log.scent_strength && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                    Scent
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#39FF14" }}
                  >
                    {SCENT_STRENGTH_LABELS[log.scent_strength as ScentStrength]}
                  </span>
                </div>
              )}
              {log.condition && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-slime-muted font-semibold">
                    Condition
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "#00F0FF" }}
                  >
                    {
                      SLIME_CONDITION_LABELS[
                        log.condition as SlimeCondition
                      ]
                    }
                  </span>
                </div>
              )}
            </div>
          )}

          {/* [Change 5 — scent_notes] Scent notes block between ratings and notes */}
          {log.scent_notes && (
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[11px] font-black tracking-widest uppercase"
                style={{ color: "#00F0FF" }}
              >
                Scent
              </p>
              <p className="text-sm leading-relaxed text-slime-text/80">
                {log.scent_notes}
              </p>
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <p className="text-sm italic leading-relaxed text-slime-text/70">
              {log.notes}
            </p>
          )}

          {/* T125 (2026-07-20) — Owner's per-log aging banner. Only
              renders for the log's owner + on-shelf slimes. Links to
              /collection/aging where they can mark checked. */}
          {ownerAgingBanner && (
            <a
              href="/collection/aging"
              className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all"
              style={{
                background: `${ownerAgingBanner.accent}12`,
                border: `1px solid ${ownerAgingBanner.accent}66`,
                boxShadow:
                  log.aging_state === "overdue"
                    ? `0 0 20px ${ownerAgingBanner.accent}22`
                    : "none",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    background: ownerAgingBanner.accent,
                    boxShadow: `0 0 10px ${ownerAgingBanner.accent}99`,
                    flexShrink: 0,
                  }}
                />
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-black tracking-widest uppercase"
                    style={{ color: ownerAgingBanner.accent }}
                  >
                    Aging: {ownerAgingBanner.label}
                  </p>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "rgba(245,245,245,0.75)" }}
                  >
                    {ownerAgingBanner.subtext}
                  </p>
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ownerAgingBanner.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          )}

          {/* T125 (2026-07-20) — Community aging insights strip.
              Only renders when we have at least the base-type insight
              (≥ 10 collectors have logged this base type). Pro users
              additionally see the brand+base-type median when
              available. Non-Pro viewers see a subtle "Pro" nudge
              instead of the brand row. */}
          {agingInsights.base && (
            <div
              className="flex flex-col gap-2 rounded-2xl p-4"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0,240,255,0.06), rgba(255,0,229,0.06))",
                border: "1px solid rgba(0,240,255,0.35)",
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#00F0FF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
                <p
                  className="text-[11px] font-black tracking-widest uppercase"
                  style={{ color: "#00F0FF" }}
                >
                  Community aging insight
                </p>
              </div>
              <p className="text-sm leading-relaxed text-slime-text/90">
                Collectors typically check{" "}
                <span
                  style={{
                    color: "#00F0FF",
                    fontWeight: 700,
                  }}
                >
                  {baseTypeLabel?.toLowerCase() ?? "this base type"}
                </span>{" "}
                slimes every{" "}
                <span
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 900,
                    color: "#FFFFFF",
                  }}
                >
                  {agingInsights.base.median_days} days
                </span>
                . Based on {agingInsights.base.sample_size} logs across
                the community.
              </p>
              {agingInsights.brand && brandJoin?.slug && (
                <p className="text-sm leading-relaxed text-slime-text/90">
                  For{" "}
                  <span
                    style={{
                      color: "#FF7BEB",
                      fontWeight: 700,
                    }}
                  >
                    {log.brand_name_raw ?? "this brand"}
                  </span>
                  &apos;s {baseTypeLabel?.toLowerCase() ?? "slimes"}
                  , the median is{" "}
                  <span
                    style={{
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 900,
                      color: "#FFFFFF",
                    }}
                  >
                    {agingInsights.brand.median_days} days
                  </span>{" "}
                  <span style={{ color: "rgba(245,245,245,0.55)" }}>
                    ({agingInsights.brand.sample_size} logs)
                  </span>
                  .
                </p>
              )}
              {!agingInsights.brand && log.brand_id && (
                <div
                  className="mt-1 flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(255,210,74,0.06)",
                    border: "1px solid rgba(255,210,74,0.35)",
                  }}
                >
                  <p
                    className="text-xs"
                    style={{ color: "rgba(255,210,74,0.85)" }}
                  >
                    Pro unlocks brand-specific aging data (e.g., how
                    long this brand&apos;s slimes typically stay
                    fresh).
                  </p>
                  <a
                    href="/settings/subscription"
                    className="text-[11px] font-bold rounded-full px-3 py-1"
                    style={{
                      color: "#0A0A0A",
                      background:
                        "linear-gradient(135deg, #FFD24A, #FFAE3B)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Go Pro
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-1.5">
            {log.created_at && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px]"
                style={{
                  background: "rgba(45,10,78,0.4)",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                Logged{" "}
                {new Intl.DateTimeFormat("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }).format(new Date(log.created_at))}
              </span>
            )}
            {/* [Change 3 — T64] Fix: use purchase_price not cost_paid */}
            {typeof log.purchase_price === "number" && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px]"
                style={{
                  background: "rgba(45,10,78,0.4)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(log.purchase_price)}
              </span>
            )}
            {log.purchased_from && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px]"
                style={{
                  background: "rgba(45,10,78,0.4)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {log.purchased_from}
              </span>
            )}
          </div>

          {/* "Log this slime" CTA — non-owners only */}
          {showCTA && (
            <Link
              href={ctaHref}
              className="block w-full text-center py-3.5 rounded-xl text-sm font-bold mt-2"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              {currentUserId ? "Log this slime" : "Sign up to log this slime"}
            </Link>
          )}
        </div>

        <ClientComments logId={log.id} />
      </main>
    </PageWrapper>
  );
}
