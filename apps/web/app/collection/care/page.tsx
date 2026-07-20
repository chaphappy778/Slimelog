// apps/web/app/collection/care/page.tsx
//
// T125 phase 2 — /collection/care: Pro-only per-slime care package
// editor. Free users hitting the route see a Pro paywall variant
// that explains the feature and links to /settings/subscription.
//
// Per-slime card:
//   - Photo + name + brand
//   - Recommended cadence (from base_type_activator_defaults) shown
//     as context
//   - Editable custom cadence (chip picker + custom N-day input)
//   - Care plan notes textarea (500 char max)
//   - Last 3 check-in actions from slime_care_actions history
//   - Save button (per-card; optimistic)
//
// Top-of-page aggregates (Pro insights):
//   - Slimes cared for + actions logged this month
//   - Top 3 action categories this month (bar chart)
//
// T188 Part 4 (2026-07-20) aligned this page to the Design mockup
// (Care Tracking.dc.html).

import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";
import BackLink from "@/components/BackLink";
import CareCardListClient from "@/components/collection/CareCardListClient";
import ProCarePaywall from "@/components/collection/ProCarePaywall";
import type { SlimeBaseType } from "@/lib/types";

export const dynamic = "force-dynamic";

export type CareCardRow = {
  id: string;
  slime_name: string | null;
  brand_name_raw: string | null;
  image_url: string | null;
  base_type: SlimeBaseType | null;
  aging_interval_days: number | null;
  care_plan_notes: string | null;
  default_interval_days: number;
  recent_actions: {
    id: string;
    performed_at: string;
    action_type: string;
    product_key: string | null;
    product_display: string | null;
  }[];
  // Seeds the check-in modal's pre-checked products so reopening the
  // sheet shows what was just logged (Jennifer 2026-07-20: "after u
  // select a recent care action close the card then reopen it all ur
  // selections disapear"). Deliberately a SEPARATE field from
  // recent_actions: that strip shows the last 3 actions over 30 days,
  // this is every product logged in the last 24h, deduped by
  // product_key. Rows with a null product_key (quick category re-logs
  // from the strip) are excluded since they map to no pill.
  recent_selections: {
    action_type: string;
    product_key: string;
    quantity_type: string | null;
    quantity_amount: number | null;
    performed_at: string;
  }[];
};

export type CareAggregate = {
  actions_this_month: number;
  slimes_cared_for_this_month: number;
  // T188 Part 4 (2026-07-20) — replaces the single top_product line
  // with a per-category breakdown so the top card can render the
  // "Top 3 actions" bar chart. Sorted desc, already truncated to 3.
  top_categories: { action_type: string; count: number }[];
};

interface Props {
  searchParams: Promise<{ highlight?: string }>;
}

async function fetchDefaultsMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, number>> {
  const { data } = await supabase
    .from("base_type_activator_defaults")
    .select("base_type, default_interval_days");
  const m = new Map<string, number>();
  for (const row of data ?? []) {
    m.set(row.base_type as string, row.default_interval_days as number);
  }
  return m;
}

