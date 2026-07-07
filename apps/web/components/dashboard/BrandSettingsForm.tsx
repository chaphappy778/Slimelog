// apps/web/components/dashboard/BrandSettingsForm.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import {
  ValidationError,
  optionalHttpUrl,
  optionalSupabaseUrl,
} from "@/lib/api-validation";

// Module-level createBrowserClient — not inside component
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// [Change 3] Local prop interface — Brand is not exported from @/lib/types
// Added youtube_handle, pinterest_handle, twitter_handle
interface BrandProps {
  id: string;
  name: string;
  bio: string | null;
  description: string | null;
  website_url: string | null;
  shop_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  youtube_handle: string | null;
  pinterest_handle: string | null;
  twitter_handle: string | null;
  contact_email: string | null;
  location: string | null;
  founded_year: number | null;
  restock_schedule: string | null;
  logo_url: string | null;
  banner_url: string | null;
  slug: string;
  verification_tier: string | null;
}

interface BrandSettingsFormProps {
  brand: BrandProps;
  userId: string;
}

// compressImage helper — canvas → WebP at 0.85 quality
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

// generateFilePath helper
function generateFilePath(userId: string, prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `brands/${userId}/${prefix}-${Date.now()}-${random}.webp`;
}

// RowDivider component
function RowDivider() {
  return (
    <div
      style={{ height: 1, background: "rgba(45,10,78,0.7)" }}
      aria-hidden="true"
    />
  );
}

// EditRow component — label, value display, expandable inline input
interface EditRowProps {
  label: string;
  value: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function EditRow({ label, value, expanded, onToggle, children }: EditRowProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left overflow-hidden"
        style={{ background: "transparent" }}
      >
        <div className="flex flex-col gap-0.5 min-w-0 pr-4 overflow-hidden">
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: "rgba(245,245,245,0.35)" }}
          >
            {label}
          </span>
          <span
            className="text-sm truncate block"
            style={{
              color: value ? "rgba(245,245,245,0.85)" : "rgba(245,245,245,0.3)",
            }}
          >
            {value || "Not set"}
          </span>
        </div>
        {/* Chevron SVG */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            color: "rgba(245,245,245,0.3)",
          }}
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {expanded && (
        <div
          className="px-4 pb-4"
          style={{ borderTop: "1px solid rgba(45,10,78,0.7)" }}
        >
          <div className="pt-3">{children}</div>
        </div>
      )}
    </div>
  );
}

// Input style helper
const inputStyle: React.CSSProperties = {
  background: "rgba(45,10,78,0.4)",
  border: "1px solid rgba(45,10,78,0.9)",
};

