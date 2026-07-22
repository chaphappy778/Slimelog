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
// T188 Part 2 + Part 5 + T138 (2026-07-21): the redesigned detail page
// folds care into one collapsible section and moves the rating scale
// behind a single "See scale" modal.
import SlimeDetailCareSection from "@/components/collection/SlimeDetailCareSection";
import RatingScaleModal from "@/components/collection/RatingScaleModal";
import { safeRedirect } from "@/lib/safe-redirect";
// T188 (2026-07-22): SCALE_BANDS is the single source of truth for the
// See-scale band colors, shared with /how-to-rate + the scale modal. We
// reuse it to color-code the rating numbers + progress bars by band.
import { SCALE_BANDS } from "@/app/how-to-rate/content";
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

// T188 (2026-07-22): map a rating value to its See-scale band color so a
// 4.x number reads "Great" green and a 2.x reads "Under" orange at a
// glance. Bands: 1.x Skip (red), 2.x Under (orange), 3.x Solid (cyan),
// 4.x Great (light green), 5.0 Elite (slime green). Sourced from
// SCALE_BANDS to keep the color mapping in one place.
function ratingBandColor(value: number): string {
  const idx = Math.min(
    SCALE_BANDS.length - 1,
    Math.max(0, Math.floor(value) - 1),
  );
  return SCALE_BANDS[idx].accentColor;
}

const RATING_DIMENSIONS: Array<{ key: keyof CollectionLog; label: string }> = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_sound", label: "Sound / ASMR" },
  { key: "rating_drizzle", label: "Aesthetic" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Quality" },
];

