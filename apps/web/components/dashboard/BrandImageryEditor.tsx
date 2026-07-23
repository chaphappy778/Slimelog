// apps/web/components/dashboard/BrandImageryEditor.tsx
//
// T137 Batch 5 (2026-07-23): brand banner + logo editor, extracted out of
// BrandSettingsForm so the imagery surface can carry its own design.
//
// The upload path here is the one that already shipped in BrandSettingsForm
// (canvas compress to WebP -> Supabase Storage `slime-photos` -> getPublicUrl
// -> `brands.logo_url` / `brands.banner_url`). It is moved, not rewritten.
// What is new: client-side type + size gates, drag and drop, a Remove action,
// a grid overlay showing the visible crop, and a live preview of the public
// brand hero.
//
// BrandSettingsForm no longer writes logo_url / banner_url. If you ever add
// those back to its payload, a save there will clobber whatever this editor
// just wrote (the form holds a stale copy from the server render).
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { ValidationError, optionalSupabaseUrl } from "@/lib/api-validation";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandImageryEditorProps {
  brand: {
    id: string;
    name: string;
    logo_url: string | null;
    banner_url: string | null;
    slug: string;
    verification_tier: string | null;
  };
  userId: string;
}

type ImageKind = "banner" | "logo";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = "image/jpeg,image/png,image/webp";
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const TYPE_ERROR = "Only JPG, PNG, WebP images allowed.";
const SIZE_ERROR = "File too large. 5MB max.";

// Preserved from BrandSettingsForm: banner compresses to 1600px on its long
// edge, logo to 400px. Both land as WebP at 0.85 quality.
const MAX_DIMENSION: Record<ImageKind, number> = { banner: 1600, logo: 400 };

// The public brand page renders the banner 200px tall in a column that caps at
// 440px, so the visible slice is roughly 2.2:1. The crop stage and the preview
// both use that ratio so what you see here is what the page shows.
const PUBLIC_BANNER_ASPECT = "440 / 200";

const cardStyle: React.CSSProperties = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

// ─── Upload helpers (moved from BrandSettingsForm) ────────────────────────────

async function compressImage(file: File, maxDimension: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
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
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    img.src = objectUrl;
  });
}

function generateFilePath(userId: string, prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `brands/${userId}/${prefix}-${Date.now()}-${random}.webp`;
}

// ─── Icons (line SVG, 1.5–2px stroke) ─────────────────────────────────────────

function ImageIcon({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(245,245,245,0.45)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.75" />
      <path d="M21 16l-5.5-5.5L6 20" />
    </svg>
  );
}

function DropletIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="rgba(245,245,245,0.45)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3s6 6.2 6 10.2A6 6 0 0 1 6 13.2C6 9.2 12 3 12 3z" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5M12 16.2v.01" />
    </svg>
  );
}

function Spinner({ size = 22 }: { size?: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="rgba(245,245,245,0.2)"
        strokeWidth="2"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="#39FF14"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Small presentational pieces ──────────────────────────────────────────────

type PillTone = "muted" | "cyan" | "green" | "red";

const PILL_TONES: Record<PillTone, { color: string; bg: string; bd: string }> = {
  muted: {
    color: "rgba(245,245,245,0.45)",
    bg: "rgba(245,245,245,0.06)",
    bd: "rgba(245,245,245,0.14)",
  },
  cyan: {
    color: "#00F0FF",
    bg: "rgba(0,240,255,0.1)",
    bd: "rgba(0,240,255,0.35)",
  },
  green: {
    color: "#39FF14",
    bg: "rgba(57,255,20,0.1)",
    bd: "rgba(57,255,20,0.35)",
  },
  red: {
    color: "#f87171",
    bg: "rgba(239,68,68,0.1)",
    bd: "rgba(239,68,68,0.35)",
  },
};

function StatusPill({ tone, children }: { tone: PillTone; children: string }) {
  const t = PILL_TONES[tone];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: t.color, background: t.bg, border: `1px solid ${t.bd}` }}
    >
      {children}
    </span>
  );
}

/** Rule-of-thirds overlay. Purely a framing guide, nothing is cropped here. */
function GridOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.14) 1px, transparent 1px)",
        backgroundSize: "33.333% 33.333%",
      }}
    />
  );
}

