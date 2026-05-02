// apps/web/components/brand/ClaimBrandButton.tsx
"use client";

import Link from "next/link";
import type { BrandClaimStatus } from "@/lib/types";

interface Props {
  brandId: string;
  brandSlug: string;
  brandOwnerId: string | null;
  currentUserId: string | null;
  existingClaim: { id: string; status: BrandClaimStatus } | null;
}

export default function ClaimBrandButton({
  brandSlug,
  brandOwnerId,
  currentUserId,
  existingClaim,
}: Props) {
  // Logged-out users don't see a claim affordance at all.
  if (!currentUserId) return null;

  // Owned brand — verified badge is rendered separately on the brand page.
  if (brandOwnerId) return null;

  // Existing claim for this user — show a status banner instead of the button.
  if (existingClaim) {
    return (
      <ClaimStatusBanner status={existingClaim.status} brandSlug={brandSlug} />
    );
  }

  // Default: render the claim CTA.
  return (
    <Link
      href={`/brands/${brandSlug}/claim`}
      className="inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
      style={{
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
        color: "#0A0A0A",
        fontWeight: 600,
        fontFamily: "Montserrat, Inter, sans-serif",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 13,
        letterSpacing: "0.02em",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 22V4a2 2 0 0 1 2-2h12l-2 5 2 5H6" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
      Claim this brand
    </Link>
  );
}

// ─── Status banner ────────────────────────────────────────────────────────────

function ClaimStatusBanner({
  status,
  brandSlug,
}: {
  status: BrandClaimStatus;
  brandSlug: string;
}) {
  // Approved should never reach here — the brand page would have brandOwnerId
  // set and the parent ClaimBrandButton bails earlier.
  if (status === "approved") return null;

  let label = "";
  let body: React.ReactNode = null;

  switch (status) {
    case "pending_email_verification":
      label = "Claim in progress";
      body = (
        <>
          Your claim is awaiting email verification.{" "}
          <Link
            href={`/brands/${brandSlug}/claim`}
            className="text-slime-accent font-semibold hover:underline"
          >
            Resume claim →
          </Link>
        </>
      );
      break;

    case "pending_review":
      label = "Claim under review";
      body = (
        <>
          Your claim is pending admin review. We&apos;ll email you within 3-5
          business days.
        </>
      );
      break;

    case "rejected":
      label = "Claim rejected";
      body = (
        <>
          Your previous claim was rejected.{" "}
          <Link
            href={`/brands/${brandSlug}/claim`}
            className="text-slime-accent font-semibold hover:underline"
          >
            Submit new claim →
          </Link>
        </>
      );
      break;

    case "auto_rejected":
      label = "Another claim approved";
      body = (
        <>
          Another claim for this brand was approved.{" "}
          <a
            href="mailto:support@slimelog.com"
            className="text-slime-accent font-semibold hover:underline"
          >
            Contact support →
          </a>
        </>
      );
      break;

    default:
      return null;
  }

  return (
    <div
      className="rounded-xl"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        padding: 16,
        backdropFilter: "blur(8px)",
      }}
    >
      <p
        className="text-[10px] uppercase tracking-widest font-bold mb-1.5"
        style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
      >
        {label}
      </p>
      <p className="text-sm text-white leading-relaxed">{body}</p>
    </div>
  );
}
