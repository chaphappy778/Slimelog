// apps/web/components/dashboard/BrandSettingsForm.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ValidationError, optionalHttpUrl } from "@/lib/api-validation";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

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

// T137 Batch 5 (2026-07-23): the banner + logo upload flow (compressImage,
// generateFilePath, the storage upload handlers and the hero) moved to
// components/dashboard/BrandImageryEditor.tsx. This form no longer reads or
// writes brands.logo_url / brands.banner_url. Do not add them back to the
// update payload below: this component holds the values from its server
// render, so saving them here would clobber whatever the imagery editor
// wrote after that render.

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
  });

  // hasChanges uses JSON.stringify — all new fields covered automatically
  const hasChanges =
    JSON.stringify(form) !== JSON.stringify(original.current.form);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const toggleRow = useCallback((key: string) => {
    setOpenRow((prev) => (prev === key ? null : key));
  }, []);

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
    // constraint-violation string. website_url + shop_url may be any
    // external http(s). logo_url + banner_url are validated in
    // BrandImageryEditor, which owns them now.
    let websiteUrl: string | null;
    let shopUrl: string | null;
    try {
      websiteUrl = optionalHttpUrl(form.website_url, "Website URL");
      shopUrl = optionalHttpUrl(form.shop_url, "Shop URL");
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
      })
      .eq("id", brand.id)
      .eq("owner_id", userId);

    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      original.current = {
        form: { ...form },
      };
      showToast("Brand profile saved");
    }
  };

  // Subscription badge logic
  const tier = brand.verification_tier ?? "";
  const isPro = tier === "verified" || tier === "partner";

  return (
    // [Change 1] Removed max-w-xl — dashboard layout constrains width on desktop
    <div className="w-full overflow-hidden">
      {/* T137 Batch 5: the banner + logo hero moved to BrandImageryEditor,
          which the settings page renders above this form. The page header
          moved to the page shell so both sections sit under one heading. */}
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
