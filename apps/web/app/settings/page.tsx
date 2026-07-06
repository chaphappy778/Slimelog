// apps/web/app/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import PageWrapper from "@/components/PageWrapper";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type Profile = {
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  subscription_tier: string;
};

const sectionStyle = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

const rowIconStyle = {
  background: "rgba(45,10,78,0.5)",
  border: "1px solid rgba(45,10,78,0.7)",
};

function SectionHeader({ label }: { label: string }) {
  return (
    <p
      className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
      style={{ color: "#00F0FF" }}
    >
      {label}
    </p>
  );
}

function SettingsRow({
  href,
  iconPath,
  label,
  rightContent,
}: {
  href: string;
  iconPath: string;
  label: string;
  rightContent?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 active:bg-slime-surface/50 transition-colors"
    >
      <span
        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={rowIconStyle}
      >
        <svg
          viewBox="0 0 24 24"
          width={18}
          height={18}
          className="text-slime-muted"
          aria-hidden="true"
        >
          <path d={iconPath} fill="currentColor" />
        </svg>
      </span>
      <span className="flex-1 text-sm font-semibold text-slime-text">
        {label}
      </span>
      {rightContent}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slime-muted shrink-0"
        aria-hidden="true"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

function RowDivider() {
  return <div style={{ borderTop: "1px solid rgba(45,10,78,0.4)" }} />;
}

function getInitials(username: string | null): string {
  if (!username || username.startsWith("user_")) return "S";
  return username.charAt(0).toUpperCase();
}

export default function SettingsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Audit blocker #3 (2026-07-06): API now requires the current password
  // to be re-verified before it will delete the account. This local state
  // holds the password only until the fetch resolves.
  const [deletePassword, setDeletePassword] = useState("");
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("username, avatar_url, display_name, subscription_tier")
        .eq("id", data.user.id)
        .maybeSingle();
      setProfile({
        username: prof?.username ?? null,
        avatar_url: prof?.avatar_url ?? null,
        display_name: prof?.display_name ?? null,
        subscription_tier: prof?.subscription_tier ?? "free",
      });
      setAuthChecked(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    if (signOutLoading) return;
    setSignOutLoading(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    // Audit blocker #3 (2026-07-06): require a non-empty password before
    // even hitting the API. Server will re-verify.
    if (!deletePassword) {
      setDeleteError("Enter your password to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      // Clear the local password immediately regardless of outcome so we
      // never keep it around in memory past the request.
      setDeletePassword("");
      if (!res.ok) {
        const body = await res.json();
        setDeleteError(body.error ?? "Something went wrong. Please try again.");
        setDeleteLoading(false);
        return;
      }
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setDeletePassword("");
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  const displayName =
    profile?.display_name ||
    (profile?.username && !profile.username.startsWith("user_")
      ? profile.username
      : "Slimer");

  const username = profile?.username;

  if (!authChecked) {
    return (
      <PageWrapper dots>
        <div className="pt-16 px-4 space-y-4 animate-pulse">
          <div className="flex flex-col items-center gap-3 pb-4">
            <div className="w-16 h-16 rounded-full bg-slime-surface" />
            <div className="h-5 w-28 bg-slime-surface rounded-xl" />
            <div className="h-3 w-20 bg-slime-surface rounded-xl" />
          </div>
          <div className="h-36 rounded-2xl" style={sectionStyle} />
          <div className="h-16 rounded-2xl" style={sectionStyle} />
          <div className="h-28 rounded-2xl" style={sectionStyle} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper dots>
      <PageHeader />

      {/* Avatar + name hero */}
      <div className="pt-16 pb-4 px-4 flex flex-col items-center gap-2">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Profile photo"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-slime-accent/30"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-black text-xl"
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {getInitials(profile?.username ?? null)}
          </div>
        )}

        <p
          className="text-xl font-black text-white mt-1"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          {displayName}
        </p>

        {username && (
          <p className="text-sm" style={{ color: "#FF00E5" }}>
            @{username}
          </p>
        )}

        {profile?.subscription_tier === "pro" && (
          <span
            style={{
              background: "linear-gradient(135deg, #39FF14, #00F0FF)",
              color: "#0A0A0A",
              fontSize: "11px",
              fontWeight: 800,
              padding: "3px 12px",
              borderRadius: "9999px",
              fontFamily: "Montserrat, sans-serif",
              letterSpacing: "0.04em",
            }}
          >
            PRO
          </span>
        )}
      </div>

      {/* Settings rows */}
      <div className="px-4 pb-28 space-y-4">
        {/* MY ACCOUNT */}
        <div>
          <SectionHeader label="My Account" />
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <SettingsRow
              href="/settings/profile"
              label="Edit Profile"
              iconPath="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"
            />
            <RowDivider />
            <SettingsRow
              href="/settings/email"
              label="Change Email"
              iconPath="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
            />
            <RowDivider />
            <SettingsRow
              href="/settings/password"
              label="Change Password"
              iconPath="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
            />
          </div>
        </div>

        {/* SUBSCRIPTION */}
        <div>
          <SectionHeader label="Subscription" />
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <SettingsRow
              href="/settings/subscription"
              label="Manage Plan"
              iconPath="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"
              rightContent={
                profile?.subscription_tier === "pro" ? (
                  <span
                    className="text-[10px] font-black mr-1"
                    style={{ color: "#39FF14" }}
                  >
                    PRO
                  </span>
                ) : (
                  <span className="text-xs text-slime-muted mr-1">Free</span>
                )
              }
            />
          </div>
        </div>

        {/* LEGAL */}
        <div>
          <SectionHeader label="Legal" />
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            <SettingsRow
              href="/privacy"
              label="Privacy Policy"
              iconPath="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
            />
            <RowDivider />
            <SettingsRow
              href="/terms"
              label="Terms of Service"
              iconPath="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"
            />
          </div>
        </div>

        {/* ACCOUNT (DANGER ZONE) */}
        <div>
          <SectionHeader label="Account" />
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            {/* Sign Out */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slime-surface/50 transition-colors disabled:opacity-50"
            >
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={rowIconStyle}
              >
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  aria-hidden="true"
                >
                  <path
                    d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
                    fill="#EF4444"
                  />
                </svg>
              </span>
              <span
                className="flex-1 text-sm font-semibold text-left"
                style={{ color: "#EF4444" }}
              >
                {signOutLoading ? "Signing out..." : "Sign Out"}
              </span>
            </button>

            <RowDivider />

            {/* Delete Account */}
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slime-surface/50 transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={rowIconStyle}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    aria-hidden="true"
                  >
                    <path
                      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                      fill="rgba(239,68,68,0.7)"
                    />
                  </svg>
                </span>
                <span
                  className="flex-1 text-sm font-semibold text-left"
                  style={{ color: "rgba(239,68,68,0.7)" }}
                >
                  Delete Account
                </span>
              </button>
            ) : (
              <div className="px-4 py-4">
                <div
                  className="rounded-xl p-3 flex flex-col gap-2"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <p className="text-xs text-red-300 font-semibold leading-snug">
                    This will permanently delete your account. All of your slime
                    logs, photos, comments, and follows will be removed. This
                    cannot be undone.
                  </p>
                  {/* Audit blocker #3 (2026-07-06): the API now requires
                      the current password to re-authenticate before it
                      will delete the account. Session cookies alone are
                      no longer sufficient to trigger the destructive
                      call — this input feeds the fetch body. */}
                  <label className="text-xs text-red-200 font-semibold">
                    Enter your password to confirm
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={deleteLoading}
                    placeholder="Current password"
                    className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-slime-muted disabled:opacity-50"
                    style={{
                      background: "rgba(45,10,78,0.5)",
                      border: "1px solid rgba(239,68,68,0.35)",
                    }}
                  />
                  {deleteError && (
                    <p className="text-xs text-red-400">{deleteError}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteError(null);
                        setDeletePassword("");
                      }}
                      disabled={deleteLoading}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-slime-muted transition-colors disabled:opacity-50"
                      style={{ background: "rgba(45,10,78,0.5)" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || deletePassword.length === 0}
                      className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                      style={{ background: "rgba(239,68,68,0.7)" }}
                    >
                      {deleteLoading ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-[10px] text-slime-muted text-center pb-8 pt-2">
          SlimeLog &middot; Rate it. Log it. Love it.
        </p>
      </div>
    </PageWrapper>
  );
}