// [Change 2] Shared card style helper
const cardStyle: React.CSSProperties = {
  background: "rgba(45,10,78,0.25)",
  border: "1px solid rgba(45,10,78,0.7)",
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

export default function BrandSettingsForm({
  brand,
  userId,
}: BrandSettingsFormProps) {
  // [Change 3] Added youtube_handle, pinterest_handle, twitter_handle to form state
  const [form, setForm] = useState({
    name: brand.name ?? "",
    bio: brand.bio ?? "",
    description: brand.description ?? "",
    website_url: brand.website_url ?? "",
    shop_url: brand.shop_url ?? "",
    instagram_handle: brand.instagram_handle ?? "",
    tiktok_handle: brand.tiktok_handle ?? "",
    youtube_handle: brand.youtube_handle ?? "",
    pinterest_handle: brand.pinterest_handle ?? "",
    twitter_handle: brand.twitter_handle ?? "",
    contact_email: brand.contact_email ?? "",
    location: brand.location ?? "",
    founded_year: brand.founded_year?.toString() ?? "",
    restock_schedule: brand.restock_schedule ?? "",
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logo_url ?? null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    brand.banner_url ?? null,
  );

  const [bannerUploading, setBannerUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  // [Change 3] Added youtube_handle, pinterest_handle, twitter_handle to original ref
  const original = useRef({
    form: {
      name: brand.name ?? "",
      bio: brand.bio ?? "",
      description: brand.description ?? "",
      website_url: brand.website_url ?? "",
      shop_url: brand.shop_url ?? "",
      instagram_handle: brand.instagram_handle ?? "",
      tiktok_handle: brand.tiktok_handle ?? "",
      youtube_handle: brand.youtube_handle ?? "",
      pinterest_handle: brand.pinterest_handle ?? "",
      twitter_handle: brand.twitter_handle ?? "",
      contact_email: brand.contact_email ?? "",
      location: brand.location ?? "",
      founded_year: brand.founded_year?.toString() ?? "",
      restock_schedule: brand.restock_schedule ?? "",
    },
    logoUrl: brand.logo_url ?? null,
    bannerUrl: brand.banner_url ?? null,
  });

  // hasChanges uses JSON.stringify — all new fields covered automatically
  const hasChanges =
    JSON.stringify(form) !== JSON.stringify(original.current.form) ||
    logoUrl !== original.current.logoUrl ||
    bannerUrl !== original.current.bannerUrl;

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleRow = useCallback((key: string) => {
    setOpenRow((prev) => (prev === key ? null : key));
  }, []);

  // Banner upload handler
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    try {
      const blob = await compressImage(file, 1600);
      const path = generateFilePath(userId, "banner");
      const { error: uploadError } = await supabase.storage
        .from("slime-photos")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("slime-photos")
        .getPublicUrl(path);
      setBannerUrl(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Banner upload failed");
    } finally {
      setBannerUploading(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const blob = await compressImage(file, 400);
      const path = generateFilePath(userId, "logo");
      const { error: uploadError } = await supabase.storage
        .from("slime-photos")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("slime-photos")
        .getPublicUrl(path);
      setLogoUrl(urlData.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // [Change 3] handleSave — added youtube_handle, pinterest_handle, twitter_handle to payload
  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Brand name is required.");
      return;
    }

    // Audit hp-16 (2026-07-07): validate every URL field before the
    // update lands in Postgres. The DB CHECK constraints (mig 57) are
    // the last line of defense; catching bad values here surfaces a
    // legible error to the brand owner instead of a raw Postgres
    // constraint-violation string. logo_url + banner_url must live on
    // our Supabase Storage (uploaded via handleLogoUpload / bannerUrl
    // upload); website_url + shop_url may be any external http(s).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let websiteUrl: string | null;
    let shopUrl: string | null;
    let checkedLogoUrl: string | null;
    let checkedBannerUrl: string | null;
    try {
      websiteUrl = optionalHttpUrl(form.website_url, "Website URL");
      shopUrl = optionalHttpUrl(form.shop_url, "Shop URL");
      checkedLogoUrl = optionalSupabaseUrl(logoUrl, "Logo", supabaseUrl);
      checkedBannerUrl = optionalSupabaseUrl(bannerUrl, "Banner", supabaseUrl);
    } catch (validationErr) {
      if (validationErr instanceof ValidationError) {
        setError(validationErr.message);
        return;
      }
      throw validationErr;
    }

    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("brands")
      .update({
        name: form.name.trim(),
        bio: form.bio || null,
        description: form.description || null,
        website_url: websiteUrl,
        shop_url: shopUrl,
        instagram_handle: form.instagram_handle.replace(/^@/, "") || null,
        tiktok_handle: form.tiktok_handle.replace(/^@/, "") || null,
        youtube_handle: form.youtube_handle.replace(/^@/, "") || null,
        pinterest_handle: form.pinterest_handle.replace(/^@/, "") || null,
        twitter_handle: form.twitter_handle.replace(/^@/, "") || null,
        contact_email: form.contact_email || null,
        location: form.location || null,
        founded_year: form.founded_year
          ? parseInt(form.founded_year, 10)
          : null,
        restock_schedule: form.restock_schedule || null,
        logo_url: checkedLogoUrl,
        banner_url: checkedBannerUrl,
      })
      .eq("id", brand.id)
      .eq("owner_id", userId);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      original.current = {
        form: { ...form },
        logoUrl,
        bannerUrl,
      };
      showToast("Brand profile saved");
    }
  };

  // Subscription badge logic
  const tier = brand.verification_tier ?? "";
  const isPro = tier === "verified" || tier === "partner";

  return (
    // [Change 1] Removed max-w-xl — dashboard layout constrains width on desktop
    <div className="pb-20 w-full overflow-hidden">
      {/* Page header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <Link
          href={`/brand-dashboard/${brand.slug}`}
          className="flex items-center justify-center rounded-lg"
          style={{ color: "rgba(245,245,245,0.5)" }}
          aria-label="Back to dashboard"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12.5 15l-5-5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <h1
            className="text-xl font-bold leading-tight"
            style={{ color: "#00F0FF", fontFamily: "Montserrat, sans-serif" }}
          >
            Brand Profile
          </h1>
          <p
            className="text-xs mt-0.5"
            style={{ color: "rgba(245,245,245,0.4)" }}
          >
            Manage your brand&apos;s public presence
          </p>
        </div>
      </div>

      {/* Brand hero */}
      <div className="relative mb-10">
        {/* Banner */}
        <button
          type="button"
          onClick={() => bannerInputRef.current?.click()}
          disabled={bannerUploading}
          className="relative w-full overflow-hidden block"
          style={{ height: 120, background: "rgba(45,10,78,0.5)" }}
          aria-label="Upload banner image"
        >
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt="Brand banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: "rgba(45,10,78,0.35)" }}
            >
              <span
                className="text-xs"
                style={{ color: "rgba(245,245,245,0.3)" }}
              >
                No banner
              </span>
            </div>
          )}
          {/* Camera overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(10,10,10,0.35)" }}
          >
            {bannerUploading ? (
              <svg
                className="animate-spin"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                  stroke="rgba(245,245,245,0.7)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="4"
                  stroke="rgba(245,245,245,0.7)"
                  strokeWidth="1.5"
                />
              </svg>
            )}
          </div>
        </button>

        {/* Hidden banner file input */}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleBannerUpload}
          aria-hidden="true"
        />

        {/* Logo circle overlapping banner */}
        <div className="absolute -bottom-8 left-4">
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            className="relative rounded-full overflow-hidden flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              background: "rgba(45,10,78,0.8)",
              border: "2px solid rgba(45,10,78,0.9)",
              boxShadow: "0 0 0 2px #0A0A0A",
            }}
            aria-label="Upload logo image"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Brand logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                  stroke="rgba(245,245,245,0.4)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="4"
                  stroke="rgba(245,245,245,0.4)"
                  strokeWidth="1.5"
                />
              </svg>
            )}
            {/* Camera badge */}
            <div
              className="absolute inset-0 flex items-center justify-center rounded-full"
              style={{ background: "rgba(10,10,10,0.45)" }}
            >
              {logoUploading ? (
                <svg
                  className="animate-spin"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
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
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
                    stroke="rgba(245,245,245,0.8)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="13"
                    r="4"
                    stroke="rgba(245,245,245,0.8)"
                    strokeWidth="1.5"
                  />
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* Hidden logo file input */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleLogoUpload}
          aria-hidden="true"
        />
      </div>

      {/* Brand name below hero */}
      <div className="px-4 mb-6">
        <p
          className="text-base font-bold text-white"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          {brand.name}
        </p>
      </div>

      {/* [Change 2] BRAND IDENTITY — section label outside card */}
      <p
        className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
        style={{ color: "#00F0FF" }}
      >
        Brand Identity
      </p>
      <div className="rounded-2xl overflow-hidden mb-4" style={cardStyle}>
        <EditRow
          label="Brand Name"
          value={form.name}
          expanded={openRow === "name"}
          onToggle={() => toggleRow("name")}
        >
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your brand name"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>

        <RowDivider />

        <EditRow
          label="Bio"
          value={form.bio}
          expanded={openRow === "bio"}
          onToggle={() => toggleRow("bio")}
        >
          <textarea
            value={form.bio}
            onChange={(e) =>
              setForm({ ...form, bio: e.target.value.slice(0, 280) })
            }
            rows={3}
            placeholder="A quick intro to your brand..."
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
          <p
            className="text-xs mt-1 text-right"
            style={{ color: "rgba(245,245,245,0.3)" }}
          >
            {form.bio.length}/280
          </p>
        </EditRow>

        <RowDivider />

        <EditRow
          label="Full Description"
          value={form.description}
          expanded={openRow === "description"}
          onToggle={() => toggleRow("description")}
        >
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Tell the community your story..."
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>
      </div>

      {/* [Change 2] CONTACT & LINKS — section label outside card */}
      <p
        className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
        style={{ color: "#00F0FF" }}
      >
        Contact &amp; Links
      </p>
      <div className="rounded-2xl overflow-hidden mb-4" style={cardStyle}>
        <EditRow
          label="Contact Email"
          value={form.contact_email}
          expanded={openRow === "contact_email"}
          onToggle={() => toggleRow("contact_email")}
        >
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) =>
              setForm({ ...form, contact_email: e.target.value })
            }
            placeholder="hello@yourbrand.com"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>

        <RowDivider />

        <EditRow
          label="Website URL"
          value={form.website_url}
          expanded={openRow === "website_url"}
          onToggle={() => toggleRow("website_url")}
        >
          <input
            type="url"
            value={form.website_url}
            onChange={(e) => setForm({ ...form, website_url: e.target.value })}
            placeholder="https://yourbrand.com"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>

        <RowDivider />

        <EditRow
          label="Shop URL"
          value={form.shop_url}
          expanded={openRow === "shop_url"}
          onToggle={() => toggleRow("shop_url")}
        >
          <input
            type="url"
            value={form.shop_url}
            onChange={(e) => setForm({ ...form, shop_url: e.target.value })}
            placeholder="https://yourbrand.com/shop"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>

        <RowDivider />

        <EditRow
          label="Location"
          value={form.location}
          expanded={openRow === "location"}
          onToggle={() => toggleRow("location")}
        >
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Austin, TX"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>

        <RowDivider />

        <EditRow
          label="Founded Year"
          value={form.founded_year}
          expanded={openRow === "founded_year"}
          onToggle={() => toggleRow("founded_year")}
        >
          <input
            type="number"
            value={form.founded_year}
            onChange={(e) => setForm({ ...form, founded_year: e.target.value })}
            placeholder="2022"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>

        <RowDivider />

        <EditRow
          label="Restock Schedule"
          value={form.restock_schedule}
          expanded={openRow === "restock_schedule"}
          onToggle={() => toggleRow("restock_schedule")}
        >
          <input
            type="text"
            value={form.restock_schedule}
            onChange={(e) =>
              setForm({ ...form, restock_schedule: e.target.value })
            }
            placeholder="Every Friday 6PM EST"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
        </EditRow>
      </div>

      {/* [Change 2] SOCIAL — section label outside card */}
      {/* [Change 3] Added YouTube, Pinterest, Twitter/X rows */}
      <p
        className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
        style={{ color: "#00F0FF" }}
      >
        Social
      </p>
      <div className="rounded-2xl overflow-hidden mb-4" style={cardStyle}>
        <EditRow
          label="Instagram Handle"
          value={form.instagram_handle ? `@${form.instagram_handle}` : ""}
          expanded={openRow === "instagram_handle"}
          onToggle={() => toggleRow("instagram_handle")}
        >
          <input
            type="text"
            value={form.instagram_handle}
            onChange={(e) =>
              setForm({
                ...form,
                instagram_handle: e.target.value.replace(/^@/, ""),
              })
            }
            placeholder="yourbrand"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(245,245,245,0.3)" }}
          >
            Enter without the @ symbol
          </p>
        </EditRow>

        <RowDivider />

        <EditRow
          label="TikTok Handle"
          value={form.tiktok_handle ? `@${form.tiktok_handle}` : ""}
          expanded={openRow === "tiktok_handle"}
          onToggle={() => toggleRow("tiktok_handle")}
        >
          <input
            type="text"
            value={form.tiktok_handle}
            onChange={(e) =>
              setForm({
                ...form,
                tiktok_handle: e.target.value.replace(/^@/, ""),
              })
            }
            placeholder="yourbrand"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
          <p
            className="text-xs mt-1"
            style={{ color: "rgba(245,245,245,0.3)" }}
          >
            Enter without the @ symbol
          </p>
        </EditRow>

        <RowDivider />

        <EditRow
          label="YouTube Handle"
          value={form.youtube_handle ? `@${form.youtube_handle}` : ""}
          expanded={openRow === "youtube_handle"}
          onToggle={() => toggleRow("youtube_handle")}
        >
          <input
            type="text"
            value={form.youtube_handle}
            onChange={(e) =>
              setForm({
                ...form,
                youtube_handle: e.target.value.replace(/^@/, ""),
              })
            }
            placeholder="yourchannel"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
          {form.youtube_handle && (
            <p
              className="text-xs mt-1"
              style={{ color: "rgba(245,245,245,0.3)" }}
            >
              Links to youtube.com/@{form.youtube_handle}
            </p>
          )}
        </EditRow>

        <RowDivider />

        <EditRow
          label="Pinterest Handle"
          value={form.pinterest_handle ? `@${form.pinterest_handle}` : ""}
          expanded={openRow === "pinterest_handle"}
          onToggle={() => toggleRow("pinterest_handle")}
        >
          <input
            type="text"
            value={form.pinterest_handle}
            onChange={(e) =>
              setForm({
                ...form,
                pinterest_handle: e.target.value.replace(/^@/, ""),
              })
            }
            placeholder="yourprofile"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
          {form.pinterest_handle && (
            <p
              className="text-xs mt-1"
              style={{ color: "rgba(245,245,245,0.3)" }}
            >
              Links to pinterest.com/{form.pinterest_handle}
            </p>
          )}
        </EditRow>

        <RowDivider />

        <EditRow
          label="Twitter / X Handle"
          value={form.twitter_handle ? `@${form.twitter_handle}` : ""}
          expanded={openRow === "twitter_handle"}
          onToggle={() => toggleRow("twitter_handle")}
        >
          <input
            type="text"
            value={form.twitter_handle}
            onChange={(e) =>
              setForm({
                ...form,
                twitter_handle: e.target.value.replace(/^@/, ""),
              })
            }
            placeholder="yourhandle"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
            style={inputStyle}
          />
          {form.twitter_handle && (
            <p
              className="text-xs mt-1"
              style={{ color: "rgba(245,245,245,0.3)" }}
            >
              Links to x.com/{form.twitter_handle}
            </p>
          )}
        </EditRow>
      </div>

      {/* [Change 2] SUBSCRIPTION — section label outside card */}
      <p
        className="text-[11px] font-black tracking-widest uppercase mb-2 px-1"
        style={{ color: "#00F0FF" }}
      >
        Subscription
      </p>
      <div className="rounded-2xl overflow-hidden mb-6" style={cardStyle}>
        <Link
          href={`/brand-dashboard/${brand.slug}/subscription`}
          className="flex items-center justify-between px-4 py-3.5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isPro ? (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(57,255,20,0.15)",
                    color: "#39FF14",
                    border: "1px solid rgba(57,255,20,0.3)",
                  }}
                >
                  BRAND PRO
                </span>
              ) : (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(245,245,245,0.08)",
                    color: "rgba(245,245,245,0.4)",
                    border: "1px solid rgba(245,245,245,0.1)",
                  }}
                >
                  FREE
                </span>
              )}
            </div>
            <span
              className="text-xs"
              style={{ color: "rgba(245,245,245,0.4)" }}
            >
              {isPro ? "Active" : "Upgrade for analytics & more"}
            </span>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ color: "rgba(245,245,245,0.3)", flexShrink: 0 }}
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 mb-4 mx-0"
          style={{
            background: "rgba(255,68,68,0.1)",
            border: "1px solid rgba(255,68,68,0.2)",
          }}
        >
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Save Profile CTA */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="w-full py-3.5 rounded-xl font-bold text-[#0A0A0A] transition-opacity"
        style={{
          background: "linear-gradient(135deg, #39FF14, #00F0FF)",
          opacity: saving || !hasChanges ? 0.4 : 1,
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {saving ? "Saving..." : "Save Profile"}
      </button>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold text-[#0A0A0A] shadow-lg"
          style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
