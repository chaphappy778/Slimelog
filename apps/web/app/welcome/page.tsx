// apps/web/app/welcome/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  checkUsernameAvailable,
  updateOnboardingProfile,
} from "@/lib/profile-actions";
import { safeRedirect } from "@/lib/safe-redirect";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

// ─── Module-level Supabase client (absolute rule, singleton internally) ─────

const supabase = createClient();

// ─── Image compression helpers (verbatim from settings/profile/page.tsx) ──────

const MAX_DIMENSION = 1200;
const COMPRESS_QUALITY = 0.8;

function generateFilePath(userId: string): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${ts}-${rand}.webp`;
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Canvas toBlob failed"));
          resolve(blob);
        },
        "image/webp",
        COMPRESS_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}

// ─── Username status types ────────────────────────────────────────────────────

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsernameStatusIcon({ status }: { status: UsernameStatus }) {
  if (status === "checking") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#00F0FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ animation: "spin 1s linear infinite" }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }
  if (status === "available") {
    return (
      <svg
        width="18"
        height="18"
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
    );
  }
  if (status === "taken" || status === "invalid") {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#FF00E5"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return null;
}

function UsernameHint({
  status,
  username,
}: {
  status: UsernameStatus;
  username: string;
}) {
  if (!username) return null;
  if (status === "invalid") {
    return (
      <p className="text-xs mt-1.5" style={{ color: "#FF00E5" }}>
        3–20 characters, letters, numbers, and underscores only
      </p>
    );
  }
  if (status === "taken") {
    return (
      <p className="text-xs mt-1.5" style={{ color: "#FF00E5" }}>
        That username is already taken
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="text-xs mt-1.5" style={{ color: "#39FF14" }}>
        Username available
      </p>
    );
  }
  return null;
}

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2] as const).map((n) => (
        <svg key={n} width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
          <circle
            cx="4"
            cy="4"
            r="4"
            fill={step === n ? "#39FF14" : "rgba(255,255,255,0.2)"}
          />
        </svg>
      ))}
    </div>
  );
}

// ─── Inner component (uses useSearchParams — requires Suspense boundary) ──────

function WelcomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const resolvedNext = safeRedirect(rawNext, "/");
  const next = resolvedNext === "/welcome" ? "/" : resolvedNext;

  const [step, setStep] = useState<1 | 2>(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1 — username
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 2 — avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2 — marketing consent (default off, GDPR opt-in)
  // Only shown to OAuth signups. Email signups already answered on /signup;
  // showing it a second time here is confusing and looks like we lost their
  // answer. We detect email-vs-OAuth via user.app_metadata.provider set by
  // Supabase Auth on the user record.
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [showMarketingConsent, setShowMarketingConsent] = useState(false);

  // Shared
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

  // ── Auth guard ──
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);
      // Show marketing consent checkbox only for OAuth signups. Email
      // signups already answered on /signup and we don't want to look like
      // we lost their answer. Supabase Auth sets app_metadata.provider on
      // every user; "email" = email/password signup, anything else (google,
      // apple, github, etc.) = OAuth.
      const provider = user.app_metadata?.provider;
      setShowMarketingConsent(!!provider && provider !== "email");
      // If user already has a real username, they don't need this page
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.username && !data.username.startsWith("user_")) {
            router.replace("/");
          }
        });
    });
  }, [router]);

  // ── Username debounce check ──
  const handleUsernameChange = useCallback(
    (value: string) => {
      setUsername(value);
      setServerError(null);

      if (!value) {
        setUsernameStatus("idle");
        return;
      }

      if (!USERNAME_RE.test(value)) {
        setUsernameStatus("invalid");
        return;
      }

      setUsernameStatus("checking");

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const available = await checkUsernameAvailable(value);
        setUsernameStatus(available ? "available" : "taken");
      }, 500);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Avatar file selection ──
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setAvatarFile(file);
      const objectUrl = URL.createObjectURL(file);
      setAvatarPreview(objectUrl);
    },
    [],
  );

  // ── Step 1: Continue ──
  const handleContinue = useCallback(() => {
    if (usernameStatus !== "available") return;
    setStep(2);
    setServerError(null);
  }, [usernameStatus]);

  // ── Step 2: Finish (with optional avatar upload) ──
  const handleFinish = useCallback(async () => {
    if (submitting || !userId) return;
    setSubmitting(true);
    setServerError(null);

    let avatarUrl: string | undefined;

    if (avatarFile) {
      setAvatarUploading(true);
      try {
        const compressed = await compressImage(avatarFile);
        const filePath = generateFilePath(userId);
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, compressed, {
            contentType: "image/webp",
            upsert: true,
          });

        if (uploadError) {
          setServerError("Failed to upload photo. Please try again.");
          setSubmitting(false);
          setAvatarUploading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        avatarUrl = publicUrlData.publicUrl;
      } catch {
        setServerError("Failed to process photo. Please try again.");
        setSubmitting(false);
        setAvatarUploading(false);
        return;
      }
      setAvatarUploading(false);
    }

    const result = await updateOnboardingProfile({
      username,
      avatar_url: avatarUrl,
      marketing_consent: marketingConsent,
    });

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(next);
  }, [submitting, userId, avatarFile, username, marketingConsent, next, router]);

  // ── Step 2: Skip ──
  const handleSkip = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setServerError(null);

    const result = await updateOnboardingProfile({
      username,
      marketing_consent: marketingConsent,
    });

    if (!result.success) {
      setServerError(result.error ?? "Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push(next);
  }, [submitting, username, marketingConsent, next, router]);

  const canContinue = usernameStatus === "available" && !submitting;
  const canFinish = !submitting && !avatarUploading;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0A0A0A 0%, #0F0018 100%)",
      }}
    >
      {/* Ambient blur orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "#39FF14" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "#00F0FF" }}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="relative z-10 w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "rgba(45,10,78,0.3)",
            border: "1px solid rgba(45,10,78,0.8)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              }}
              aria-hidden="true"
            >
              {/* Slime blob SVG — four ellipses */}
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                fill="none"
                aria-hidden="true"
              >
                <ellipse cx="18" cy="14" rx="10" ry="10" fill="#0A0A0A" />
                <ellipse cx="12" cy="22" rx="7" ry="7" fill="#0A0A0A" />
                <ellipse cx="24" cy="22" rx="7" ry="7" fill="#0A0A0A" />
                <ellipse cx="18" cy="26" rx="6" ry="6" fill="#0A0A0A" />
              </svg>
            </div>
          </div>

          {/* Step dots */}
          <StepDots step={step} />

          {step === 1 && (
            <>
              <h1
                className="text-xl font-black text-center mb-2 leading-tight"
                style={{ color: "#00F0FF" }}
              >
                Choose your username
              </h1>
              <p
                className="text-sm text-center mb-6"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                This is how you&apos;ll appear in the SlimeLog community
              </p>

              {/* Username input */}
              <div className="mb-2">
                <div
                  className="flex items-center rounded-2xl overflow-hidden"
                  style={{
                    background: "rgba(10,0,20,0.6)",
                    border: `1px solid ${
                      usernameStatus === "available"
                        ? "rgba(57,255,20,0.5)"
                        : usernameStatus === "taken" ||
                            usernameStatus === "invalid"
                          ? "rgba(255,0,229,0.5)"
                          : "rgba(45,10,78,0.8)"
                    }`,
                  }}
                >
                  <span
                    className="pl-4 pr-1 text-sm font-semibold select-none"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    @
                  </span>
                  <input
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    spellCheck={false}
                    maxLength={20}
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="yourname"
                    className="flex-1 bg-transparent py-3 pr-2 text-sm font-medium outline-none"
                    style={{ color: "rgba(255,255,255,0.9)" }}
                    aria-label="Username"
                  />
                  <span className="pr-3 flex items-center">
                    <UsernameStatusIcon status={usernameStatus} />
                  </span>
                </div>
                <UsernameHint status={usernameStatus} username={username} />
              </div>

              {serverError && (
                <p className="text-xs mt-3 mb-1" style={{ color: "#FF00E5" }}>
                  {serverError}
                </p>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                className="w-full mt-6 py-3.5 rounded-2xl text-sm font-black transition-opacity"
                style={{
                  background: canContinue
                    ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                    : "rgba(255,255,255,0.08)",
                  color: canContinue ? "#0A0A0A" : "rgba(255,255,255,0.3)",
                  cursor: canContinue ? "pointer" : "not-allowed",
                }}
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h1
                className="text-xl font-black text-center mb-2 leading-tight"
                style={{ color: "#00F0FF" }}
              >
                Add a profile photo
              </h1>
              <p
                className="text-sm text-center mb-6"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                Put a face to your slimes — you can always change this later
              </p>

              {/* Avatar upload */}
              <div className="flex flex-col items-center mb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full overflow-hidden transition-opacity active:opacity-80 focus:outline-none"
                  style={{
                    padding: avatarPreview ? "3px" : "0",
                    background: avatarPreview
                      ? "linear-gradient(135deg, #39FF14, #00F0FF, #FF00E5)"
                      : "rgba(45,10,78,0.6)",
                    border: avatarPreview
                      ? "none"
                      : "2px dashed rgba(255,255,255,0.2)",
                  }}
                  aria-label="Upload profile photo"
                >
                  {avatarPreview ? (
                    <span className="block w-full h-full rounded-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarPreview}
                        alt="Profile photo preview"
                        className="w-full h-full object-cover"
                      />
                    </span>
                  ) : (
                    <span className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="rgba(255,255,255,0.4)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      >
                        Tap to upload
                      </span>
                    </span>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleFileSelect}
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>

              {serverError && (
                <p
                  className="text-xs mt-3 mb-1 text-center"
                  style={{ color: "#FF00E5" }}
                >
                  {serverError}
                </p>
              )}

              {showMarketingConsent && (
                <label
                  className="mt-6 flex items-start gap-3 cursor-pointer"
                  htmlFor="welcome-marketing-consent"
                >
                  <input
                    id="welcome-marketing-consent"
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={(e) => setMarketingConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded shrink-0"
                    style={{ accentColor: "#39FF14" }}
                  />
                  <span
                    className="text-xs leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    Send me occasional emails about drop releases, brand
                    launches, and new SlimeLog features. You can unsubscribe any
                    time.
                  </span>
                </label>
              )}

              <button
                type="button"
                onClick={handleFinish}
                disabled={!canFinish}
                className={`w-full ${
                  showMarketingConsent ? "mt-5" : "mt-6"
                } py-3.5 rounded-2xl text-sm font-black transition-opacity`}
                style={{
                  background: canFinish
                    ? "linear-gradient(135deg, #39FF14, #00F0FF)"
                    : "rgba(255,255,255,0.08)",
                  color: canFinish ? "#0A0A0A" : "rgba(255,255,255,0.3)",
                  cursor: canFinish ? "pointer" : "not-allowed",
                }}
              >
                {avatarUploading
                  ? "Uploading..."
                  : submitting
                    ? "Saving..."
                    : "Finish"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                disabled={submitting}
                className="w-full mt-3 py-2 text-sm font-medium transition-opacity active:opacity-70"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page export with Suspense boundary (useSearchParams requirement) ─────────

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0A0A0A 0%, #0F0018 100%)",
          }}
        >
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent"
            style={{
              borderColor: "#39FF14",
              borderTopColor: "transparent",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      }
    >
      <WelcomeInner />
    </Suspense>
  );
}
