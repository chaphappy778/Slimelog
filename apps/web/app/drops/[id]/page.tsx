// apps/web/app/drops/[id]/page.tsx
// T139 (2026-07-24): full redesign of the public drop detail page per
// Design's "Drop Detail Redesign" mockup, bundled with the functional
// bug fixes Jenn reported. Mobile-first (375px is the priority, the page
// is Instagram-led shopper traffic); desktop mirrors it as a 2-column
// layout with a sticky buy/actions rail.
//
// Functional fixes shipped here:
//   1. Slime metadata pipe-through. The old page selected name/base_type/
//      etc. off drop_slimes but never pulled the catalog rating, so cards
//      had no rating pill. We now embed the linked `slimes` row
//      (avg_overall/total_ratings) so each card can show a rating.
//   2. Slime cards are now tappable. There is NO public catalog-slime
//      detail route (`/slimes/[id]` renders a collection_logs record, not
//      a `slimes` catalog row), so a card links to the log wizard
//      prefilled for THAT slime — which is the actual conversion the
//      ticket is chasing ("no way to open it and log it"). See logHref().
//   3. "Log this drop" deep-link. Prefills the log wizard with the brand
//      name + drop name (as collection). Follows the established
//      `/log?brand={name}` convention (leaderboard cards, T126) rather
//      than `?brand_id=` — the wizard prefills the free-text brand name
//      and resolves brand_id server-side on save. No wizard change needed.
//   4. Share button preserved (ShareButton, unchanged payload).
//
// The mockup's "Save" control is intentionally omitted: there is no
// drop-bookmark backing table, and Follow (brand) already covers the
// save-the-drop intent. Adding a dead button would ship a non-functional
// control. The mockup's hardcoded "1,204 loggers · 18 drops" counts are
// also omitted (CLAUDE.md: no fabricated trust signals) in favor of the
// real restock-cadence caption.
import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import ShareButton from "@/components/ShareButton";
import FollowBrandButton from "@/components/FollowBrandButton";
import {
  SLIME_BASE_TYPE_LABELS,
  SLIME_BASE_TYPE_COLORS,
} from "@/lib/types";
import type { SlimeBaseType } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Drop {
  id: string;
  brand_id: string;
  name: string;
  description: string | null;
  drop_at: string | null;
  status: string | null;
  cover_image_url: string | null;
  shop_url: string | null;
  created_at: string;
  drop_type: "new_drop" | "restock" | null;
  discount_code: string | null;
  free_shipping_threshold: number | null;
  tubs_available: number | null;
}

interface DropBrand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  is_verified: boolean | null;
  restock_schedule: string | null;
}

// The linked catalog-slime row, embedded via the drop_slimes.slime_id FK.
// Object (or null when the drop-slime is a free-standing, non-catalog
// entry — slime_id is nullable after the drops overhaul migration).
interface CatalogSlime {
  id: string;
  name: string | null;
  image_url: string | null;
  slime_type: string | null;
  avg_overall: number | null;
  total_ratings: number | null;
}

interface DropSlimeRow {
  slime_id: string | null;
  name: string | null;
  base_type: string | null;
  image_url: string | null;
  price: number | null;
  scent_notes: string | null;
  // PostgREST embeds a to-one relationship as an object or null.
  slimes: CatalogSlime | null;
}

interface UpcomingDrop {
  id: string;
  name: string;
  drop_at: string | null;
  status: string | null;
  cover_image_url: string | null;
  tubs_available: number | null;
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

// Wrapped in React cache() so generateMetadata and the page body share a
// single drop+brand fetch within one render pass (mirrors /slimes/[id]).
const fetchDropAndBrand = cache(
  async (id: string): Promise<{ drop: Drop; brand: DropBrand } | null> => {
    const supabase = await getSupabase();
    const { data: dropRow, error: dropErr } = await supabase
      .from("drops")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (dropErr) {
      console.warn("[drops/[id]] drop fetch failed:", dropErr.message);
      return null;
    }
    if (!dropRow) return null;
    const drop = dropRow as Drop;

    const { data: brandRow, error: brandErr } = await supabase
      .from("brands")
      .select("id, slug, name, logo_url, is_verified, restock_schedule")
      .eq("id", drop.brand_id)
      .maybeSingle();

    if (brandErr) {
      console.warn("[drops/[id]] brand fetch failed:", brandErr.message);
      return null;
    }
    if (!brandRow) return null;
    return { drop, brand: brandRow as DropBrand };
  },
);

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchDropAndBrand(id);

