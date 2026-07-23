// apps/web/components/dashboard/BrandSettingsForm.tsx
//
// T137 Batch 6a (2026-07-23): visual rebuild against the "Brand Settings
// Redesign" mockup. The state shape, the dirty check, the URL validation and
// the `.update()` payload are carried over unchanged from Batch 5. Only the
// JSX and the toast plumbing changed.
//
// ── Clobber guard (docs/error-tracker.md 2026-07-23) ─────────────────────────
// BrandImageryEditor owns the two brand imagery columns (the logo and banner
// URLs). This component owns every OTHER column on the row, and the regression
// check for this file is that neither of those two column names appears in it
// at all. The two payloads must stay disjoint: if
// this form ever writes the imagery columns it will write the stale copy it
// captured at its own server render and silently undo whatever the imagery
// editor saved. The two banner/logo values this file needs for the live
// preview arrive on a separate `preview` prop, are never copied into `form`
// state, and are never part of the update payload.
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ValidationError, optionalHttpUrl } from "@/lib/api-validation";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

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
  slug: string;
  verification_tier: string | null;
}

/**
 * Read-only imagery for the live preview hero. Deliberately a separate prop
 * with different key names so these values can never be spread into `form`
 * or into the update payload. See the clobber guard at the top of the file.
 */
interface PreviewImagery {
  bannerSrc: string | null;
  logoSrc: string | null;
}

interface BrandSettingsFormProps {
  brand: BrandProps;
  userId: string;
  preview: PreviewImagery;
}

type FormState = {
  name: string;
  bio: string;
  description: string;
  website_url: string;
  shop_url: string;
  instagram_handle: string;
  tiktok_handle: string;
  youtube_handle: string;
  pinterest_handle: string;
  twitter_handle: string;
  contact_email: string;
  location: string;
  founded_year: string;
  restock_schedule: string;
};

type FormKey = keyof FormState;

// ─── Palette + shared style objects ───────────────────────────────────────────

const CYAN = "#00F0FF";
const MAGENTA = "#FF00E5";
const GREEN = "#39FF14";

const TEXT_STRONG = "rgba(245,245,245,0.9)";
const TEXT_MUTED = "rgba(245,245,245,0.45)";
const TEXT_FAINT = "rgba(245,245,245,0.3)";
const HAIRLINE = "1px solid rgba(45,10,78,0.7)";

const cardStyle: React.CSSProperties = {
  background: "rgba(45,10,78,0.25)",
  border: HAIRLINE,
  boxShadow: "inset 0 0 16px rgba(45,10,78,0.1)",
};

const inputStyle: React.CSSProperties = {
  background: "rgba(45,10,78,0.4)",
  border: "1px solid rgba(45,10,78,0.9)",
  fontFamily: "system-ui, sans-serif",
};

// The public brand page renders the banner 200px tall in a 440px column, so
// the visible slice is roughly 2.2:1. Same constant the imagery editor uses.
const PUBLIC_BANNER_ASPECT = "440 / 200";

// Batch 6b wires this to a real column. Rendered disabled until then.
const FOLLOWER_TIERS = [
  "0 to 1k",
  "1k to 10k",
  "10k to 50k",
  "50k to 250k",
  "250k to 1M",
  "1M+",
];

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s",
        color: TEXT_FAINT,
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
  );
}

function PinIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CalendarIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PlusIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function TeamIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.4" />
      <path d="M17.5 14c2.5 0 4.5 2 4.5 4.5" />
    </svg>
  );
}

function StarIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 19.3 7.2 16.7l.9-5.4L4.2 7.7l5.4-.8z" />
    </svg>
  );
}

function LinkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12.2 19" />
    </svg>
  );
}

function BagIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M6 7h12l1.2 13H4.8z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

// ─── Verification tier pill ───────────────────────────────────────────────────

type PillTone = "muted" | "cyan" | "green";

