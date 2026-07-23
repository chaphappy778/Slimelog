// apps/web/app/brand-dashboard/[slug]/analytics/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ProGate from "@/components/dashboard/ProGate";
import LogsOverTimeChart from "@/components/dashboard/charts/LogsOverTimeChart";
import RatingsRadarChart from "@/components/dashboard/charts/RatingsRadarChart";
import TopSlimesChart from "@/components/dashboard/charts/TopSlimesChart";
import DropPerformanceChart from "@/components/dashboard/charts/DropPerformanceChart";
import BrandExportButtons from "@/components/dashboard/BrandExportButtons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface DimensionData {
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  avg_overall: number | null;
}

// [T137 Batch 3a] Shared card chrome — matches Batch 1 DashboardLayout tokens:
// soft-violet border on a barely-there white surface, generous radius.
const CARD_STYLE = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(150,110,240,0.16)",
  borderRadius: 18,
} as const;

// Placeholder / "coming soon" cards use a slightly dimmer border.
const PLACEHOLDER_STYLE = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(150,110,240,0.14)",
  borderRadius: 18,
} as const;

const SECTION_LABEL =
  "text-xs font-black uppercase tracking-widest" as const;

// [T137 Batch B] Round a date down to the Monday that starts its ISO week,
// returned as a YYYY-MM-DD string. Mirrors Postgres date_trunc('week', ...).
// We hand this parseable ISO date to LogsOverTimeChart as `week`: the chart's
// own formatWeek() renders the "Aug 5" label and its range filter needs a real
// date, so we must NOT pre-format the label here (a pre-formatted string like
// "Aug 5" parses as year 2001 and the range filter would drop every point).
function isoWeekStart(d: Date): string {
  const utc = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  const dow = utc.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const delta = dow === 0 ? -6 : 1 - dow; // shift back to Monday
  utc.setUTCDate(utc.getUTCDate() + delta);
  return utc.toISOString().slice(0, 10);
}

