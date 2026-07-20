// apps/web/lib/aging-insights.ts
//
// T125 — community aging insights.
//
// Given a base_type (and optionally a brand_id), returns the median
// aging interval reported by other collectors. Two tiers of insight:
//
//   TIER 1 (free)     — base-type-only median. "Collectors typically
//                       check butter slimes every ~34 days."
//   TIER 2 (Pro)      — brand + base-type median. "Collectors
//                       typically check Aloe Nightmares butter every
//                       ~42 days — a bit longer than the community
//                       average."
//
// Both tiers require at least MIN_SAMPLE_LOGS matching logs before
// we return a value. Small samples give misleading medians ("1
// collector said day 30 → we tell everyone day 30").
//
// This runs SERVER-SIDE ONLY (via Supabase server client) so the
// aggregate can't be gamed by client-side manipulation. Called from
// the slime detail page (SSR).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SlimeBaseType } from "@/lib/types";

// Minimum number of matching logs before we surface a median. Below
// this threshold we return null (UI treats null as "no insight yet,
// come back once more collectors have logged this").
const MIN_SAMPLE_LOGS = 10;

export interface AgingInsight {
  scope: "base_type" | "brand_base_type";
  median_days: number;
  sample_size: number;
}

/**
 * Compute the median aging interval for a given (base_type,
 * optional brand_id) tuple. Returns null when there's not enough
 * data yet (<10 logs).
 *
 * Median is over `aging_interval_days OR base_type_default` — i.e.,
 * the effective interval each user is running. Users who haven't
 * customized use the base-type default; those who have use their
 * override. That way the median reflects how the COMMUNITY actually
 * treats these slimes, not just what defaults we shipped.
 *
 * Only considers `on_shelf` logs (excludes archived + for-sale).
 * Aging-disabled logs are also excluded — a user who turned off
 * reminders isn't a signal for community timing.
 */
export async function computeAgingInsight(
  supabase: SupabaseClient,
  params: {
    base_type: SlimeBaseType;
    brand_id?: string | null;
  },
): Promise<AgingInsight | null> {
  const { base_type, brand_id } = params;

  // Fetch the base-type default so we can compute the "effective
  // interval" per row in JS (Postgres would need a JOIN + coalesce
  // in the aggregate; JS is simpler and the row set is small).
  const { data: defaultRow, error: defaultErr } = await supabase
    .from("base_type_activator_defaults")
    .select("default_interval_days")
    .eq("base_type", base_type)
    .maybeSingle();
  if (defaultErr) {
    console.warn(
      "[aging-insights] base-type default lookup failed:",
      defaultErr.message,
    );
  }
  const baseDefault =
    (defaultRow?.default_interval_days as number | undefined) ?? 45;

  // Pull the aging_interval_days column across matching logs. Keep
  // the SELECT narrow — we only need one column plus the filter
  // enforcement.
  let query = supabase
    .from("collection_logs")
    .select("aging_interval_days")
    .eq("base_type", base_type)
    .eq("shelf_state", "on_shelf")
    .eq("aging_enabled", true);
  if (brand_id) {
    query = query.eq("brand_id", brand_id);
  }
  const { data, error } = await query;
  if (error) {
    console.warn(
      "[aging-insights] log fetch failed:",
      error.message,
    );
    return null;
  }
  const rows = data ?? [];
  if (rows.length < MIN_SAMPLE_LOGS) {
    return null;
  }

  // Resolve effective interval per row, then compute the median.
  const intervals = rows
    .map(
      (r) =>
        (r.aging_interval_days as number | null) ?? baseDefault,
    )
    .sort((a, b) => a - b);
  const mid = Math.floor(intervals.length / 2);
  const median =
    intervals.length % 2 === 0
      ? Math.round((intervals[mid - 1] + intervals[mid]) / 2)
      : intervals[mid];

  return {
    scope: brand_id ? "brand_base_type" : "base_type",
    median_days: median,
    sample_size: intervals.length,
  };
}

/**
 * Convenience wrapper that returns BOTH the free-tier and Pro-tier
 * insights in one call. Pro insight is only computed when
 * `include_pro` is true (avoids an unnecessary query for
 * non-subscribers).
 */
export async function fetchDualAgingInsights(
  supabase: SupabaseClient,
  params: {
    base_type: SlimeBaseType;
    brand_id: string | null;
    include_pro: boolean;
  },
): Promise<{
  base: AgingInsight | null;
  brand: AgingInsight | null;
}> {
  const base = await computeAgingInsight(supabase, {
    base_type: params.base_type,
  });
  const brand =
    params.include_pro && params.brand_id
      ? await computeAgingInsight(supabase, {
          base_type: params.base_type,
          brand_id: params.brand_id,
        })
      : null;
  return { base, brand };
}

export { MIN_SAMPLE_LOGS };
