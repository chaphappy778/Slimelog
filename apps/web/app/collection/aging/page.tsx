// apps/web/app/collection/aging/page.tsx
//
// T125 — /collection/aging: three-section aging view for the user's
// on-shelf collection. Grouped by aging_state:
//   1. Overdue (red glow) — needs immediate attention
//   2. Warning (amber) — coming up in the next few days
//   3. Fresh (green, collapsed by default) — no action needed
//
// Server-renders the initial state, hands off to <AgingListClient> for
// the interactive actions (Mark checked / Snooze / Adjust interval /
// Archive / Turn off).
//
// Only shows logs where shelf_state='on_shelf'. Archived slimes live
// on the main /collection page (with a filter chip). For-sale slimes
// also skip this view — the marketplace surface will handle them.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import BackLink from "@/components/BackLink";
import AgingListClient from "@/components/collection/AgingListClient";
import type { AgingState, SlimeBaseType } from "@/lib/types";

export const dynamic = "force-dynamic";

export type AgingLogRow = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  image_url: string | null;
  base_type: SlimeBaseType | null;
  aging_state: AgingState;
  aging_interval_days: number | null;
  last_checked_at: string | null;
  created_at: string;
  effective_interval_days: number;
  days_since_check: number;
};

// Effective interval resolution mirrors get_effective_aging_interval
// in the migration. We fetch the base_type defaults once and apply in
// memory rather than joining per-row.
async function fetchDefaults(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("base_type_activator_defaults")
    .select("base_type, default_interval_days");
  if (error) {
    console.warn(
      "[aging] Failed to load activator defaults:",
      error.message,
    );
    return new Map();
  }
  const m = new Map<string, number>();
  for (const row of data ?? []) {
    m.set(
      row.base_type as string,
      row.default_interval_days as number,
    );
  }
  return m;
}

export default async function AgingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection/aging");
  }

  // Query ordered by state (overdue first) so the initial paint
  // matches the visual grouping without additional JS sort.
  const { data: logs, error } = await supabase
    .from("collection_logs")
    .select(
      "id, slime_name, brand_name_raw, image_url, base_type, aging_state, aging_interval_days, last_checked_at, created_at",
    )
    .eq("user_id", user.id)
    .eq("shelf_state", "on_shelf")
    .eq("aging_enabled", true)
    .order("aging_state", { ascending: false }); // 'overdue' > 'warning' > 'fresh' alphabetically

  if (error) {
    console.error("[aging] Failed to load logs:", error.message);
  }

  const defaults = await fetchDefaults(supabase);
  const HARD_FALLBACK = 45;

  const enrichedLogs: AgingLogRow[] = (logs ?? []).map((row) => {
    const interval =
      row.aging_interval_days ??
      (row.base_type
        ? defaults.get(row.base_type as string)
        : undefined) ??
      HARD_FALLBACK;
    const anchor = new Date(
      row.last_checked_at ?? row.created_at,
    ).getTime();
    const daysSince = Math.floor((Date.now() - anchor) / 86_400_000);
    return {
      id: row.id as string,
      slime_name: row.slime_name as string | null,
      brand_name_raw: row.brand_name_raw as string | null,
      image_url: row.image_url as string | null,
      base_type: row.base_type as SlimeBaseType | null,
      aging_state: row.aging_state as AgingState,
      aging_interval_days: row.aging_interval_days as number | null,
      last_checked_at: row.last_checked_at as string | null,
      created_at: row.created_at as string,
      effective_interval_days: interval,
      days_since_check: daysSince,
    };
  });

  const overdue = enrichedLogs.filter((l) => l.aging_state === "overdue");
  const warning = enrichedLogs.filter((l) => l.aging_state === "warning");
  const fresh = enrichedLogs.filter((l) => l.aging_state === "fresh");

  const totalNeedsAttention = overdue.length + warning.length;

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24">
        <div className="px-4 pt-4 mb-3">
          <BackLink fallbackHref="/collection" label="Back to collection" />
        </div>

        {/* Hero header */}
        <div className="px-4 mb-6">
          <p
            className="section-label mb-2"
            style={{ color: "rgba(0,240,255,0.85)" }}
          >
            Aging shelf
          </p>
          <h1
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 900,
              fontSize: 32,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
            }}
          >
            {totalNeedsAttention === 0 ? (
              <>Your shelf is fresh.</>
            ) : (
              <>
                <span style={{ color: "#FF7BEB" }}>
                  {totalNeedsAttention}
                </span>{" "}
                {totalNeedsAttention === 1 ? "slime needs" : "slimes need"}{" "}
                attention
              </>
            )}
          </h1>
          <p
            className="mt-2"
            style={{
              color: "rgba(245,245,245,0.55)",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {totalNeedsAttention === 0
              ? "Check back in a few days — we'll flag your slimes as they age. "
              : "Tap a slime when you've checked or re-activated it to reset its timer. "}
            Mark slimes you no longer own as{" "}
            <Link
              href="/collection"
              style={{
                color: "#00F0FF",
                textDecoration: "underline",
              }}
            >
              archived
            </Link>{" "}
            to stop seeing them here.
          </p>
        </div>

        <AgingListClient
          overdue={overdue}
          warning={warning}
          fresh={fresh}
        />
      </main>
    </PageWrapper>
  );
}