function UploadingVeil() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{ background: "rgba(10,10,10,0.6)", zIndex: 2 }}
    >
      <Spinner />
      <span className="text-[11px]" style={{ color: "rgba(245,245,245,0.7)" }}>
        Uploading...
      </span>
    </div>
  );
}

function InlineError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 mt-3 rounded-xl px-3 py-2.5"
      style={{
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.35)",
        color: "#f87171",
      }}
      role="alert"
    >
      <AlertIcon />
      <span className="text-xs flex-1 min-w-0">{message}</span>
      <button
        type="button"
        onClick={onRetry}
        className="text-xs font-bold underline underline-offset-2 flex-shrink-0"
        style={{ color: "#f87171" }}
      >
        Try again
      </button>
    </div>
  );
}

function ActionButton({
  variant,
  onClick,
  disabled,
  children,
}: {
  variant: "secondary" | "ghost";
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const isGhost = variant === "ghost";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-3.5 py-2 rounded-xl text-xs font-bold transition-opacity"
      style={{
        background: isGhost ? "transparent" : "rgba(45,10,78,0.55)",
        border: isGhost
          ? "1px solid rgba(245,245,245,0.14)"
          : "1px solid rgba(0,240,255,0.35)",
        color: isGhost ? "rgba(245,245,245,0.6)" : "#00F0FF",
        opacity: disabled ? 0.4 : 1,
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      {children}
    </button>
  );
}

// verification_tier -> preview pill. Mirrors DashboardLayout's tierPill so the
// owner sees the same badge language everywhere.
function tierPill(tier: string | null | undefined): {
  label: string;
  tone: PillTone;
} {
  const t = (tier ?? "community").toLowerCase();
  if (t === "verified" || t === "partner")
    return { label: t.toUpperCase(), tone: "green" };
  if (t === "claimed") return { label: "CLAIMED", tone: "cyan" };
  return { label: t.toUpperCase(), tone: "muted" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandImageryEditor({
  brand,
  userId,
}: BrandImageryEditorProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logo_url ?? null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    brand.banner_url ?? null,
  );

  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [bannerDrag, setBannerDrag] = useState(false);
  const [logoDrag, setLogoDrag] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Same dirty-check shape as BrandSettingsForm: compare against the values
  // the server rendered with, and re-baseline on a successful save.
  const original = useRef({
    logoUrl: brand.logo_url ?? null,
    bannerUrl: brand.banner_url ?? null,
  });
  const hasChanges =
    logoUrl !== original.current.logoUrl ||
    bannerUrl !== original.current.bannerUrl;

  // Race protection (BrandSearchInput pattern): a slow first upload must not
  // overwrite a faster second one.
  const requestId = useRef<Record<ImageKind, number>>({ banner: 0, logo: 0 });

  const handleFile = useCallback(
    async (kind: ImageKind, file: File | null | undefined) => {
      if (!file) return;
      const setUrl = kind === "banner" ? setBannerUrl : setLogoUrl;
      const setUploading =
        kind === "banner" ? setBannerUploading : setLogoUploading;
      const setError = kind === "banner" ? setBannerError : setLogoError;

      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError(TYPE_ERROR);
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(SIZE_ERROR);
        return;
      }

      const id = ++requestId.current[kind];
      setUploading(true);
      try {
        const blob = await compressImage(file, MAX_DIMENSION[kind]);
        const path = generateFilePath(userId, kind);
        const { error: uploadError } = await supabase.storage
          .from("slime-photos")
          .upload(path, blob, { contentType: "image/webp", upsert: false });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("slime-photos")
          .getPublicUrl(path);
        if (id !== requestId.current[kind]) return; // stale, a newer pick won
        setUrl(urlData.publicUrl);
      } catch (err) {
        if (id !== requestId.current[kind]) return;
        console.error(`[BrandImageryEditor] ${kind} upload failed`, err);
        setError(
          err instanceof Error
            ? err.message
            : "Upload failed. Check your connection and try again.",
        );
      } finally {
        if (id === requestId.current[kind]) setUploading(false);
      }
    },
    [userId],
  );

  const onInputChange =
    (kind: ImageKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
      void handleFile(kind, e.target.files?.[0]);
      e.target.value = "";
    };

  const onDrop = (kind: ImageKind) => (e: React.DragEvent) => {
    e.preventDefault();
    (kind === "banner" ? setBannerDrag : setLogoDrag)(false);
    void handleFile(kind, e.dataTransfer.files?.[0]);
  };

  const openPicker = (kind: ImageKind) => () => {
    (kind === "banner" ? bannerInputRef : logoInputRef).current?.click();
  };

  const removeImage = (kind: ImageKind) => () => {
    // Bumping the request id drops any in-flight upload for this slot.
    requestId.current[kind] += 1;
    if (kind === "banner") {
      setBannerUrl(null);
      setBannerError(null);
      setBannerUploading(false);
    } else {
      setLogoUrl(null);
      setLogoError(null);
      setLogoUploading(false);
    }
  };

  const handleDiscard = () => {
    setLogoUrl(original.current.logoUrl);
    setBannerUrl(original.current.bannerUrl);
    setBannerError(null);
    setLogoError(null);
    setSaveError(null);
  };

  const handleSave = async () => {
    // Audit hp-16 (2026-07-07): logo_url + banner_url must live on our own
    // Supabase Storage. Same guard the settings form ran before the split.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let checkedLogoUrl: string | null;
    let checkedBannerUrl: string | null;
    try {
      checkedLogoUrl = optionalSupabaseUrl(logoUrl, "Logo", supabaseUrl);
      checkedBannerUrl = optionalSupabaseUrl(bannerUrl, "Banner", supabaseUrl);
    } catch (validationErr) {
      if (validationErr instanceof ValidationError) {
        setSaveError(validationErr.message);
        return;
      }
      throw validationErr;
    }

    setSaving(true);
    setSaveError(null);
    const { error: err } = await supabase
      .from("brands")
      .update({ logo_url: checkedLogoUrl, banner_url: checkedBannerUrl })
      .eq("id", brand.id)
      .eq("owner_id", userId);

    setSaving(false);
    if (err) {
      console.error("[BrandImageryEditor] save failed", err);
      setSaveError(err.message);
      showToast("Could not save your imagery", "error");
      return;
    }
    original.current = { logoUrl, bannerUrl };
    showToast("Brand imagery saved", "success");
    // Refresh so the dashboard rail and the public page pick up the new files.
    router.refresh();
  };

  const bannerTone: PillTone = bannerError
    ? "red"
    : !bannerUrl
      ? "muted"
      : bannerUrl !== original.current.bannerUrl
        ? "cyan"
        : "green";
  const bannerStatus = bannerError
    ? "Error"
    : !bannerUrl
      ? "No image"
      : bannerUrl !== original.current.bannerUrl
        ? "Unsaved"
        : "Saved";

  const logoTone: PillTone = logoError
    ? "red"
    : !logoUrl
      ? "muted"
      : logoUrl !== original.current.logoUrl
        ? "cyan"
        : "green";
  const logoStatus = logoError
    ? "Error"
    : !logoUrl
      ? "No image"
      : logoUrl !== original.current.logoUrl
        ? "Unsaved"
        : "Saved";

  const initials = brand.name.slice(0, 2).toUpperCase();
  const pill = tierPill(brand.verification_tier);

  return (
    <div className="w-full">
      {/* Section header */}
      <p
        className="text-[11px] font-black tracking-widest uppercase mb-1 px-1"
        style={{ color: "#00F0FF" }}
      >
        Brand Imagery
      </p>
      <p
        className="text-xs mb-4 px-1"
        style={{ color: "rgba(245,245,245,0.45)" }}
      >
        Upload the banner and logo that appear on your public brand page.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* ── Editor column ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* BANNER */}
          <div className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2
                className="text-base font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Banner
              </h2>
              <StatusPill tone={bannerTone}>{bannerStatus}</StatusPill>
            </div>
            <p
              className="text-xs mb-4"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              2000 × 600 recommended (10:3). JPG, PNG or WebP, 5MB max. Shows
              200px tall on your brand page.
            </p>

            {bannerUrl ? (
              <div>
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    aspectRatio: PUBLIC_BANNER_ASPECT,
                    background: "#100020",
                    border: "1px solid rgba(0,240,255,0.3)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bannerUrl}
                    alt="Brand banner"
                    className="w-full h-full object-cover"
                  />
                  <GridOverlay />
                  <span
                    className="absolute left-2.5 bottom-2.5 text-[10px] font-semibold px-2 py-1 rounded-full pointer-events-none"
                    style={{
                      background: "rgba(10,10,10,0.6)",
                      color: "rgba(245,245,245,0.8)",
                    }}
                  >
                    Visible area on your brand page
                  </span>
                  {bannerUploading && <UploadingVeil />}
                </div>
                <div className="flex gap-2.5 mt-3">
                  <ActionButton
                    variant="secondary"
                    onClick={openPicker("banner")}
                    disabled={bannerUploading}
                  >
                    Replace
                  </ActionButton>
                  <ActionButton
                    variant="ghost"
                    onClick={removeImage("banner")}
                  >
                    Remove
                  </ActionButton>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openPicker("banner")}
                disabled={bannerUploading}
                onDragOver={(e) => {
                  e.preventDefault();
                  setBannerDrag(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setBannerDrag(false);
                }}
                onDrop={onDrop("banner")}
                className="relative w-full rounded-xl flex flex-col items-center justify-center gap-2 text-center px-4"
                style={{
                  aspectRatio: PUBLIC_BANNER_ASPECT,
                  border: bannerDrag
                    ? "2px solid #00F0FF"
                    : "2px dashed rgba(245,245,245,0.18)",
                  background: bannerDrag
                    ? "rgba(0,240,255,0.08)"
                    : "rgba(45,10,78,0.3)",
                  transition: "border-color 160ms, background 160ms",
                }}
                aria-label="Upload banner image"
              >
                <ImageIcon />
                <span className="text-sm font-bold text-white">
                  Drag and drop your banner
                </span>
                <span
                  className="text-xs"
                  style={{ color: "rgba(245,245,245,0.4)" }}
                >
                  or tap to choose a file from your device
                </span>
                {bannerUploading && <UploadingVeil />}
              </button>
            )}

            {bannerError && (
              <InlineError
                message={bannerError}
                onRetry={openPicker("banner")}
              />
            )}

            <input
              ref={bannerInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={onInputChange("banner")}
              aria-hidden="true"
            />
          </div>

          {/* LOGO */}
          <div className="rounded-2xl p-5" style={cardStyle}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2
                className="text-base font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                Logo
              </h2>
              <StatusPill tone={logoTone}>{logoStatus}</StatusPill>
            </div>
            <p
              className="text-xs mb-4"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              512 × 512 recommended (square). JPG, PNG or WebP, 5MB max.
            </p>

            <div className="flex gap-4 items-start">
              {logoUrl ? (
                <div
                  className="relative rounded-xl overflow-hidden flex-shrink-0"
                  style={{
                    width: 132,
                    height: 132,
                    background: "#100020",
                    border: "1px solid rgba(0,240,255,0.3)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Brand logo"
                    className="w-full h-full object-cover"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      inset: 8,
                      border: "2px solid rgba(255,255,255,0.25)",
                    }}
                  />
                  {logoUploading && <UploadingVeil />}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openPicker("logo")}
                  disabled={logoUploading}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setLogoDrag(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setLogoDrag(false);
                  }}
                  onDrop={onDrop("logo")}
                  className="relative rounded-xl flex flex-col items-center justify-center gap-1.5 flex-shrink-0 text-center px-2"
                  style={{
                    width: 132,
                    height: 132,
                    border: logoDrag
                      ? "2px solid #00F0FF"
                      : "2px dashed rgba(245,245,245,0.18)",
                    background: logoDrag
                      ? "rgba(0,240,255,0.08)"
                      : "rgba(45,10,78,0.3)",
                    transition: "border-color 160ms, background 160ms",
                  }}
                  aria-label="Upload logo image"
                >
                  <DropletIcon />
                  <span className="text-xs font-bold text-white">
                    Drop or tap
                  </span>
                  {logoUploading && <UploadingVeil />}
                </button>
              )}

              <div className="flex-1 min-w-0">
                <p
                  className="text-xs leading-relaxed mb-3"
                  style={{ color: "rgba(245,245,245,0.4)" }}
                >
                  The circle guide shows how your logo gets cropped in some
                  places. Keep the mark centered.
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <ActionButton
                    variant="secondary"
                    onClick={openPicker("logo")}
                    disabled={logoUploading}
                  >
                    {logoUrl ? "Replace" : "Choose file"}
                  </ActionButton>
                  {logoUrl && (
                    <ActionButton variant="ghost" onClick={removeImage("logo")}>
                      Remove
                    </ActionButton>
                  )}
                </div>
              </div>
            </div>

            {logoError && (
              <InlineError message={logoError} onRetry={openPicker("logo")} />
            )}

            <input
              ref={logoInputRef}
              type="file"
              accept={ACCEPT_ATTR}
              className="hidden"
              onChange={onInputChange("logo")}
              aria-hidden="true"
            />
          </div>

          {saveError && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.2)",
              }}
              role="alert"
            >
              <p className="text-xs text-red-400">{saveError}</p>
            </div>
          )}
        </div>

        {/* ── Live preview column ─────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 min-w-0">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(45,10,78,0.25)",
              border: "1px solid rgba(45,10,78,0.7)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid rgba(45,10,78,0.7)" }}
            >
              <span
                className="text-[11px] font-black tracking-widest uppercase"
                style={{
                  color: "rgba(245,245,245,0.85)",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Live preview
              </span>
              <span
                className="text-[10px]"
                style={{ color: "rgba(245,245,245,0.35)" }}
              >
                Public brand page
              </span>
            </div>

            <div className="p-4">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "#100020",
                  border: "1px solid rgba(45,10,78,0.7)",
                }}
              >
                {/* Banner slice, same 200px-tall crop the public page uses */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: PUBLIC_BANNER_ASPECT }}
                >
                  {bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={bannerUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{
                        background:
                          "radial-gradient(120% 130% at 72% 10%, rgba(204,68,255,0.55), rgba(71,15,96,0.7) 55%, rgba(16,0,32,1))",
                      }}
                    >
                      <span
                        className="text-[11px]"
                        style={{ color: "rgba(245,245,245,0.4)" }}
                      >
                        No banner yet
                      </span>
                    </div>
                  )}
                  {/* Scrim, matching the public hero */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(16,0,32,0) 30%, rgba(16,0,32,0.55) 78%, rgba(16,0,32,0.9) 100%)",
                    }}
                  />
                </div>

                {/* Overlapping logo + name block */}
                <div className="px-3">
                  <div
                    className="flex items-center justify-center rounded-2xl relative overflow-hidden"
                    style={{
                      width: 56,
                      height: 56,
                      marginTop: -23,
                      border: "3px solid #0F0018",
                      background: logoUrl
                        ? "#0F0018"
                        : "linear-gradient(135deg, #39FF14, #00F0FF)",
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 900,
                      fontSize: 19,
                      color: "#04140A",
                      boxShadow:
                        "0 0 18px rgba(57,255,20,0.4), 0 8px 24px rgba(0,0,0,0.5)",
                      zIndex: 2,
                    }}
                  >
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                </div>

                <div className="px-3 pt-2.5 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-white"
                      style={{
                        fontFamily: "Montserrat, sans-serif",
                        fontWeight: 900,
                        fontSize: 18,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {brand.name}
                    </span>
                    <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
                  </div>
                  <p
                    className="text-[11px] mt-1.5"
                    style={{ color: "rgba(245,245,245,0.35)" }}
                  >
                    Your bio and stats show here.
                  </p>
                </div>
              </div>

              <p
                className="text-[10px] text-center mt-2.5"
                style={{ color: "rgba(245,245,245,0.3)" }}
              >
                Updates as you upload. Save to publish.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky save bar ───────────────────────────────────────────── */}
      {hasChanges && (
        <div
          className="fixed inset-x-0 bottom-0 lg:left-[280px] z-[45] px-4 lg:px-8 pointer-events-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div
            className="mb-[72px] lg:mb-6 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap pointer-events-auto"
            style={{
              background: "rgba(20,10,40,0.94)",
              border: "1px solid rgba(0,240,255,0.3)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <span
              className="text-xs"
              style={{ color: "rgba(245,245,245,0.6)" }}
            >
              You have unsaved imagery changes.
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  border: "1px solid rgba(245,245,245,0.14)",
                  color: "rgba(245,245,245,0.6)",
                  fontFamily: "Montserrat, sans-serif",
                  opacity: saving ? 0.4 : 1,
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || bannerUploading || logoUploading}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#0A0A0A] transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                  opacity: saving || bannerUploading || logoUploading ? 0.4 : 1,
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {saving ? "Saving..." : "Save imagery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
