// apps/web/app/brands/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import FollowBrandButton from "@/components/FollowBrandButton";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const SLIME_TYPE_COLORS: Record<string, string> = {
  butter: "bg-yellow-900/40 text-yellow-300",
  clear: "bg-sky-900/40 text-sky-300",
  cloud: "bg-slate-800 text-slate-300",
  icee: "bg-cyan-900/40 text-cyan-300",
  fluffy: "bg-pink-900/40 text-pink-300",
  floam: "bg-lime-900/40 text-lime-300",
  snow_fizz: "bg-blue-900/40 text-blue-300",
  thick_and_glossy: "bg-fuchsia-900/40 text-fuchsia-300",
  jelly: "bg-green-900/40 text-green-300",
  beaded: "bg-orange-900/40 text-orange-300",
  clay: "bg-amber-900/40 text-amber-300",
  cloud_cream: "bg-rose-900/40 text-rose-300",
  magnetic: "bg-zinc-800 text-zinc-300",
  thermochromic: "bg-fuchsia-900/40 text-fuchsia-300",
  avalanche: "bg-indigo-900/40 text-indigo-300",
  slay: "bg-violet-900/40 text-violet-300",
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
    <div className="flex items-center justify-between py-2 border-b border-slime-border last:border-0">
      <span className="text-xs text-slime-muted">{label}</span>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <svg key={i} viewBox="0 0 10 10" className="w-3.5 h-3.5">
            <polygon
              points="5,1 6.2,3.8 9,3.8 7,5.8 7.8,9 5,7.5 2.2,9 3,5.8 1,3.8 3.8,3.8"
              className={i < filled ? "fill-slime-accent" : "fill-slime-border"}
            />
          </svg>
        ))}
        <span className="ml-1 text-xs font-bold text-slime-text">
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
  valueColor = "text-slime-text",
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col items-center bg-slime-card rounded-2xl border border-slime-border p-3 gap-0.5 min-w-0">
      <span className="text-xl leading-none">{icon}</span>
      {value != null ? (
        <span
          className={`text-base font-black mt-1 leading-none ${valueColor}`}
        >
          {value}
          {unit && (
            <span className="text-xs font-medium text-slime-muted ml-0.5">
              {unit}
            </span>
          )}
        </span>
      ) : (
        <span className="text-xs text-slime-muted mt-1">—</span>
      )}
      <span className="text-[10px] text-slime-muted text-center leading-tight mt-0.5">
        {label}
      </span>
    </div>
  );
}

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
    <div className="min-h-screen bg-slime-bg pb-28">
      {/* Sticky back nav */}
      <div
        className="sticky top-0 z-20 px-4"
        style={{
          background: "rgba(10,10,10,0.92)",
          borderBottom: "1px solid rgba(57,255,20,0.12)",
        }}
      >
        <div className="max-w-[390px] mx-auto flex items-center gap-3 py-3">
          <Link
            href="/brands"
            className="p-1.5 rounded-xl bg-slime-surface text-slime-accent hover:bg-slime-border transition-colors active:scale-95"
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
          <span className="text-sm font-bold text-slime-text truncate">
            {brand.name}
          </span>
        </div>
      </div>

      <div className="max-w-[390px] mx-auto px-4 space-y-4 pt-5">
        {/* Brand Header Card */}
        <div className="relative bg-slime-card rounded-3xl border border-slime-border">
          {/* Hero banner */}
          <div
            className="h-28 rounded-t-3xl overflow-hidden relative"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF, #FF00E5)",
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>

          {/* Avatar */}
          <div className="absolute top-16 left-4 z-10">
            <div className="w-16 h-16 rounded-2xl border-4 border-slime-bg shadow-md bg-slime-surface flex items-center justify-center overflow-hidden">
              {brand.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-black text-slime-accent select-none">
                  {initials}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-4 pt-10 pb-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <h1 className="text-lg font-black text-slime-text leading-tight">
                  {brand.name}
                </h1>
                {brand.verification_tier === "verified" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slime-accent/20 text-slime-accent border border-slime-accent/30 uppercase tracking-wide shrink-0">
                    <svg
                      viewBox="0 0 12 12"
                      className="w-2.5 h-2.5 fill-current"
                    >
                      <path d="M6 1L7.3 4H11L8.3 6.2l.9 3.3L6 7.8 2.8 9.5l.9-3.3L1 4h3.7z" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <div className="shrink-0">
                <FollowBrandButton
                  brandId={brand.id}
                  brandSlug={brand.slug}
                  initialFollowerCount={brand.follower_count ?? 0}
                />
              </div>
            </div>

            {brand.owner_name && (
              <p className="text-xs text-slime-muted mt-0.5">
                by {brand.owner_name}
              </p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {brand.location && (
                <span className="flex items-center gap-1 text-xs text-slime-muted">
                  <svg
                    viewBox="0 0 12 12"
                    className="w-3 h-3 fill-slime-accent shrink-0"
                  >
                    <path d="M6 1a3.5 3.5 0 0 0-3.5 3.5C2.5 7.5 6 11 6 11s3.5-3.5 3.5-6.5A3.5 3.5 0 0 0 6 1zm0 4.75A1.25 1.25 0 1 1 6 3.25a1.25 1.25 0 0 1 0 2.5z" />
                  </svg>
                  {brand.location}
                </span>
              )}
              {brand.founded_year && (
                <span className="text-xs text-slime-muted">
                  Est. {brand.founded_year}
                </span>
              )}
              {brand.follower_count != null && (
                <span className="text-xs text-slime-muted">
                  {/* Follower count number — cyan */}
                  <span className="font-bold text-slime-cyan">
                    {brand.follower_count.toLocaleString()}
                  </span>{" "}
                  followers
                </span>
              )}
            </div>

            {(brand.bio || brand.description) && (
              <p className="mt-3 text-xs text-slime-muted leading-relaxed">
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
                  className="flex items-center gap-1 text-[11px] font-semibold text-slime-cyan bg-slime-surface border border-slime-border px-2.5 py-1 rounded-lg hover:border-slime-cyan/50 transition-colors"
                >
                  🌐 Website
                </a>
              )}
              {brand.shop_url && brand.shop_url !== brand.website_url && (
                <a
                  href={brand.shop_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-slime-accent bg-slime-surface border border-slime-border px-2.5 py-1 rounded-lg hover:border-slime-accent/50 transition-colors"
                >
                  🛍️ Shop
                </a>
              )}
              {brand.instagram_handle && (
                <a
                  href={`https://instagram.com/${brand.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-orange-400 bg-slime-surface border border-slime-border px-2.5 py-1 rounded-lg hover:border-orange-400/50 transition-colors"
                >
                  📸 @{brand.instagram_handle}
                </a>
              )}
              {brand.tiktok_handle && (
                <a
                  href={`https://tiktok.com/@${brand.tiktok_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-slime-muted bg-slime-surface border border-slime-border px-2.5 py-1 rounded-lg hover:border-slime-muted/50 transition-colors"
                >
                  🎵 @{brand.tiktok_handle}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Restock Schedule — bg-slime-purple card */}
        {brand.restock_schedule ? (
          <div className="bg-slime-purple border border-slime-accent/20 rounded-2xl p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm text-slime-bg"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              }}
            >
              <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
                <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm1 8.41V6a1 1 0 0 0-2 0v4.59l3.71 3.7 1.41-1.41L11 10.41z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slime-accent uppercase tracking-widest">
                Restock Schedule
              </p>
              <p className="text-sm font-bold text-slime-text mt-0.5">
                {brand.restock_schedule}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-slime-purple border border-slime-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slime-border flex items-center justify-center shrink-0">
              <svg viewBox="0 0 20 20" className="w-5 h-5 fill-slime-muted">
                <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm1 8.41V6a1 1 0 0 0-2 0v4.59l3.71 3.7 1.41-1.41L11 10.41z" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slime-muted uppercase tracking-widest">
                Restock Schedule
              </p>
              <p className="text-xs text-slime-muted italic mt-0.5">
                No schedule listed — follow to get notified
              </p>
            </div>
          </div>
        )}

        {/* Community Stats — numbers cyan */}
        <div>
          <h2 className="text-xs font-black text-slime-muted uppercase tracking-widest mb-3 px-1">
            Community Stats
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <StatPill
              label="Total Logs"
              value={brand.total_logs ?? 0}
              icon="📋"
              valueColor="text-slime-cyan"
            />
            <StatPill
              label="Avg Ship"
              value={brand.avg_days_to_ship}
              unit="d"
              icon="📦"
              valueColor="text-slime-cyan"
            />
            <StatPill
              label="Avg Receive"
              value={brand.avg_days_to_receive}
              unit="d"
              icon="📬"
              valueColor="text-slime-cyan"
            />
            <StatPill
              label="Ship Logs"
              value={brand.shipping_log_count ?? 0}
              icon="🚚"
              valueColor="text-slime-cyan"
            />
          </div>

          {brand.avg_shipping != null || brand.avg_customer_service != null ? (
            <div className="bg-slime-card rounded-2xl border border-slime-border px-4 py-2">
              <StarRow value={brand.avg_shipping} label="Shipping Rating" />
              <StarRow
                value={brand.avg_customer_service}
                label="Customer Service"
              />
              {brand.total_brand_ratings != null &&
                brand.total_brand_ratings > 0 && (
                  <p className="text-[10px] text-slime-muted pt-2 text-right">
                    Based on {brand.total_brand_ratings} rating
                    {brand.total_brand_ratings !== 1 ? "s" : ""}
                  </p>
                )}
            </div>
          ) : (
            <div className="bg-slime-card rounded-2xl border border-slime-border px-4 py-4 text-center">
              <p className="text-xs text-slime-muted">
                No ratings yet — be the first to rate this brand!
              </p>
            </div>
          )}
        </div>

        {/* Recent Community Logs */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-black text-slime-muted uppercase tracking-widest">
              Community Logs
            </h2>
            <span className="text-[11px] text-slime-accent font-semibold">
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
                    "bg-slime-surface text-slime-muted")
                  : null;

                return (
                  <div
                    key={log.id}
                    className="bg-slime-card rounded-2xl border border-slime-border p-3 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-slime-surface border border-slime-border flex items-center justify-center shrink-0 overflow-hidden">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt={username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slime-accent">
                          {username.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slime-text truncate">
                            {slimeName}
                          </p>
                          {/* username handle — magenta */}
                          <p className="text-[11px] text-slime-magenta">
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
                                      ? "fill-slime-accent"
                                      : "fill-slime-border"
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
                        <span className="text-[10px] text-slime-muted">
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
    <div className="bg-slime-card rounded-2xl border border-slime-border p-8 flex flex-col items-center text-center">
      <div className="text-4xl mb-3">🫧</div>
      <h3 className="text-sm font-bold text-slime-text mb-1">No logs yet</h3>
      <p className="text-xs text-slime-muted leading-relaxed">
        Be the first to log a {brandName} slime and help the community!
      </p>
      <Link
        href="/log"
        className="mt-4 inline-flex items-center gap-1.5 text-slime-bg text-xs font-bold px-5 py-2.5 rounded-xl shadow-glow-green active:scale-95 transition-transform"
        style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
          <path d="M8 2a1 1 0 0 1 1 1v4h4a1 1 0 0 1 0 2H9v4a1 1 0 0 1-2 0V9H3a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1z" />
        </svg>
        Log a Slime
      </Link>
    </div>
  );
}
