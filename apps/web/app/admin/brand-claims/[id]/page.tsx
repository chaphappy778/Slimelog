// apps/web/app/admin/brand-claims/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
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
import ClaimReviewActions from "./ClaimReviewActions";
import ClaimDocumentPreview from "./ClaimDocumentPreview";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  website_url: string | null;
  owner_id: string | null;
  is_verified: boolean | null;
  verification_tier: string | null;
}

interface ClaimantProfile {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ReviewerProfile {
  username: string | null;
  display_name: string | null;
}

interface ClaimDetail {
  id: string;
  brand_id: string;
  user_id: string;
  status: BrandClaimStatus;
  full_legal_name: string | null;
  role: BrandClaimRole;
  business_email: string;
  email_verified_at: string | null;
  document_storage_path: string | null;
  document_filename: string | null;
  document_uploaded_at: string | null;
  instagram_handle: string | null;
  additional_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  // Audit hp-18 (2026-07-07): true when brand had no website_url at
  // submit — email-domain match couldn't run, needs extra scrutiny.
  requires_manual_review: boolean | null;
  // [T59-fix] No profile joins on ClaimDetail — both claimant and reviewer
  // are fetched via separate queries to avoid PostgREST failing the entire
  // request when reviewed_by is NULL and an alias join is present.
  brands: BrandRow | BrandRow[] | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseRelation<T>(raw: T | T[] | null): T | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

function formatFullDateTime(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
    .format(d)
    .toLowerCase();
  return `${date} · ${time}`;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "—";
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

function SectionCard({
  title,
  titleColor = "#00F0FF",
  children,
}: {
  title: string;
  titleColor?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-5 mb-4"
      style={{
        background: "rgba(45,10,78,0.3)",
        border: "1px solid rgba(45,10,78,0.7)",
      }}
    >
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: titleColor, fontFamily: "Montserrat, sans-serif" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1.5 border-b border-white/5 last:border-b-0">
      <p className="text-[11px] uppercase tracking-widest text-slime-muted font-semibold sm:w-44 shrink-0">
        {label}
      </p>
      <div
        className={`text-sm text-slime-text break-words min-w-0 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminBrandClaimReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Auth gate
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // Audit hp-9 (2026-07-06): role-based admin check.
  if (!(await isAdminUser(authClient, user))) {
    redirect("/");
  }

  const { id } = await params;
  const admin = createAdminClient();

  // [T59-fix] No profile joins on the main query — PostgREST fails the entire
  // request when reviewed_by is NULL and an alias join is present. Brand join
  // only; claimant and reviewer fetched in separate queries below.
  const { data: rawClaim } = await admin
    .from("brand_claims")
    .select(
      `id, brand_id, user_id, status, full_legal_name, role, business_email,
       email_verified_at, document_storage_path, document_filename, document_uploaded_at,
       instagram_handle, additional_notes, reviewed_by, reviewed_at, rejection_reason,
       created_at, updated_at, requires_manual_review,
       brands!brand_claims_brand_id_fkey ( id, name, slug, logo_url, website_url, owner_id, is_verified, verification_tier )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!rawClaim) {
    notFound();
  }

  const claim = rawClaim as unknown as ClaimDetail;
  const brand = normaliseRelation(claim.brands);

  if (!brand) {
    notFound();
  }

  // Claimant auth email
  const { data: authUserData } = await admin.auth.admin.getUserById(
    claim.user_id,
  );
  const claimantAuthEmail = authUserData?.user?.email ?? null;

  // Claimant profile — separate query from profiles so private-profile
  // claimants resolve correctly in the admin queue.
  const { data: claimantProfileData } = await admin
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", claim.user_id)
    .maybeSingle();

  const claimant: ClaimantProfile | null = claimantProfileData ?? null;

  // Reviewer profile — separate query, only needed when reviewed_by is set.
  let reviewer: ReviewerProfile | null = null;
  if (claim.reviewed_by) {
    const { data: reviewerData } = await admin
      .from("profiles")
      .select("username, display_name")
      .eq("id", claim.reviewed_by)
      .maybeSingle();
    reviewer = reviewerData ?? null;
  }

  // Competing claims count
  const { count: competingCount } = await admin
    .from("brand_claims")
    .select("*", { count: "exact", head: true })
    .eq("brand_id", claim.brand_id)
    .neq("id", claim.id)
    .in("status", ["pending_review", "pending_email_verification"]);

  const competingClaimsCount = competingCount ?? 0;

  return (
    <PageWrapper dots>
      <PageHeader />

      <main className="pt-20 pb-24 px-4 max-w-4xl mx-auto">
        {/* 2026-07-11: inline back button removed — PageHeader now renders
            it via BACK_BUTTON_ROUTES (falls back to /admin/brand-claims
            via the nav-history stack). Was showing two back buttons. */}
        <div className="flex items-center gap-3 mb-6">
          <div className="min-w-0">
            <h1
              className="text-2xl font-black tracking-tight"
              style={{ fontFamily: "Montserrat, sans-serif", color: "#fff" }}
            >
              Review Claim
            </h1>
            <p className="text-xs text-slime-muted mt-0.5 truncate">
              <Link
                href="/admin/brand-claims"
                className="hover:text-slime-cyan transition-colors"
              >
                Brand Claims
              </Link>{" "}
              / {brand.name}
            </p>
          </div>
        </div>

        {/* Audit hp-18 (2026-07-07): manual-review warning banner.
            Renders above the brand summary when requires_manual_review
            is true so admins can't miss it. */}
        {claim.requires_manual_review && (
          <div
            role="alert"
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(255,140,0,0.10)",
              border: "1px solid rgba(255,140,0,0.45)",
              color: "#ffb066",
            }}
          >
            <p className="font-bold" style={{ color: "#ff8c00" }}>
              Manual review required
            </p>
            <p className="mt-1" style={{ color: "#ffb066" }}>
              This brand had no <code>website_url</code> at submit time, so
              the email-domain match couldn&apos;t run. Verify the document
              carefully and cross-check the Instagram handle before
              approving.
            </p>
          </div>
        )}

        {/* Brand summary */}
        <SectionCard title="Brand">
          <div className="flex items-start gap-4">
            <div
              className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0"
              style={{ background: "rgba(45,10,78,0.6)" }}
            >
              {brand.logo_url ? (
                <Image
                  src={brand.logo_url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-slime-text">{brand.name}</p>
              <p className="text-xs text-slime-muted">/{brand.slug}</p>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-slime-muted">
                  Tier:{" "}
                  <span style={{ color: "#00F0FF" }}>
                    {brand.verification_tier ?? "community"}
                  </span>
                </span>
                <span className="text-slime-muted">
                  Verified:{" "}
                  <span
                    style={{ color: brand.is_verified ? "#39FF14" : "#888" }}
                  >
                    {brand.is_verified ? "yes" : "no"}
                  </span>
                </span>
              </div>
              {brand.website_url && (
                <a
                  href={brand.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs mt-2 inline-block hover:underline"
                  style={{ color: "#00F0FF" }}
                >
                  {brand.website_url}
                </a>
              )}
              <p className="text-[10px] text-slime-muted mt-2">
                Owner ID:{" "}
                <span className="font-mono">
                  {brand.owner_id ?? "(unowned)"}
                </span>
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Competing claims warning */}
        {competingClaimsCount >= 1 && (
          <div
            className="rounded-2xl p-4 mb-4 flex items-start gap-3"
            style={{
              background: "rgba(0,240,255,0.08)",
              border: "1px solid rgba(0,240,255,0.4)",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm text-slime-text">
              <span style={{ color: "#00F0FF" }} className="font-bold">
                {competingClaimsCount} other claim
                {competingClaimsCount === 1 ? "" : "s"} pending for this brand.
              </span>{" "}
              Approving this claim will auto-reject{" "}
              {competingClaimsCount === 1 ? "it" : "them"}.
            </p>
          </div>
        )}

        {/* Claimant */}
        <SectionCard title="Claimant" titleColor="#FF00E5">
          <div className="flex items-start gap-4 mb-4">
            <div
              className="relative w-12 h-12 rounded-full overflow-hidden shrink-0"
              style={{ background: "rgba(45,10,78,0.6)" }}
            >
              {claimant?.avatar_url ? (
                <Image
                  src={claimant.avatar_url}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-slime-text">
                {claimant?.display_name ?? "—"}
              </p>
              <p className="text-sm" style={{ color: "#FF00E5" }}>
                @{claimant?.username ?? "unknown"}
              </p>
            </div>
          </div>
          <FieldRow
            label="Full Legal Name"
            value={claim.full_legal_name ?? "—"}
          />
          <FieldRow
            label="Account Email"
            value={claimantAuthEmail ?? "—"}
            mono
          />
          <FieldRow label="Business Email" value={claim.business_email} mono />
          <FieldRow
            label="Role"
            value={BRAND_CLAIM_ROLE_LABELS[claim.role] ?? claim.role}
          />
          <FieldRow
            label="Instagram"
            value={
              claim.instagram_handle ? (
                <a
                  href={`https://instagram.com/${claim.instagram_handle.replace(
                    /^@/,
                    "",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  style={{ color: "#FF00E5" }}
                >
                  @{claim.instagram_handle.replace(/^@/, "")}
                </a>
              ) : (
                "—"
              )
            }
          />
          <FieldRow
            label="Additional Notes"
            value={
              claim.additional_notes ? (
                <pre
                  className="whitespace-pre-wrap break-words text-sm font-sans m-0"
                  style={{ color: "#e5e5e5" }}
                >
                  {claim.additional_notes}
                </pre>
              ) : (
                "—"
              )
            }
          />
        </SectionCard>

        {/* Verification status */}
        <SectionCard title="Verification Status">
          <FieldRow
            label="Status"
            value={<StatusBadge status={claim.status} />}
          />
          <FieldRow
            label="Email Verified"
            value={formatFullDateTime(claim.email_verified_at)}
          />
          <FieldRow
            label="Document Uploaded"
            value={formatFullDateTime(claim.document_uploaded_at)}
          />
          <FieldRow
            label="Submitted"
            value={
              <>
                {formatFullDateTime(claim.created_at)}{" "}
                <span className="text-slime-muted">
                  ({formatRelativeTime(claim.created_at)})
                </span>
              </>
            }
          />
          {claim.reviewed_at && (
            <FieldRow
              label="Reviewed"
              value={
                <>
                  {formatFullDateTime(claim.reviewed_at)}{" "}
                  {reviewer && (
                    <span style={{ color: "#FF00E5" }}>
                      by @{reviewer.username ?? "unknown"}
                    </span>
                  )}
                </>
              }
            />
          )}
        </SectionCard>

        {/* Document preview */}
        <SectionCard title="Verification Document">
          <ClaimDocumentPreview
            claimId={claim.id}
            filename={claim.document_filename}
          />
        </SectionCard>

        {/* State guards / Action panel */}
        {claim.status === "approved" && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(57,255,20,0.08)",
              border: "1px solid rgba(57,255,20,0.4)",
            }}
          >
            <p className="text-sm font-bold" style={{ color: "#39FF14" }}>
              This claim has been approved.
            </p>
            <p className="text-xs text-slime-muted mt-1">
              Approved {formatFullDateTime(claim.reviewed_at)}
              {reviewer && ` by @${reviewer.username ?? "unknown"}`}.
            </p>
          </div>
        )}

        {(claim.status === "rejected" || claim.status === "auto_rejected") && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(204,68,255,0.08)",
              border: "1px solid rgba(204,68,255,0.4)",
            }}
          >
            <p className="text-sm font-bold" style={{ color: "#CC44FF" }}>
              This claim was{" "}
              {claim.status === "auto_rejected" ? "auto-rejected" : "rejected"}.
            </p>
            <p className="text-xs text-slime-muted mt-1">
              {formatFullDateTime(claim.reviewed_at)}
              {reviewer && ` by @${reviewer.username ?? "unknown"}`}.
            </p>
            {claim.rejection_reason && (
              <div
                className="mt-3 rounded-lg p-3"
                style={{ background: "rgba(10,0,20,0.55)" }}
              >
                <p className="text-[10px] uppercase tracking-widest text-slime-muted font-semibold mb-1">
                  Reason
                </p>
                <pre
                  className="whitespace-pre-wrap break-words text-sm font-sans m-0"
                  style={{ color: "#e5e5e5" }}
                >
                  {claim.rejection_reason}
                </pre>
              </div>
            )}
          </div>
        )}

        {claim.status === "pending_email_verification" && (
          <div
            className="rounded-2xl p-5"
            style={{
              background: "rgba(136,136,136,0.08)",
              border: "1px solid rgba(136,136,136,0.4)",
            }}
          >
            <p className="text-sm font-bold text-slime-text">
              Awaiting email verification
            </p>
            <p className="text-xs text-slime-muted mt-1">
              Claimant has not yet verified their email. Cannot review until
              they complete email verification.
            </p>
          </div>
        )}

        {claim.status === "pending_review" && (
          <ClaimReviewActions
            claimId={claim.id}
            claimantDisplayName={
              claimant?.display_name ?? claimant?.username ?? "the claimant"
            }
            claimantBusinessEmail={claim.business_email}
            brandName={brand.name}
            brandSlug={brand.slug}
            competingClaimsCount={competingClaimsCount}
          />
        )}
      </main>
    </PageWrapper>
  );
}