const PILL_TONES: Record<PillTone, { color: string; bg: string; bd: string }> = {
  muted: {
    color: TEXT_MUTED,
    bg: "rgba(245,245,245,0.06)",
    bd: "rgba(245,245,245,0.14)",
  },
  cyan: { color: CYAN, bg: "rgba(0,240,255,0.1)", bd: "rgba(0,240,255,0.35)" },
  green: { color: GREEN, bg: "rgba(57,255,20,0.1)", bd: "rgba(57,255,20,0.35)" },
};

/** Mirrors DashboardLayout + BrandImageryEditor so the badge reads the same everywhere. */
function tierPill(tier: string | null | undefined): {
  label: string;
  tone: PillTone;
  starred: boolean;
} {
  const t = (tier ?? "community").toLowerCase();
  if (t === "verified" || t === "partner")
    return { label: t.toUpperCase(), tone: "green", starred: true };
  if (t === "claimed")
    return { label: "CLAIMED", tone: "cyan", starred: false };
  return { label: t.toUpperCase(), tone: "muted", starred: false };
}

function TierPill({
  tone,
  starred,
  children,
  size = "md",
}: {
  tone: PillTone;
  starred?: boolean;
  children: string;
  size?: "sm" | "md";
}) {
  const t = PILL_TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full whitespace-nowrap ${
        size === "sm" ? "text-[9px] px-2 py-0.5" : "text-[10px] px-2.5 py-1"
      }`}
      style={{ color: t.color, background: t.bg, border: `1px solid ${t.bd}` }}
    >
      {starred && <StarIcon size={size === "sm" ? 9 : 11} />}
      {children}
    </span>
  );
}

// ─── Section chrome ───────────────────────────────────────────────────────────

function SectionLabel({
  children,
  meta,
}: {
  children: React.ReactNode;
  meta?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3 px-1">
      <p
        className="text-[11px] font-black tracking-[0.16em] uppercase"
        style={{ color: CYAN, fontFamily: "Montserrat, sans-serif" }}
      >
        {children}
      </p>
      {meta && (
        <span className="text-[11px]" style={{ color: TEXT_FAINT }}>
          {meta}
        </span>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
      style={{ color: TEXT_MUTED }}
    >
      {children}
    </span>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] mt-2 leading-relaxed" style={{ color: TEXT_FAINT }}>
      {children}
    </p>
  );
}

function ComingSoonNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] mt-2 inline-flex items-center gap-1.5"
      style={{ color: "rgba(201,182,255,0.65)" }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 5, height: 5, background: "rgba(201,182,255,0.65)" }}
        aria-hidden="true"
      />
      {children}
    </p>
  );
}

/**
 * Read row with an Edit / Add pill that expands into an inline editor.
 * Nothing here writes to the database. The sticky bar at the bottom owns
 * the save, so the inner buttons are Done (collapse) and Cancel (revert
 * this one field and collapse).
 */
function FieldRow({
  label,
  value,
  placeholder = "Not set",
  expanded,
  onToggle,
  onCancel,
  divider = true,
  leading,
  children,
}: {
  label: string;
  value: string;
  placeholder?: string;
  expanded: boolean;
  onToggle: () => void;
  onCancel: () => void;
  divider?: boolean;
  leading?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isSet = value.trim().length > 0;
  return (
    <div style={divider ? { borderBottom: HAIRLINE } : undefined}>
      {expanded ? (
        <div
          className="px-4 py-4 sm:px-5"
          style={{
            background: "rgba(0,240,255,0.04)",
            borderLeft: `2px solid ${CYAN}`,
          }}
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: CYAN }}
            >
              {label}
            </span>
            <ChevronDown open />
          </div>
          {children}
          <div className="flex gap-2.5 mt-3">
            <button
              type="button"
              onClick={onToggle}
              className="rounded-xl px-4 py-2 text-xs font-bold"
              style={{
                background: "rgba(0,240,255,0.1)",
                border: `1px solid ${CYAN}55`,
                color: CYAN,
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Done
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-xs font-bold"
              style={{
                background: "transparent",
                border: "1px solid rgba(245,245,245,0.14)",
                color: TEXT_MUTED,
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4 text-left"
        >
          <span className="flex items-center gap-3 min-w-0 flex-1">
            {leading}
            <span className="flex flex-col min-w-0">
              <FieldLabel>{label}</FieldLabel>
              <span
                className="text-sm truncate"
                style={{ color: isSet ? TEXT_STRONG : TEXT_FAINT }}
              >
                {isSet ? value : placeholder}
              </span>
            </span>
          </span>
          <span
            className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold"
            style={
              isSet
                ? {
                    color: CYAN,
                    background: "rgba(0,240,255,0.08)",
                    border: "1px solid rgba(0,240,255,0.28)",
                  }
                : {
                    color: MAGENTA,
                    background: "rgba(255,0,229,0.08)",
                    border: "1px solid rgba(255,0,229,0.3)",
                  }
            }
          >
            {isSet ? "Edit" : "Add"}
          </span>
        </button>
      )}
    </div>
  );
}

/** Social platform badge. Two or three letters, no emoji, no imagery. */
function SocialBadge({ code, bg }: { code: string; bg: string }) {
  return (
    <span
      className="grid place-items-center rounded-[9px] flex-shrink-0 font-extrabold text-white"
      style={{ width: 30, height: 30, background: bg, fontSize: 11 }}
      aria-hidden="true"
    >
      {code}
    </span>
  );
}

const SOCIALS: Array<{
  key: FormKey;
  label: string;
  code: string;
  bg: string;
  placeholder: string;
  hint: (v: string) => string | null;
}> = [
  {
    key: "instagram_handle",
    label: "Instagram",
    code: "IG",
    bg: "linear-gradient(135deg,#feda75,#d62976,#4f5bd5)",
    placeholder: "yourbrand",
    hint: (v) => (v ? `Links to instagram.com/${v}` : "Enter it without the @"),
  },
  {
    key: "tiktok_handle",
    label: "TikTok",
    code: "TT",
    bg: "#000000",
    placeholder: "yourbrand",
    hint: (v) => (v ? `Links to tiktok.com/@${v}` : "Enter it without the @"),
  },
  {
    key: "youtube_handle",
    label: "YouTube",
    code: "YT",
    bg: "#FF0033",
    placeholder: "yourchannel",
    hint: (v) => (v ? `Links to youtube.com/@${v}` : "Enter it without the @"),
  },
  {
    key: "pinterest_handle",
    label: "Pinterest",
    code: "Pin",
    bg: "#E60023",
    placeholder: "yourprofile",
    hint: (v) => (v ? `Links to pinterest.com/${v}` : "Enter it without the @"),
  },
  {
    key: "twitter_handle",
    label: "Twitter / X",
    code: "X",
    bg: "#111111",
    placeholder: "yourhandle",
    hint: (v) => (v ? `Links to x.com/${v}` : "Enter it without the @"),
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BrandSettingsForm({
  brand,
  userId,
  preview,
}: BrandSettingsFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<FormState>({
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
  const [error, setError] = useState<string | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

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
    } as FormState,
  });

  // hasChanges uses JSON.stringify, so every key in FormState is covered.
  const hasChanges =
    JSON.stringify(form) !== JSON.stringify(original.current.form);

  const toggleRow = useCallback((key: string) => {
    setOpenRow((prev) => (prev === key ? null : key));
  }, []);

  const setField = useCallback((key: FormKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  /** Cancel on a row reverts just that field, then collapses it. */
  const cancelRow = useCallback((key: FormKey) => {
    setForm((prev) => ({ ...prev, [key]: original.current.form[key] }));
    setOpenRow(null);
  }, []);

  const handleDiscard = useCallback(() => {
    setForm({ ...original.current.form });
    setOpenRow(null);
    setError(null);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Brand name is required.");
      return;
    }

    // Audit hp-16 (2026-07-07): validate every URL field before the update
    // lands in Postgres. The DB CHECK constraints (mig 57) are the last line
    // of defense; catching bad values here surfaces a legible error to the
    // brand owner instead of a raw constraint-violation string. Imagery URLs
    // are validated in BrandImageryEditor, which owns them now.
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
      console.error("[BrandSettingsForm] save failed", err);
      setError(err.message);
      showToast("Could not save your profile", "error");
      return;
    }
    original.current = { form: { ...form } };
    setOpenRow(null);
    showToast("Profile saved. Live on your brand page.", "success");
    // Refresh so the dashboard rail and the public page pick up a name change.
    router.refresh();
  };

  const tier = brand.verification_tier ?? "";
  const isPro = tier === "verified" || tier === "partner";
  const pill = tierPill(brand.verification_tier);
  const initials = (form.name || brand.name).slice(0, 2).toUpperCase();

  const activeSocials = useMemo(
    () => SOCIALS.filter((s) => form[s.key].trim().length > 0),
    [form],
  );

  const inputClass =
    "w-full rounded-xl px-4 py-3 text-sm text-white outline-none focus:ring-1 focus:ring-[#00F0FF]/50";

  // ── Live preview ───────────────────────────────────────────────────────────
  const livePreview = (
    <div className="rounded-2xl overflow-hidden" style={cardStyle}>
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: HAIRLINE }}
      >
        <span
          className="text-[11px] font-black tracking-[0.16em] uppercase"
          style={{ color: CYAN, fontFamily: "Montserrat, sans-serif" }}
        >
          Live preview
        </span>
        <span className="text-[10px]" style={{ color: TEXT_FAINT }}>
          Public brand page
        </span>
      </div>

      <div className="p-4">
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#100020", border: HAIRLINE }}
        >
          {/* Banner slice, same crop the public hero uses */}
          <div
            className="relative w-full"
            style={{ aspectRatio: PUBLIC_BANNER_ASPECT }}
          >
            {preview.bannerSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.bannerSrc}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0"
                aria-hidden="true"
                style={{
                  background:
                    "radial-gradient(120% 130% at 72% 10%, rgba(204,68,255,0.55), rgba(71,15,96,0.7) 55%, rgba(16,0,32,1))",
                }}
              />
            )}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(16,0,32,0) 30%, rgba(16,0,32,0.55) 78%, rgba(16,0,32,0.9) 100%)",
              }}
            />
          </div>

          {/* Overlapping logo */}
          <div className="px-3">
            <div
              className="flex items-center justify-center rounded-2xl relative overflow-hidden"
              style={{
                width: 56,
                height: 56,
                marginTop: -23,
                border: "3px solid #0F0018",
                background: preview.logoSrc
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
              {preview.logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.logoSrc}
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
                {form.name.trim() || "Your brand name"}
              </span>
              <TierPill tone={pill.tone} starred={pill.starred} size="sm">
                {pill.label}
              </TierPill>
            </div>

            {/* Meta row, mirrors the public page */}
            {(form.location.trim() || form.restock_schedule.trim()) && (
              <div
                className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px]"
                style={{ color: "rgba(245,245,245,0.55)" }}
              >
                {form.location.trim() && (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <PinIcon size={12} />
                    <span className="truncate">{form.location}</span>
                  </span>
                )}
                {form.restock_schedule.trim() && (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <CalendarIcon size={12} />
                    <span className="truncate">{form.restock_schedule}</span>
                  </span>
                )}
              </div>
            )}

            <p
              className="text-[11.5px] mt-2.5 leading-relaxed"
              style={{
                color: form.bio.trim() ? "rgba(245,245,245,0.85)" : TEXT_FAINT,
              }}
            >
              {form.bio.trim() || "Your bio shows here."}
            </p>

            {/* Link pills */}
            {(form.website_url.trim() || form.shop_url.trim()) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.website_url.trim() && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{
                      color: CYAN,
                      background: "rgba(0,240,255,0.08)",
                      border: "1px solid rgba(0,240,255,0.28)",
                    }}
                  >
                    <LinkIcon />
                    Website
                  </span>
                )}
                {form.shop_url.trim() && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                    style={{
                      color: MAGENTA,
                      background: "rgba(255,0,229,0.08)",
                      border: "1px solid rgba(255,0,229,0.3)",
                    }}
                  >
                    <BagIcon />
                    Shop
                  </span>
                )}
              </div>
            )}

            {/* Social row, only handles that are set */}
            {activeSocials.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {activeSocials.map((s) => (
                  <SocialBadge key={s.key} code={s.code} bg={s.bg} />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-center mt-2.5" style={{ color: TEXT_FAINT }}>
          Updates as you edit. Save to publish.
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* ── Form column ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-7 min-w-0">
          {/* ══ BRAND IDENTITY ══ */}
          <section>
            <SectionLabel>Brand identity</SectionLabel>
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <FieldRow
                label="Brand name"
                value={form.name}
                expanded={openRow === "name"}
                onToggle={() => toggleRow("name")}
                onCancel={() => cancelRow("name")}
              >
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Your brand name"
                  className={inputClass}
                  style={inputStyle}
                />
              </FieldRow>

              {/* Verification tier is read only. Admins move brands between tiers. */}
              <div
                className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4"
                style={{ borderBottom: HAIRLINE }}
              >
                <div className="min-w-0">
                  <FieldLabel>Verification tier</FieldLabel>
                  <TierPill tone={pill.tone} starred={pill.starred}>
                    {pill.label}
                  </TierPill>
                </div>
                <span
                  className="flex-shrink-0 text-[11px] text-right leading-snug"
                  style={{ color: TEXT_FAINT, maxWidth: 150 }}
                >
                  Managed by SlimeLog. Not editable here.
                </span>
              </div>

              <FieldRow
                label="Bio (short)"
                value={form.bio}
                expanded={openRow === "bio"}
                onToggle={() => toggleRow("bio")}
                onCancel={() => cancelRow("bio")}
              >
                <textarea
                  value={form.bio}
                  onChange={(e) =>
                    setField("bio", e.target.value.slice(0, 280))
                  }
                  rows={3}
                  placeholder="A quick intro to your brand..."
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
                <p
                  className="text-[11px] mt-1.5 text-right"
                  style={{ color: TEXT_FAINT }}
                >
                  {form.bio.length} / 280
                </p>
              </FieldRow>

              <FieldRow
                label="Full description"
                value={form.description}
                expanded={openRow === "description"}
                onToggle={() => toggleRow("description")}
                onCancel={() => cancelRow("description")}
              >
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={5}
                  placeholder="Tell the community your story..."
                  className={`${inputClass} resize-y`}
                  style={inputStyle}
                />
              </FieldRow>

              <FieldRow
                label="Founded year"
                value={form.founded_year}
                expanded={openRow === "founded_year"}
                onToggle={() => toggleRow("founded_year")}
                onCancel={() => cancelRow("founded_year")}
                divider={false}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.founded_year}
                  onChange={(e) => setField("founded_year", e.target.value)}
                  placeholder="2022"
                  className={inputClass}
                  style={inputStyle}
                />
              </FieldRow>
            </div>
          </section>

          {/* ══ CONTACT + LINKS ══ */}
          <section>
            <SectionLabel>Contact + links</SectionLabel>
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <FieldRow
                label="Contact email"
                value={form.contact_email}
                expanded={openRow === "contact_email"}
                onToggle={() => toggleRow("contact_email")}
                onCancel={() => cancelRow("contact_email")}
              >
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  placeholder="hello@yourbrand.com"
                  className={inputClass}
                  style={inputStyle}
                />
              </FieldRow>

              <FieldRow
                label="Website URL"
                value={form.website_url}
                expanded={openRow === "website_url"}
                onToggle={() => toggleRow("website_url")}
                onCancel={() => cancelRow("website_url")}
              >
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => setField("website_url", e.target.value)}
                  placeholder="https://yourbrand.com"
                  className={inputClass}
                  style={inputStyle}
                />
              </FieldRow>

              <FieldRow
                label="Shop URL"
                value={form.shop_url}
                expanded={openRow === "shop_url"}
                onToggle={() => toggleRow("shop_url")}
                onCancel={() => cancelRow("shop_url")}
                divider={false}
              >
                <input
                  type="url"
                  value={form.shop_url}
                  onChange={(e) => setField("shop_url", e.target.value)}
                  placeholder="https://yourbrand.com/shop"
                  className={inputClass}
                  style={inputStyle}
                />
              </FieldRow>
            </div>

            <p
              className="text-[10px] font-bold uppercase tracking-[0.16em] mt-5 mb-3 px-1"
              style={{ color: TEXT_FAINT }}
            >
              Social handles
            </p>
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              {SOCIALS.map((s, i) => (
                <FieldRow
                  key={s.key}
                  label={s.label}
                  value={form[s.key] ? `@${form[s.key]}` : ""}
                  expanded={openRow === s.key}
                  onToggle={() => toggleRow(s.key)}
                  onCancel={() => cancelRow(s.key)}
                  divider={i < SOCIALS.length - 1}
                  leading={<SocialBadge code={s.code} bg={s.bg} />}
                >
                  <input
                    type="text"
                    value={form[s.key]}
                    onChange={(e) =>
                      setField(s.key, e.target.value.replace(/^@/, ""))
                    }
                    placeholder={s.placeholder}
                    className={inputClass}
                    style={inputStyle}
                  />
                  <HelperText>{s.hint(form[s.key].trim())}</HelperText>
                </FieldRow>
              ))}
            </div>
          </section>

          {/* ══ LOCATION ══ */}
          {/* City, state and country have no columns on `brands` yet. They are
              rendered disabled so the shape matches the mockup without
              pretending to persist. Display location is the live one. */}
          <section>
            <SectionLabel>Location</SectionLabel>
            <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-4">
                {["City", "State / region", "Country"].map((label) => (
                  <div key={label}>
                    <FieldLabel>{label}</FieldLabel>
                    <input
                      type="text"
                      disabled
                      value=""
                      placeholder="Coming soon"
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none cursor-not-allowed"
                      style={{
                        ...inputStyle,
                        color: TEXT_FAINT,
                        opacity: 0.55,
                      }}
                    />
                  </div>
                ))}
              </div>
              <ComingSoonNote>
                Separate city, state and country fields land in a later update.
              </ComingSoonNote>

              <div className="mt-5">
                <FieldLabel>Display location</FieldLabel>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setField("location", e.target.value)}
                  placeholder="Brooklyn, NY (ships worldwide)"
                  className={inputClass}
                  style={inputStyle}
                />
                <HelperText>
                  Free text shown on your public brand page, next to a pin icon.
                </HelperText>
              </div>
            </div>
          </section>

          {/* ══ RESTOCKS + AVAILABILITY ══ */}
          <section>
            <SectionLabel>Restocks and availability</SectionLabel>
            <div
              className="rounded-2xl p-4 sm:p-5 flex flex-col gap-5"
              style={cardStyle}
            >
              <div>
                <FieldLabel>Restock schedule</FieldLabel>
                <input
                  type="text"
                  value={form.restock_schedule}
                  onChange={(e) => setField("restock_schedule", e.target.value)}
                  placeholder="Every other Friday, 6pm PST"
                  className={inputClass}
                  style={inputStyle}
                />
                <HelperText>
                  Shown on your brand page so collectors know when to check
                  back.
                </HelperText>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)] gap-5 items-start">
                {/* Batch 6b: brands has no default-tubs column yet. `drops.tubs_available`
                    is per drop. Disabled until the brand-level default ships. */}
                <div>
                  <FieldLabel>Default tubs available</FieldLabel>
                  <input
                    type="number"
                    inputMode="numeric"
                    disabled
                    value=""
                    placeholder="40"
                    className="w-full rounded-xl px-4 py-3 outline-none cursor-not-allowed"
                    style={{
                      ...inputStyle,
                      color: TEXT_FAINT,
                      opacity: 0.55,
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 800,
                      fontSize: 17,
                    }}
                  />
                  <HelperText>Prefilled when you start a new drop.</HelperText>
                  <ComingSoonNote>Coming soon</ComingSoonNote>
                </div>

                {/* Batch 6b wires this to a real column. Disabled for now. */}
                <div>
                  <FieldLabel>Instagram follower tier</FieldLabel>
                  <select
                    disabled
                    defaultValue=""
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none cursor-not-allowed appearance-none"
                    style={{
                      ...inputStyle,
                      color: TEXT_FAINT,
                      opacity: 0.55,
                    }}
                    aria-label="Instagram follower tier"
                  >
                    <option value="">Not set</option>
                    {FOLLOWER_TIERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <HelperText>
                    Buckets your brand for peer comparisons on the Analytics
                    page. Private, never shown publicly.
                  </HelperText>
                  <ComingSoonNote>Coming soon</ComingSoonNote>
                </div>
              </div>
            </div>
          </section>

          {/* ══ FEATURED VARIANTS (stub, Batch 6c) ══ */}
          <section>
            <SectionLabel meta="0 of 3 selected">Featured variants</SectionLabel>
            <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
              <p
                className="text-[13px] leading-relaxed mb-4"
                style={{ color: TEXT_MUTED }}
              >
                Promote up to 3 variants from your catalog to filter tabs on
                your public brand page.
              </p>
              <div
                className="rounded-2xl px-5 py-8 text-center"
                style={{ border: "1.5px dashed rgba(45,10,78,0.9)" }}
              >
                <div
                  className="grid place-items-center rounded-xl mx-auto mb-3.5"
                  style={{
                    width: 44,
                    height: 44,
                    background: "rgba(255,0,229,0.1)",
                    border: "1px solid rgba(255,0,229,0.3)",
                    color: MAGENTA,
                  }}
                >
                  <PlusIcon />
                </div>
                <p
                  className="text-[15px] font-extrabold text-white mb-1.5"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Add your first featured variant
                </p>
                <p
                  className="text-[13px] leading-relaxed mx-auto"
                  style={{ color: TEXT_MUTED, maxWidth: 320 }}
                >
                  Search your catalog to promote a variant. It becomes a filter
                  tab on your brand page.
                </p>
                <button
                  type="button"
                  disabled
                  className="mt-4 rounded-xl px-4 py-2.5 text-xs font-bold cursor-not-allowed"
                  style={{
                    background: "rgba(45,10,78,0.55)",
                    border: "1px solid rgba(245,245,245,0.14)",
                    color: TEXT_MUTED,
                    opacity: 0.55,
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Search your catalog
                </button>
                <ComingSoonNote>Coming soon</ComingSoonNote>
              </div>
            </div>
          </section>

          {/* ══ TEAM ACCESS (stub, Batch 6d) ══ */}
          <section>
            <SectionLabel>Team access</SectionLabel>
            <div
              className="relative rounded-2xl p-5 overflow-hidden"
              style={{
                background: "rgba(45,10,78,0.18)",
                border: "1px solid rgba(45,10,78,0.55)",
              }}
            >
              <span
                className="absolute top-4 right-4 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.1em]"
                style={{
                  background: "rgba(124,77,255,0.16)",
                  border: "1px solid rgba(124,77,255,0.4)",
                  color: "#C9B6FF",
                }}
              >
                COMING SOON
              </span>
              <div className="flex items-center gap-3 mb-2 pr-24">
                <span
                  className="grid place-items-center rounded-xl flex-shrink-0"
                  style={{
                    width: 38,
                    height: 38,
                    background: "rgba(124,77,255,0.14)",
                    border: "1px solid rgba(124,77,255,0.3)",
                    color: "#C9B6FF",
                  }}
                >
                  <TeamIcon />
                </span>
                <span
                  className="text-base font-extrabold text-white"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  Invite teammates
                </span>
              </div>
              <p
                className="text-[13px] leading-relaxed mb-4"
                style={{ color: TEXT_MUTED, maxWidth: 440 }}
              >
                Add teammates to manage drops, reply to collectors, and edit
                this profile. Roles (owner, editor, viewer) are on the way.
              </p>
              <div
                className="flex gap-2.5"
                style={{ maxWidth: 460, opacity: 0.55, pointerEvents: "none" }}
                aria-hidden="true"
              >
                <input
                  type="email"
                  disabled
                  value=""
                  placeholder="teammate@email.com"
                  className="flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-sm outline-none"
                  style={{ ...inputStyle, color: TEXT_FAINT }}
                />
                <button
                  type="button"
                  disabled
                  className="rounded-xl px-4 text-xs font-bold flex-shrink-0"
                  style={{
                    background: "rgba(45,10,78,0.55)",
                    border: "1px solid rgba(245,245,245,0.14)",
                    color: TEXT_MUTED,
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Invite
                </button>
              </div>
            </div>
          </section>

          {/* ══ SUBSCRIPTION ══ */}
          <section>
            <SectionLabel>Subscription</SectionLabel>
            <div className="rounded-2xl overflow-hidden" style={cardStyle}>
              <Link
                href={`/brand-dashboard/${brand.slug}/subscription`}
                className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5"
              >
                <span className="flex flex-col gap-1.5 min-w-0">
                  <TierPill tone={isPro ? "green" : "muted"}>
                    {isPro ? "BRAND PRO" : "FREE"}
                  </TierPill>
                  <span className="text-xs" style={{ color: TEXT_MUTED }}>
                    {isPro
                      ? "Active"
                      : "Upgrade for analytics, featured chips and more"}
                  </span>
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  style={{ color: TEXT_FAINT, flexShrink: 0 }}
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
          </section>

          {error && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.2)",
              }}
              role="alert"
            >
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Mobile preview toggle. Desktop uses the sticky right column. */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setShowMobilePreview((v) => !v)}
              className="w-full rounded-xl px-4 py-3 text-xs font-bold"
              style={{
                background: "rgba(45,10,78,0.55)",
                border: "1px solid rgba(0,240,255,0.35)",
                color: CYAN,
                fontFamily: "Montserrat, sans-serif",
              }}
              aria-expanded={showMobilePreview}
            >
              {showMobilePreview ? "Hide live preview" : "Show live preview"}
            </button>
            {showMobilePreview && <div className="mt-4">{livePreview}</div>}
          </div>
        </div>

        {/* ── Live preview column (desktop) ───────────────────────────── */}
        <div className="hidden lg:block lg:sticky lg:top-6 min-w-0">
          {livePreview}
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
            <span className="flex items-center gap-2 text-xs" style={{ color: TEXT_MUTED }}>
              <span
                className="inline-block rounded-full flex-shrink-0"
                style={{
                  width: 7,
                  height: 7,
                  background: MAGENTA,
                  boxShadow: `0 0 8px ${MAGENTA}`,
                }}
                aria-hidden="true"
              />
              You have unsaved changes.
            </span>
            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={handleDiscard}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs font-bold"
                style={{
                  border: "1px solid rgba(245,245,245,0.14)",
                  color: TEXT_MUTED,
                  fontFamily: "Montserrat, sans-serif",
                  opacity: saving ? 0.4 : 1,
                }}
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#0A0A0A] transition-opacity"
                style={{
                  background: `linear-gradient(135deg, ${MAGENTA}, #CC44FF)`,
                  opacity: saving ? 0.4 : 1,
                  fontFamily: "Montserrat, sans-serif",
                  boxShadow: "0 0 18px rgba(255,0,229,0.35)",
                }}
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
