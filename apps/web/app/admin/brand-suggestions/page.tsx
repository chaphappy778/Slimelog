// apps/web/app/admin/brand-suggestions/page.tsx
//
// T110 (2026-07-11): admin queue for community brand suggestions.
//
// Server component. Reads the list under the service-role client so we
// can join to profiles_public and see submitter usernames regardless of
// visibility. Filter tabs: Pending / Approved / Rejected / Duplicate.
// Row-level actions (approve slug picker, reject notes, duplicate link)
// live in the client-side <BrandSuggestionRow> component.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import BrandSuggestionRow from "./BrandSuggestionRow";

// ─── Types ────────────────────────────────────────────────────────────────────

type BrandSuggestionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "duplicate";

const VALID_STATUSES: readonly BrandSuggestionStatus[] = [
  "pending",
  "approved",
  "rejected",
  "duplicate",
];

interface SubmitterProfile {
  id: string;
  username: string | null;
  display_name: string | null;
}

interface SuggestionRow {
  id: string;
  submitter_id: string | null;
  name: string;
  website_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  note: string | null;
  status: BrandSuggestionStatus;
  admin_notes: string | null;
  resolved_brand_id: string | null;
  resolved_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<BrandSuggestionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  duplicate: "Duplicate",
};

const STATUS_COLORS: Record<BrandSuggestionStatus, string> = {
  pending: "#00F0FF",
  approved: "#39FF14",
  rejected: "#FF00E5",
  duplicate: "#FFB800",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = (d - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 365)
    return rtf.format(Math.round(diff / 86400 / 30), "month");
  return rtf.format(Math.round(diff / 86400 / 365), "year");
}

// Kebab-cased slug guess: strip non-alnum, collapse dashes.
export function suggestSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabPill({
  label,
  count,
  href,
  isActive,
  color,
}: {
  label: string;
  count: number;
  href: string;
  isActive: boolean;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all"
      style={{
        background: isActive ? `${color}1F` : "rgba(45,10,78,0.3)",
        border: isActive
          ? `1px solid ${color}66`
          : "1px solid rgba(45,10,78,0.6)",
        color: isActive ? color : "rgba(245,245,245,0.6)",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {label}
      <span
        className="text-[10px] px-1.5 py-0.5 rounded-full"
        style={{
          background: isActive ? `${color}33` : "rgba(0,0,0,0.35)",
          color: isActive ? color : "rgba(245,245,245,0.4)",
        }}
      >
        {count.toLocaleString()}
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminBrandSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!(await isAdminUser(authClient, user))) {
    redirect("/");
  }

  const params = await searchParams;
  const requested = params.status;
  const statusFilter: BrandSuggestionStatus =
    requested && (VALID_STATUSES as readonly string[]).includes(requested)
      ? (requested as BrandSuggestionStatus)
      : "pending";

  const admin = createAdminClient();

  const [pendingCount, approvedCount, rejectedCount, duplicateCount] =
    await Promise.all([
      admin
        .from("brand_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .then((r) => r.count ?? 0),
      admin
        .from("brand_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .then((r) => r.count ?? 0),
      admin
        .from("brand_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "rejected")
        .then((r) => r.count ?? 0),
      admin
        .from("brand_suggestions")
        .select("*", { count: "exact", head: true })
        .eq("status", "duplicate")
        .then((r) => r.count ?? 0),
    ]);

  const { data: rawRows, error: listErr } = await admin
    .from("brand_suggestions")
    .select(
      `id, submitter_id, name, website_url, instagram_handle, tiktok_handle,
       note, status, admin_notes, resolved_brand_id, resolved_at, created_at`,
    )
    .eq("status", statusFilter)
    .order("created_at", { ascending: false })
    .limit(100);

  if (listErr) {
    console.error("[admin/brand-suggestions] list failed:", listErr);
  }

  const suggestions = (rawRows ?? []) as SuggestionRow[];

  // Batch-fetch submitter profiles so we can label rows with @username.
  const submitterIds = Array.from(
    new Set(
      suggestions
        .map((s) => s.submitter_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  );

  let profilesById: Map<string, SubmitterProfile> = new Map();
  if (submitterIds.length > 0) {
    const { data: profilesData } = await admin
      .from("profiles_public")
      .select("id, username, display_name")
      .in("id", submitterIds);
    if (profilesData) {
      profilesById = new Map(
        (profilesData as SubmitterProfile[]).map((p) => [p.id, p]),
      );
    }
  }

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-20 pb-24 px-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
          >
            Brand Suggestions
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Review community-submitted brands before they join the catalog
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabPill
            label={STATUS_LABELS.pending}
            count={pendingCount}
            href="/admin/brand-suggestions?status=pending"
            isActive={statusFilter === "pending"}
            color={STATUS_COLORS.pending}
          />
          <TabPill
            label={STATUS_LABELS.approved}
            count={approvedCount}
            href="/admin/brand-suggestions?status=approved"
            isActive={statusFilter === "approved"}
            color={STATUS_COLORS.approved}
          />
          <TabPill
            label={STATUS_LABELS.rejected}
            count={rejectedCount}
            href="/admin/brand-suggestions?status=rejected"
            isActive={statusFilter === "rejected"}
            color={STATUS_COLORS.rejected}
          />
          <TabPill
            label={STATUS_LABELS.duplicate}
            count={duplicateCount}
            href="/admin/brand-suggestions?status=duplicate"
            isActive={statusFilter === "duplicate"}
            color={STATUS_COLORS.duplicate}
          />
        </div>

        {suggestions.length === 0 ? (
          <div
            className="rounded-2xl text-center text-sm text-slime-muted"
            style={{
              padding: 48,
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            No suggestions with status: {STATUS_LABELS[statusFilter]}.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map((row) => {
              const submitter = row.submitter_id
                ? (profilesById.get(row.submitter_id) ?? null)
                : null;
              return (
                <BrandSuggestionRow
                  key={row.id}
                  suggestion={{
                    id: row.id,
                    name: row.name,
                    website_url: row.website_url,
                    instagram_handle: row.instagram_handle,
                    tiktok_handle: row.tiktok_handle,
                    note: row.note,
                    status: row.status,
                    admin_notes: row.admin_notes,
                    resolved_brand_id: row.resolved_brand_id,
                    resolved_at: row.resolved_at,
                    createdAtRelative: relativeTime(row.created_at),
                    createdAtIso: row.created_at,
                  }}
                  submitter={submitter}
                  defaultSlug={suggestSlug(row.name)}
                />
              );
            })}
          </div>
        )}
      </main>
    </PageWrapper>
  );
}
