// apps/web/app/settings/profile/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { updateProfile, checkUsernameAvailable } from "@/lib/profile-actions";
import PageWrapper from "@/components/PageWrapper";
import { useToast } from "@/components/Toast";

// Module-level client — absolute rule
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const MAX_DIMENSION = 1200;
const COMPRESS_QUALITY = 0.8;

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const INSTAGRAM_RE = /^[a-zA-Z0-9._]{1,30}$/;
const TIKTOK_RE = /^[a-zA-Z0-9._]{1,24}$/;
const SHOP_URL_RE = /^https?:\/\/.+/;

function validateUsername(value: string): "invalid" | "valid" {
  return USERNAME_RE.test(value) ? "valid" : "invalid";
}

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slime-border bg-slime-surface text-sm text-slime-text placeholder:text-slime-muted outline-none focus:border-slime-accent/50 focus:ring-1 focus:ring-slime-accent/30 transition-colors";

const sectionStyle = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

// ─── Image compression helpers ───────────────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
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
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        COMPRESS_QUALITY,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

function generateFilePath(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${userId}/${timestamp}-${random}.webp`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

// [Change 1] — Added youtube_handle, pinterest_handle, twitter_handle to FormState
type FormState = {
  username: string;
  bio: string;
  location: string;
  website_url: string;
  avatar_url: string | null;
  instagram_handle: string;
  tiktok_handle: string;
  shop_url: string;
  youtube_handle: string;
  pinterest_handle: string;
  twitter_handle: string;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

// ─── Helper components ────────────────────────────────────────────────────────

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
          aria-hidden="true"
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
          aria-hidden="true"
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
        aria-hidden="true"
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

function RowDivider() {
  return <div style={{ borderTop: "1px solid rgba(45,10,78,0.4)" }} />;
}

function EditRow({
  label,
  value,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-slime-surface/50 transition-colors"
      >
        <span className="flex-1 text-left">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slime-muted mb-0.5">
            {label}
          </span>
          <span
            className="block text-sm font-medium"
            style={{
              color: value ? "rgba(245,245,245,0.85)" : "rgba(245,245,245,0.3)",
            }}
          >
            {value || "Not set"}
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-slime-muted shrink-0 transition-transform duration-200"
          style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: "1px solid rgba(45,10,78,0.4)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── ProfileSettingsContent ───────────────────────────────────────────────────

function ProfileSettingsContent({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // [Change 2] — Initial state includes all three new fields
  const [originalForm, setOriginalForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
    instagram_handle: "",
    tiktok_handle: "",
    shop_url: "",
    youtube_handle: "",
    pinterest_handle: "",
    twitter_handle: "",
  });
  const [form, setForm] = useState<FormState>({
    username: "",
    bio: "",
    location: "",
    website_url: "",
    avatar_url: null,
    instagram_handle: "",
    tiktok_handle: "",
    shop_url: "",
    youtube_handle: "",
    pinterest_handle: "",
    twitter_handle: "",
  });
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Accordion — only one row open at a time
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  function toggleField(field: string) {
    setExpandedField((prev) => (prev === field ? null : field));
  }

  // ── upgrade toast ──────────────────────────────────────────────────────────
  useEffect(() => {
    const upgraded = searchParams.get("upgraded") === "true";
    const alreadyPro = searchParams.get("already_pro") === "true";

    if (upgraded) {
      showToast("Welcome to SlimeLog Pro!", "success");
    } else if (alreadyPro) {
      showToast("You're already subscribed to Pro.", "info");
    }

    if (upgraded || alreadyPro) {
      router.replace("/settings/profile");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── profile fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    // [Change 4] — Added youtube_handle, pinterest_handle, twitter_handle to select
    supabase
      .from("profiles")
      .select(
        "username, bio, location, website_url, avatar_url, instagram_handle, tiktok_handle, shop_url, youtube_handle, pinterest_handle, twitter_handle",
      )
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          // [Change 3] — Load new fields from profile data
          const loaded: FormState = {
            username: data.username ?? "",
            bio: data.bio ?? "",
            location: data.location ?? "",
            website_url: data.website_url ?? "",
            avatar_url: data.avatar_url ?? null,
            instagram_handle: data.instagram_handle ?? "",
            tiktok_handle: data.tiktok_handle ?? "",
            shop_url: data.shop_url ?? "",
            youtube_handle: data.youtube_handle ?? "",
            pinterest_handle: data.pinterest_handle ?? "",
            twitter_handle: data.twitter_handle ?? "",
          };
          setOriginalForm(loaded);
          setForm(loaded);
        }
        setProfileLoading(false);
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── username handlers ──────────────────────────────────────────────────────
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

  // ── avatar upload ──────────────────────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    const localPreview = URL.createObjectURL(file);
    setForm((f) => ({ ...f, avatar_url: localPreview }));
    try {
      const compressed = await compressImage(file);
      const filePath = generateFilePath(userId);
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, compressed, {
          contentType: "image/webp",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);
      URL.revokeObjectURL(localPreview);
      setForm((f) => ({ ...f, avatar_url: publicUrl }));
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
      setForm((f) => ({ ...f, avatar_url: originalForm.avatar_url }));
      URL.revokeObjectURL(localPreview);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  // ── validation helpers ─────────────────────────────────────────────────────
  const stripLeadingAt = (value: string) =>
    value.startsWith("@") ? value.slice(1) : value;

  const handleInstagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = stripLeadingAt(e.target.value);
    setForm((f) => ({ ...f, instagram_handle: value }));
  };

  const handleTiktokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = stripLeadingAt(e.target.value);
    setForm((f) => ({ ...f, tiktok_handle: value }));
  };

  const handleShopUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value && !/^https?:\/\//i.test(value)) {
      setForm((f) => ({ ...f, shop_url: `https://${value}` }));
    }
  };

  // [Change 5] — hasChanges includes the three new fields
  const hasChanges =
    form.username !== originalForm.username ||
    form.bio !== originalForm.bio ||
    form.location !== originalForm.location ||
    form.website_url !== originalForm.website_url ||
    form.avatar_url !== originalForm.avatar_url ||
    form.instagram_handle !== originalForm.instagram_handle ||
    form.tiktok_handle !== originalForm.tiktok_handle ||
    form.shop_url !== originalForm.shop_url ||
    form.youtube_handle !== originalForm.youtube_handle ||
    form.pinterest_handle !== originalForm.pinterest_handle ||
    form.twitter_handle !== originalForm.twitter_handle;

  const instagramValid =
    form.instagram_handle === "" || INSTAGRAM_RE.test(form.instagram_handle);
  const tiktokValid =
    form.tiktok_handle === "" || TIKTOK_RE.test(form.tiktok_handle);
  const shopUrlValid = form.shop_url === "" || SHOP_URL_RE.test(form.shop_url);

  // [Change 6] — Validation booleans for new fields
  const youtubeValid =
    form.youtube_handle === "" ||
    /^[a-zA-Z0-9_.-]{1,50}$/.test(form.youtube_handle);
  const pinterestValid =
    form.pinterest_handle === "" ||
    /^[a-zA-Z0-9_.+-]{1,30}$/.test(form.pinterest_handle);
  const twitterValid =
    form.twitter_handle === "" ||
    /^[a-zA-Z0-9_]{1,15}$/.test(form.twitter_handle);

  // [Change 7] — isFormValid includes new field validations
  const isFormValid =
    hasChanges &&
    form.username.length >= 3 &&
    (form.username === originalForm.username ||
      usernameStatus === "available") &&
    (form.username === originalForm.username ||
      validateUsername(form.username) === "valid") &&
    form.bio.length <= 150 &&
    instagramValid &&
    tiktokValid &&
    shopUrlValid &&
    youtubeValid &&
    pinterestValid &&
    twitterValid;

  const handleSave = async () => {
    if (!isFormValid) return;
    setSaving(true);

    // [Change 8] — Pass new handle fields to updateProfile
    const result = await updateProfile({
      username: form.username,
      bio: form.bio || undefined,
      avatar_url: form.avatar_url || undefined,
      location: form.location || undefined,
      website_url: form.website_url || undefined,
      instagram_handle: form.instagram_handle || undefined,
      tiktok_handle: form.tiktok_handle || undefined,
      shop_url: form.shop_url || undefined,
      youtube_handle: form.youtube_handle || undefined,
      pinterest_handle: form.pinterest_handle || undefined,
      twitter_handle: form.twitter_handle || undefined,
    });

    setSaving(false);

    if (result.success) {
      showToast("Profile saved", "success");
      setOriginalForm({ ...form });
      setUsernameStatus("idle");
    } else {
      showToast("Could not save profile", "error");
    }
  };

  // ── loading skeleton ───────────────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div className="px-4 pt-10 space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-slime-surface rounded-xl" />
        <div className="w-20 h-20 rounded-full bg-slime-surface mx-auto" />
        <div className="h-32 rounded-2xl" style={sectionStyle} />
        <div className="h-64 rounded-2xl" style={sectionStyle} />
      </div>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <header className="px-4 pt-10 pb-4 flex items-center gap-3">
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
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-black text-slime-cyan leading-tight">
            Edit Profile
          </h1>
          <p className="text-xs text-slime-muted mt-0.5">
            Update your SlimeLog presence
          </p>
        </div>
      </header>

      <div className="px-4 pb-28 space-y-4">
        {/* Hidden file input */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
          aria-label="Change profile photo"
        />

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-2 py-4">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative active:opacity-80 transition-opacity"
            aria-label="Change profile photo"
          >
            <div
              className="w-20 h-20 rounded-full overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                opacity: avatarUploading ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {form.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.avatar_url}
                  alt="Profile photo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-black text-2xl"
                  style={{
                    color: "#0A0A0A",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {form.username ? form.username.charAt(0).toUpperCase() : "S"}
                </div>
              )}
            </div>

            {/* Camera badge */}
            <span
              className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: avatarUploading
                  ? "rgba(45,10,78,0.8)"
                  : "rgba(57,255,20,0.9)",
                border: "2px solid #0A0A0A",
              }}
            >
              {avatarUploading ? (
                <svg
                  className="animate-spin"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#0A0A0A"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="#0A0A0A"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
              ) : (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0A0A0A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </span>
          </button>

          {form.avatar_url && !avatarUploading && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, avatar_url: null }))}
              className="text-xs font-medium active:opacity-70 transition-opacity"
              style={{ color: "rgba(245,245,245,0.35)" }}
            >
              Remove photo
            </button>
          )}

          {avatarError && (
            <p className="text-xs text-red-400 text-center px-4">
              {avatarError}
            </p>
          )}
        </div>

        {/* About You card */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            About You
          </p>
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            {/* Username row */}
            <EditRow
              label="Username"
              value={form.username ? `@${form.username}` : ""}
              expanded={expandedField === "username"}
              onToggle={() => toggleField("username")}
            >
              <div className="pt-3">
                <div className="relative flex items-center">
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
                <UsernameHint
                  status={usernameStatus}
                  username={form.username}
                />
              </div>
            </EditRow>

            <RowDivider />

            {/* Bio row */}
            <EditRow
              label="Bio"
              value={form.bio}
              expanded={expandedField === "bio"}
              onToggle={() => toggleField("bio")}
            >
              <div className="pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slime-muted">
                    Bio
                  </span>
                  <span
                    className={`text-[10px] font-medium tabular-nums transition-colors ${
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
                  rows={4}
                  value={form.bio}
                  maxLength={150}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bio: e.target.value }))
                  }
                  placeholder="Tell the slime world about yourself…"
                  className={`${inputCls} resize-none`}
                />
              </div>
            </EditRow>
          </div>
        </div>

        {/* Contact & Links card — Location, Website, Shop URL only */}
        {/* [Change 9] — Instagram and TikTok moved to Social Links section below */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            Contact &amp; Links
          </p>
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            {/* Location */}
            <EditRow
              label="Location"
              value={form.location}
              expanded={expandedField === "location"}
              onToggle={() => toggleField("location")}
            >
              <div className="pt-3">
                <input
                  id="location"
                  type="text"
                  value={form.location}
                  maxLength={100}
                  placeholder="e.g. Austin, TX"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                  className={inputCls}
                />
              </div>
            </EditRow>

            <RowDivider />

            {/* Website */}
            <EditRow
              label="Website"
              value={form.website_url}
              expanded={expandedField === "website_url"}
              onToggle={() => toggleField("website_url")}
            >
              <div className="pt-3">
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
                  className={inputCls}
                />
              </div>
            </EditRow>

            <RowDivider />

            {/* Shop URL */}
            <EditRow
              label="Shop URL"
              value={form.shop_url}
              expanded={expandedField === "shop_url"}
              onToggle={() => toggleField("shop_url")}
            >
              <div className="pt-3">
                <input
                  id="shop_url"
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.shop_url}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, shop_url: e.target.value }))
                  }
                  onBlur={handleShopUrlBlur}
                  maxLength={200}
                  placeholder="https://myshop.etsy.com"
                  className={inputCls}
                />
                {form.shop_url !== "" && !SHOP_URL_RE.test(form.shop_url) && (
                  <p className="text-xs text-red-400 mt-1.5">
                    Must be a valid URL starting with https://
                  </p>
                )}
              </div>
            </EditRow>
          </div>
        </div>

        {/* [Change 9] — Social Links card (new section) */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            Social Links
          </p>
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
            {/* Instagram */}
            <EditRow
              label="Instagram"
              value={form.instagram_handle ? `@${form.instagram_handle}` : ""}
              expanded={expandedField === "instagram_handle"}
              onToggle={() => toggleField("instagram_handle")}
            >
              <div className="pt-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                    @
                  </span>
                  <input
                    id="instagram_handle"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.instagram_handle}
                    onChange={handleInstagramChange}
                    maxLength={30}
                    placeholder="slimelogapp"
                    className={`${inputCls} pl-7`}
                  />
                </div>
                {form.instagram_handle !== "" &&
                  (INSTAGRAM_RE.test(form.instagram_handle) ? (
                    <p className="text-[10px] text-slime-muted mt-1.5">
                      Links to instagram.com/{form.instagram_handle}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-1.5">
                      Letters, numbers, periods, and underscores only.
                    </p>
                  ))}
              </div>
            </EditRow>

            <RowDivider />

            {/* TikTok */}
            <EditRow
              label="TikTok"
              value={form.tiktok_handle ? `@${form.tiktok_handle}` : ""}
              expanded={expandedField === "tiktok_handle"}
              onToggle={() => toggleField("tiktok_handle")}
            >
              <div className="pt-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                    @
                  </span>
                  <input
                    id="tiktok_handle"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.tiktok_handle}
                    onChange={handleTiktokChange}
                    maxLength={24}
                    placeholder="slimelogapp"
                    className={`${inputCls} pl-7`}
                  />
                </div>
                {form.tiktok_handle !== "" &&
                  (TIKTOK_RE.test(form.tiktok_handle) ? (
                    <p className="text-[10px] text-slime-muted mt-1.5">
                      Links to tiktok.com/@{form.tiktok_handle}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-1.5">
                      Letters, numbers, periods, and underscores only.
                    </p>
                  ))}
              </div>
            </EditRow>

            <RowDivider />

            {/* YouTube */}
            <EditRow
              label="YouTube"
              value={form.youtube_handle ? `@${form.youtube_handle}` : ""}
              expanded={expandedField === "youtube_handle"}
              onToggle={() => toggleField("youtube_handle")}
            >
              <div className="pt-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                    @
                  </span>
                  <input
                    id="youtube_handle"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.youtube_handle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        youtube_handle: e.target.value.startsWith("@")
                          ? e.target.value.slice(1)
                          : e.target.value,
                      }))
                    }
                    maxLength={50}
                    placeholder="yourchannel"
                    className={`${inputCls} pl-7`}
                  />
                </div>
                {form.youtube_handle !== "" &&
                  (/^[a-zA-Z0-9_.-]{1,50}$/.test(form.youtube_handle) ? (
                    <p className="text-[10px] text-slime-muted mt-1.5">
                      Links to youtube.com/@{form.youtube_handle}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-1.5">
                      Letters, numbers, hyphens, underscores, and periods only.
                    </p>
                  ))}
              </div>
            </EditRow>

            <RowDivider />

            {/* Pinterest */}
            <EditRow
              label="Pinterest"
              value={form.pinterest_handle ? `@${form.pinterest_handle}` : ""}
              expanded={expandedField === "pinterest_handle"}
              onToggle={() => toggleField("pinterest_handle")}
            >
              <div className="pt-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                    @
                  </span>
                  <input
                    id="pinterest_handle"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.pinterest_handle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pinterest_handle: e.target.value.startsWith("@")
                          ? e.target.value.slice(1)
                          : e.target.value,
                      }))
                    }
                    maxLength={30}
                    placeholder="yourprofile"
                    className={`${inputCls} pl-7`}
                  />
                </div>
                {form.pinterest_handle !== "" &&
                  (/^[a-zA-Z0-9_.+-]{1,30}$/.test(form.pinterest_handle) ? (
                    <p className="text-[10px] text-slime-muted mt-1.5">
                      Links to pinterest.com/{form.pinterest_handle}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-1.5">
                      Letters, numbers, underscores, hyphens, and periods only.
                    </p>
                  ))}
              </div>
            </EditRow>

            <RowDivider />

            {/* Twitter/X */}
            <EditRow
              label="Twitter / X"
              value={form.twitter_handle ? `@${form.twitter_handle}` : ""}
              expanded={expandedField === "twitter_handle"}
              onToggle={() => toggleField("twitter_handle")}
            >
              <div className="pt-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slime-muted text-sm font-medium select-none">
                    @
                  </span>
                  <input
                    id="twitter_handle"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={form.twitter_handle}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        twitter_handle: e.target.value.startsWith("@")
                          ? e.target.value.slice(1)
                          : e.target.value,
                      }))
                    }
                    maxLength={15}
                    placeholder="yourhandle"
                    className={`${inputCls} pl-7`}
                  />
                </div>
                {form.twitter_handle !== "" &&
                  (/^[a-zA-Z0-9_]{1,15}$/.test(form.twitter_handle) ? (
                    <p className="text-[10px] text-slime-muted mt-1.5">
                      Links to x.com/{form.twitter_handle}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 mt-1.5">
                      Letters, numbers, and underscores only. Max 15 characters.
                    </p>
                  ))}
              </div>
            </EditRow>
          </div>
        </div>

        {/* Save button */}
        <button
          type="button"
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
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function ProfileSettingsPage() {
  const router = useRouter();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authChecked || !userId) {
    return (
      <PageWrapper>
        <div className="px-4 pt-10 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-slime-surface rounded-xl" />
          <div className="w-20 h-20 rounded-full bg-slime-surface mx-auto" />
          <div className="h-32 rounded-2xl" style={sectionStyle} />
          <div className="h-64 rounded-2xl" style={sectionStyle} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper dots>
      <ProfileSettingsContent userId={userId} />
    </PageWrapper>
  );
}
