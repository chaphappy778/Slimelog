// apps/web/app/admin/brand-claims/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/is-admin-check";
import PageWrapper from "@/components/PageWrapper";
import PageHeader from "@/components/PageHeader";
import {
  BRAND_CLAIM_STATUS_LABELS,
  BRAND_CLAIM_ROLE_LABELS,
} from "@/lib/types";
import type { BrandClaimStatus, BrandClaimRole } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClaimRow {
  id: string;
  brand_id: string;
  user_id: string;
  status: BrandClaimStatus;
  business_email: string;
  role: BrandClaimRole;
  created_at: string;
  // Audit hp-18 (2026-07-07): true when brand has no website_url, so
  // no email-domain match was performed at submit — needs extra
  // scrutiny.
  requires_manual_review: boolean | null;
  brands:
    | {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        logo_url: string | null;
      }[]
    | null;
  // [T59] switched from profiles_public to profiles
  profiles:
    | {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
}

const VALID_STATUSES = [
  "pending_email_verification",
  "pending_review",
  "approved",
  "rejected",
  "auto_rejected",
] as const;

type StatusFilter = (typeof VALID_STATUSES)[number] | null;

// ─── Status color mapping (LOCKED) ────────────────────────────────────────────

const STATUS_COLORS: Record<BrandClaimStatus, string> = {
  pending_review: "#00F0FF",
  pending_email_verification: "#FFB800",
  approved: "#39FF14",
  rejected: "#FF00E5",
  auto_rejected: "#888888",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseRelation<T>(raw: T | T[] | null): T | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: BrandClaimStatus }) {
  const color = STATUS_COLORS[status];
  const label = BRAND_CLAIM_STATUS_LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap"
      style={{
        background: `${color}1F`,
        border: `1px solid ${color}66`,
        color,
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      <svg width="6" height="6" viewBox="0 0 6 6" aria-hidden="true">
        <circle cx="3" cy="3" r="3" fill={color} />
      </svg>
      {label}
    </span>
  );
}

function StatCard({
  label,
  value,
  color,
  href,
  isActive,
}: {
  label: string;
  value: number;
  color: string;
  href: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl px-5 py-4 transition-all hover:scale-[1.02]"
      style={{
        background: "#1a0a2e",
        border: "1px solid rgba(45,10,78,0.9)",
        boxShadow: isActive ? `0 0 0 2px ${color}` : "none",
      }}
    >
      <p
        className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1"
        style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-black"
        style={{ color, fontFamily: "Montserrat, sans-serif" }}
      >
        {value.toLocaleString()}
      </p>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminBrandClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Auth gate — mirrors /admin/waitlist exactly
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // Audit hp-9 (2026-07-06): role-based admin check.
  if (!(await isAdminUser(authClient, user))) {
    redirect("/");
  }

  // Resolve filter — default state is null (show all). No filter shown if
  // the query param is missing or invalid.
  const params = await searchParams;
  const requestedStatus = params.status;
  const statusFilter: StatusFilter =
    requestedStatus &&
    (VALID_STATUSES as readonly string[]).includes(requestedStatus)
      ? (requestedStatus as (typeof VALID_STATUSES)[number])
      : null;

  const admin = createAdminClient();

  // Stats counts — always all 5 statuses regardless of current filter.
  const [
    pendingReviewCount,
    pendingEmailCount,
    approvedCount,
    rejectedCount,
    autoRejectedCount,
  ] = await Promise.all([
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review")
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_email_verification")
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .then((r) => r.count ?? 0),
    admin
      .from("brand_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "auto_rejected")
      .then((r) => r.count ?? 0),
  ]);

  // [T59] Filtered list — switched profiles_public join to profiles
  let listQuery = admin
    .from("brand_claims")
    .select(
      `id, brand_id, user_id, status, business_email, role, created_at, requires_manual_review,
       brands!brand_claims_brand_id_fkey ( id, name, slug, logo_url ),
       profiles!brand_claims_user_id_fkey ( username, display_name, avatar_url )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (statusFilter !== null) {
    listQuery = listQuery.eq("status", statusFilter);
  }

  const { data: rawClaims } = await listQuery;
  const claims = (rawClaims ?? []) as unknown as ClaimRow[];

  const filterLabel =
    statusFilter === null
      ? "all"
      : (BRAND_CLAIM_STATUS_LABELS[statusFilter] ?? statusFilter);

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-20 pb-24 px-4 max-w-7xl mx-auto">
        {/* 2026-07-11: inline back button removed — PageHeader now renders
            it via BACK_BUTTON_ROUTES with proper navigation-history-stack
            behavior. Was showing two back buttons before the removal. */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
            >
              Brand Claims
            </h1>
            <p className="text-xs text-slime-muted mt-0.5">
              Review pending brand ownership claims
            </p>
          </div>
        </div>

        {/* Stats cards — five cards, also act as filter buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
          <StatCard
            label="Pending Review"
            value={pendingReviewCount}
            color={STATUS_COLORS.pending_review}
            href="/admin/brand-claims?status=pending_review"
            isActive={statusFilter === "pending_review"}
          />
          <StatCard
            label="Pending Email"
            value={pendingEmailCount}
            color={STATUS_COLORS.pending_email_verification}
            href="/admin/brand-claims?status=pending_email_verification"
            isActive={statusFilter === "pending_email_verification"}
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            color={STATUS_COLORS.approved}
            href="/admin/brand-claims?status=approved"
            isActive={statusFilter === "approved"}
          />
          <StatCard
            label="Rejected"
            value={rejectedCount}
            color={STATUS_COLORS.rejected}
            href="/admin/brand-claims?status=rejected"
            isActive={statusFilter === "rejected"}
          />
          <StatCard
            label="Auto-Rejected"
            value={autoRejectedCount}
            color={STATUS_COLORS.auto_rejected}
            href="/admin/brand-claims?status=auto_rejected"
            isActive={statusFilter === "auto_rejected"}
          />
        </div>

        {/* "View all claims" link — only when a filter is active */}
        <div className="mb-6 h-5">
          {statusFilter !== null ? (
            <Link
              href="/admin/brand-claims"
              className="text-xs font-bold uppercase tracking-widest hover:underline"
              style={{
                color: "#00F0FF",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              View all claims
            </Link>
          ) : null}
        </div>

        {/* Claim list */}
        {claims.length === 0 ? (
          <div
            className="rounded-2xl text-center text-sm text-slime-muted"
            style={{
              padding: 48,
              background: "rgba(45,10,78,0.3)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            No claims with status: {filterLabel}.
          </div>
        ) : (
          <>
            {/* Desktop table (>=640px) */}
            <div
              className="hidden sm:block rounded-2xl overflow-hidden"
              style={{ border: "1px solid rgba(45,10,78,0.9)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "#1a0a2e" }}>
                      {[
                        "Brand",
                        "Claimant",
                        "Business Email",
                        "Role",
                        "Submitted",
                        "Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest"
                          style={{ color: "#00F0FF" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((row, i) => {
                      const brand = normaliseRelation(row.brands);
                      // [T59] switched from row.profiles_public to row.profiles
                      const profile = normaliseRelation(row.profiles);
                      const brandInitial = (brand?.name ??
                        "?")[0].toUpperCase();
                      const isEven = i % 2 === 0;
                      return (
                        <tr
                          key={row.id}
                          style={{
                            background: isEven
                              ? "#0f0f0f"
                              : "rgba(26,10,46,0.30)",
                          }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div
                                className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0"
                                style={{ background: "rgba(45,10,78,0.6)" }}
                              >
                                {brand?.logo_url ? (
                                  <Image
                                    src={brand.logo_url}
                                    alt=""
                                    fill
                                    sizes="32px"
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 900,
                                        color: "#39FF14",
                                        fontFamily: "Montserrat, sans-serif",
                                        userSelect: "none",
                                        lineHeight: 1,
                                      }}
                                      aria-hidden="true"
                                    >
                                      {brandInitial}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-slime-text font-medium truncate">
                                  {brand?.name ?? "Unknown brand"}
                                </p>
                                <p className="text-[10px] text-slime-muted truncate">
                                  /{brand?.slug ?? "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="relative w-7 h-7 rounded-full overflow-hidden shrink-0"
                                style={{ background: "rgba(45,10,78,0.6)" }}
                              >
                                {profile?.avatar_url ? (
                                  <Image
                                    src={profile.avatar_url}
                                    alt=""
                                    fill
                                    sizes="28px"
                                    className="object-cover"
                                  />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="text-slime-text text-xs truncate">
                                  {profile?.display_name ?? "—"}
                                </p>
                                <p
                                  className="text-[10px] truncate"
                                  style={{ color: "#FF00E5" }}
                                >
                                  @{profile?.username ?? "unknown"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slime-muted text-xs whitespace-nowrap">
                            {row.business_email}
                          </td>
                          <td className="px-4 py-3 text-slime-text text-xs whitespace-nowrap">
                            {BRAND_CLAIM_ROLE_LABELS[row.role] ?? row.role}
                          </td>
                          <td className="px-4 py-3 text-slime-muted text-xs whitespace-nowrap">
                            {relativeTime(row.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <StatusPill status={row.status} />
                              {row.requires_manual_review && (
                                <span
                                  title="Brand has no website — no email-domain match performed. Extra scrutiny required."
                                  className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{
                                    background: "rgba(255,140,0,0.15)",
                                    border: "1px solid rgba(255,140,0,0.45)",
                                    color: "#ff8c00",
                                  }}
                                >
                                  Manual
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/brand-claims/${row.id}`}
                              className="text-xs font-bold uppercase tracking-widest"
                              style={{ color: "#39FF14" }}
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile stacked cards (<640px) */}
            <div className="sm:hidden flex flex-col gap-3">
              {claims.map((row) => {
                const brand = normaliseRelation(row.brands);
                // [T59] switched from row.profiles_public to row.profiles
                const profile = normaliseRelation(row.profiles);
                const brandInitial = (brand?.name ?? "?")[0].toUpperCase();
                return (
                  <Link
                    key={row.id}
                    href={`/admin/brand-claims/${row.id}`}
                    className="block rounded-2xl p-4 transition-colors hover:border-[rgba(57,255,20,0.3)]"
                    style={{
                      background: "rgba(45,10,78,0.25)",
                      border: "1px solid rgba(45,10,78,0.7)",
                    }}
                  >
                    {/* Top row: logo + brand name + status pill */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0"
                          style={{ background: "rgba(45,10,78,0.6)" }}
                        >
                          {brand?.logo_url ? (
                            <Image
                              src={brand.logo_url}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                style={{
                                  fontSize: 15,
                                  fontWeight: 900,
                                  color: "#39FF14",
                                  fontFamily: "Montserrat, sans-serif",
                                  userSelect: "none",
                                  lineHeight: 1,
                                }}
                                aria-hidden="true"
                              >
                                {brandInitial}
                              </span>
                            </div>
                          )}
                        </div>
                        <p
                          className="text-base font-bold text-white truncate"
                          style={{ fontFamily: "Montserrat, sans-serif" }}
                        >
                          {brand?.name ?? "Unknown brand"}
                        </p>
                      </div>
                      <StatusPill status={row.status} />
                    </div>

                    {/* Claimant + relative time */}
                    <p className="text-xs text-slime-muted">
                      <span style={{ color: "#888888" }}>Claimed by </span>
                      <span style={{ color: "#FF00E5" }}>
                        @{profile?.username ?? "unknown"}
                      </span>
                      <span style={{ color: "#888888" }}>
                        {" "}
                        &middot; {relativeTime(row.created_at)}
                      </span>
                    </p>

                    {/* Email · role */}
                    <p className="text-xs mt-1">
                      <span style={{ color: "#888888" }}>
                        {row.business_email}
                      </span>
                      <span style={{ color: "#888888" }}> &middot; </span>
                      <span style={{ color: "#FFFFFF" }}>
                        {BRAND_CLAIM_ROLE_LABELS[row.role] ?? row.role}
                      </span>
                    </p>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </PageWrapper>
  );
}
