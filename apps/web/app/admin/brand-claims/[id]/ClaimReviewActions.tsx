// apps/web/app/admin/brand-claims/[id]/ClaimReviewActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "idle" | "confirming_approve" | "confirming_reject";

interface Props {
  claimId: string;
  claimantDisplayName: string;
  claimantBusinessEmail: string;
  brandName: string;
  brandSlug: string;
  competingClaimsCount: number;
}

const MIN_REASON_LENGTH = 10;
const MAX_REASON_LENGTH = 2000;

export default function ClaimReviewActions({
  claimId,
  claimantDisplayName,
  claimantBusinessEmail,
  brandName,
  brandSlug,
  competingClaimsCount,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reference to silence unused-prop linting; useful tooltip context.
  void brandSlug;
  void claimantBusinessEmail;

  async function handleApprove() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/brand-claims/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (json && typeof json.error === "string" ? json.error : null) ??
            "Failed to approve claim. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      router.push("/admin/brand-claims?status=approved");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleReject() {
    const trimmed = rejectionReason.trim();
    if (trimmed.length < MIN_REASON_LENGTH) {
      setError(
        `Rejection reason must be at least ${MIN_REASON_LENGTH} characters.`,
      );
      return;
    }
    if (trimmed.length > MAX_REASON_LENGTH) {
      setError(
        `Rejection reason must be at most ${MAX_REASON_LENGTH} characters.`,
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/brand-claims/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId, reason: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (json && typeof json.error === "string" ? json.error : null) ??
            "Failed to reject claim. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      router.push("/admin/brand-claims?status=rejected");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  const trimmedReasonLength = rejectionReason.trim().length;
  const reasonValid =
    trimmedReasonLength >= MIN_REASON_LENGTH &&
    trimmedReasonLength <= MAX_REASON_LENGTH;

  return (
    <section
      className="rounded-2xl p-5 sticky bottom-4"
      style={{
        background: "rgba(45,10,78,0.5)",
        border: "1px solid rgba(45,10,78,0.9)",
        backdropFilter: "blur(8px)",
      }}
    >
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: "#39FF14", fontFamily: "Montserrat, sans-serif" }}
      >
        Review Decision
      </h2>

      {error && (
        <div
          className="rounded-lg p-3 mb-4 text-sm"
          style={{
            background: "rgba(204,68,255,0.12)",
            border: "1px solid rgba(204,68,255,0.4)",
            color: "#CC44FF",
          }}
        >
          {error}
        </div>
      )}

      {mode === "idle" && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("confirming_approve");
            }}
            className="flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-transform active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Approve Claim
          </button>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMode("confirming_reject");
            }}
            className="flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-transform active:scale-[0.97]"
            style={{
              background: "#CC44FF",
              color: "#FFFFFF",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            Reject Claim
          </button>
        </div>
      )}

      {mode === "confirming_approve" && (
        <div>
          <p className="text-sm text-slime-text leading-relaxed mb-4">
            You are about to approve{" "}
            <span className="font-bold" style={{ color: "#FF00E5" }}>
              {claimantDisplayName}
            </span>
            ’s claim for{" "}
            <span className="font-bold" style={{ color: "#00F0FF" }}>
              {brandName}
            </span>
            . This will set them as the brand owner
            {competingClaimsCount >= 1
              ? ` and auto-reject ${competingClaimsCount} other pending claim${
                  competingClaimsCount === 1 ? "" : "s"
                }`
              : ""}
            . Continue?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setMode("idle");
              }}
              className="flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
              style={{
                background: "rgba(10,0,20,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#FFFFFF",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleApprove}
              className="flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                color: "#0A0A0A",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {submitting ? "Approving…" : "Yes, approve"}
            </button>
          </div>
        </div>
      )}

      {mode === "confirming_reject" && (
        <div>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-slime-muted font-semibold">
              Rejection Reason
            </span>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Why is this claim being rejected? This message is sent to the claimant."
              maxLength={MAX_REASON_LENGTH}
              rows={5}
              disabled={submitting}
              className="mt-2 w-full rounded-xl p-3 text-sm text-slime-text resize-y disabled:opacity-60"
              style={{
                background: "rgba(10,0,20,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                outline: "none",
              }}
            />
          </label>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span
              className="text-slime-muted"
              style={{
                color: reasonValid ? "#39FF14" : "#888",
              }}
            >
              {trimmedReasonLength} / {MAX_REASON_LENGTH} (min{" "}
              {MIN_REASON_LENGTH})
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setError(null);
                setMode("idle");
              }}
              className="flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-colors disabled:opacity-60"
              style={{
                background: "rgba(10,0,20,0.55)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#FFFFFF",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !reasonValid}
              onClick={handleReject}
              className="flex-1 py-3 px-5 rounded-xl font-bold text-sm transition-transform active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "#CC44FF",
                color: "#FFFFFF",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {submitting ? "Rejecting…" : "Reject claim"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
