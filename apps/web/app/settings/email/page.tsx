// apps/web/app/settings/email/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageWrapper from "@/components/PageWrapper";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface text-sm text-slime-text placeholder:text-slime-muted outline-none focus:border-slime-accent/50 focus:ring-1 focus:ring-slime-accent/30 transition-colors";

const subLabelCls =
  "text-[10px] font-semibold uppercase tracking-wider text-slime-muted mb-1.5 block";

const sectionStyle = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangeEmailPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
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
      setUserEmail(data.user.email ?? "");
      setAuthChecked(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    const trimmed = newEmail.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    if (trimmed.toLowerCase() === userEmail.toLowerCase()) {
      setErrorMsg("That\u2019s already your current email.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  }

  if (!authChecked) {
    return (
      <PageWrapper dots>
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-8 w-40 bg-slime-surface rounded-xl" />
          <div className="h-40 rounded-2xl" style={sectionStyle} />
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
            Change Email
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Update your account email address
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
                  Confirmation sent
                </p>
              </div>
              <p className="text-xs text-slime-muted leading-relaxed">
                Check your inbox at{" "}
                <span className="text-slime-text font-medium">
                  {newEmail.trim()}
                </span>{" "}
                and click the link to confirm your new email address.
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
              {/* Current email */}
              <div>
                <span className={subLabelCls}>CURRENT EMAIL</span>
                <div className="text-sm text-slime-text font-medium px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface/50">
                  {userEmail}
                </div>
              </div>

              {/* New email */}
              <div>
                <label htmlFor="new-email" className={subLabelCls}>
                  NEW EMAIL
                </label>
                <input
                  id="new-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  spellCheck={false}
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (status === "error") {
                      setStatus("idle");
                      setErrorMsg("");
                    }
                  }}
                  placeholder="new@email.com"
                  className={inputCls}
                />
                {status === "error" && errorMsg && (
                  <p className="text-xs text-red-400 mt-1.5">{errorMsg}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === "loading" || newEmail.trim() === ""}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  color: "#0A0A0A",
                }}
              >
                {status === "loading" ? "Sending\u2026" : "Send Confirmation"}
              </button>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
