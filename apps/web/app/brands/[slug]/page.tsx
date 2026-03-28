// apps/web/app/brands/[slug]/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FollowBrandButton from "@/components/FollowBrandButton";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SLIME_TYPE_COLORS: Record<string, string> = {
  butter: "bg-yellow-100 text-yellow-700",
  clear: "bg-blue-50 text-blue-600",
  cloud: "bg-sky-100 text-sky-700",
  icee: "bg-cyan-100 text-cyan-700",
  fluffy: "bg-pink-100 text-pink-700",
  floam: "bg-lime-100 text-lime-700",
  snow_fizz: "bg-slate-100 text-slate-600",
  thick_and_glossy: "bg-purple-100 text-purple-700",
  jelly: "bg-green-100 text-green-700",
  beaded: "bg-orange-100 text-orange-700",
  clay: "bg-amber-100 text-amber-700",
  cloud_cream: "bg-rose-100 text-rose-600",
  magnetic: "bg-gray-200 text-gray-700",
  thermochromic: "bg-fuchsia-100 text-fuchsia-700",
  avalanche: "bg-indigo-100 text-indigo-700",
  slay: "bg-violet-100 text-violet-700",
};

function formatSlimeType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StarRow({ value, label }: { value: number | null; label: string }) {
  if (value == null) return null;
  const filled = Math.round(value);
  return (
    <div className="flex items-center justify-between py-2 border-b border-pink-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} viewBox="0 0 10 10" className="w-3.5 h-3.5">
            <polygon
              points="5,1 6.2,3.8 9,3.8 7,5.8 7.8,9 5,7.5 2.2,9 3,5.8 1,3.8 3.8,3.8"
              className={i < filled ? "fill-amber-400" : "fill-gray-200"}
            />
          </svg>
        ))}
        <span className="ml-1 text-xs font-bold text-gray-700">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  unit,
  icon,
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  icon: string;
}) {
  return (
    <div className="flex flex-col items-center bg-white rounded-2xl border border-pink-100 shadow-sm p-3 gap-0.5 min-w-0">
      <span className="text-xl leading-none">{icon}</span>
      {value != null ? (
        <span className="text-base font-black text-gray-900 mt-1 leading-none">
          {value}
          {unit && (
            <span className="text-xs font-medium text-gray-400 ml-0.5">
              {unit}
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs text-gray-400 mt-1">—</span>
      )}
      <span className="text-[10px] text-gray-500 text-center leading-tight mt-0.5">
        {label}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("name, bio")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Brand — SlimeLog" };
  return {
    title: `${data.name} — SlimeLog`,
    description:
      data.bio ??
      `Explore ${data.name} slimes and community reviews on SlimeLog.`,
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch brand
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select(
      `
      id, name, slug, description, bio, logo_url, website_url, shop_url,
      instagram_handle, tiktok_handle, owner_name, verification_tier,
      avg_shipping, avg_customer_service, total_brand_ratings,
      avg_days_to_ship, avg_days_to_receive, shipping_log_count,
      location, founded_year, restock_schedule, follower_count, total_logs,
      country_code, contact_email
    `,
    )
    .eq("slug", slug)
    .single();

  if (brandError || !brand) notFound();

  // Fetch recent community logs for this brand
  const { data: logs } = await supabase
    .from("collection_logs")
    .select(
      `
      id, slime_name, slime_type, rating_overall, created_at, brand_name_raw,
      slimes ( name ),
      profiles ( username, avatar_url )
    `,
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentLogs = logs ?? [];
  const initials = brand.name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-fuchsia-50/20 to-white pb-28">
      {/* Back button header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-pink-100 px-4 pt-safe-top">
        <div className="max-w-[390px] mx-auto flex items-center gap-3 py-3">
          <Link
            href="/brands"
            className="p-1.5 rounded-xl bg-pink-50 text-pink-500 hover:bg-pink-100 transition-colors active:scale-95"
          >
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
              <path
                d="M13 4l-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <span className="text-sm font-bold text-gray-800 truncate">
            {brand.name}
          </span>
        </div>
      </div>

      <div className="max-w-[390px] mx-auto px-4 space-y-4 pt-5">
        {/* ── Brand Header Card ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm overflow-hidden">
          {/* Gradient banner */}
          <div className="h-20 bg-gradient-to-br from-pink-300 via-fuchsia-300 to-violet-300 relative">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          {/* Logo overlapping banner */}
          <div className="px-4 pb-4">
            <div className="-mt-8 mb-3 flex items-end justify-between">
              <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-gradient-to-br from-pink-100 to-violet-100 flex items-center justify-center overflow-hidden">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-black bg-gradient-to-br from-pink-500 to-violet-500 bg-clip-text text-transparent">
                    {initials}
                  </span>
                )}
              </div>

              {/* ✅ Real Follow button — replaces UI stub */}
              <div className="mt-2">
                <FollowBrandButton
                  brandId={brand.id}
                  brandSlug={brand.slug}
                  initialFollowerCount={brand.follower_count ?? 0}
                />
              </div>
            </div>

            {/* Name + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-gray-900">{brand.name}</h1>
              {brand.verification_tier === "verified" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-sm uppercase tracking-wide">
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-white">
                    <path d="M6 1L7.3 4H11L8.3 6.2l.9 3.3L6 7.8 2.8 9.5l.9-3.3L1 4h3.7z" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            {/* Owner */}
            {brand.owner_name && (
              <p className="text-xs text-gray-400 mt-0.5">
                by {brand.owner_name}
              </p>
            )}

            {/* Location + founded */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {brand.location && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3 fill-pink-400 shrink-0"
                  >
                    <path d="M6 1a3.5 3.5 0 0 0-3.5 3.5C2.5 7.5 6 11 6 11s3.5-3.5 3.5-6.5A3.5 3.5 0 0 0 6 1zm0 4.75A1.25 1.25 0 1 1 6 3.25a1.25 1.25 0 0 1 0 2.5z" />
                  </svg>
                  {brand.location}
                </span>
              )}
              {brand.founded_year && (
                <span className="text-xs text-gray-400">
                  Est. {brand.founded_year}
                </span>
              )}
              {brand.follower_count != null && (
                <span className="text-xs text-gray-500">
                  <span className="font-bold text-gray-700">
                    {brand.follower_count.toLocaleString()}
                  </span>{" "}
                  followers
                </span>
              )}
            </div>

            {/* Bio */}
            {(brand.bio || brand.description) && (
              <p className="mt-3 text-xs text-gray-600 leading-relaxed">
                {brand.bio ?? brand.description}
              </p>
            )}

            {/* Links */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {brand.website_url && (
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 px-2.5 py-1 rounded-lg hover:bg-fuchsia-100 transition-colors"
                >
                  <svg viewBox="0 0 12 12" className="w-3 h-3 fill-fuchsia-500">
                    <path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1zm0 1c.7 0 1.5.8 2 2H4c.5-1.2 1.3-2 2-2zm-4.8 3h2.1c-.1.3-.1.6-.1 1s0 .7.1 1H1.2A4 4 0 0 1 1.2 5zM2 8h1.3c.3.8.8 1.5 1.4 1.9A4 4 0 0 1 2 8zm4 2c-.7 0-1.5-.8-2-2h4c-.5 1.2-1.3 2-2 2zm1.3-.1A4 4 0 0 1 8.7 8H10a4 4 0 0 1-2.7 1.9zM10.8 7H8.7c.1-.3.1-.6.1-1s0-.7-.1-1h2.1c.1.3.2.6.2 1s-.1.7-.2 1z" />
                  </svg>
                  Website
                </a>
              )}
              {brand.shop_url && brand.shop_url !== brand.website_url && (
                <a
                  href={brand.shop_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-pink-600 bg-pink-50 border border-pink-100 px-2.5 py-1 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  <svg viewBox="0 0 12 12" className="w-3 h-3 fill-pink-500">
                    <path
                      d="M1 1h2l1.5 6h5l1.5-4H4"
                      stroke="currentColor"
                      strokeWidth="1"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <circle cx="5.5" cy="10" r="1" className="fill-pink-500" />
                    <circle cx="9" cy="10" r="1" className="fill-pink-500" />
                  </svg>
                  Shop
                </a>
              )}
              {brand.instagram_handle && (
                <a
                  href={`https://instagram.com/${brand.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3 stroke-orange-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  >
                    <rect x="1" y="1" width="10" height="10" rx="2.5" />
                    <circle cx="6" cy="6" r="2.5" />
                    <circle cx="9" cy="3" r="0.5" fill="currentColor" />
                  </svg>
                  @{brand.instagram_handle}
                </a>
              )}
              {brand.tiktok_handle && (
                <a
                  href={`https://tiktok.com/@${brand.tiktok_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-gray-800 bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <svg viewBox="0 0 12 12" className="w-3 h-3 fill-gray-700">
                    <path d="M9 1.5c0 1 .8 1.8 1.8 1.8v1.5c-.7 0-1.3-.2-1.8-.5v4.2A3 3 0 1 1 6 5.5v1.6a1.5 1.5 0 1 0 1.5 1.4V1.5H9z" />
                  </svg>
                  @{brand.tiktok_handle}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Restock Schedule ────────────────────────────────────────── */}
        {brand.restock_schedule ? (
          <div className="bg-gradient-to-r from-fuchsia-50 to-violet-50 border border-fuchsia-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
              <svg viewBox="0 0 20 20" className="w-5 h-5 fill-white">
                <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm1 8.41V6a1 1 0 0 0-2 0v4.59l3.71 3.7 1.41-1.41L11 10.41z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-widest">
                Restock Schedule
              </p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">
                {brand.restock_schedule}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 20 20" className="w-5 h-5 fill-gray-400">
                <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm1 8.41V6a1 1 0 0 0-2 0v4.59l3.71 3.7 1.41-1.41L11 10.41z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Restock Schedule
              </p>
              <p className="text-xs text-gray-400 italic mt-0.5">
                No schedule listed — follow to get notified
              </p>
            </div>
          </div>
        )}

        {/* ── Community Stats ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 px-1">
            Community Stats
          </h2>

          {/* Pill grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <StatPill
              label="Total Logs"
              value={brand.total_logs ?? 0}
              icon="📋"
            />
            <StatPill
              label="Avg Ship"
              value={brand.avg_days_to_ship}
              unit="d"
              icon="📦"
            />
            <StatPill
              label="Avg Receive"
              value={brand.avg_days_to_receive}
              unit="d"
              icon="📬"
            />
            <StatPill
              label="Ship Logs"
              value={brand.shipping_log_count ?? 0}
              icon="🚚"
            />
          </div>

          {/* Ratings */}
          {(brand.avg_shipping != null ||
            brand.avg_customer_service != null) && (
            <div className="bg-white rounded-2xl border border-pink-100 shadow-sm px-4 py-2">
              <StarRow value={brand.avg_shipping} label="Shipping Rating" />
              <StarRow
                value={brand.avg_customer_service}
                label="Customer Service"
              />
              {brand.total_brand_ratings != null &&
                brand.total_brand_ratings > 0 && (
                  <p className="text-[10px] text-gray-400 pt-2 text-right">
                    Based on {brand.total_brand_ratings} rating
                    {brand.total_brand_ratings !== 1 ? "s" : ""}
                  </p>
                )}
            </div>
          )}

          {brand.avg_shipping == null && brand.avg_customer_service == null && (
            <div className="bg-white rounded-2xl border border-pink-100 shadow-sm px-4 py-4 text-center">
              <p className="text-xs text-gray-400">
                No ratings yet — be the first to rate this brand!
              </p>
            </div>
          )}
        </div>

        {/* ── Recent Community Logs ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Community Logs
            </h2>
            <span className="text-[11px] text-fuchsia-500 font-semibold">
              {recentLogs.length} recent
            </span>
          </div>

          {recentLogs.length === 0 ? (
            <NoLogsEmpty brandName={brand.name} />
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => {
                const slimeName =
                  (log.slimes as any)?.name ??
                  log.slime_name ??
                  "Unnamed Slime";
                const username = (log.profiles as any)?.username ?? "slimer";
                const avatarUrl = (log.profiles as any)?.avatar_url;
                const typeColor = log.slime_type
                  ? (SLIME_TYPE_COLORS[log.slime_type] ??
                    "bg-gray-100 text-gray-600")
                  : null;

                return (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl border border-pink-100 shadow-sm p-3 flex items-start gap-3"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-violet-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-fuchsia-600">
                          {username.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">
                            {slimeName}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            @{username}
                          </p>
                        </div>
                        {log.rating_overall != null && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <svg
                                key={i}
                                viewBox="0 0 10 10"
                                className="w-3 h-3"
                              >
                                <polygon
                                  points="5,1 6.2,3.8 9,3.8 7,5.8 7.8,9 5,7.5 2.2,9 3,5.8 1,3.8 3.8,3.8"
                                  className={
                                    i < log.rating_overall
                                      ? "fill-amber-400"
                                      : "fill-gray-200"
                                  }
                                />
                              </svg>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {typeColor && log.slime_type && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColor}`}
                          >
                            {formatSlimeType(log.slime_type)}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoLogsEmpty({ brandName }: { brandName: string }) {
  return (
    <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-8 flex flex-col items-center text-center">
      <div className="text-4xl mb-3">🫧</div>
      <h3 className="text-sm font-bold text-gray-700 mb-1">No logs yet</h3>
      <p className="text-xs text-gray-400 leading-relaxed">
        Be the first to log a {brandName} slime and help the community!
      </p>
      <Link
        href="/log"
        className="mt-4 inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm active:scale-95 transition-transform"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
          <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 0 1 0 2H9v4a1 1 0 0 1-2 0V9H3a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1z" />
        </svg>
        Log a Slime
      </Link>
    </div>
  );
}
