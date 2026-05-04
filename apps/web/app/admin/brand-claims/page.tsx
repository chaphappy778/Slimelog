// apps/web/app/admin/brand-claims/page.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  profiles_public:
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
  "all",
] as const;

type StatusFilter = (typeof VALID_STATUSES)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseRelation<T>(raw: T | T[] | null): T | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

function getStatusColor(status: BrandClaimStatus): string {
  switch (status) {
    case "pending_review":
      return "#00F0FF";
    case "approved":
      return "#39FF14";
    case "rejected":
      return "#CC44FF";
    case "auto_rejected":
    case "pending_email_verification":
    default:
      return "#888888";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BrandClaimStatus }) {
  const color = getStatusColor(status);
  const label = BRAND_CLAIM_STATUS_LABELS[status] ?? status;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
      style={{
        background: "rgba(10,0,20,0.55)",
        border: `1px solid ${color}40`,
        color,
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
      className="flex-1 rounded-2xl px-5 py-4 transition-all hover:scale-[1.02]"
      style={{
        background: "#1a0a2e",
        border: isActive
          ? `1px solid ${color}`
          : "1px solid rgba(45,10,78,0.9)",
        boxShadow: isActive ? `0 0 12px ${color}40` : "none",
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-1"
        style={{ color }}
      >
        {label}
      </p>
      <p className="text-2xl font-black" style={{ color }}>
        {value.toLocaleString()}
      </p>
    </Link>
  );
}

function FilterTab({
  label,
  status,
  active,
}: {
  label: string;
  status: StatusFilter;
  active: boolean;
}) {
  return (
    <Link
      href={`/admin/brand-claims?status=${status}`}
      className="px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors"
      style={{
        color: active ? "#00F0FF" : "#888888",
        borderBottom: active ? "2px solid #00F0FF" : "2px solid transparent",
      }}
    >
      {label}
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

  if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
    redirect("/");
  }

  // Resolve filter
  const params = await searchParams;
  const requestedStatus = (params.status ?? "pending_review") as StatusFilter;
  const statusFilter: StatusFilter = (
    VALID_STATUSES as readonly string[]
  ).includes(requestedStatus)
    ? requestedStatus
    : "pending_review";

  const admin = createAdminClient();

  // Stats counts (head:true for cheap counts)
  const [pendingReviewCount, approvedCount, rejectedCount, autoRejectedCount] =
    await Promise.all([
      admin
        .from("brand_claims")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_review")
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

  // Filtered list
  let listQuery = admin
    .from("brand_claims")
    .select(
      `id, brand_id, user_id, status, business_email, role, created_at,
       brands!brand_claims_brand_id_fkey ( id, name, slug, logo_url ),
       profiles_public!brand_claims_user_id_fkey ( username, display_name, avatar_url )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (statusFilter !== "all") {
    listQuery = listQuery.eq("status", statusFilter);
  }

  const { data: rawClaims } = await listQuery;
  const claims = (rawClaims ?? []) as unknown as ClaimRow[];

  const filterLabel =
    statusFilter === "all"
      ? "all"
      : (BRAND_CLAIM_STATUS_LABELS[statusFilter as BrandClaimStatus] ??
        statusFilter);

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-20 pb-24 px-4 max-w-7xl mx-auto">
        {/* Back button + breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/admin"
            aria-label="Back to admin"
            className="flex items-center justify-center transition-colors"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(10,0,20,0.55)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#FFFFFF",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>
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

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            label="Pending Review"
            value={pendingReviewCount}
            color="#00F0FF"
            href="/admin/brand-claims?status=pending_review"
            isActive={statusFilter === "pending_review"}
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            color="#39FF14"
            href="/admin/brand-claims?status=approved"
            isActive={statusFilter === "approved"}
          />
          <StatCard
            label="Rejected"
            value={rejectedCount}
            color="#CC44FF"
            href="/admin/brand-claims?status=rejected"
            isActive={statusFilter === "rejected"}
          />
          <StatCard
            label="Auto-Rejected"
            value={autoRejectedCount}
            color="#888888"
            href="/admin/brand-claims?status=auto_rejected"
            isActive={statusFilter === "auto_rejected"}
          />
        </div>

        {/* Filter tabs */}
        <div
          className="flex items-center gap-1 mb-4 overflow-x-auto"
          style={{ borderBottom: "1px solid rgba(45,10,78,0.7)" }}
        >
          <FilterTab
            label="Pending Review"
            status="pending_review"
            active={statusFilter === "pending_review"}
          />
          <FilterTab
            label="Approved"
            status="approved"
            active={statusFilter === "approved"}
          />
          <FilterTab
            label="Rejected"
            status="rejected"
            active={statusFilter === "rejected"}
          />
          <FilterTab
            label="Auto-Rejected"
            status="auto_rejected"
            active={statusFilter === "auto_rejected"}
          />
          <FilterTab
            label="Pending Email"
            status="pending_email_verification"
            active={statusFilter === "pending_email_verification"}
          />
          <FilterTab label="All" status="all" active={statusFilter === "all"} />
        </div>

        {/* Claim table / empty state */}
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
            {/* Desktop table */}
            <div
              className="hidden md:block rounded-2xl overflow-hidden"
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
                      const profile = normaliseRelation(row.profiles_public);
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
                                ) : null}
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
                            {formatRelativeTime(row.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/brand-claims/${row.id}`}
                              className="text-xs font-bold uppercase tracking-widest"
                              style={{ color: "#39FF14" }}
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile stacked cards */}
            <div className="md:hidden flex flex-col gap-3">
              {claims.map((row) => {
                const brand = normaliseRelation(row.brands);
                const profile = normaliseRelation(row.profiles_public);
                return (
                  <Link
                    key={row.id}
                    href={`/admin/brand-claims/${row.id}`}
                    className="block rounded-2xl p-4"
                    style={{
                      background: "rgba(45,10,78,0.3)",
                      border: "1px solid rgba(45,10,78,0.9)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
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
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-slime-text truncate">
                          {brand?.name ?? "Unknown brand"}
                        </p>
                      </div>
                      <StatusBadge status={row.status} />
                    </div>
                    <p className="text-xs text-slime-muted">
                      Claimed by{" "}
                      <span style={{ color: "#FF00E5" }}>
                        @{profile?.username ?? "unknown"}
                      </span>{" "}
                      · {formatRelativeTime(row.created_at)}
                    </p>
                    <p className="text-xs text-slime-muted mt-1">
                      {row.business_email} ·{" "}
                      {BRAND_CLAIM_ROLE_LABELS[row.role] ?? row.role}
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
