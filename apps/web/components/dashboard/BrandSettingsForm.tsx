"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ImageUpload";

interface Brand {
  id: string;
  name: string;
  bio: string | null;
  description: string | null;
  website_url: string | null;
  shop_url: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  contact_email: string | null;
  location: string | null;
  founded_year: number | null;
  restock_schedule: string | null;
  logo_url: string | null;
}

interface BrandSettingsFormProps {
  brand: Brand;
  userId: string;
}

export default function BrandSettingsForm({
  brand,
  userId,
}: BrandSettingsFormProps) {
  const [form, setForm] = useState({
    name: brand.name ?? "",
    bio: brand.bio ?? "",
    description: brand.description ?? "",
    website_url: brand.website_url ?? "",
    shop_url: brand.shop_url ?? "",
    instagram_handle: brand.instagram_handle ?? "",
    tiktok_handle: brand.tiktok_handle ?? "",
    contact_email: brand.contact_email ?? "",
    location: brand.location ?? "",
    founded_year: brand.founded_year?.toString() ?? "",
    restock_schedule: brand.restock_schedule ?? "",
  });
  const [logoUrl, setLogoUrl] = useState<string | null>(brand.logo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Brand name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("brands")
      .update({
        name: form.name.trim(),
        bio: form.bio || null,
        description: form.description || null,
        website_url: form.website_url || null,
        shop_url: form.shop_url || null,
        instagram_handle: form.instagram_handle.replace(/^@/, "") || null,
        tiktok_handle: form.tiktok_handle.replace(/^@/, "") || null,
        contact_email: form.contact_email || null,
        location: form.location || null,
        founded_year: form.founded_year ? parseInt(form.founded_year) : null,
        restock_schedule: form.restock_schedule || null,
        logo_url: logoUrl,
      })
      .eq("id", brand.id)
      .eq("owner_id", userId);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      showToast("Brand profile saved");
    }
  };

  const fields = [
    {
      key: "name",
      label: "Brand Name",
      placeholder: "Your brand name",
      type: "text",
      required: true,
    },
    {
      key: "contact_email",
      label: "Contact Email",
      placeholder: "hello@yourbrand.com",
      type: "email",
    },
    {
      key: "website_url",
      label: "Website URL",
      placeholder: "https://yourbrand.com",
      type: "url",
    },
    {
      key: "shop_url",
      label: "Shop URL",
      placeholder: "https://yourbrand.com/shop",
      type: "url",
    },
    {
      key: "instagram_handle",
      label: "Instagram Handle",
      placeholder: "@yourbrand",
      type: "text",
    },
    {
      key: "tiktok_handle",
      label: "TikTok Handle",
      placeholder: "@yourbrand",
      type: "text",
    },
    {
      key: "location",
      label: "Location",
      placeholder: "Austin, TX",
      type: "text",
    },
    {
      key: "founded_year",
      label: "Founded Year",
      placeholder: "2022",
      type: "number",
    },
    {
      key: "restock_schedule",
      label: "Restock Schedule",
      placeholder: "Every Friday 6PM EST",
      type: "text",
    },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#00F0FF]">
          Brand Settings
        </p>
        <p className="text-2xl font-bold text-white">Edit Profile</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-3">
            Brand Logo
          </label>
          <div className="w-32">
            <ImageUpload
              bucket="avatars"
              userId={userId}
              existingUrl={logoUrl}
              onUploadComplete={(url: string) => setLogoUrl(url)}
              onRemove={() => setLogoUrl(null)}
              label="Upload Logo"
              aspectRatio="square"
            />
          </div>
        </div>

        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
              {field.label}{" "}
              {field.required && <span className="text-[#FF00E5]">*</span>}
            </label>
            <input
              type={field.type}
              value={(form as any)[field.key]}
              onChange={(e) =>
                setForm({ ...form, [field.key]: e.target.value })
              }
              placeholder={field.placeholder}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#39FF14]/40"
              style={{
                background: "rgba(45,10,78,0.4)",
                border: "1px solid rgba(45,10,78,0.9)",
              }}
            />
          </div>
        ))}

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
            Bio{" "}
            <span
              style={{
                color: "rgba(245,245,245,0.3)",
                fontWeight: 400,
                textTransform: "none",
                letterSpacing: 0,
                fontSize: 11,
              }}
            >
              (max 280 chars)
            </span>
          </label>
          <textarea
            value={form.bio}
            onChange={(e) =>
              setForm({ ...form, bio: e.target.value.slice(0, 280) })
            }
            rows={3}
            placeholder="A quick intro to your brand..."
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
            style={{
              background: "rgba(45,10,78,0.4)",
              border: "1px solid rgba(45,10,78,0.9)",
            }}
          />
          <p className="text-xs text-[#6B5A7E] mt-1 text-right">
            {form.bio.length}/280
          </p>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-[#6B5A7E] block mb-1.5">
            Full Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
            placeholder="Tell the community your story, your process, what makes your slimes special..."
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
            style={{
              background: "rgba(45,10,78,0.4)",
              border: "1px solid rgba(45,10,78,0.9)",
            }}
          />
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: "rgba(255,68,68,0.1)",
              border: "1px solid rgba(255,68,68,0.2)",
            }}
          >
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-xl font-bold text-[#0A0A0A] disabled:opacity-50 transition-opacity"
          style={{ background: "linear-gradient(135deg, #39FF14, #00F0FF)" }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

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