export default async function AnalyticsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: brand } = await supabase
    .from("brands")
    .select(
      "id, name, slug, verification_tier, subscription_tier, subscription_status, logo_url, total_logs, follower_count, avg_shipping",
    )
    .eq("slug", slug)
    .eq("owner_id", user.id)
    .single();

  if (!brand) redirect("/brands");

  const isPro =
    brand.subscription_tier === "brand_pro" &&
    brand.subscription_status === "active";

  const layoutBrand = {
    id: brand.id,
    name: brand.name,
    slug: brand.slug,
    logo_url: brand.logo_url,
    verification_tier: brand.verification_tier ?? "community",
  };

  // [T137 Fix B-2] Pre-fetch this brand's slime IDs so analytics can count a
  // log through EITHER linking path: collection_logs.brand_id = brand OR the
  // log's slime belongs to the brand. Fix B counted only the slime_id path,
  // which dropped logs where the wizard tagged the brand but no catalog slime
  // (brand.total_logs on Overview counts those, so the two surfaces disagreed:
  // Overview 14, Analytics 0). A brand has well under 500 slimes, so this extra
  // query is small and bounded. See docs/cost-tracker.md.
  const { data: brandSlimes } = await supabase
    .from("slimes")
    .select("id")
    .eq("brand_id", brand.id);
  const brandSlimeIds = (brandSlimes ?? []).map((s) => s.id as string);

  // PostgREST .or() filter matching either path. When the brand has no catalog
  // slimes yet, slime_id.in.() would be empty/invalid, so fall back to the
  // brand_id path alone. A collection_logs row is returned once even when it
  // satisfies both clauses, so the OR is inherently deduped (no double count).
  const logOrFilter =
    brandSlimeIds.length > 0
      ? `brand_id.eq.${brand.id},slime_id.in.(${brandSlimeIds.join(",")})`
      : `brand_id.eq.${brand.id}`;

  // [T137 Batch 3a] Paywall split: brand-specific data is FREE for any brand
  // owner. These six queries now run for everyone, not just Pro. Aggregate /
  // cross-brand / portability features stay Pro-gated at the section level.
  const [
    { data: wl },
    { data: dd },
    { data: ts },
    { data: dropRows },
    { data: cl },
    { data: sa },
  ] = await Promise.all([
    // [T137 Fix B-2] Logs Over Time now counts logs through BOTH paths via the
    // OR filter above: brand_id.eq OR slime_id.in.(brand's slimes). Fix B used
    // only the slime_id -> slimes.brand_id embed, which missed brand_id-only
    // logs and left the chart at 0 while Overview showed the real total. We
    // fetch the timestamp for every matching non-wishlist log and bucket by
    // ISO week in JS below.
    //
    // 2026-07-22 (Fix B-2 follow-up): the schema column is `created_at`, NOT
    // `logged_at` (checked against 20260324000001_slimelog_initial_schema.sql,
    // grep confirms no migration adds a `logged_at` column). Aliasing on the
    // server (`logged_at:created_at`) so the response shape stays what the
    // rest of the page + `BrandExportButtons` expect, without a wider rename.
    // Ordered newest-first and capped so a very large brand keeps the recent
    // weeks the chart actually shows. See docs/cost-tracker.md.
    supabase
      .from("collection_logs")
      .select("logged_at:created_at")
      .or(logOrFilter)
      .eq("in_wishlist", false)
      .order("created_at", { ascending: false })
      .limit(10000),
    supabase
      .from("slimes")
      .select(
        "avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, avg_overall",
      )
      .eq("brand_id", brand.id)
      .eq("is_brand_official", true)
      .not("avg_overall", "is", null),
    supabase
      .from("brand_top_slimes")
      .select("name, total_logs, avg_overall")
      .eq("brand_id", brand.id)
      .order("total_logs", { ascending: false })
      .limit(5),
    supabase
      .from("drops")
      .select("id, name")
      .eq("brand_id", brand.id)
      .order("drop_at", { ascending: false, nullsFirst: false })
      .limit(6),
    // [T137 Fix B-2] Community Logging Activity uses the same OR filter so it
    // lists brand_id-only logs too, not just catalog-slime logs. The slimes
    // embed is now a LEFT join (no `!inner`), so logs with no catalog slime are
    // kept: those display collection_logs.slime_name (always set) and base_type
    // instead of a joined slime name. Catalog logs still prefer the canonical
    // slime.name / slimes.slime_type for enrichment (see mapping below).
    supabase
      .from("collection_logs")
      .select(
        `id,
         slime_name,
         base_type,
         rating_overall,
         rating_texture,
         rating_scent,
         rating_sound,
         rating_drizzle,
         rating_creativity,
         rating_sensory_fit,
         logged_at:created_at,
         slimes(name, slime_type),
         profiles!collection_logs_user_id_fkey(username)`,
      )
      .or(logOrFilter)
      .eq("in_wishlist", false)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("slimes")
      .select(
        "name, slime_type, avg_overall, avg_texture, avg_scent, avg_sound, avg_drizzle, avg_creativity, avg_sensory_fit, total_ratings",
      )
      .eq("brand_id", brand.id)
      .eq("is_brand_official", true)
      .not("avg_overall", "is", null),
  ]);

  // Bucket community logs by ISO week start (Monday), matching the old
  // date_trunc('week', ...) behavior. `week` stays a parseable ISO date; the
  // chart formats the "Aug 5" label itself and its 7/30/90 day range filter
  // reads the real date. The hero "in N days" stat is derived by the chart from
  // this same data, so the top number and the bars always agree.
  const weekBuckets = new Map<string, number>();
  for (const row of wl ?? []) {
    const loggedAt = (row as { logged_at: string | null }).logged_at;
    if (!loggedAt) continue;
    const key = isoWeekStart(new Date(loggedAt));
    weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + 1);
  }
  const weeklyLogs = Array.from(weekBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, log_count]) => ({ week, log_count }));
  const dimensionData: DimensionData[] = (dd ?? []).map((d) => ({
    avg_texture: d.avg_texture,
    avg_scent: d.avg_scent,
    avg_sound: d.avg_sound,
    avg_drizzle: d.avg_drizzle,
    avg_creativity: d.avg_creativity,
    avg_sensory_fit: d.avg_sensory_fit,
    avg_overall: d.avg_overall,
  }));
  const topSlimes = (ts ?? []).map((s) => ({
    name: s.name,
    total_logs: s.total_logs ?? 0,
    avg_overall: s.avg_overall,
  }));

  // [T137 Batch 3a — DATA FIX] Drop Performance previously hardcoded
  // log_count: 0, so every bar rendered as zero. We now compute real community
  // log counts per drop. Approach: three cheap brand-scoped queries + JS
  // aggregation, rather than a PostgREST embed. A nested embed
  // (drops -> drop_slimes -> slimes -> collection_logs!inner) is fragile here
  // because collection_logs.slime_id is nullable and PostgREST embed counts on
  // nullable FKs have bitten us before; separate queries are predictable.
  const dropIds = (dropRows ?? []).map((d) => d.id);
  let dropSlimeRows: { drop_id: string; slime_id: string }[] = [];
  if (dropIds.length) {
    const { data: ds, error: dsErr } = await supabase
      .from("drop_slimes")
      .select("drop_id, slime_id")
      .in("drop_id", dropIds);
    if (dsErr) console.warn("drop_slimes query failed", dsErr.message);
    dropSlimeRows = ds ?? [];
  }

  const involvedSlimeIds = Array.from(
    new Set(dropSlimeRows.map((r) => r.slime_id)),
  );
  const logCountBySlime = new Map<string, number>();
  if (involvedSlimeIds.length) {
    // Bounded by a single brand's drop catalog, so the 10k cap is generous.
    // See docs/cost-tracker.md — revisit if a brand's drop slimes exceed it.
    const { data: logRows, error: logErr } = await supabase
      .from("collection_logs")
      .select("slime_id")
      .in("slime_id", involvedSlimeIds)
      .eq("in_wishlist", false)
      .limit(10000);
    if (logErr) console.warn("drop log-count query failed", logErr.message);
    for (const row of logRows ?? []) {
      const sid = row.slime_id as string | null;
      if (!sid) continue;
      logCountBySlime.set(sid, (logCountBySlime.get(sid) ?? 0) + 1);
    }
  }

  const dropPerformance = (dropRows ?? []).map((d) => {
    const count = dropSlimeRows
      .filter((r) => r.drop_id === d.id)
      .reduce((sum, r) => sum + (logCountBySlime.get(r.slime_id) ?? 0), 0);
    return { name: d.name, log_count: count };
  });

  const communityLogs = (cl ?? []).map((row: Record<string, unknown>) => {
    // [T137 Fix B-2] slimes is now a LEFT embed, so it may be null for
    // brand_id-only logs. Prefer the catalog slime's canonical name/type when
    // present (unchanged display for catalog logs); otherwise fall back to the
    // log's own free-text slime_name (never null) and base_type.
    const slimeEmbed = row.slimes;
    const slime = (Array.isArray(slimeEmbed) ? slimeEmbed[0] : slimeEmbed) as
      | Record<string, unknown>
      | null;
    const profile = row.profiles as Record<string, unknown> | null;
    return {
      slime_name:
        (slime?.name as string) || (row.slime_name as string) || "",
      slime_type:
        (slime?.slime_type as string) ?? (row.base_type as string) ?? null,
      overall: (row.rating_overall as number) ?? null,
      texture: (row.rating_texture as number) ?? null,
      scent: (row.rating_scent as number) ?? null,
      sound: (row.rating_sound as number) ?? null,
      drizzle: (row.rating_drizzle as number) ?? null,
      creativity: (row.rating_creativity as number) ?? null,
      sensory_fit: (row.rating_sensory_fit as number) ?? null,
      logged_at: row.logged_at as string,
      username: (profile?.username as string) ?? null,
    };
  });
  const slimeAggregates = (sa ?? []).map((s) => ({
    name: s.name,
    slime_type: s.slime_type ?? null,
    avg_overall: s.avg_overall ?? null,
    avg_texture: s.avg_texture ?? null,
    avg_scent: s.avg_scent ?? null,
    avg_sound: s.avg_sound ?? null,
    avg_drizzle: s.avg_drizzle ?? null,
    avg_creativity: s.avg_creativity ?? null,
    avg_sensory_fit: s.avg_sensory_fit ?? null,
    total_logs: s.total_ratings ?? 0,
  }));

  // Community Logging Activity table — most recent 100 for display; the full
  // history stays available through the (Pro) CSV export below.
  const activityRows = communityLogs.slice(0, 100);

  return (
    <DashboardLayout brand={layoutBrand} active="analytics" isPro={isPro}>
      {/* [T137 Batch 3a] Small-caps cyan section label; the app bar carries
          brand identity, so no large page h1 here. */}
      <div className="mb-5">
        <p
          className={SECTION_LABEL}
          style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
        >
          Analytics
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
        >
          Deep performance insights for your brand
        </p>
      </div>

      <div className="space-y-4">
        {/* Logs Over Time — FREE, full width. Chart owns its header/stat. */}
        <div className="p-5 lg:p-6" style={CARD_STYLE}>
          <LogsOverTimeChart data={weeklyLogs} />
        </div>

        {/* Drop Performance — FREE, full width. Real log counts per drop. */}
        <div className="p-5 lg:p-6" style={CARD_STYLE}>
          <DropPerformanceChart data={dropPerformance} />
        </div>

        {/* Community Ratings Breakdown | Top Slimes by Logs — FREE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 lg:p-6" style={CARD_STYLE}>
            <RatingsRadarChart data={dimensionData} />
          </div>
          <div className="p-5 lg:p-6" style={CARD_STYLE}>
            <TopSlimesChart data={topSlimes} />
          </div>
        </div>

        {/* Rating Trend | Follower Growth — FREE placeholders (Batch 3b) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              {
                label: "Rating Trend Over Time",
                sub: "How your community rating moves over time",
              },
              {
                label: "Follower Growth",
                sub: "New followers week over week",
              },
            ] as const
          ).map((card) => (
            <div
              key={card.label}
              className="p-6 flex flex-col items-center justify-center text-center min-h-[180px]"
              style={PLACEHOLDER_STYLE}
            >
              <p
                className={SECTION_LABEL}
                style={{
                  color: "#22d3ee",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {card.label}
              </p>
              <p
                className="text-sm mt-2"
                style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
              >
                {card.sub}
              </p>
              <p
                className="text-xs font-bold mt-3"
                style={{ color: "#6b6180" }}
              >
                Coming soon
              </p>
            </div>
          ))}
        </div>

        {/* Community Logging Activity — FREE, full-width scrollable table */}
        <div className="p-5 lg:p-6" style={CARD_STYLE}>
          <p
            className={SECTION_LABEL}
            style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
          >
            Community Logging Activity
          </p>
          <p
            className="text-sm mt-1 mb-4"
            style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
          >
            Every community log of your slimes, newest first
          </p>

          {activityRows.length === 0 ? (
            <div className="py-10 text-center">
              <p
                className="text-sm"
                style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
              >
                No community logs yet. Share your brand page to get started.
              </p>
            </div>
          ) : (
            <>
              <div
                className="overflow-auto rounded-xl"
                style={{
                  maxHeight: 380,
                  border: "1px solid rgba(150,110,240,0.12)",
                }}
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      {["Slime", "Type", "Logger", "Overall", "Logged"].map(
                        (h, i) => (
                          <th
                            key={h}
                            className="sticky top-0 px-3 py-2.5 text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                            style={{
                              color: "#22d3ee",
                              background: "#0e0820",
                              textAlign: i === 3 ? "center" : "left",
                              fontFamily: "Montserrat, sans-serif",
                            }}
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activityRows.map((log, idx) => (
                      <tr
                        key={idx}
                        style={{
                          borderTop: "1px solid rgba(150,110,240,0.1)",
                        }}
                      >
                        <td
                          className="px-3 py-2.5 text-sm font-semibold text-white"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {log.slime_name || "Unknown"}
                        </td>
                        <td
                          className="px-3 py-2.5 text-xs whitespace-nowrap"
                          style={{
                            color: "#8f83b0",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {log.slime_type ?? "Unlisted"}
                        </td>
                        <td
                          className="px-3 py-2.5 text-xs whitespace-nowrap"
                          style={{
                            color: "#b3a7d0",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {log.username ? `@${log.username}` : "Anonymous"}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          {log.overall != null ? (
                            <span
                              className="inline-block text-xs font-black px-2 py-0.5 rounded-full"
                              style={{
                                color: "#22d3ee",
                                background: "rgba(34,211,238,0.12)",
                                fontFamily: "Montserrat, sans-serif",
                              }}
                            >
                              {log.overall.toFixed(1)}
                            </span>
                          ) : (
                            <span style={{ color: "#6b6180" }}>n/a</span>
                          )}
                        </td>
                        <td
                          className="px-3 py-2.5 text-xs whitespace-nowrap"
                          style={{
                            color: "#8f83b0",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {new Date(log.logged_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {communityLogs.length > activityRows.length && (
                <p
                  className="text-xs mt-3"
                  style={{ color: "#6b6180", fontFamily: "Inter, sans-serif" }}
                >
                  Showing the {activityRows.length} most recent logs.
                </p>
              )}
            </>
          )}
        </div>

        {/* [T137 Fix Batch A] Brand Pro extras — three Pro-only sections merged
            under ONE ProGate so free brand owners see a single blurred region
            with one upgrade CTA, not three stacked overlays. The section label
            stays outside the gate so the boundary is clear even when blurred. */}
        <p
          className={SECTION_LABEL}
          style={{ color: "#22d3ee", fontFamily: "Montserrat, sans-serif" }}
        >
          Brand Pro Extras
        </p>
        <ProGate isPro={isPro} brandId={brand.id} brandSlug={brand.slug}>
          <div className="flex flex-col gap-4">
            {/* Community Logs Per Drop — PRO. Cross-brand benchmark, no data yet. */}
            <div
              className="p-6 flex flex-col items-center justify-center text-center min-h-[160px]"
              style={PLACEHOLDER_STYLE}
            >
              <p
                className={SECTION_LABEL}
                style={{
                  color: "#22d3ee",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Community Logs Per Drop
              </p>
              <p
                className="text-sm mt-2"
                style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
              >
                Coming soon: cross-brand benchmarks. See how your logs per drop
                stack up against the platform average.
              </p>
            </div>

            {/* Care action market intel — PRO placeholder (future ticket) */}
            <div
              className="p-6 flex flex-col items-center justify-center text-center min-h-[160px]"
              style={PLACEHOLDER_STYLE}
            >
              <p
                className={SECTION_LABEL}
                style={{
                  color: "#22d3ee",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Care Action Market Intel
              </p>
              <p
                className="text-sm mt-2"
                style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
              >
                Coming soon: aggregate care insights from your customers.
              </p>
            </div>

            {/* Export data — PRO. Portability feature, full-width block. */}
            <div className="p-5 lg:p-6" style={CARD_STYLE}>
              <p
                className={SECTION_LABEL}
                style={{
                  color: "#22d3ee",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Export Data
              </p>
              <p
                className="text-sm mt-1 mb-4"
                style={{ color: "#8f83b0", fontFamily: "Inter, sans-serif" }}
              >
                Download your community logs and slime ratings as CSV
              </p>
              <BrandExportButtons
                brandName={brand.name}
                brandSlug={brand.slug}
                communityLogs={communityLogs}
                slimeAggregates={slimeAggregates}
              />
            </div>
          </div>
        </ProGate>
      </div>
    </DashboardLayout>
  );
}
