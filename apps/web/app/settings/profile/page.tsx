// apps/web/app/settings/profile/page.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { updateProfile, checkUsernameAvailable } from "@/lib/profile-actions";
import PageWrapper from "@/components/PageWrapper";
import { useToast } from "@/components/Toast";
import BrandSearchInput from "@/components/BrandSearchInput";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
// T104 (2026-07-10): use the shared AuthProvider for the auth gate so
// this page doesn't fire its own duplicate getUser call. The heavier
// per-page profile fetch (12+ social + form fields) stays local because
// those columns aren't in AuthProvider's payload.
import { useAuth } from "@/components/AuthProvider";

// Module-level client — absolute rule. Singleton internally.
const supabase = createClient();

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
  background_url: string | null;
  favorite_brand_id: string | null;
  favorite_brand_name: string;
};

type ProfileLink = {
  id: string;
  label: string;
  url: string;
  sort_order: number;
};

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

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
  const searchParams = useSearchParams();
  const router = useRouter();

  const emptyForm: FormState = {
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
    background_url: null,
    favorite_brand_id: null,
    favorite_brand_name: "",
  };

  const [originalForm, setOriginalForm] = useState<FormState>(emptyForm);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  function toggleField(field: string) {
    setExpandedField((prev) => (prev === field ? null : field));
  }

  // ── upgrade toast ──────────────────────────────────────────────────────────
  //
  // #20: two toasts were firing on Pro upgrade return. Root cause was the
  // effect re-running on remount — React 18/19 strict mode fires effects
  // twice in dev, and any component-level re-mount in prod would repeat
  // the toast because the useEffect deps are `[]` (an intentional "run
  // once on mount" hint). The dedupe here is a hard ref-guard so the
  // block can never fire more than once per page-load regardless of
  // remount cycles.
  const upgradeToastFiredRef = useRef(false);
  useEffect(() => {
    if (upgradeToastFiredRef.current) return;
    const upgraded = searchParams.get("upgraded") === "true";
    const alreadyPro = searchParams.get("already_pro") === "true";
    if (!(upgraded || alreadyPro)) return;
    upgradeToastFiredRef.current = true;
    if (upgraded) showToast("Welcome to SlimeLog Pro!", "success");
    else showToast("You're already subscribed to Pro.", "info");
    router.replace("/settings/profile");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── profile fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("profiles")
      .select(
        "username, bio, location, website_url, avatar_url, instagram_handle, tiktok_handle, shop_url, youtube_handle, pinterest_handle, twitter_handle, background_url, favorite_brand_id",
      )
      .eq("id", userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          let favName = "";
          if (data.favorite_brand_id) {
            const { data: brandRow } = await supabase
              .from("brands")
              .select("name")
              .eq("id", data.favorite_brand_id)
              .maybeSingle();
            favName = brandRow?.name ?? "";
          }
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
            background_url: data.background_url ?? null,
            favorite_brand_id: data.favorite_brand_id ?? null,
            favorite_brand_name: favName,
          };
          setOriginalForm(loaded);
          setForm(loaded);
        }
        setProfileLoading(false);
      });

    supabase
      .from("profile_links")
      .select("id, label, url, sort_order")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setLinks((data ?? []) as ProfileLink[]);
        setLinksLoading(false);
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

  // ── background upload ──────────────────────────────────────────────────────
  async function handleBgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const compressed = await compressImage(file);
      const filePath = generateFilePath(userId);
      const { error: uploadError } = await supabase.storage
        .from("slime-photos")
        .upload(filePath, compressed, {
          contentType: "image/webp",
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
      const {
        data: { publicUrl },
      } = supabase.storage.from("slime-photos").getPublicUrl(filePath);
      setForm((f) => ({ ...f, background_url: publicUrl }));
    } catch {
      // silently ignore
    } finally {
      setBgUploading(false);
      if (bgInputRef.current) bgInputRef.current.value = "";
    }
  }

  // ── validation helpers ─────────────────────────────────────────────────────
  const stripLeadingAt = (value: string) =>
    value.startsWith("@") ? value.slice(1) : value;

  const handleInstagramChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({
      ...f,
      instagram_handle: stripLeadingAt(e.target.value),
    }));
  };

  const handleTiktokChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, tiktok_handle: stripLeadingAt(e.target.value) }));
  };

  const handleShopUrlBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    if (value && !/^https?:\/\//i.test(value)) {
      setForm((f) => ({ ...f, shop_url: `https://${value}` }));
    }
  };

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
    form.twitter_handle !== originalForm.twitter_handle ||
    form.background_url !== originalForm.background_url ||
    form.favorite_brand_id !== originalForm.favorite_brand_id;

  const instagramValid =
    form.instagram_handle === "" || INSTAGRAM_RE.test(form.instagram_handle);
  const tiktokValid =
    form.tiktok_handle === "" || TIKTOK_RE.test(form.tiktok_handle);
  const shopUrlValid = form.shop_url === "" || SHOP_URL_RE.test(form.shop_url);
  const youtubeValid =
    form.youtube_handle === "" ||
    /^[a-zA-Z0-9_.-]{1,50}$/.test(form.youtube_handle);
  const pinterestValid =
    form.pinterest_handle === "" ||
    /^[a-zA-Z0-9_.+-]{1,30}$/.test(form.pinterest_handle);
  const twitterValid =
    form.twitter_handle === "" ||
    /^[a-zA-Z0-9_]{1,15}$/.test(form.twitter_handle);

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
      background_url: form.background_url || undefined,
      favorite_brand_id: form.favorite_brand_id || undefined,
    });
    setSaving(false);
    if (result.success) {
      showToast("Profile saved", "success");
      setOriginalForm({ ...form });
      setUsernameStatus("idle");
    } else {
      showToast(result.error ?? "Could not save profile", "error");
    }
  };

  // ── link operations ────────────────────────────────────────────────────────
  async function handleAddLink() {
    const trimLabel = newLinkLabel.trim();
    const trimUrl = newLinkUrl.trim();
    if (!trimLabel || !trimUrl) {
      setLinkError("Label and URL are required.");
      return;
    }
    // Audit blocker #2 (2026-07-06): match the DB CHECK constraint added
    // in migration 20260706000048. The constraint accepts http(s):// and
    // is case-insensitive, so we validate the same way here to keep the
    // client / DB / render layers in agreement. Historically this was
    // `startsWith("https://")` which would reject valid `HTTPS://` URLs
    // and mislead users about what the server actually accepts.
    if (!/^https?:\/\//i.test(trimUrl)) {
      setLinkError("URL must start with http:// or https://");
      return;
    }
    if (links.length >= 5) {
      setLinkError("Maximum 5 links allowed.");
      return;
    }
    setLinkSaving(true);
    setLinkError(null);
    const nextOrder =
      links.length > 0 ? Math.max(...links.map((l) => l.sort_order)) + 1 : 0;
    const { data, error } = await supabase
      .from("profile_links")
      .insert({
        user_id: userId,
        label: trimLabel,
        url: trimUrl,
        sort_order: nextOrder,
      })
      .select("id, label, url, sort_order")
      .single();
    if (error) {
      setLinkError(error.message);
    } else {
      setLinks((prev) => [...prev, data as ProfileLink]);
      setNewLinkLabel("");
      setNewLinkUrl("");
      setShowAddLink(false);
    }
    setLinkSaving(false);
  }

  async function handleDeleteLink(id: string) {
    const { error } = await supabase
      .from("profile_links")
      .delete()
      .eq("id", id);
    if (!error) setLinks((prev) => prev.filter((l) => l.id !== id));
  }

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
        {/* Hidden file inputs */}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
          aria-label="Change profile photo"
        />
        <input
          ref={bgInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleBgChange}
          aria-hidden="true"
        />

        {/* Appearance — avatar + background */}
        <p
          className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
          style={{ color: "#00F0FF" }}
        >
          Appearance
        </p>

        {/* Avatar */}
        <div
          className="flex flex-col items-center gap-2 py-4 rounded-2xl"
          style={sectionStyle}
        >
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

        {/* Background */}
        <div className="rounded-2xl p-4" style={sectionStyle}>
          <button
            type="button"
            onClick={() => bgInputRef.current?.click()}
            className="relative w-full rounded-2xl overflow-hidden transition-opacity active:opacity-80"
            style={{
              height: 160,
              border: form.background_url
                ? "1px solid rgba(45,10,78,0.8)"
                : "2px dashed rgba(45,10,78,0.8)",
              background: "rgba(10,0,20,0.3)",
            }}
            aria-label="Set profile background image"
          >
            {form.background_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.background_url}
                alt=""
                className="w-full h-full object-cover"
                aria-hidden="true"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span
                  className="text-xs font-semibold"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  Tap to set background
                </span>
              </div>
            )}
            {bgUploading && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: "rgba(10,0,20,0.6)" }}
              >
                <svg
                  className="animate-spin"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            )}
          </button>
          {form.background_url && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, background_url: null }))}
              className="mt-2 text-xs font-medium active:opacity-70 transition-opacity"
              style={{ color: "rgba(245,245,245,0.35)" }}
            >
              Remove background
            </button>
          )}
        </div>

        {/* About You */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            About You
          </p>
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
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
                    className={`text-[10px] font-medium tabular-nums transition-colors ${form.bio.length > 140 ? (form.bio.length > 150 ? "text-red-400" : "text-amber-400") : "text-slime-muted"}`}
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

        {/* Contact & Links */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            Contact &amp; Links
          </p>
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
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

        {/* Social Links */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            Social Links
          </p>
          <div className="rounded-2xl overflow-hidden" style={sectionStyle}>
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

        {/* Favorite Shop — no overflow-hidden so dropdown isn't clipped */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            Favorite Shop
          </p>
          <div className="rounded-2xl p-4" style={sectionStyle}>
            <BrandSearchInput
              value={form.favorite_brand_name}
              onChange={(name: string, id: string | null) =>
                setForm((f) => ({
                  ...f,
                  favorite_brand_name: name,
                  favorite_brand_id: id,
                }))
              }
              placeholder="Search brands..."
            />
            {form.favorite_brand_id && (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    favorite_brand_id: null,
                    favorite_brand_name: "",
                  }))
                }
                className="mt-2 text-xs font-medium active:opacity-70 transition-opacity"
                style={{ color: "rgba(245,245,245,0.35)" }}
              >
                Clear favorite shop
              </button>
            )}
          </div>
        </div>

        {/* Affiliate Links */}
        <div>
          <p
            className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
            style={{ color: "#00F0FF" }}
          >
            Affiliate Links
          </p>
          <div className="rounded-2xl overflow-hidden p-4" style={sectionStyle}>
            {linksLoading ? (
              <div className="flex flex-col gap-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-12 rounded-xl animate-pulse"
                    style={{ background: "rgba(45,10,78,0.3)" }}
                  />
                ))}
              </div>
            ) : (
              <>
                {links.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3">
                    {links.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                        style={{
                          background: "rgba(45,10,78,0.3)",
                          border: "1px solid rgba(45,10,78,0.6)",
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slime-text truncate">
                            {link.label}
                          </p>
                          <p className="text-[10px] text-slime-muted truncate">
                            {link.url}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteLink(link.id)}
                          className="shrink-0 transition-opacity active:opacity-70"
                          aria-label={`Delete link: ${link.label}`}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FF00E5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {showAddLink ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slime-muted mb-1.5">
                        Label (max 50 chars)
                      </label>
                      <input
                        type="text"
                        value={newLinkLabel}
                        onChange={(e) => setNewLinkLabel(e.target.value)}
                        className={inputCls}
                        placeholder="e.g. My Etsy Shop"
                        maxLength={50}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-slime-muted mb-1.5">
                        URL (must start with https://)
                      </label>
                      <input
                        type="url"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        className={inputCls}
                        placeholder="https://example.com"
                        maxLength={200}
                      />
                    </div>
                    {linkError && (
                      <p className="text-xs" style={{ color: "#ff6b6b" }}>
                        {linkError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddLink}
                        disabled={linkSaving}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-50"
                        style={{
                          background:
                            "linear-gradient(135deg, #39FF14, #00F0FF)",
                          color: "#0A0A0A",
                        }}
                      >
                        {linkSaving ? "Saving..." : "Save Link"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddLink(false);
                          setNewLinkLabel("");
                          setNewLinkUrl("");
                          setLinkError(null);
                        }}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slime-muted transition-opacity active:opacity-70"
                        style={{
                          background: "rgba(45,10,78,0.3)",
                          border: "1px solid rgba(45,10,78,0.7)",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (links.length < 5) setShowAddLink(true);
                    }}
                    disabled={links.length >= 5}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
                    style={{
                      background: "rgba(57,255,20,0.08)",
                      border: "1px solid rgba(57,255,20,0.25)",
                      color: "#39FF14",
                    }}
                  >
                    {links.length >= 5 ? "Max 5 links reached" : "+ Add Link"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isFormValid || saving}
          className={`w-full py-3.5 rounded-2xl text-sm font-black tracking-wide transition-all active:scale-95 ${isFormValid && !saving ? "text-slime-bg shadow-glow-green" : "bg-slime-surface text-slime-muted cursor-not-allowed"}`}
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
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  const authChecked = !authLoading;
  const userId = user?.id ?? null;

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
