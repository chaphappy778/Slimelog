"use client";
// apps/web/app/settings/profile/page.tsx

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateProfile, checkUsernameAvailable } from "@/lib/profile-actions";
import { ImageUpload } from "@/components/ImageUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  username: string;
  bio: string;
  location: string;
  website_url: string;
  avatar_url: string | null;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

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
          className="animate-spin text-slime-muted"
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
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slime-accent/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          width={12}
          height={12}
          className="text-slime-accent"
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
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        width={12}
        height={12}
        className="text-red-400"
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
  if (status === "idle")
    return (
      <p className="text-xs text-slime-muted mt-1.5">
        3–20 characters, letters, numbers, and underscores only.
      </p>
    );
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
  if (status === "taken")
    return (
      <p className="text-xs text-red-400 mt-1.5">
        @{username} is already taken.
      </p>
    );
  if (status === "available")
    return (
      <p className="text-xs text-slime-accent mt-1.5">
        @{username} is available!
      </p>
    );
  return null;
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface text-sm text-slime-text placeholder:text-slime-muted outline-none focus:border-slime-accent/50 focus:ring-1 focus:ring-slime-accent/30 transition-colors";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

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

  const [originalForm, setOriginalForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
  });
  const [form, setForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
  });
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("username, bio, location, website_url, avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const loaded: FormState = {
            username: data.username ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            website_url: data.website_url ?? "",
            avatar_url: data.avatar_url ?? null,
          };
          setOriginalForm(loaded);
          setForm(loaded);
        }
        setProfileLoading(false);
      });
  }, [userId]);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkUsername = useCallback(
    async (value: string) => {
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
    if (value === originalForm.username || value === "") {
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const hasChanges =
    form.username !== originalForm.username ||
    form.bio !== originalForm.bio ||
    form.location !== originalForm.location ||
    form.website_url !== originalForm.website_url ||
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

  if (!authChecked || profileLoading) {
    return (
      <main className="min-h-screen pb-24 bg-slime-bg">
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-slime-surface rounded-xl" />
          <div className="h-28 w-28 bg-slime-surface rounded-2xl" />
          <div className="h-12 bg-slime-card rounded-2xl border border-slime-border" />
          <div className="h-24 bg-slime-card rounded-2xl border border-slime-border" />
          <div className="h-12 bg-slime-card rounded-2xl border border-slime-border" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28 bg-slime-bg">
      <header className="px-4 pt-10 pb-6 flex items-center gap-3">
        <Link
          href="/profile"
          className="w-8 h-8 rounded-xl bg-slime-surface border border-slime-border flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Back to profile"
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
          <h1 className="text-xl font-black text-slime-text leading-tight">
            Edit Profile
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Update your SlimeLog presence
          </p>
        </div>
      </header>

      <div className="px-4 space-y-5">
        {/* Avatar */}
        <section className="bg-slime-card rounded-2xl border border-slime-border p-4 space-y-2">
          <p className="text-xs text-slime-muted font-semibold uppercase tracking-wider">
            Profile Photo
          </p>
          {userId ? (
            <div className="flex items-start gap-4">
              <div className="w-24 shrink-0">
                <ImageUpload
                  bucket="avatars"
                  userId={userId}
                  existingUrl={form.avatar_url}
                  onUploadComplete={(url) =>
                    setForm((f) => ({ ...f, avatar_url: url }))
                  }
                  onRemove={() => setForm((f) => ({ ...f, avatar_url: null }))}
                  label="Add photo"
                  aspectRatio="square"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center gap-1 pt-1">
                <p className="text-sm font-semibold text-slime-text leading-tight">
                  {form.username || "Your Name"}
                </p>
                <p className="text-xs text-slime-muted">
                  Tap to upload or change your avatar. Max 2 MB.
                </p>
                {form.avatar_url && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, avatar_url: null }))}
                    className="mt-1 text-xs text-red-400 font-medium text-left active:opacity-70 transition-opacity"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="w-24 aspect-square rounded-2xl bg-slime-surface border border-slime-border animate-pulse" />
          )}
        </section>

        {/* Username */}
        <section className="bg-slime-card rounded-2xl border border-slime-border p-4 space-y-1">
          <label
            htmlFor="username"
            className="text-xs text-slime-muted font-semibold uppercase tracking-wider"
          >
            Username
          </label>
          <div className="relative flex items-center mt-1">
            <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
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
              className={`w-full pl-7 pr-10 py-2.5 rounded-xl border text-sm font-semibold placeholder:text-slime-muted outline-none transition-colors bg-slime-surface text-slime-text ${
                usernameStatus === "taken" || usernameStatus === "invalid"
                  ? "border-red-500/40 focus:border-red-500/60"
                  : usernameStatus === "available"
                    ? "border-slime-accent/40 focus:border-slime-accent/60"
                    : "border-slime-border focus:border-slime-accent/50"
              }`}
            />
            <div className="absolute right-3">
              <UsernameStatusIcon status={usernameStatus} />
            </div>
          </div>
          <UsernameHint status={usernameStatus} username={form.username} />
        </section>

        {/* Bio */}
        <section className="bg-slime-card rounded-2xl border border-slime-border p-4 space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="bio"
              className="text-xs text-slime-muted font-semibold uppercase tracking-wider"
            >
              Bio
            </label>
            <span
              className={`text-xs font-medium tabular-nums transition-colors ${
                form.bio.length > 140
                  ? form.bio.length > 150
                    ? "text-red-400"
                    : "text-amber-400"
                  : "text-slime-muted"
              }`}
            >
              {form.bio.length}/150
            </span>
          </div>
          <textarea
            id="bio"
            rows={3}
            value={form.bio}
            maxLength={150}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            placeholder="Tell the slime world about yourself…"
            className={`${inputCls} resize-none mt-1`}
          />
        </section>

        {/* Location */}
        <section className="bg-slime-card rounded-2xl border border-slime-border p-4 space-y-1">
          <label
            htmlFor="location"
            className="text-xs text-slime-muted font-semibold uppercase tracking-wider"
          >
            Location
          </label>
          <input
            id="location"
            type="text"
            value={form.location}
            maxLength={100}
            placeholder="e.g. Austin, TX"
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            className={`${inputCls} mt-1`}
          />
        </section>

        {/* Website */}
        <section className="bg-slime-card rounded-2xl border border-slime-border p-4 space-y-1">
          <label
            htmlFor="website_url"
            className="text-xs text-slime-muted font-semibold uppercase tracking-wider"
          >
            Website
          </label>
          <input
            id="website_url"
            type="url"
            inputMode="url"
            value={form.website_url}
            maxLength={200}
            placeholder="https://yourshop.com"
            onChange={(e) =>
              setForm((f) => ({ ...f, website_url: e.target.value }))
            }
            className={`${inputCls} mt-1`}
          />
        </section>

        {/* Feedback */}
        {saveError && (
          <div className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="px-4 py-3 rounded-2xl bg-slime-accent/10 border border-slime-accent/30 text-xs text-slime-accent font-semibold flex items-center gap-2">
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

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className={`w-full py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-95 ${
            isFormValid && !saving
              ? "text-slime-bg shadow-glow-green"
              : "bg-slime-surface text-slime-muted cursor-not-allowed"
          }`}
          style={
            isFormValid && !saving
              ? { background: "linear-gradient(135deg, #39FF14, #00F0FF)" }
              : undefined
          }
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
      </div>
    </main>
  );
}
