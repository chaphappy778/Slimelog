// apps/web/app/settings/profile/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile, checkUsernameAvailable } from "@/lib/profile-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  username: string;
  bio: string;
  avatar_url: string;
};

type UsernameStatus =
  | "idle" // no input yet or unchanged from original
  | "checking" // debounced request in flight
  | "available" // confirmed not taken
  | "taken" // confirmed taken
  | "invalid"; // fails local regex

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validateUsername(value: string): "invalid" | "valid" {
  return USERNAME_RE.test(value) ? "valid" : "invalid";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsernameStatusIcon({ status }: { status: UsernameStatus }) {
  if (status === "idle") return null;
  if (status === "checking") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5">
        <svg
          className="animate-spin text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          width={16}
          height={16}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          width={12}
          height={12}
          className="text-emerald-500"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }
  // taken or invalid → red X
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-50">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        width={12}
        height={12}
        className="text-red-500"
      >
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </span>
  );
}

function UsernameHint({
  status,
  username,
}: {
  status: UsernameStatus;
  username: string;
}) {
  if (status === "idle") {
    return (
      <p className="text-xs text-gray-400 mt-1.5">
        3–20 characters, letters, numbers, and underscores only.
      </p>
    );
  }
  if (status === "invalid" && username.length > 0) {
    return (
      <p className="text-xs text-red-400 mt-1.5">
        {username.length < 3
          ? "Too short — at least 3 characters."
          : username.length > 20
            ? "Too long — max 20 characters."
            : "Only letters, numbers, and underscores allowed."}
      </p>
    );
  }
  if (status === "taken") {
    return (
      <p className="text-xs text-red-400 mt-1.5">
        @{username} is already taken.
      </p>
    );
  }
  if (status === "available") {
    return (
      <p className="text-xs text-emerald-500 mt-1.5">
        @{username} is available!
      </p>
    );
  }
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const router = useRouter();

  // Supabase browser client — safe to instantiate at module level in a
  // client component as long as env vars are present.
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // ── Auth guard ──
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUserId(data.user.id);
        setAuthChecked(true);
      }
    });
  }, []);

  // ── Initial profile load ──
  const [originalForm, setOriginalForm] = useState<FormState>({
    username: "",
    bio: "",
    avatar_url: "",
  });
  const [form, setForm] = useState<FormState>({
    username: "",
    bio: "",
    avatar_url: "",
  });
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("username, bio, avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const loaded: FormState = {
            username: data.username ?? "",
            bio: data.bio ?? "",
            avatar_url: data.avatar_url ?? "",
          };
          setOriginalForm(loaded);
          setForm(loaded);
        }
        setProfileLoading(false);
      });
  }, [userId]);

  // ── Username availability ──
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(
    async (value: string) => {
      // Same as original — no need to check
      if (value === originalForm.username) {
        setUsernameStatus("idle");
        return;
      }
      if (validateUsername(value) === "invalid") {
        setUsernameStatus("invalid");
        return;
      }
      setUsernameStatus("checking");
      const available = await checkUsernameAvailable(value);
      setUsernameStatus(available ? "available" : "taken");
    },
    [originalForm.username],
  );

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, username: value }));

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value === originalForm.username) {
      setUsernameStatus("idle");
      return;
    }
    if (value === "") {
      setUsernameStatus("idle");
      return;
    }
    if (validateUsername(value) === "invalid") {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    debounceTimer.current = setTimeout(() => checkUsername(value), 500);
  };

  // ── Save logic ──
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges =
    form.username !== originalForm.username ||
    form.bio !== originalForm.bio ||
    form.avatar_url !== originalForm.avatar_url;

  const isFormValid =
    hasChanges &&
    form.username.length >= 3 &&
    (form.username === originalForm.username ||
      usernameStatus === "available") &&
    (form.username === originalForm.username ||
      validateUsername(form.username) === "valid") &&
    form.bio.length <= 150;

  const handleSave = async () => {
    if (!isFormValid) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const result = await updateProfile({
      username: form.username,
      bio: form.bio || undefined,
      avatar_url: form.avatar_url || undefined,
    });

    setSaving(false);
    if (result.success) {
      setSaveSuccess(true);
      setOriginalForm({ ...form });
      setUsernameStatus("idle");
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError(result.error ?? "Something went wrong.");
    }
  };

  // ── Loading skeleton ──
  if (!authChecked || profileLoading) {
    return (
      <main
        className="min-h-screen pb-24"
        style={{
          background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
        }}
      >
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-pink-100 rounded-xl" />
          <div className="h-12 bg-white rounded-2xl border border-pink-50" />
          <div className="h-24 bg-white rounded-2xl border border-pink-50" />
          <div className="h-12 bg-white rounded-2xl border border-pink-50" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen pb-28"
      style={{
        background: "linear-gradient(160deg, #fdf2f8 0%, #faf5ff 100%)",
      }}
    >
      {/* Header */}
      <header className="px-4 pt-10 pb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="w-8 h-8 rounded-xl bg-white border border-pink-100 shadow-sm flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back to profile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            width={16}
            height={16}
            className="text-gray-400"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">
            Edit Profile
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Update your SlimeLog presence
          </p>
        </div>
      </header>

      <div className="px-4 space-y-5">
        {/* ── Username ── */}
        <section className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4 space-y-1">
          <label
            htmlFor="username"
            className="text-xs text-gray-400 font-semibold uppercase tracking-wider"
          >
            Username
          </label>
          <div className="relative flex items-center mt-1">
            <span className="absolute left-3 text-gray-400 text-sm font-medium select-none">
              @
            </span>
            <input
              id="username"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={form.username}
              onChange={handleUsernameChange}
              maxLength={20}
              placeholder="your_username"
              className={`w-full pl-7 pr-10 py-2.5 rounded-xl border text-sm font-semibold text-gray-900 placeholder:text-gray-300 outline-none transition-colors ${
                usernameStatus === "taken" || usernameStatus === "invalid"
                  ? "border-red-200 bg-red-50/40 focus:border-red-300"
                  : usernameStatus === "available"
                    ? "border-emerald-200 bg-emerald-50/30 focus:border-emerald-300"
                    : "border-pink-100 bg-pink-50/20 focus:border-fuchsia-300"
              }`}
            />
            <div className="absolute right-3">
              <UsernameStatusIcon status={usernameStatus} />
            </div>
          </div>
          <UsernameHint status={usernameStatus} username={form.username} />
        </section>

        {/* ── Bio ── */}
        <section className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4 space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="bio"
              className="text-xs text-gray-400 font-semibold uppercase tracking-wider"
            >
              Bio
            </label>
            <span
              className={`text-xs font-medium tabular-nums transition-colors ${
                form.bio.length > 140
                  ? form.bio.length > 150
                    ? "text-red-500"
                    : "text-amber-500"
                  : "text-gray-300"
              }`}
            >
              {form.bio.length}/150
            </span>
          </div>
          <textarea
            id="bio"
            rows={3}
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            maxLength={150}
            placeholder="Tell the slime world about yourself…"
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-pink-100 bg-pink-50/20 text-sm text-gray-800 placeholder:text-gray-300 resize-none outline-none focus:border-fuchsia-300 transition-colors"
          />
        </section>

        {/* ── Avatar URL ── */}
        <section className="bg-white rounded-2xl border border-pink-50 shadow-sm p-4 space-y-1">
          <label
            htmlFor="avatar_url"
            className="text-xs text-gray-400 font-semibold uppercase tracking-wider"
          >
            Avatar URL
          </label>
          <input
            id="avatar_url"
            type="url"
            autoComplete="off"
            value={form.avatar_url}
            onChange={(e) =>
              setForm((f) => ({ ...f, avatar_url: e.target.value }))
            }
            placeholder="https://example.com/your-photo.jpg"
            className="w-full mt-1 px-3 py-2.5 rounded-xl border border-pink-100 bg-pink-50/20 text-sm text-gray-800 placeholder:text-gray-300 outline-none focus:border-fuchsia-300 transition-colors"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Photo upload coming soon — paste an image URL for now.
          </p>
          {form.avatar_url && (
            <div className="mt-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.avatar_url}
                alt="Avatar preview"
                className="w-10 h-10 rounded-2xl object-cover border border-pink-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-xs text-gray-400">Preview</span>
            </div>
          )}
        </section>

        {/* ── Save feedback ── */}
        {saveError && (
          <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-100 text-xs text-red-500">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-600 font-semibold flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              width={14}
              height={14}
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
            Profile updated!
          </div>
        )}

        {/* ── Save button ── */}
        <button
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className={`w-full py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-95 ${
            isFormValid && !saving
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-200/60"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </main>
  );
}
