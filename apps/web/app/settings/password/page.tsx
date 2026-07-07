// apps/web/app/settings/password/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface text-sm text-slime-text placeholder:text-slime-muted outline-none focus:border-slime-accent/50 focus:ring-1 focus:ring-slime-accent/30 transition-colors";

const subLabelCls =
  "text-[10px] font-semibold uppercase tracking-wider text-slime-muted mb-1.5 block";

const sectionStyle = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

function EyeOpenPath() {
  return (
    <path
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
      fill="currentColor"
    />
  );
}

function EyeClosedPath() {
  return (
    <path
      d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
      fill="currentColor"
    />
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={subLabelCls}>
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            placeholder ?? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
          }
          className={`${inputCls} pr-10`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 text-slime-muted active:opacity-60 transition-opacity"
          aria-label={show ? "Hide password" : "Show password"}
        >
          <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
            {show ? <EyeClosedPath /> : <EyeOpenPath />}
          </svg>
        </button>
      </div>
    </div>
  );
}

function ValidationDot({ met }: { met: boolean }) {
  return (
    <span
      className="w-3 h-3 rounded-full shrink-0 transition-colors"
      style={{
        background: met ? "#39FF14" : "rgba(245,245,245,0.15)",
        boxShadow: met ? "0 0 6px rgba(57,255,20,0.4)" : "none",
      }}
    />
  );
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  // Audit hp-22 (2026-07-07): added currentPassword. Client no longer
  // calls supabase.auth.updateUser() directly — the server route
  // /api/account/change-password verifies the current password via
  // signInWithPassword before rotating.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      setAuthChecked(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasCurrent = currentPassword.length > 0;
  const isLongEnough = newPassword.length >= 8;
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword;
  const isDifferent =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    currentPassword !== newPassword;
  const isValid = hasCurrent && isLongEnough && passwordsMatch && isDifferent;

  async function handleSubmit() {
    if (!isValid || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const json = (await res.json()) as { error?: string; success?: boolean };
      if (!res.ok || !json.success) {
        setErrorMsg(json.error ?? "Could not update password. Try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      // Clear the fields on success so the values don't linger in
      // memory / autofill.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setErrorMsg("Network error. Try again.");
      setStatus("error");
    }
  }

  if (!authChecked) {
    return (
      <PageWrapper dots>
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-8 w-44 bg-slime-surface rounded-xl" />
          <div className="h-52 rounded-2xl" style={sectionStyle} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper dots>
      {/* Header */}
      <header className="px-4 pt-10 pb-6 flex items-center gap-3">
        <Link
          href="/settings"
          className="w-8 h-8 rounded-xl bg-slime-surface border border-slime-border flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back to settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            width={16}
            height={16}
            className="text-slime-muted"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1
            className="text-xl font-black leading-tight"
            style={{ color: "#00F0FF" }}
          >
            Change Password
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Set a new password for your account
          </p>
        </div>
      </header>

      <div className="px-4 pb-28">
        <div className="rounded-2xl p-4 space-y-4" style={sectionStyle}>
          {status === "success" ? (
            <div className="flex flex-col gap-3 py-2">
              <div className="flex items-center gap-2">
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
                <p
                  className="text-sm font-semibold"
                  style={{ color: "#39FF14" }}
                >
                  Password updated
                </p>
              </div>
              <p className="text-xs text-slime-muted leading-relaxed">
                Your password has been changed successfully.
              </p>
              <Link
                href="/settings"
                className="mt-1 text-xs font-semibold"
                style={{ color: "#00F0FF" }}
              >
                Back to Settings
              </Link>
            </div>
          ) : (
            <>
              {/* Audit hp-22 (2026-07-07): current-password re-auth input.
                  Without this a session-hijacker could rotate the
                  password and permanently lock out the real user. */}
              <PasswordInput
                id="current-password"
                label="CURRENT PASSWORD"
                value={currentPassword}
                onChange={(v) => {
                  setCurrentPassword(v);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMsg("");
                  }
                }}
                show={showCurrent}
                onToggle={() => setShowCurrent((s) => !s)}
              />

              <PasswordInput
                id="new-password"
                label="NEW PASSWORD"
                value={newPassword}
                onChange={(v) => {
                  setNewPassword(v);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMsg("");
                  }
                }}
                show={showNew}
                onToggle={() => setShowNew((s) => !s)}
              />

              <PasswordInput
                id="confirm-password"
                label="CONFIRM PASSWORD"
                value={confirmPassword}
                onChange={(v) => {
                  setConfirmPassword(v);
                  if (status === "error") {
                    setStatus("idle");
                    setErrorMsg("");
                  }
                }}
                show={showConfirm}
                onToggle={() => setShowConfirm((s) => !s)}
              />

              {/* Validation checklist */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <ValidationDot met={hasCurrent} />
                  <span
                    className="text-xs transition-colors"
                    style={{
                      color: hasCurrent
                        ? "rgba(245,245,245,0.85)"
                        : "rgba(245,245,245,0.4)",
                    }}
                  >
                    Current password entered
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ValidationDot met={isLongEnough} />
                  <span
                    className="text-xs transition-colors"
                    style={{
                      color: isLongEnough
                        ? "rgba(245,245,245,0.85)"
                        : "rgba(245,245,245,0.4)",
                    }}
                  >
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ValidationDot met={passwordsMatch} />
                  <span
                    className="text-xs transition-colors"
                    style={{
                      color: passwordsMatch
                        ? "rgba(245,245,245,0.85)"
                        : "rgba(245,245,245,0.4)",
                    }}
                  >
                    Passwords match
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ValidationDot met={isDifferent} />
                  <span
                    className="text-xs transition-colors"
                    style={{
                      color: isDifferent
                        ? "rgba(245,245,245,0.85)"
                        : "rgba(245,245,245,0.4)",
                    }}
                  >
                    New password differs from current
                  </span>
                </div>
              </div>

              {status === "error" && errorMsg && (
                <p className="text-xs text-red-400">{errorMsg}</p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isValid || status === "loading"}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                }}
              >
                {status === "loading" ? "Updating\u2026" : "Update Password"}
              </button>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