// Share caption builder — used by both the just-logged CTA and the
// action-bar Share button so the copy stays identical. 2026-07-17
// T39-H3/T39-L1: warmer intro, numeric rating surfaced, brand IG tagged
// when available.
function buildShareText(
  slimeName: string | null,
  ratingOverall: number | null | undefined,
  brandInstagramHandle: string | null,
  brandNameRaw: string | null,
): string {
  const parts: string[] = [
    `Just logged this on SlimeLog: ${slimeName ?? "this slime"}`,
  ];
  if (typeof ratingOverall === "number") {
    parts.push(`${ratingOverall.toFixed(1)}/5`);
  }
  if (brandInstagramHandle) {
    parts.push(`@${brandInstagramHandle}`);
  } else if (brandNameRaw) {
    parts.push(`by ${brandNameRaw}`);
  }
  return parts.join(" · ");
}

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
  // Viewer profile — used for the owner aging banner (which respects
  // the profile-level aging_reminders_enabled toggle) AND for gating
  // the Pro care-plan upsell copy on the recommended-cadence strip.
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
    viewerAgingRemindersEnabled =
      privateRes.data?.aging_reminders_enabled ?? true;
  }

  // T125 phase 2 (2026-07-20): fetch the recommended check-in cadence
  // for this base type. Was previously calling `fetchDualAgingInsights`
  // which returned a "community median" that was actually just our
  // seed default (no one had customized their intervals). Jenn caught
  // the dishonesty in smoke-test — the copy claimed community-sourced
  // data while showing our defaults. Fix: pull the default directly
  // from `base_type_activator_defaults` and label it honestly as a
  // "recommended cadence." Real community medians (based on
  // slime_care_actions history) roll in as V2 once we have data
  // volume worth aggregating. See computeAgingInsight helper in
  // lib/aging-insights.ts — kept for future re-use.
  let recommendedCadenceDays: number | null = null;
  if (log.base_type) {
    const { data: defaultRow } = await supabase
      .from("base_type_activator_defaults")
      .select("default_interval_days")
      .eq("base_type", log.base_type)
      .maybeSingle();
    recommendedCadenceDays =
      (defaultRow?.default_interval_days as number | undefined) ?? null;
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

  const shareText = buildShareText(
    log.slime_name,
    log.rating_overall as number | null | undefined,
    brandInstagramHandle,
    log.brand_name_raw,
  );

  // ─── T188 Part 2 + T138: Care section data ─────────────────────────────
  // The Care card folds the old owner aging banner + recommended-cadence
  // strip + Pro care-plan CTA into one collapsible surface. Gate mirrors
  // the prior aging-banner gate (on-shelf + per-log aging_enabled + the
  // viewer's own aging_reminders_enabled toggle) minus the owner check,
  // so visitors also see the aging + cadence context. The owner-only
  // care-plan CTA lives inside the component and is gated there.
  const careVisible =
    log.shelf_state === "on_shelf" &&
    Boolean(log.aging_enabled) &&
    viewerAgingRemindersEnabled;

  const nowMs = Date.now();
  const createdMs = log.created_at
    ? new Date(log.created_at).getTime()
    : nowMs;
  const ownedDays = Math.max(0, Math.floor((nowMs - createdMs) / 86_400_000));
  const hasBeenChecked = Boolean(log.last_checked_at);
  const checkAnchorMs = hasBeenChecked
    ? new Date(log.last_checked_at as string).getTime()
    : createdMs;
  const daysSinceCheck = Math.max(
    0,
    Math.floor((nowMs - checkAnchorMs) / 86_400_000),
  );
  // Effective interval: per-log override, else the base-type recommended
  // cadence, else the SQL helper's hard fallback of 45 days.
  const careIntervalDays =
    log.aging_interval_days ?? recommendedCadenceDays ?? 45;
  const daysToGo = Math.max(0, careIntervalDays - daysSinceCheck);
  const careProgressPct = Math.min(
    100,
    Math.max(0, Math.round((daysSinceCheck / careIntervalDays) * 100)),
  );
  const cadenceDays = recommendedCadenceDays ?? careIntervalDays;
  const careBaseLabel = baseTypeLabel ? baseTypeLabel.toLowerCase() : null;
  const careHref = `/collection/care?highlight=${log.id}`;

  // Shared props for both Care instances (mobile inline + desktop sidebar).
  const careProps = {
    isOwner,
    isPro: viewerIsPro,
    ownedDays,
    daysSinceCheck,
    hasBeenChecked,
    intervalDays: careIntervalDays,
    daysToGo,
    progressPct: careProgressPct,
    cadenceDays,
    baseTypeLabel: careBaseLabel,
    careHref,
  };

  const slimeName = log.slime_name ?? "Unnamed Slime";

  // Brand row (logo + linked name) — reused in the hero overlay and the
  // no-image header fallback.
  const brandRow = log.brand_name_raw ? (
    <div className="text-sm flex items-center gap-2 pointer-events-auto">
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
        <span className="font-medium" style={{ color: "#00F0FF" }}>
          {log.brand_name_raw}
        </span>
      )}
    </div>
  ) : null;

  // T188 (2026-07-22): Share moved out of the action bar to the hero's
  // top-right corner (Instagram-style prominence). Icon-only circular
  // glass button; same share payload as before.
  const heroShareButton = (
    <ShareButton
      path={`/slimes/${log.id}?utm_source=share&utm_medium=slime_log`}
      title={log.slime_name ?? "A slime on SlimeLog"}
      text={shareText}
      variant="icon"
    />
  );

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-14 pb-32">
        <div className="max-w-2xl lg:max-w-6xl mx-auto lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-7 lg:px-6 lg:pt-2 lg:items-start">
          {/* ═══════════════════ MAIN COLUMN ═══════════════════ */}
          <div className="min-w-0 flex flex-col">
            {/* Hero */}
            {log.image_url ? (
              <div className="relative w-full aspect-square lg:aspect-[16/10] overflow-hidden lg:rounded-3xl">
                <Image
                  src={log.image_url}
                  alt={slimeName}
                  fill
                  sizes="(max-width: 1024px) 100vw, 760px"
                  priority
                  className="object-cover"
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(10,0,20,0.92) 4%, rgba(10,0,20,0.35) 42%, transparent 68%)",
                  }}
                />
                {/* Share — top-right corner. pointer-events-auto opts back
                    in over the pointer-events-none gradient overlay. */}
                <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-10 pointer-events-auto">
                  {heroShareButton}
                </div>
                <div className="absolute left-4 right-4 bottom-4 lg:left-6 lg:right-6 lg:bottom-6 pointer-events-none">
                  <h1
                    className="mont text-[34px] lg:text-[52px] font-black leading-[0.98] tracking-tight"
                    style={{
                      color: "#fff",
                      fontFamily: "Montserrat, Inter, sans-serif",
                      textShadow: "0 4px 24px rgba(0,0,0,0.6)",
                    }}
                  >
                    {slimeName}
                  </h1>
                  {brandRow && <div className="mt-2.5">{brandRow}</div>}
                </div>
              </div>
            ) : (
              <header className="px-4 lg:px-0 pt-2 flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <h1
                    className="mont text-3xl font-black leading-tight"
                    style={{
                      color: "#fff",
                      fontFamily: "Montserrat, Inter, sans-serif",
                    }}
                  >
                    {slimeName}
                  </h1>
                  {brandRow}
                </div>
                {/* Share — top-right of the no-image header (flex-positioned
                    rather than absolute). */}
                <div className="shrink-0">{heroShareButton}</div>
              </header>
            )}

            <div className="px-4 lg:px-0 mt-4 flex flex-col gap-4">
              {/* 2026-07-17 T39-H1: Just-logged share CTA. Fires only when
                  (a) the URL carries ?justLogged=1 (only set by the wizard's
                  post-submit redirect), and (b) the viewer is the owner. */}
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
                      {brandInstagramHandle
                        ? ` (@${brandInstagramHandle})`
                        : ""}
                      .
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
                        text={shareText}
                        label="Share now"
                        variant="primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Owner identity row */}
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
                          background:
                            "linear-gradient(135deg, #39FF14, #00F0FF)",
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

              {/* Meta chips */}
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
                    In collection
                  </span>
                ) : null}
              </div>

              {/* Keyword pills */}
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
                  <span
                    className="mont font-black leading-none"
                    style={{
                      fontSize: 60,
                      // T188: overall number carries its See-scale band color.
                      color: ratingBandColor(log.rating_overall as number),
                      fontFamily: "Montserrat, Inter, sans-serif",
                      textShadow: `0 0 16px ${ratingBandColor(log.rating_overall as number)}73`,
                    }}
                  >
                    {(log.rating_overall as number).toFixed(1)}
                  </span>
                  <div className="flex-1 flex flex-col">
                    <span
                      className="mont text-xs uppercase font-extrabold"
                      style={{
                        letterSpacing: "0.12em",
                        color: "rgba(245,245,245,0.65)",
                        fontFamily: "Montserrat, Inter, sans-serif",
                      }}
                    >
                      Overall rating
                    </span>
                    <div
                      style={{
                        marginTop: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "rgba(45,10,78,0.5)",
                        position: "relative",
                        overflow: "hidden",
                        maxWidth: 220,
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          right: "auto",
                          width: `${((log.rating_overall ?? 0) / 5) * 100}%`,
                          background:
                            "linear-gradient(90deg, #00F0FF, #39FF14)",
                          borderRadius: 999,
                          boxShadow: "0 0 20px rgba(57,255,20,0.35)",
                        }}
                      />
                    </div>
                    <span
                      className="text-xs mt-1.5"
                      style={{ color: "rgba(245,245,245,0.4)" }}
                    >
                      out of 5
                    </span>
                  </div>
                </div>
              )}

              {/* Owner action row — Edit (glow) + Delete (red) */}
              {isOwner && (
                <div className="flex gap-3 items-stretch">
                  <Link
                    href={`/log/edit/${log.id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                      color: "#0A0A0A",
                      boxShadow: "0 0 12px rgba(0,240,255,0.35)",
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
                  <div className="flex items-center justify-center px-4 rounded-xl">
                    <DeleteLogButton logId={log.id} accent="#FF3D6E" />
                  </div>
                </div>
              )}

              {/* Action bar — Like + Report (Share moved to hero corner) */}
              <div
                className="flex items-stretch border-y"
                style={{ borderColor: "rgba(45,10,78,0.6)" }}
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

              {/* RATINGS */}
              {(activeDimensions.length > 0 ||
                log.scent_strength ||
                log.condition) && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2
                      className="mont font-black text-lg"
                      style={{
                        letterSpacing: "0.02em",
                        color: "#fff",
                        fontFamily: "Montserrat, Inter, sans-serif",
                      }}
                    >
                      RATINGS
                    </h2>
                    <RatingScaleModal />
                  </div>

                  {/* Grid — 5 rating cards + a 6th stacked Condition/Scent
                      cell that fills the otherwise-empty last slot. */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {activeDimensions.map(({ key, label }) => {
                      const value = log[key] as number;
                      // T188: color the number + bar by See-scale band.
                      const color = ratingBandColor(value);
                      return (
                        <div
                          key={key}
                          style={{
                            background: "rgba(45,10,78,0.25)",
                            border: "1px solid rgba(45,10,78,0.7)",
                            borderRadius: 14,
                            padding: 12,
                          }}
                        >
                          <span
                            className="mont uppercase font-extrabold"
                            style={{
                              fontSize: 10.5,
                              letterSpacing: "0.08em",
                              color: "rgba(245,245,245,0.65)",
                              fontFamily: "Montserrat, Inter, sans-serif",
                            }}
                          >
                            {label}
                          </span>
                          <div
                            className="mont font-black"
                            style={{
                              fontSize: 26,
                              lineHeight: 1.1,
                              marginTop: 4,
                              color,
                              fontFamily: "Montserrat, Inter, sans-serif",
                              textShadow: `0 0 12px ${color}73`,
                            }}
                          >
                            {value.toFixed(1)}
                          </div>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 999,
                              background: "rgba(45,10,78,0.6)",
                              overflow: "hidden",
                              marginTop: 7,
                            }}
                          >
                            <div
                              style={{
                                width: `${(value / 5) * 100}%`,
                                height: "100%",
                                borderRadius: 999,
                                background: color,
                                boxShadow: `0 0 10px ${color}80`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* 6th cell — Condition + Scent stacked. Renders only the
                        row(s) that are set; when just one is present the card
                        is simply shorter. Omitted entirely when both null. */}
                    {(log.condition || log.scent_strength) && (
                      <div
                        style={{
                          background: "rgba(45,10,78,0.25)",
                          border: "1px solid rgba(45,10,78,0.7)",
                          borderRadius: 14,
                          padding: 12,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        {log.condition && (
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="mont uppercase font-extrabold"
                              style={{
                                fontSize: 10.5,
                                letterSpacing: "0.08em",
                                color: "rgba(245,245,245,0.65)",
                                fontFamily: "Montserrat, Inter, sans-serif",
                              }}
                            >
                              Condition
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                              style={{
                                background: "rgba(0,240,255,0.1)",
                                border: "1px solid rgba(0,240,255,0.3)",
                                color: "#00F0FF",
                              }}
                            >
                              {
                                SLIME_CONDITION_LABELS[
                                  log.condition as SlimeCondition
                                ]
                              }
                            </span>
                          </div>
                        )}
                        {log.scent_strength && (
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="mont uppercase font-extrabold"
                              style={{
                                fontSize: 10.5,
                                letterSpacing: "0.08em",
                                color: "rgba(245,245,245,0.65)",
                                fontFamily: "Montserrat, Inter, sans-serif",
                              }}
                            >
                              Scent
                            </span>
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                              style={{
                                background: "rgba(57,255,20,0.1)",
                                border: "1px solid rgba(57,255,20,0.3)",
                                color: "#39FF14",
                              }}
                            >
                              {
                                SCENT_STRENGTH_LABELS[
                                  log.scent_strength as ScentStrength
                                ]
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Scent notes */}
              {log.scent_notes && (
                <div className="flex flex-col gap-1.5">
                  <p
                    className="text-[11px] font-black tracking-widest uppercase"
                    style={{ color: "#00F0FF" }}
                  >
                    Scent notes
                  </p>
                  <p className="text-sm leading-relaxed text-slime-text/80">
                    {log.scent_notes}
                  </p>
                </div>
              )}

              {/* Review notes */}
              {log.notes && (
                <p className="text-sm italic leading-relaxed text-slime-text/70">
                  {log.notes}
                </p>
              )}

              {/* CARE — mobile inline (collapsed by default) */}
              {careVisible && (
                <div className="lg:hidden">
                  <SlimeDetailCareSection defaultOpen={false} {...careProps} />
                </div>
              )}

              {/* Meta pills — logged date + purchase info */}
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
                  className="block w-full text-center py-3.5 rounded-xl text-sm font-bold mt-1"
                  style={{
                    background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                    color: "#0A0A0A",
                    fontFamily: "Montserrat, Inter, sans-serif",
                  }}
                >
                  {currentUserId
                    ? "Log this slime"
                    : "Sign up to log this slime"}
                </Link>
              )}
            </div>

            {/* Comments */}
            <ClientComments logId={log.id} />
          </div>

          {/* ═══════════════ STICKY CARE SIDEBAR (desktop) ═══════════════ */}
          {careVisible && (
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <SlimeDetailCareSection defaultOpen={true} {...careProps} />
              </div>
            </aside>
          )}
        </div>
      </main>
    </PageWrapper>
  );
}