export default async function CarePage({ searchParams }: Props) {
  const supabase = await createClient();
  const { highlight } = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/collection/care");
  }

  // Pro gate — use profiles_public.is_premium (computed column that
  // already checks subscription_tier + subscription_status = active).
  const { data: viewerProfile } = await supabase
    .from("profiles_public")
    .select("is_premium")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = Boolean(viewerProfile?.is_premium);

  if (!isPro) {
    return (
      <PageWrapper dots glow="cyan" orbs>
        <PageHeader />
        <main className="pt-14 pb-24">
          <div className="px-4 pt-4 mb-3">
            <BackLink
              fallbackHref="/collection"
              label="Back to collection"
            />
          </div>
          <ProCarePaywall />
        </main>
      </PageWrapper>
    );
  }

  // Fetch on-shelf logs + product catalog for label display
  const [logsRes, productsRes, recentActionsRes] = await Promise.all([
    supabase
      .from("collection_logs")
      .select(
        "id, slime_name, brand_name_raw, image_url, base_type, aging_interval_days, care_plan_notes",
      )
      .eq("user_id", user.id)
      .eq("shelf_state", "on_shelf")
      .order("created_at", { ascending: false }),
    supabase
      .from("care_products")
      .select("key, display_name"),
    // Pull last 30 days of actions to compute recent history per log
    // + aggregate top-product stats. Cheap join in JS.
    supabase
      .from("slime_care_actions")
      .select(
        "id, log_id, performed_at, action_type, product_key, quantity_type, quantity_amount",
      )
      .eq("user_id", user.id)
      .gt(
        "performed_at",
        new Date(Date.now() - 30 * 86_400_000).toISOString(),
      )
      .order("performed_at", { ascending: false }),
  ]);

  if (logsRes.error) {
    console.error(
      "[care] Failed to load on-shelf logs:",
      logsRes.error.message,
    );
  }
  if (productsRes.error) {
    console.error(
      "[care] Failed to load products:",
      productsRes.error.message,
    );
  }

  const defaults = await fetchDefaultsMap(supabase);
  const HARD_FALLBACK = 45;

  const productDisplay = new Map<string, string>(
    (productsRes.data ?? []).map(
      (p) => [p.key as string, p.display_name as string] as const,
    ),
  );

  // Group actions by log_id for the per-card "recent history" strip.
  const actionsByLog = new Map<
    string,
    NonNullable<typeof recentActionsRes.data>
  >();
  for (const a of recentActionsRes.data ?? []) {
    const list = actionsByLog.get(a.log_id as string) ?? [];
    list.push(a);
    actionsByLog.set(a.log_id as string, list);
  }

  // 24h window for modal seeding. Anything older is a check-in the
  // user has moved on from, so it should not come back pre-checked.
  const seedCutoff = Date.now() - 86_400_000;

  const cards: CareCardRow[] = (logsRes.data ?? []).map((row) => {
    const logActions = actionsByLog.get(row.id as string) ?? [];

    // logActions is already sorted performed_at desc, so the first
    // row seen for a product_key is its most recent one — that is the
    // quantity we want to restore.
    const seenKeys = new Set<string>();
    const recentSelections: CareCardRow["recent_selections"] = [];
    for (const a of logActions) {
      const key = a.product_key as string | null;
      if (!key) continue;
      if (new Date(a.performed_at as string).getTime() < seedCutoff) {
        break; // sorted desc, everything after this is older too
      }
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      const amount = a.quantity_amount;
      recentSelections.push({
        action_type: a.action_type as string,
        product_key: key,
        quantity_type: (a.quantity_type as string | null) ?? null,
        quantity_amount:
          amount === null || amount === undefined ? null : Number(amount),
        performed_at: a.performed_at as string,
      });
    }

    return {
      id: row.id as string,
      slime_name: row.slime_name as string | null,
      brand_name_raw: row.brand_name_raw as string | null,
      image_url: row.image_url as string | null,
      base_type: row.base_type as SlimeBaseType | null,
      aging_interval_days: row.aging_interval_days as number | null,
      care_plan_notes: row.care_plan_notes as string | null,
      default_interval_days:
        (row.base_type
          ? defaults.get(row.base_type as string)
          : undefined) ?? HARD_FALLBACK,
      recent_actions: logActions.slice(0, 3).map((a) => ({
        id: a.id as string,
        performed_at: a.performed_at as string,
        action_type: a.action_type as string,
        product_key: a.product_key as string | null,
        product_display: a.product_key
          ? (productDisplay.get(a.product_key as string) ?? null)
          : null,
      })),
      recent_selections: recentSelections,
    };
  });

  // Aggregate: this-month actions, distinct slimes cared for, top product.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonthActions = (recentActionsRes.data ?? []).filter(
    (a) => new Date(a.performed_at as string) >= monthStart,
  );
  const categoryCounts = new Map<string, number>();
  const distinctSlimes = new Set<string>();
  for (const a of thisMonthActions) {
    distinctSlimes.add(a.log_id as string);
    const cat = a.action_type as string;
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }
  const topCategories = [...categoryCounts.entries()]
    .map(([action_type, count]) => ({ action_type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const aggregate: CareAggregate = {
    actions_this_month: thisMonthActions.length,
    slimes_cared_for_this_month: distinctSlimes.size,
    top_categories: topCategories,
  };

  return (
    <PageWrapper dots glow="cyan" orbs>
      <PageHeader />
      <main className="pt-14 pb-24">
        <div className="px-4 pt-4 mb-3">
          <BackLink fallbackHref="/collection" label="Back to collection" />
        </div>

        {/* T188 Part 4 (2026-07-20) — header trimmed to the Design
            mockup: bare "Care" h1 + holo PRO badge on the same row,
            one muted sub-line. The old section label and the long
            explainer paragraph are gone. */}
        <div className="px-4 mb-6">
          <div className="flex items-center gap-2.5">
            <h1
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 900,
                fontSize: 36,
                color: "#FFFFFF",
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              Care
            </h1>
            {/* Decorative Pro badge, not a link. --grad-holo from the
                Design system tokens. */}
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 900,
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#04110A",
                background:
                  "linear-gradient(115deg, #00F0FF 0%, #39FF14 25%, #FFAE3B 50%, #CC44FF 75%, #00F0FF 100%)",
                borderRadius: 999,
                padding: "3px 9px",
              }}
            >
              PRO
            </span>
          </div>
          <p
            className="mt-1"
            style={{
              color: "rgba(245,245,245,0.65)",
              fontSize: 13,
            }}
          >
            Your shelf, on a schedule.
          </p>
        </div>

        <CareCardListClient
          initialCards={cards}
          aggregate={aggregate}
          highlightId={highlight ?? null}
        />
      </main>
    </PageWrapper>
  );
}
