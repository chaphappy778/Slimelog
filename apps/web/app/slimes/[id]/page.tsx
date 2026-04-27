// apps/web/app/slimes/[id]/page.tsx
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
import { safeRedirect } from "@/lib/safe-redirect";
import type { CollectionLog } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OwnerProfile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

// SlimeLogRecord — local extension of CollectionLog with image_url field
// that exists on the DB column but isn't in the lib/types CollectionLog
// definition. Filed as separate type-cleanup work; cast at fetch boundary
// instead of mutating the shared type.
type SlimeLogRecord = CollectionLog & {
  image_url: string | null;
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

// ─── Log fetch ────────────────────────────────────────────────────────────────
// RLS on collection_logs (post-#35 migration) allows anon SELECT only when
// is_public = true. We still filter explicitly in the query as defense in
// depth. If the log isn't public, the query returns null and we 404.

async function fetchLog(id: string): Promise<SlimeLogRecord | null> {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("collection_logs")
    .select("*")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();
  return (data as SlimeLogRecord | null) ?? null;
}

// ─── Metadata (#35) ───────────────────────────────────────────────────────────

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
  const ratingPart =
    typeof log.rating_overall === "number"
      ? ` — rated ${log.rating_overall}/5`
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

const TYPE_COLORS: Record<string, string> = {
  butter: "#FFB347",
  clear: "#00F0FF",
  cloud: "#F5F5F5",
  icee: "#4FC3F7",
  fluffy: "#FF6B9D",
  floam: "#8BC34A",
  jelly: "#4ECDC4",
  beaded: "#FF00E5",
  clay: "#E74C3C",
};

const RATING_DIMENSIONS: Array<{ key: keyof CollectionLog; label: string }> = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_scent", label: "Scent" },
  { key: "rating_sound", label: "Sound / ASMR" },
  { key: "rating_drizzle", label: "Aesthetic" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Quality" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SlimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const log = await fetchLog(id);

  if (!log) {
    notFound();
  }

  const supabase = await getSupabase();

  // Current viewer
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  // Owner profile via profiles_public
  const { data: ownerData } = await supabase
    .from("profiles_public")
    .select("username, display_name, avatar_url")
    .eq("id", log.user_id)
    .maybeSingle();
  const owner = ownerData as OwnerProfile | null;

  // Brand slug for linking
  let brandSlug: string | null = null;
  if (log.brand_name_raw) {
    const { data: brandRow } = await supabase
      .from("brands")
      .select("slug")
      .eq("name", log.brand_name_raw)
      .maybeSingle();
    brandSlug = (brandRow?.slug as string | undefined) ?? null;
  }

  // Like info — bulk
  const [{ count: likeCount }, { data: userLikeRow }] = await Promise.all([
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
  ]);

  const typeColor = log.slime_type
    ? (TYPE_COLORS[log.slime_type] ?? "#39FF14")
    : "#39FF14";

  const activeDimensions = RATING_DIMENSIONS.filter(
    ({ key }) => typeof log[key] === "number",
  );

  // [Change 1 — #35] "Log this slime" CTA appears for any non-owner
  // viewer (logged-in or out). Wishlist intent is a real conversion
  // hook for shareable pages.
  const showCTA = currentUserId !== log.user_id;
  const ctaNext = safeRedirect(`/slimes/${log.id}`, "/landing");
  const ctaHref = currentUserId
    ? `/log?prefill=${encodeURIComponent(log.slime_name ?? "")}&brand=${encodeURIComponent(log.brand_name_raw ?? "")}`
    : `/signup?next=${encodeURIComponent(ctaNext)}`;

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
            <h1
              className="text-2xl font-black leading-tight"
              style={{
                color: "#fff",
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              {log.slime_name ?? "Unnamed Slime"}
            </h1>
            {log.brand_name_raw && (
              <div className="text-sm">
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
            {log.slime_type && (
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  background: `${typeColor}20`,
                  color: typeColor,
                  borderColor: `${typeColor}50`,
                }}
              >
                {log.slime_type.replace(/_/g, " ")}
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

          {/* Overall rating */}
          {typeof log.rating_overall === "number" && (
            <div className="flex items-center gap-4 mt-1">
              <span
                className="text-5xl font-black leading-none"
                style={{
                  color: "#39FF14",
                  fontFamily: "Montserrat, Inter, sans-serif",
                }}
              >
                {log.rating_overall}
              </span>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <svg
                      key={n}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill={
                        n <= (log.rating_overall ?? 0)
                          ? "#39FF14"
                          : "rgba(57,255,20,0.15)"
                      }
                      aria-hidden="true"
                    >
                      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs text-slime-muted uppercase tracking-wider">
                  overall rating
                </span>
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

          {/* Dimension grid */}
          {activeDimensions.length > 0 && (
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
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full"
                        style={{
                          background:
                            i <= (log[key] as number)
                              ? "#39FF14"
                              : "rgba(57,255,20,0.15)",
                        }}
                      />
                    ))}
                    <span
                      className="text-xs font-bold ml-1"
                      style={{ color: "#39FF14" }}
                    >
                      {log[key] as number}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {log.notes && (
            <p className="text-sm italic leading-relaxed text-slime-text/70">
              {log.notes}
            </p>
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
            {typeof log.cost_paid === "number" && (
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
                }).format(log.cost_paid)}
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

        {/* Comments — client-only mount so they're not in the SSR HTML.
            [Change 2 — #35] Defers comment thread to hydration so logged-out
            comment text doesn't appear in indexable page source. */}
        <ClientComments logId={log.id} />
      </main>
    </PageWrapper>
  );
}