  if (!result) {
    return {
      title: "Drop not found — SlimeLog",
      description: "This drop doesn't exist on SlimeLog.",
    };
  }

  const { drop, brand } = result;
  const title = `${drop.name} drop from ${brand.name} — SlimeLog`;
  const description =
    drop.description?.trim() ||
    `${drop.name} — an upcoming slime drop from ${brand.name}. See details on SlimeLog.`;

  const url = `https://slimelog.com/drops/${drop.id}`;

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
      images: [{ url: drop.cover_image_url ?? "/og-default.png" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [drop.cover_image_url ?? "/og-default.png"],
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDropDate(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "Date TBD", time: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { date: "Date TBD", time: "" };

  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(d);
  return { date, time };
}

// T-minus pill — ported from the brand detail page (brands/[slug]) so the
// countdown reads identically everywhere. "LIVE" wins over any countdown;
// unscheduled / past drops render no countdown pill.
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
    return { label: `T-${Math.max(1, Math.round(hours))}h`, variant: "soon" };
  if (days < 7) return { label: `T-${Math.round(days)}d`, variant: "soon" };
  return { label: `T-${Math.max(1, Math.round(weeks))}w`, variant: "far" };
}

// Human label for a drop status (used on the upcoming-drops cards).
function statusLabel(status: string | null): string {
  switch (status) {
    case "live":
      return "live now";
    case "announced":
      return "announced";
    case "sold_out":
      return "sold out";
    case "restocked":
      return "restocked";
    case "cancelled":
      return "cancelled";
    default:
      return "drop";
  }
}

// Build a prefilled log-wizard deep-link. The wizard reads `brand`
// (free-text name, resolved to brand_id server-side on save),
// `collection` (→ collection_name — the drop maps naturally to this),
// `slime_name` and `base_type`. Only the drop-level link omits the
// per-slime params.
function logHref(opts: {
  brandName: string;
  dropName: string;
  slimeName?: string | null;
  baseType?: string | null;
}): string {
  const sp = new URLSearchParams();
  sp.set("brand", opts.brandName);
  sp.set("collection", opts.dropName);
  if (opts.slimeName) sp.set("slime_name", opts.slimeName);
  if (opts.baseType) sp.set("base_type", opts.baseType);
  return `/log?${sp.toString()}`;
}

function baseTypeLabelOf(raw: string | null): string | null {
  if (!raw) return null;
  return SLIME_BASE_TYPE_LABELS[raw as SlimeBaseType] ?? raw;
}

function baseTypeColorOf(raw: string | null): string {
  if (!raw) return "#7DF6FF";
  return SLIME_BASE_TYPE_COLORS[raw as SlimeBaseType]?.text ?? "#7DF6FF";
}

// ─── Small presentational bits ──────────────────────────────────────────────

function VerifiedBadge({ size = 18 }: { size?: number }) {
  return (
    <span
      title="Verified brand"
      aria-label="Verified brand"
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg,#00F0FF,#39FF14)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        fill="none"
        stroke="#04110A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20 7L9 18l-5-5" />
      </svg>
    </span>
  );
}

function RatingPill({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-extrabold shrink-0"
      style={{
        padding: "3px 8px",
        fontSize: 11,
        background: "rgba(255,210,74,0.12)",
        border: "1px solid rgba(255,210,74,0.4)",
        color: "#FFD24A",
      }}
    >
      <svg viewBox="0 0 24 24" width="11" height="11" fill="#FFD24A" aria-hidden="true">
        <path d="M12 3l2.6 5.7 6.2.8-4.6 4.3 1.2 6.2L12 17.2 6.6 20.3l1.2-6.2L3.2 9.5l6.2-.8z" />
      </svg>
      {value.toFixed(1)}
    </span>
  );
}

// Buy-now CTA. Magenta primary when the drop is live; muted violet when
// merely announced; a disabled "Sold out" state when sold out. Renders
// nothing when there's no shop URL or the drop is cancelled.
function BuyButton({
  drop,
}: {
  drop: Drop;
}) {
  const isLive = drop.status === "live";
  const isSoldOut = drop.status === "sold_out";
  const isCancelled = drop.status === "cancelled";

  if (isSoldOut) {
    return (
      <span
        className="w-full flex items-center justify-center gap-2 rounded-2xl font-extrabold cursor-not-allowed"
        style={{
          padding: 15,
          background: "rgba(45,10,78,0.4)",
          border: "1px solid rgba(45,10,78,0.7)",
          color: "rgba(245,245,245,0.5)",
          fontFamily: "Montserrat, Inter, sans-serif",
        }}
        aria-disabled="true"
      >
        Sold out
      </span>
    );
  }

  if (isCancelled || !drop.shop_url) return null;

  const cartIcon = (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );

  return (
    <a
      href={drop.shop_url}
      target="_blank"
      rel="noopener noreferrer"
      className="w-full flex items-center justify-center gap-2.5 rounded-2xl font-extrabold"
      style={{
        padding: 15,
        fontFamily: "Montserrat, Inter, sans-serif",
        ...(isLive
          ? {
              background: "linear-gradient(135deg,#FF00E5,#B800D4)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(255,0,229,0.45)",
            }
          : {
              background: "rgba(45,10,78,0.5)",
              border: "1px solid rgba(255,0,229,0.4)",
              color: "#FF7BEB",
            }),
      }}
    >
      {cartIcon}
      Buy now
    </a>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DropPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchDropAndBrand(id);

  if (!result) {
    notFound();
  }

  const { drop, brand } = result;
  const supabase = await getSupabase();

  // Slimes in this drop + the upcoming-drops row, fired concurrently.
  const [slimeRes, upcomingRes] = await Promise.all([
    supabase
      .from("drop_slimes")
      .select(
        "slime_id, name, base_type, image_url, price, scent_notes, " +
          "slimes ( id, name, image_url, slime_type, avg_overall, total_ratings )",
      )
      .eq("drop_id", drop.id),
    supabase
      .from("drops")
      .select("id, name, drop_at, status, cover_image_url, tubs_available")
      .eq("brand_id", brand.id)
      .neq("id", drop.id)
      .in("status", ["announced", "live"])
      .order("drop_at", { ascending: true })
      .limit(5),
  ]);

  if (slimeRes.error) {
    console.warn("[drops/[id]] drop_slimes fetch failed:", slimeRes.error.message);
  }
  if (upcomingRes.error) {
    console.warn(
      "[drops/[id]] upcoming drops fetch failed:",
      upcomingRes.error.message,
    );
  }

  const slimes = (slimeRes.data ?? []) as unknown as DropSlimeRow[];
  const upcoming = (upcomingRes.data ?? []) as UpcomingDrop[];

  const { date, time } = formatDropDate(drop.drop_at);
  const tminus = computeTminus(drop.status, drop.drop_at);
  const isLive = drop.status === "live";
  const isSoldOut = drop.status === "sold_out";
  const isCancelled = drop.status === "cancelled";

  const dropLogHref = logHref({ brandName: brand.name, dropName: drop.name });

  const sharePath = `/drops/${drop.id}?utm_source=share&utm_medium=drop`;
  const shareTitle = `${drop.name} — ${brand.name}`;
  const shareText = `${brand.name} drop I'm watching on SlimeLog: ${drop.name}`;

  // Icon-only glass circle — used in the hero corner and the mobile
  // action-row square (both are icon-sized slots).
  const heroShareButton = (
    <ShareButton
      path={sharePath}
      title={shareTitle}
      text={shareText}
      variant="icon"
    />
  );

  // Full-width labeled Share — desktop buy rail.
  const railShareButton = (
    <ShareButton
      path={sharePath}
      title={shareTitle}
      text={shareText}
      className="w-full justify-center"
    />
  );

  // ─── Hero status / countdown pill ────────────────────────────────────────
  let heroPill: React.ReactNode = null;
  if (isLive) {
    heroPill = (
      <span
        className="inline-flex items-center gap-2 rounded-full font-extrabold"
        style={{
          padding: "6px 13px",
          fontSize: 12,
          letterSpacing: "0.09em",
          color: "#04110A",
          background: "linear-gradient(135deg,#39FF14,#00F0FF)",
          boxShadow: "0 0 22px rgba(57,255,20,0.55)",
        }}
      >
        <span
          className="rounded-full animate-pulse"
          style={{ width: 8, height: 8, background: "#04110A" }}
          aria-hidden="true"
        />
        LIVE NOW
      </span>
    );
  } else if (isSoldOut) {
    heroPill = (
      <span
        className="inline-flex items-center rounded-full font-extrabold uppercase"
        style={{
          padding: "6px 13px",
          fontSize: 12,
          letterSpacing: "0.09em",
          background: "rgba(6,1,14,0.55)",
          border: "1px solid rgba(245,245,245,0.25)",
          color: "rgba(245,245,245,0.75)",
        }}
      >
        Sold out
      </span>
    );
  } else if (isCancelled) {
    heroPill = (
      <span
        className="inline-flex items-center rounded-full font-extrabold uppercase"
        style={{
          padding: "6px 13px",
          fontSize: 12,
          letterSpacing: "0.09em",
          background: "rgba(255,61,110,0.9)",
          color: "#fff",
        }}
      >
        Cancelled
      </span>
    );
  } else if (tminus) {
    heroPill = (
      <span
        className="inline-flex items-center gap-1.5 rounded-full font-bold"
        style={{
          padding: "6px 12px",
          fontSize: 12,
          fontFamily: "var(--font-mono, ui-monospace, monospace)",
          background: "rgba(6,1,14,0.5)",
          border: "1px solid rgba(0,240,255,0.4)",
          color: "#7DF6FF",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
        Drops in {tminus.label.replace(/^T-/, "")}
      </span>
    );
  }

  // ─── Reusable brand-context row ──────────────────────────────────────────
  const brandContext = (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        <Link
          href={`/brands/${brand.slug}`}
          className="relative rounded-2xl overflow-hidden shrink-0"
          style={{
            width: 46,
            height: 46,
            border: "1px solid rgba(120,60,180,0.5)",
          }}
          aria-label={brand.name}
        >
          {brand.logo_url ? (
            <Image
              src={brand.logo_url}
              alt={brand.name}
              fill
              sizes="46px"
              className="object-cover"
            />
          ) : (
            <span
              className="w-full h-full flex items-center justify-center font-black"
              style={{
                background: "linear-gradient(135deg,#39FF14,#00F0FF)",
                color: "#04110A",
              }}
              aria-hidden="true"
            >
              {brand.name.charAt(0).toUpperCase()}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link
            href={`/brands/${brand.slug}`}
            className="flex items-center gap-1.5"
          >
            <span
              className="font-extrabold truncate"
              style={{
                fontSize: 17,
                color: "#fff",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              {brand.name}
            </span>
            {brand.is_verified && <VerifiedBadge size={18} />}
          </Link>
        </div>
        <FollowBrandButton brandId={brand.id} brandSlug={brand.slug} />
      </div>
      {brand.restock_schedule && (
        <div
          className="inline-flex items-center gap-2"
          style={{ fontSize: 12, color: "rgba(245,245,245,0.65)" }}
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="#CC44FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 11A8 8 0 1 0 18 16" />
            <path d="M20 5v6h-6" />
          </svg>
          Restock cadence:{" "}
          <span style={{ color: "rgba(245,245,245,0.85)", fontWeight: 600 }}>
            {brand.restock_schedule}
          </span>
        </div>
      )}
    </div>
  );

  // ─── Reusable date + tubs meta ───────────────────────────────────────────
  const metaStats = (
    <div className="flex gap-3">
      <div className="flex-1 flex items-center gap-2.5">
        <span
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 40,
            height: 40,
            background: "rgba(0,240,255,0.1)",
            border: "1px solid rgba(0,240,255,0.3)",
            color: "#7DF6FF",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="4.5" width="18" height="17" rx="2.5" />
            <path d="M3 9.5h18" />
            <path d="M8 3v3" />
            <path d="M16 3v3" />
          </svg>
        </span>
        <div className="min-w-0">
          <div
            className="font-extrabold"
            style={{
              fontSize: 14,
              color: "#fff",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            {date}
          </div>
          {time && (
            <div
              style={{
                fontSize: 11,
                color: "rgba(245,245,245,0.65)",
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
              }}
            >
              {time}
            </div>
          )}
        </div>
      </div>
      {typeof drop.tubs_available === "number" && (
        <>
          <div style={{ width: 1, background: "rgba(120,60,180,0.3)" }} />
          <div className="flex-1 flex items-center gap-2.5">
            <span
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{
                width: 40,
                height: 40,
                background: "rgba(57,255,20,0.1)",
                border: "1px solid rgba(57,255,20,0.3)",
                color: "#6DFF4D",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z" />
              </svg>
            </span>
            <div>
              <div
                className="font-black leading-none"
                style={{
                  fontSize: 18,
                  color: "#fff",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                {drop.tubs_available}
              </div>
              <div style={{ fontSize: 11, color: "rgba(245,245,245,0.65)" }}>
                tubs available
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const logThisDropButton = (
    <Link
      href={dropLogHref}
      className="flex items-center justify-center gap-2 rounded-2xl font-extrabold"
      style={{
        padding: 15,
        background: "linear-gradient(135deg,#39FF14,#00F0FF)",
        color: "#04110A",
        boxShadow: "0 0 20px rgba(57,255,20,0.35), 0 0 44px rgba(0,240,255,0.28)",
        fontFamily: "Montserrat, Inter, sans-serif",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
      Log this drop
    </Link>
  );

  // Description block (with the desktop "About this drop" eyebrow).
  const descriptionBlock = drop.description ? (
    <div className="flex flex-col gap-2">
      <h2
        className="hidden lg:block font-extrabold uppercase"
        style={{
          fontSize: 15,
          letterSpacing: "0.05em",
          color: "rgba(245,245,245,0.65)",
          fontFamily: "Montserrat, Inter, sans-serif",
        }}
      >
        About this drop
      </h2>
      <p
        className="leading-relaxed"
        style={{ fontSize: 15, color: "rgba(245,245,245,0.85)" }}
      >
        {drop.description}
      </p>
    </div>
  ) : null;

  // ─── Slimes grid ─────────────────────────────────────────────────────────
  const slimesBlock =
    slimes.length > 0 ? (
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2
            className="font-extrabold uppercase"
            style={{
              fontSize: 17,
              letterSpacing: "0.02em",
              color: "#fff",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            In this drop
          </h2>
          <span
            className="font-black"
            style={{
              fontSize: 14,
              color: "#39FF14",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            {slimes.length}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {slimes.map((s, idx) => {
            const name = s.name ?? s.slimes?.name ?? "Unnamed";
            const rawType = s.base_type ?? s.slimes?.slime_type ?? null;
            const typeLabel = baseTypeLabelOf(rawType);
            const typeColor = baseTypeColorOf(rawType);
            const img = s.image_url ?? s.slimes?.image_url ?? null;
            const rating =
              s.slimes &&
              typeof s.slimes.avg_overall === "number" &&
              (s.slimes.total_ratings ?? 0) > 0
                ? (s.slimes.avg_overall as number)
                : null;
            const href = logHref({
              brandName: brand.name,
              dropName: drop.name,
              slimeName: name,
              baseType: rawType,
            });

            return (
              <Link
                key={s.slime_id ?? `${name}-${idx}`}
                href={href}
                className="block rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(45,10,78,0.3)",
                  border: "1px solid rgba(45,10,78,0.7)",
                  boxShadow: "0 2px 12px rgba(45,10,78,0.45)",
                }}
              >
                <div className="relative" style={{ height: 120 }}>
                  {img ? (
                    <Image
                      src={img}
                      alt={name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 220px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(57,255,20,0.1), rgba(45,10,78,0.4))",
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="28"
                        height="28"
                        fill="none"
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex flex-col gap-1.5">
                  <div
                    className="font-extrabold truncate"
                    style={{
                      fontSize: 14,
                      color: "#fff",
                      fontFamily: "Montserrat, Inter, sans-serif",
                    }}
                    title={name}
                  >
                    {name}
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    {typeLabel ? (
                      <span
                        className="rounded-full font-semibold truncate"
                        style={{
                          padding: "3px 9px",
                          fontSize: 11,
                          background: `${typeColor}1A`,
                          border: `1px solid ${typeColor}59`,
                          color: typeColor,
                        }}
                      >
                        {typeLabel}
                      </span>
                    ) : (
                      <span />
                    )}
                    {rating !== null && <RatingPill value={rating} />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    ) : null;

  // ─── Upcoming drops from the same brand ──────────────────────────────────
  const upcomingBlock =
    upcoming.length > 0 ? (
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2
            className="font-extrabold uppercase"
            style={{
              fontSize: 17,
              letterSpacing: "0.02em",
              color: "#fff",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
          >
            More from {brand.name}
          </h2>
          <Link
            href={`/brands/${brand.slug}`}
            style={{ fontSize: 12, color: "#7DF6FF", fontWeight: 600 }}
          >
            See all
          </Link>
        </div>
        <div
          className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none"
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
        >
          {upcoming.map((u) => {
            const ut = computeTminus(u.status, u.drop_at);
            return (
              <Link
                key={u.id}
                href={`/drops/${u.id}`}
                className="block rounded-2xl overflow-hidden shrink-0"
                style={{
                  width: 180,
                  background: "rgba(45,10,78,0.3)",
                  border: "1px solid rgba(45,10,78,0.7)",
                  boxShadow: "0 2px 12px rgba(45,10,78,0.45)",
                }}
              >
                <div className="relative" style={{ height: 110 }}>
                  {u.cover_image_url ? (
                    <Image
                      src={u.cover_image_url}
                      alt={u.name}
                      fill
                      sizes="180px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(0,240,255,0.15), rgba(45,10,78,0.5))",
                      }}
                    />
                  )}
                  {ut && (
                    <span
                      className="absolute inline-flex items-center gap-1 rounded-full font-bold"
                      style={{
                        top: 8,
                        left: 8,
                        padding: "4px 9px",
                        fontSize: 10.5,
                        fontFamily: "var(--font-mono, ui-monospace, monospace)",
                        background: "rgba(6,1,14,0.6)",
                        border:
                          ut.variant === "live"
                            ? "1px solid rgba(57,255,20,0.5)"
                            : "1px solid rgba(0,240,255,0.4)",
                        color: ut.variant === "live" ? "#6DFF4D" : "#7DF6FF",
                      }}
                    >
                      {ut.label}
                    </span>
                  )}
                </div>
                <div className="p-2.5">
                  <div
                    className="font-extrabold truncate"
                    style={{
                      fontSize: 14,
                      color: "#fff",
                      fontFamily: "Montserrat, Inter, sans-serif",
                    }}
                  >
                    {u.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(245,245,245,0.65)",
                      marginTop: 2,
                    }}
                  >
                    {statusLabel(u.status)}
                    {typeof u.tubs_available === "number"
                      ? ` · ${u.tubs_available} tubs`
                      : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    ) : null;

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-14 pb-32">
        <div className="max-w-2xl lg:max-w-6xl mx-auto">
          {/* ═══════════════ HERO ═══════════════ */}
          <div
            className="relative w-full h-[300px] lg:h-[380px] lg:rounded-3xl overflow-hidden"
            style={{
              background: drop.cover_image_url
                ? undefined
                : "linear-gradient(135deg, rgba(57,255,20,0.15), rgba(45,10,78,0.5))",
            }}
          >
            {drop.cover_image_url && (
              <Image
                src={drop.cover_image_url}
                alt={drop.name}
                fill
                sizes="(max-width: 1024px) 100vw, 1152px"
                priority
                className="object-cover"
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, rgba(6,1,14,0.55) 0%, rgba(6,1,14,0) 34%, rgba(6,1,14,0.35) 62%, rgba(6,1,14,0.96) 100%)",
              }}
            />

            {/* Top row — back + share */}
            <div className="absolute top-4 left-4 right-4 lg:top-6 lg:left-6 lg:right-6 flex items-center justify-between z-10">
              <Link
                href={`/brands/${brand.slug}`}
                className="inline-flex items-center gap-2 rounded-full"
                style={{
                  height: 42,
                  padding: "0 14px",
                  background: "rgba(10,0,20,0.5)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  color: "#fff",
                }}
                aria-label={`Back to ${brand.name}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 12H5" />
                  <path d="M12 18l-6-6 6-6" />
                </svg>
                <span className="hidden lg:inline font-semibold text-sm">
                  Back to {brand.name}
                </span>
              </Link>
              <div className="pointer-events-auto">{heroShareButton}</div>
            </div>

            {/* Bottom — pill + title */}
            <div className="absolute left-5 right-5 bottom-5 lg:left-10 lg:right-10 lg:bottom-8 flex flex-col gap-3 pointer-events-none">
              {heroPill && <div>{heroPill}</div>}
              <h1
                className="font-black leading-[0.96] tracking-tight"
                style={{
                  fontSize: "clamp(38px, 11vw, 76px)",
                  color: "#fff",
                  fontFamily: "Montserrat, Inter, sans-serif",
                  textShadow: "0 4px 24px rgba(0,0,0,0.5)",
                }}
              >
                {drop.name}
              </h1>
            </div>
          </div>

          {/* ═══════════════ BODY ═══════════════ */}
          <div className="px-4 lg:px-0 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8 lg:mt-8">
            {/* ── Main column ── */}
            <div className="flex flex-col gap-5 lg:gap-7 mt-5 lg:mt-0 min-w-0">
              {brandContext}

              {/* Meta + Buy — mobile inline (desktop shows it in the rail) */}
              <div
                className="lg:hidden flex flex-col gap-3.5 rounded-3xl"
                style={{
                  background: "rgba(45,10,78,0.3)",
                  border: "1px solid rgba(45,10,78,0.7)",
                  boxShadow:
                    "0 0 0 1px rgba(120,60,180,0.20), 0 4px 24px rgba(45,10,78,0.55)",
                  padding: 16,
                }}
              >
                {metaStats}
                <BuyButton drop={drop} />
              </div>

              {descriptionBlock}
              {slimesBlock}

              {/* Actions — mobile inline (desktop shows them in the rail) */}
              <div className="lg:hidden flex gap-2.5">
                <div className="flex-1">{logThisDropButton}</div>
                <div
                  className="flex items-center justify-center rounded-2xl shrink-0"
                  style={{
                    width: 52,
                    height: 52,
                    background: "rgba(45,10,78,0.3)",
                    border: "1px solid rgba(45,10,78,0.7)",
                  }}
                >
                  {heroShareButton}
                </div>
              </div>

              {upcomingBlock}
            </div>

            {/* ── Sticky buy/actions rail (desktop only) ── */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 flex flex-col gap-4">
                <div
                  className="flex flex-col gap-4 rounded-3xl"
                  style={{
                    background: "rgba(45,10,78,0.3)",
                    border: "1px solid rgba(45,10,78,0.7)",
                    boxShadow:
                      "0 0 0 1px rgba(120,60,180,0.28), 0 8px 40px rgba(45,10,78,0.65), 0 0 32px rgba(204,68,255,0.12)",
                    padding: 22,
                  }}
                >
                  {metaStats}
                  <BuyButton drop={drop} />
                  <div
                    style={{ height: 1, background: "rgba(120,60,180,0.3)" }}
                  />
                  {logThisDropButton}
                  {railShareButton}
                </div>
                {brand.restock_schedule && (
                  <div
                    className="inline-flex items-center gap-2 px-1"
                    style={{ fontSize: 12.5, color: "rgba(245,245,245,0.65)" }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="#CC44FF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 11A8 8 0 1 0 18 16" />
                      <path d="M20 5v6h-6" />
                    </svg>
                    Restocks {brand.restock_schedule}
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Promo info (discount code + free shipping) — below the fold */}
          {(drop.discount_code || drop.free_shipping_threshold != null) &&
            !isCancelled && (
              <div className="px-4 lg:px-0 mt-6 flex flex-wrap items-center gap-3">
                {drop.discount_code && (
                  <div
                    className="inline-flex items-center gap-2 rounded-2xl"
                    style={{
                      padding: "8px 12px",
                      background: "rgba(45,10,78,0.3)",
                      border: "1px solid rgba(45,10,78,0.7)",
                    }}
                  >
                    <span
                      className="font-bold uppercase"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "rgba(245,245,245,0.4)",
                        fontFamily: "Montserrat, Inter, sans-serif",
                      }}
                    >
                      Code
                    </span>
                    <span
                      className="font-black text-white rounded-lg"
                      style={{
                        fontSize: 14,
                        padding: "2px 8px",
                        background: "rgba(45,10,78,0.5)",
                        border: "1px solid rgba(45,10,78,0.8)",
                      }}
                    >
                      {drop.discount_code}
                    </span>
                  </div>
                )}
                {drop.free_shipping_threshold != null && (
                  <p style={{ fontSize: 12, color: "rgba(245,245,245,0.5)" }}>
                    Free shipping on orders over $
                    {Number.isInteger(drop.free_shipping_threshold)
                      ? drop.free_shipping_threshold
                      : (drop.free_shipping_threshold as number).toFixed(2)}
                  </p>
                )}
              </div>
            )}
        </div>
      </main>
    </PageWrapper>
  );
}
