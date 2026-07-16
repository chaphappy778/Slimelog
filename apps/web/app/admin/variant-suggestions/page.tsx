// apps/web/app/admin/variant-suggestions/page.tsx
//
// T158 (2026-07-16) Commit B-admin: admin queue for community
// brand-scoped variant suggestions. Mirrors /admin/brand-suggestions
// (T110) but for the variant_suggestions table (mig 078).
//
// Server component. Uses the service-role client to join across
// profiles_public + brands + subtypes + brand_variants regardless of
// visibility.
//
// Filter tabs: Pending / Approved / Rejected / Duplicate.
// Row-level actions live in the client <VariantSuggestionRow>
// component. Each pending row is enriched with:
//  * The submitter's public profile
//  * All subtypes for that suggestion's base_type (approve-link mode)
//  * All existing brand_variants for that (brand, base) combo so the
//   admin sees what's already tracked before approving
//  * Any other pending variant_suggestions for the same brand+base
//   combo (used by the mark-duplicate form's dropdown)

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import VariantSuggestionRow from "./VariantSuggestionRow";
import {
 SLIME_BASE_TYPE_LABELS,
 type SlimeBaseType,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type VariantSuggestionStatus =
 | "pending"
 | "approved"
 | "rejected"
 | "duplicate";

const VALID_STATUSES: readonly VariantSuggestionStatus[] = [
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

interface BrandLite {
 id: string;
 name: string;
 slug: string;
}

interface SuggestionRow {
 id: string;
 submitter_id: string | null;
 brand_id: string;
 base_type: SlimeBaseType;
 proposed_name: string;
 note: string | null;
 status: VariantSuggestionStatus;
 admin_notes: string | null;
 resolved_subtype_id: string | null;
 resolved_brand_variant_id: string | null;
 resolved_at: string | null;
 created_at: string;
 brands: BrandLite | BrandLite[] | null;
}

export interface SubtypeOption {
 id: string;
 name: string;
 slug: string;
 base_type: SlimeBaseType;
}

export interface BrandVariantSummary {
 id: string;
 subtype_id: string;
 subtype_name: string;
 brand_display_name: string | null;
}

export interface PendingPeer {
 id: string;
 proposed_name: string;
 created_at: string;
}

const STATUS_LABELS: Record<VariantSuggestionStatus, string> = {
 pending: "Pending",
 approved: "Approved",
 rejected: "Rejected",
 duplicate: "Duplicate",
};

const STATUS_COLORS: Record<VariantSuggestionStatus, string> = {
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

// Kebab-cased slug guess for a proposed subtype name.
export function suggestSlug(name: string): string {
 return name
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");
}

function firstBrand(rel: BrandLite | BrandLite[] | null): BrandLite | null {
 if (!rel) return null;
 return Array.isArray(rel) ? (rel[0] ?? null) : rel;
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

export default async function AdminVariantSuggestionsPage({
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
 const statusFilter: VariantSuggestionStatus =
  requested && (VALID_STATUSES as readonly string[]).includes(requested)
   ? (requested as VariantSuggestionStatus)
   : "pending";

 const admin = createAdminClient();

 const [pendingCount, approvedCount, rejectedCount, duplicateCount] =
  await Promise.all([
   admin
    .from("variant_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .then((r) => r.count ?? 0),
   admin
    .from("variant_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved")
    .then((r) => r.count ?? 0),
   admin
    .from("variant_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("status", "rejected")
    .then((r) => r.count ?? 0),
   admin
    .from("variant_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("status", "duplicate")
    .then((r) => r.count ?? 0),
  ]);

 const { data: rawRows, error: listErr } = await admin
  .from("variant_suggestions")
  .select(
   `id, submitter_id, brand_id, base_type, proposed_name, note,
    status, admin_notes, resolved_subtype_id, resolved_brand_variant_id,
    resolved_at, created_at,
    brands ( id, name, slug )`,
  )
  .eq("status", statusFilter)
  .order("created_at", { ascending: false })
  .limit(100);

 if (listErr) {
  console.error("[admin/variant-suggestions] list failed:", listErr);
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
  const { data: profilesData, error: profilesErr } = await admin
   .from("profiles_public")
   .select("id, username, display_name")
   .in("id", submitterIds);
  if (profilesErr) {
   console.warn(
    "[admin/variant-suggestions] profiles lookup failed:",
    profilesErr.message,
   );
  }
  if (profilesData) {
   profilesById = new Map(
    (profilesData as SubmitterProfile[]).map((p) => [p.id, p]),
   );
  }
 }

 // For pending rows, we need three lookups the row component uses to
 // render the approve + duplicate forms:
 //
 //  subtypesByBase - every subtype for the given base_type, so admin
 //   can pick an existing canonical subtype during approval.
 //
 //  variantsByBrandBase - every brand_variants row already tracked
 //   for (brand_id, base_type), so admin can see what's already
 //   tracked and avoid double-creating a duplicate join row.
 //
 //  pendingPeersByBrandBase - other pending variant_suggestions rows
 //   for the same (brand_id, base_type) combo. Feeds the mark-
 //   duplicate dropdown so admin can point at a sibling suggestion.

 const subtypesByBase: Map<SlimeBaseType, SubtypeOption[]> = new Map();
 const variantsByBrandBase: Map<string, BrandVariantSummary[]> = new Map();
 const pendingPeersByBrandBase: Map<string, PendingPeer[]> = new Map();

 const brandBaseKey = (brandId: string, base: SlimeBaseType): string =>
  `${brandId}::${base}`;

 if (statusFilter === "pending" && suggestions.length > 0) {
  const baseTypes = Array.from(new Set(suggestions.map((s) => s.base_type)));
  const brandIds = Array.from(new Set(suggestions.map((s) => s.brand_id)));

  // 1. Subtypes for each base_type in play. One query per base_type
  // (typical queue depth is small enough that these run in parallel
  // fine; if the queue grows, refactor to a single `.in('base_type', ...)`
  // and bucket in JS).
  const subtypeResults = await Promise.all(
   baseTypes.map(async (base) => {
    const { data, error } = await admin
     .from("subtypes")
     .select("id, name, slug, base_type")
     .eq("base_type", base)
     .order("name", { ascending: true });
    if (error) {
     console.warn(
      "[admin/variant-suggestions] subtype lookup failed:",
      error.message,
      { base },
     );
    }
    return { base, rows: (data ?? []) as SubtypeOption[] };
   }),
  );
  for (const { base, rows } of subtypeResults) {
   subtypesByBase.set(base, rows);
  }

  // 2. Existing brand_variants for every brand_id in the queue,
  // joined to subtypes so we can filter to the requested base_type in
  // JS.
  const { data: variantRows, error: variantErr } = await admin
   .from("brand_variants")
   .select(
    `id, brand_id, subtype_id, brand_display_name,
     subtypes ( name, base_type )`,
   )
   .in("brand_id", brandIds);
  if (variantErr) {
   console.warn(
    "[admin/variant-suggestions] brand_variants lookup failed:",
    variantErr.message,
   );
  }
  interface RawVariantRow {
   id: string;
   brand_id: string;
   subtype_id: string;
   brand_display_name: string | null;
   subtypes:
    | { name: string; base_type: SlimeBaseType }
    | { name: string; base_type: SlimeBaseType }[]
    | null;
  }
  for (const raw of (variantRows ?? []) as RawVariantRow[]) {
   const subtypeRel = Array.isArray(raw.subtypes)
    ? (raw.subtypes[0] ?? null)
    : raw.subtypes;
   if (!subtypeRel) continue;
   const key = brandBaseKey(raw.brand_id, subtypeRel.base_type);
   const bucket = variantsByBrandBase.get(key) ?? [];
   bucket.push({
    id: raw.id,
    subtype_id: raw.subtype_id,
    subtype_name: subtypeRel.name,
    brand_display_name: raw.brand_display_name,
   });
   variantsByBrandBase.set(key, bucket);
  }

  // 3. Other pending peers for the same (brand, base) combo.
  const { data: peerRows, error: peerErr } = await admin
   .from("variant_suggestions")
   .select("id, brand_id, base_type, proposed_name, created_at")
   .eq("status", "pending")
   .in("brand_id", brandIds)
   .order("created_at", { ascending: true });
  if (peerErr) {
   console.warn(
    "[admin/variant-suggestions] peer lookup failed:",
    peerErr.message,
   );
  }
  interface RawPeerRow {
   id: string;
   brand_id: string;
   base_type: SlimeBaseType;
   proposed_name: string;
   created_at: string;
  }
  for (const raw of (peerRows ?? []) as RawPeerRow[]) {
   const key = brandBaseKey(raw.brand_id, raw.base_type);
   const bucket = pendingPeersByBrandBase.get(key) ?? [];
   bucket.push({
    id: raw.id,
    proposed_name: raw.proposed_name,
    created_at: raw.created_at,
   });
   pendingPeersByBrandBase.set(key, bucket);
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
      Variant Suggestions
     </h1>
     <p className="text-xs text-slime-muted mt-0.5">
      Review community-submitted brand variants before they join the
      picker
     </p>
    </div>

    {/* Filter tabs */}
    <div className="flex flex-wrap gap-2 mb-6">
     <TabPill
      label={STATUS_LABELS.pending}
      count={pendingCount}
      href="/admin/variant-suggestions?status=pending"
      isActive={statusFilter === "pending"}
      color={STATUS_COLORS.pending}
     />
     <TabPill
      label={STATUS_LABELS.approved}
      count={approvedCount}
      href="/admin/variant-suggestions?status=approved"
      isActive={statusFilter === "approved"}
      color={STATUS_COLORS.approved}
     />
     <TabPill
      label={STATUS_LABELS.rejected}
      count={rejectedCount}
      href="/admin/variant-suggestions?status=rejected"
      isActive={statusFilter === "rejected"}
      color={STATUS_COLORS.rejected}
     />
     <TabPill
      label={STATUS_LABELS.duplicate}
      count={duplicateCount}
      href="/admin/variant-suggestions?status=duplicate"
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
       const brand = firstBrand(row.brands);
       const key = brandBaseKey(row.brand_id, row.base_type);
       const subtypes = subtypesByBase.get(row.base_type) ?? [];
       const existingVariants = variantsByBrandBase.get(key) ?? [];
       const peers = (pendingPeersByBrandBase.get(key) ?? []).filter(
        (p) => p.id !== row.id,
       );
       return (
        <VariantSuggestionRow
         key={row.id}
         suggestion={{
          id: row.id,
          proposed_name: row.proposed_name,
          base_type: row.base_type,
          base_type_label: SLIME_BASE_TYPE_LABELS[row.base_type],
          note: row.note,
          status: row.status,
          admin_notes: row.admin_notes,
          resolved_subtype_id: row.resolved_subtype_id,
          resolved_brand_variant_id: row.resolved_brand_variant_id,
          resolved_at: row.resolved_at,
          createdAtRelative: relativeTime(row.created_at),
          createdAtIso: row.created_at,
         }}
         brand={brand}
         submitter={submitter}
         defaultSubtypeSlug={suggestSlug(row.proposed_name)}
         subtypeOptions={subtypes}
         existingVariants={existingVariants}
         pendingPeers={peers}
        />
       );
      })}
     </div>
    )}
   </main>
  </PageWrapper>
 );
}
