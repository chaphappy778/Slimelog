// apps/web/components/brand/ClaimBrandForm.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { BrandClaim, BrandClaimRole } from "@/lib/types";
import { BRAND_CLAIM_ROLE_LABELS } from "@/lib/types";

interface Props {
  brand: {
    id: string;
    slug: string;
    name: string;
    website_url: string | null;
  };
  initialClaim: BrandClaim | null;
  currentUserEmail: string;
}

type Step = "claimant_info" | "document_upload" | "email_verification" | "done";

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];

function deriveInitialStep(claim: BrandClaim | null): Step {
  if (!claim) return "claimant_info";
  if (
    claim.status === "pending_email_verification" &&
    !claim.document_uploaded_at
  ) {
    return "document_upload";
  }
  if (
    claim.status === "pending_email_verification" &&
    claim.document_uploaded_at
  ) {
    return "email_verification";
  }
  return "claimant_info";
}

export default function ClaimBrandForm({
  brand,
  initialClaim,
  currentUserEmail,
}: Props) {
  const [step, setStep] = useState<Step>(() => deriveInitialStep(initialClaim));
  const [claimId, setClaimId] = useState<string | null>(
    initialClaim?.id ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 state.
  const [fullLegalName, setFullLegalName] = useState(
    initialClaim?.full_legal_name ?? "",
  );
  const [role, setRole] = useState<BrandClaimRole>(
    (initialClaim?.role as BrandClaimRole) ?? "owner",
  );
  const [businessEmail, setBusinessEmail] = useState(
    initialClaim?.business_email ?? "",
  );
  const [instagramHandle, setInstagramHandle] = useState(
    initialClaim?.instagram_handle ?? "",
  );
  const [additionalNotes, setAdditionalNotes] = useState(
    initialClaim?.additional_notes ?? "",
  );

  // Step 2 state.
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3 state.
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    if (step !== "email_verification") return;
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendCooldown]);

  const submittedEmail = useMemo(
    () => initialClaim?.business_email ?? businessEmail,
    [initialClaim, businessEmail],
  );

  // ─── Step 1: claimant info ─────────────────────────────────────────────────

  async function handleSubmitClaimantInfo(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);

    if (fullLegalName.trim().length < 2) {
      setError("Enter your full legal name.");
      return;
    }
    if (!businessEmail.trim()) {
      setError("Enter a business email.");
      return;
    }
    if (additionalNotes.length > 1000) {
      setError("Notes are limited to 1000 characters.");
      return;
    }

    const handleClean = instagramHandle.trim().replace(/^@/, "");

    setSubmitting(true);
    try {
      const res = await fetch("/api/brand-claims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          full_legal_name: fullLegalName.trim(),
          role,
          business_email: businessEmail.trim(),
          instagram_handle: handleClean || null,
          additional_notes: additionalNotes.trim() || null,
          // [Change 1 — email-edit-back-button] include claim_id so route PATCHes rather than INSERTs when returning from step 3
          ...(claimId ? { claim_id: claimId } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Try again.");
        return;
      }
      setClaimId(body.claim_id);
      setStep("document_upload");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 2: document upload ───────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_DOC_SIZE) {
      setError("File is too large. Max 10MB.");
      setSelectedFile(null);
      return;
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Only PDF, JPG, or PNG files are allowed.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  }

  async function handleUploadDocument(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    if (!claimId) {
      setError("Claim not found. Restart the form.");
      return;
    }
    if (!selectedFile) {
      setError("Choose a file to upload.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("claim_id", claimId);
      fd.append("file", selectedFile);
      const res = await fetch("/api/brand-claims/upload-document", {
        method: "POST",
        body: fd,
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Upload failed. Try again.");
        return;
      }
      setStep("email_verification");
      setResendCooldown(30);
    } catch {
      setError("Network error during upload.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 3: email verification ────────────────────────────────────────────

  async function handleResendCode(e: React.MouseEvent) {
    e.preventDefault();
    if (resendCooldown > 0 || !claimId) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/brand-claims/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId,
          brand_id: brand.id,
          full_legal_name:
            fullLegalName.trim() || initialClaim?.full_legal_name,
          role,
          business_email: businessEmail.trim() || initialClaim?.business_email,
          instagram_handle: instagramHandle.trim().replace(/^@/, "") || null,
          additional_notes: additionalNotes.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not resend code. Try again.");
        return;
      }
      setResendCooldown(30);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyCode(e: React.MouseEvent) {
    e.preventDefault();
    setError(null);
    if (!claimId) {
      setError("Claim not found.");
      return;
    }
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/brand-claims/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claim_id: claimId, code }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === "expired") {
          setError("Code expired. Request a new one.");
        } else if (body.error === "invalid_code") {
          setError("Incorrect code. Try again.");
        } else if (body.error === "no_document") {
          setError("Document not uploaded. Go back to step 2.");
        } else {
          setError(body.error ?? "Verification failed.");
        }
        return;
      }
      setStep("done");
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <ProgressIndicator step={step} />

      {error && <ErrorBanner message={error} />}

      {step === "claimant_info" && (
        <ClaimantInfoStep
          brandName={brand.name}
          fullLegalName={fullLegalName}
          setFullLegalName={setFullLegalName}
          role={role}
          setRole={setRole}
          businessEmail={businessEmail}
          setBusinessEmail={setBusinessEmail}
          currentUserEmail={currentUserEmail}
          instagramHandle={instagramHandle}
          setInstagramHandle={setInstagramHandle}
          additionalNotes={additionalNotes}
          setAdditionalNotes={setAdditionalNotes}
          submitting={submitting}
          onSubmit={handleSubmitClaimantInfo}
        />
      )}

      {step === "document_upload" && (
        <DocumentUploadStep
          selectedFile={selectedFile}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onClearFile={() => setSelectedFile(null)}
          onSubmit={handleUploadDocument}
          submitting={submitting}
          // 2026-07-17 T175: back to step 1 so users can revise the
          // legal name / role / email / notes without losing the flow.
          // Browser back navigates all the way out of the wizard which
          // was Jennifer's specific pain point during the auto-approve
          // smoke test.
          onBack={() => setStep("claimant_info")}
        />
      )}

      {step === "email_verification" && (
        // [Change 1 — email-edit-back-button] pass onEditEmail to allow returning to step 1
        <EmailVerificationStep
          email={submittedEmail}
          code={code}
          setCode={setCode}
          resendCooldown={resendCooldown}
          onResend={handleResendCode}
          onVerify={handleVerifyCode}
          submitting={submitting}
          onEditEmail={() => setStep("claimant_info")}
        />
      )}

      {step === "done" && (
        <SuccessScreen
          brandName={brand.name}
          brandSlug={brand.slug}
          email={submittedEmail}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ProgressIndicator({ step }: { step: Step }) {
  const steps: Step[] = [
    "claimant_info",
    "document_upload",
    "email_verification",
  ];
  const currentIndex = step === "done" ? 3 : steps.indexOf(step);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = i === currentIndex;
        const isComplete = i < currentIndex;
        return (
          <div
            key={s}
            className="flex-1 h-1.5 rounded-full"
            style={{
              background: isActive
                ? "#39FF14"
                : isComplete
                  ? "rgba(57,255,20,0.5)"
                  : "rgba(255,255,255,0.12)",
              transition: "background 200ms ease",
            }}
          />
        );
      })}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg text-sm"
      style={{
        background: "rgba(204,68,255,0.12)",
        border: "1px solid rgba(204,68,255,0.4)",
        color: "#fff",
        padding: "10px 14px",
      }}
      role="alert"
    >
      {message}
    </div>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl"
      style={{
        background: "rgba(45,10,78,0.25)",
        border: "1px solid rgba(45,10,78,0.7)",
        padding: 24,
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      className="block text-[10px] uppercase tracking-widest font-bold mb-1.5"
      style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
    >
      {children}
      {required && <span className="text-slime-accent ml-1">*</span>}
    </label>
  );
}

const inputBase: React.CSSProperties = {
  background: "rgba(10,0,20,0.55)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  color: "#fff",
  padding: "10px 14px",
  fontSize: 14,
  width: "100%",
  fontFamily: "Inter, sans-serif",
};

function PrimaryButton({
  onClick,
  disabled,
  children,
  type = "button",
}: {
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="active:scale-[0.97] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: "linear-gradient(135deg, #39FF14, #00F0FF)",
        color: "#0A0A0A",
        fontWeight: 600,
        fontFamily: "Montserrat, Inter, sans-serif",
        padding: "12px 20px",
        borderRadius: 10,
        fontSize: 13,
        letterSpacing: "0.02em",
        width: "100%",
      }}
    >
      {children}
    </button>
  );
}

// ─── Step 1 ──────────────────────────────────────────────────────────────────

interface Step1Props {
  brandName: string;
  fullLegalName: string;
  setFullLegalName: (v: string) => void;
  role: BrandClaimRole;
  setRole: (v: BrandClaimRole) => void;
  businessEmail: string;
  setBusinessEmail: (v: string) => void;
  currentUserEmail: string;
  instagramHandle: string;
  setInstagramHandle: (v: string) => void;
  additionalNotes: string;
  setAdditionalNotes: (v: string) => void;
  submitting: boolean;
  onSubmit: (e: React.MouseEvent) => void;
}

function ClaimantInfoStep(props: Step1Props) {
  return (
    <CardShell>
      <h2
        className="text-lg font-bold mb-1"
        style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
      >
        Your information
      </h2>
      <p className="text-xs text-slime-muted mb-5">
        Step 1 of 3 — tell us who you are.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel required>Full legal name</FieldLabel>
          <input
            type="text"
            value={props.fullLegalName}
            onChange={(e) => props.setFullLegalName(e.target.value)}
            style={inputBase}
            autoComplete="name"
            maxLength={120}
          />
        </div>

        <div>
          <FieldLabel required>Your role at {props.brandName}</FieldLabel>
          <select
            value={props.role}
            onChange={(e) => props.setRole(e.target.value as BrandClaimRole)}
            style={inputBase}
          >
            <option value="owner">{BRAND_CLAIM_ROLE_LABELS.owner}</option>
            <option value="authorized_representative">
              {BRAND_CLAIM_ROLE_LABELS.authorized_representative}
            </option>
          </select>
        </div>

        <div>
          <FieldLabel required>Business email</FieldLabel>
          <input
            type="email"
            value={props.businessEmail}
            onChange={(e) => props.setBusinessEmail(e.target.value)}
            style={inputBase}
            autoComplete="email"
            placeholder={
              props.currentUserEmail
                ? `e.g. you@yourbrand.com`
                : "you@yourbrand.com"
            }
          />
          <p className="mt-1.5 text-[11px] text-slime-muted leading-relaxed">
            Use your work email at the brand&apos;s domain. This is how we
            verify you&apos;re authorized.
          </p>
        </div>

        <div>
          <FieldLabel>Instagram handle</FieldLabel>
          <div className="relative">
            <span
              className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              @
            </span>
            <input
              type="text"
              value={props.instagramHandle.replace(/^@/, "")}
              onChange={(e) =>
                props.setInstagramHandle(e.target.value.replace(/^@/, ""))
              }
              style={{ ...inputBase, paddingLeft: 28 }}
              maxLength={64}
              placeholder="yourbrand"
            />
          </div>
        </div>

        <div>
          <FieldLabel>Additional notes</FieldLabel>
          <textarea
            value={props.additionalNotes}
            onChange={(e) => props.setAdditionalNotes(e.target.value)}
            style={{ ...inputBase, minHeight: 80, resize: "vertical" }}
            maxLength={1000}
            placeholder="Anything our reviewer should know."
          />
          <p className="mt-1.5 text-[11px] text-slime-muted">
            {props.additionalNotes.length}/1000
          </p>
        </div>

        <div className="mt-2">
          <PrimaryButton onClick={props.onSubmit} disabled={props.submitting}>
            {props.submitting ? "Sending code..." : "Continue"}
          </PrimaryButton>
        </div>
      </div>
    </CardShell>
  );
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────

interface Step2Props {
  selectedFile: File | null;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onSubmit: (e: React.MouseEvent) => void;
  submitting: boolean;
  // 2026-07-17 T175: step 2 → step 1 back navigation. Optional so
  // any other consumer (there aren't any today) that mounts this
  // step in a one-shot context can leave it out.
  onBack?: () => void;
}

function DocumentUploadStep(props: Step2Props) {
  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  }

  return (
    <CardShell>
      <h2
        className="text-lg font-bold mb-1"
        style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
      >
        Upload business documentation
      </h2>
      <p className="text-xs text-slime-muted mb-5">
        Step 2 of 3 — verify ownership.
      </p>

      <input
        ref={props.fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        onChange={props.onFileChange}
        className="hidden"
      />

      {!props.selectedFile && (
        <button
          type="button"
          onClick={() => props.fileInputRef.current?.click()}
          className="w-full"
          style={{
            background: "rgba(10,0,20,0.55)",
            border: "1px dashed rgba(0,240,255,0.4)",
            borderRadius: 10,
            padding: "32px 16px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#00F0FF"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-sm font-semibold">Choose a file</span>
            <span className="text-[11px] text-slime-muted">
              PDF, JPG, or PNG. Max 10MB.
            </span>
          </div>
        </button>
      )}

      {props.selectedFile && (
        <div
          className="flex items-center gap-3"
          style={{
            background: "rgba(10,0,20,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#39FF14"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {props.selectedFile.name}
            </p>
            <p className="text-[11px] text-slime-muted">
              {formatBytes(props.selectedFile.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (props.fileInputRef.current) {
                props.fileInputRef.current.value = "";
              }
              props.onClearFile();
            }}
            aria-label="Remove file"
            className="text-slime-muted hover:text-slime-accent transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slime-muted leading-relaxed">
        Upload one of: business registration certificate, EIN letter, trademark
        filing, or DBA certificate. We use this to verify ownership and never
        share it.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <PrimaryButton
          onClick={props.onSubmit}
          disabled={props.submitting || !props.selectedFile}
        >
          {props.submitting ? "Uploading..." : "Upload and continue"}
        </PrimaryButton>
        {/* 2026-07-17 T175: back to step 1 (claimant info) so users can
            revise legal name / role / email / notes without losing the
            wizard. Ghost styling so it visually defers to the primary
            "Upload and continue" CTA above. */}
        {props.onBack && (
          <button
            type="button"
            onClick={props.onBack}
            disabled={props.submitting}
            className="w-full text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: "transparent",
              color: "rgba(245,245,245,0.55)",
            }}
          >
            ← Back to your info
          </button>
        )}
      </div>
    </CardShell>
  );
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────

// [Change 1 — email-edit-back-button] extended Step3Props with optional onEditEmail
interface Step3Props {
  email: string;
  code: string;
  setCode: (v: string) => void;
  resendCooldown: number;
  onResend: (e: React.MouseEvent) => void;
  onVerify: (e: React.MouseEvent) => void;
  submitting: boolean;
  onEditEmail?: () => void;
}

function EmailVerificationStep(props: Step3Props) {
  return (
    <CardShell>
      <h2
        className="text-lg font-bold mb-1"
        style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
      >
        Verify your email
      </h2>
      <p className="text-xs text-slime-muted mb-5">
        Step 3 of 3 — almost there.
      </p>

      <p className="text-sm text-white/90 leading-relaxed mb-1">
        We sent a 6-digit code to{" "}
        <span style={{ color: "#00F0FF", fontWeight: 600 }}>{props.email}</span>
        . Enter it below to complete your claim.
      </p>

      {/* [Change 1 — email-edit-back-button] wrong email escape hatch */}
      {props.onEditEmail && (
        <p className="mb-4">
          <button
            type="button"
            onClick={props.onEditEmail}
            className="text-xs hover:underline"
            style={{
              color: "#00F0FF",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            Wrong email?
          </button>
        </p>
      )}

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={props.code}
        onChange={(e) =>
          props.setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
        }
        autoComplete="one-time-code"
        style={{
          ...inputBase,
          textAlign: "center",
          fontSize: 24,
          letterSpacing: 8,
          fontWeight: 700,
          fontFamily: "Montserrat, monospace",
        }}
        placeholder="000000"
      />

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={props.onResend}
          disabled={props.resendCooldown > 0 || props.submitting}
          className="text-xs text-slime-muted hover:text-slime-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {props.resendCooldown > 0
            ? `Resend code in ${props.resendCooldown}s`
            : "Didn't get it? Resend code"}
        </button>
      </div>

      <div className="mt-5">
        <PrimaryButton
          onClick={props.onVerify}
          disabled={props.submitting || props.code.length !== 6}
        >
          {props.submitting ? "Verifying..." : "Verify and submit claim"}
        </PrimaryButton>
      </div>
    </CardShell>
  );
}

// ─── Success ─────────────────────────────────────────────────────────────────

function SuccessScreen({
  brandName,
  brandSlug,
  email,
}: {
  brandName: string;
  brandSlug: string;
  email: string;
}) {
  return (
    <CardShell>
      <div className="flex justify-center mb-4">
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: 64,
            height: 64,
            background: "rgba(57,255,20,0.15)",
            border: "1px solid rgba(57,255,20,0.5)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#39FF14"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      <h2
        className="text-xl font-black text-center mb-3"
        style={{ color: "#fff", fontFamily: "Montserrat, sans-serif" }}
      >
        Claim submitted!
      </h2>
      <p className="text-sm text-white/85 leading-relaxed text-center mb-6">
        We&apos;ll review your application within 3-5 business days and email
        you at{" "}
        <span style={{ color: "#00F0FF", fontWeight: 600 }}>{email}</span> when
        there&apos;s an update.
      </p>

      <Link
        href={`/brands/${brandSlug}`}
        className="block text-center"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          color: "#0A0A0A",
          fontWeight: 600,
          fontFamily: "Montserrat, Inter, sans-serif",
          padding: "12px 20px",
          borderRadius: 10,
          fontSize: 13,
        }}
      >
        Back to {brandName}
      </Link>
    </CardShell>
  );
}
