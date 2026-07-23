// apps/web/components/dashboard/BrandSettingsForm.tsx
//
// T137 Batch 6a (2026-07-23): visual rebuild against the "Brand Settings
// Redesign" mockup. The state shape, the dirty check, the URL validation and
// the `.update()` payload are carried over unchanged from Batch 5. Only the
// JSX and the toast plumbing changed.
//
// T137 Batch 6b (2026-07-23): Location is structured now (country / state /
// city writing `country_code`, `state`, `city`) and the free-text "display
// location" input is gone. `brands.location` is still written on every save,
// derived from the parts by deriveLocation() so the public page pill and the
// brand directory keep reading one column. See the migration
// 20260723000091_brands_structured_location.sql for the contract.
//
// Also in 6b: the restock and availability section moved to the Drops page
// (RestockCadenceRow owns the `restock_schedule` write now, this form no
// longer touches it) and the featured variants stub was removed until it
// lands on the Slimes page.
//
// T137 Batch 6c (2026-07-23): "Custom display location" is back, but as an
// override rather than as the source of truth. It writes
// `brands.display_location_override` (migration 20260723000092), which the
// public pill prefers over `brands.location`. The structured parts stay
// authoritative: `location` is still derived from city + state on every save,
// exactly as in 6b, and the override never feeds it.
//
// Not in 6c: moderation. Neither `city` nor the override runs through
// lib/moderation.ts, and neither does anything else this form writes. Tracked
// as T196 in docs/SlimeLog_Tracker.md.
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
import {
  COUNTRIES,
  deriveLocation,
  regionLabel,
  regionsFor,
} from "@/lib/geo";
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
  /** Derived display value. Read-only here; recomputed from the parts on save. */
  location: string | null;
  /**
   * Batch 6c. Free-text label that wins over `location` on the public pill.
   * Optional on the prop so a migration-lagged read (settings page falls back
   * to the legacy column list) still type-checks.
   */
  display_location_override?: string | null;
  country_code: string | null;
  state: string | null;
  city: string | null;
  founded_year: number | null;
  /**
   * Read-only in this form since Batch 6b. The Drops page owns the write.
   * Kept on the prop so the live preview meta row stays accurate.
   */
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
  country_code: string;
  state: string;
  city: string;
  display_location_override: string;
  founded_year: string;
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

/**
 * Stub badge. Batch 6b pulled it out of the Team card's absolute corner: it
 * sits in the header flex row now so it can never overlap the headline at a
 * narrow width. Same violet language the other stub pills use.
 */
function ComingSoonPill() {
  return (
    <span
      className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[0.1em] whitespace-nowrap"
      style={{
        background: "rgba(124,77,255,0.16)",
        border: "1px solid rgba(124,77,255,0.4)",
        color: "#C9B6FF",
        fontFamily: "Montserrat, sans-serif",
      }}
    >
      COMING SOON
    </span>
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
    // Every brand row was seeded country_code 'US', so an empty value only
    // shows up on a row that predates that default. Fall back to US.
    country_code: brand.country_code ?? "US",
    state: brand.state ?? "",
    city: brand.city ?? "",
    display_location_override: brand.display_location_override ?? "",
    founded_year: brand.founded_year?.toString() ?? "",
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
      country_code: brand.country_code ?? "US",
      state: brand.state ?? "",
      city: brand.city ?? "",
      display_location_override: brand.display_location_override ?? "",
      founded_year: brand.founded_year?.toString() ?? "",
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

  /**
   * Country and state are coupled: "CA" means California under US and is not
   * a province code under Canada. Switching country clears the region so the
   * two can never disagree.
   */
  const setCountry = useCallback((value: string) => {
    setForm((prev) =>
      prev.country_code === value
        ? prev
        : { ...prev, country_code: value, state: "" },
    );
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

  // What `brands.location` becomes on save. Unchanged by 6c: the override is a
  // separate column and never feeds this derivation.
  const derivedLocation = deriveLocation(form.city, form.state);
  const regions = regionsFor(form.country_code);
  const stateLabel = regionLabel(form.country_code);

  // Batch 6c: what the public pill will render after this save. Same
  // `override || derived` precedence the public page uses, written once here so
  // the preview, the helper copy and the stale-value note cannot drift apart
  // from each other or from app/brands/[slug]/page.tsx.
  const overrideLocation = form.display_location_override.trim();
  const previewLocation = overrideLocation || derivedLocation;

  // What the public pill shows RIGHT NOW, before this save lands. Same
  // precedence again, against the values that came off the server render.
  const storedLocation =
    (brand.display_location_override ?? "").trim() ||
    (brand.location ?? "").trim();
  const showsStaleLocation =
    storedLocation.length > 0 && storedLocation !== previewLocation;
  const restockSchedule = (brand.restock_schedule ?? "").trim();

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
        // Structured location plus the derived display string, written
        // together. See lib/geo.ts and the Batch 6b migration: `location` is
        // what the public page and the brand directory read, so it can never
        // be left behind when the parts change.
        country_code: form.country_code || null,
        state: form.state || null,
        city: form.city.trim() || null,
        location: derivedLocation || null,
        // Batch 6c. Display-only, and deliberately NOT part of the derivation
        // above: clearing it must fall the pill back to "City, ST", which only
        // works if `location` was written from the parts every time.
        display_location_override: overrideLocation || null,
        founded_year: form.founded_year
          ? parseInt(form.founded_year, 10)
          : null,
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

            {/* Meta row, mirrors the public page. Location is the custom
                override when the owner has typed one, otherwise the derived
                "City, ST" the save writes to `brands.location`, which is the
                same precedence app/brands/[slug]/page.tsx renders.
                Restock cadence is read only here: the Drops page owns it. */}
            {(previewLocation || restockSchedule) && (
              <div
                className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-[11px]"
                style={{ color: "rgba(245,245,245,0.55)" }}
              >
                {previewLocation && (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <PinIcon size={12} />
                    <span className="truncate">{previewLocation}</span>
                  </span>
                )}
                {restockSchedule && (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <CalendarIcon size={12} />
                    <span className="truncate">{restockSchedule}</span>
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
          {/* Batch 6b: structured country / state / city. `brands.location`
              is derived from these on save (lib/geo.ts, deriveLocation) and
              stays the one value the public page reads.
              Batch 6c: plus an optional free-text override that the public
              pill prefers. The structured parts stay authoritative for
              filtering, analytics and marketplace shipping, so the override
              never changes what `location` is derived from. */}
          <section>
            <SectionLabel>Location</SectionLabel>
            <div className="rounded-2xl p-4 sm:p-5" style={cardStyle}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <select
                    value={form.country_code}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`${inputClass} appearance-none`}
                    style={inputStyle}
                    aria-label="Country"
                  >
                    {COUNTRIES.map((c) => (
                      <option
                        key={c.code}
                        value={c.code}
                        style={{ background: "#0F0A1A" }}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>{stateLabel}</FieldLabel>
                  <select
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    className={`${inputClass} appearance-none`}
                    style={inputStyle}
                    aria-label={stateLabel}
                  >
                    <option value="" style={{ background: "#0F0A1A" }}>
                      Not set
                    </option>
                    {regions.map((r) => (
                      <option
                        key={r.code}
                        value={r.code}
                        style={{ background: "#0F0A1A" }}
                      >
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <FieldLabel>City</FieldLabel>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value.slice(0, 60))}
                    placeholder="Los Angeles"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>

              <HelperText>
                {derivedLocation
                  ? `Your city and ${stateLabel.toLowerCase()} give you "${derivedLocation}".`
                  : `Pick a ${stateLabel.toLowerCase()} and add a city to show a location on your brand page.`}
              </HelperText>

              {/* Batch 6c: the override. Separate column, separate row, below
                  the structured parts so it reads as a layer on top of them
                  rather than as an alternative to filling them in. */}
              <div
                className="mt-4 pt-4"
                style={{ borderTop: HAIRLINE }}
              >
                <FieldLabel>Custom display location</FieldLabel>
                <input
                  type="text"
                  value={form.display_location_override}
                  onChange={(e) =>
                    setField(
                      "display_location_override",
                      e.target.value.slice(0, 60),
                    )
                  }
                  placeholder="SlimeLog HQ"
                  className={inputClass}
                  style={inputStyle}
                />
                <HelperText>
                  Optional. Overrides the auto-generated &quot;City,
                  State&quot; pill on your public page. Leave blank to use your
                  city and state.
                </HelperText>
              </div>

              <p
                className="text-[11px] mt-4 leading-relaxed"
                style={{ color: TEXT_FAINT }}
              >
                {previewLocation ? (
                  <>
                    Your brand page will show{" "}
                    <span style={{ color: TEXT_STRONG }}>{previewLocation}</span>{" "}
                    next to a pin icon.
                  </>
                ) : (
                  "No location pill shows on your brand page yet."
                )}
              </p>

              {showsStaleLocation && (
                <p
                  className="text-[11px] mt-2 leading-relaxed"
                  style={{ color: "rgba(201,182,255,0.7)" }}
                >
                  Your brand page currently shows{" "}
                  <span style={{ color: TEXT_STRONG }}>{storedLocation}</span>.
                  Saving replaces it with the value above.
                </p>
              )}
            </div>
          </section>

          {/* ══ TEAM ACCESS (stub, Batch 6d) ══ */}
          <section>
            <SectionLabel>Team access</SectionLabel>
            <div
              className="rounded-2xl p-5 overflow-hidden"
              style={{
                background: "rgba(45,10,78,0.18)",
                border: "1px solid rgba(45,10,78,0.55)",
              }}
            >
              {/* Batch 6b: the pill used to be absolutely positioned in the
                  corner and collided with the headline once the card narrowed.
                  It is a flex sibling now, so the headline truncates or wraps
                  and the two can never overlap. */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
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
                    className="text-base font-extrabold text-white min-w-0"
                    style={{ fontFamily: "Montserrat, sans-serif" }}
                  >
                    Invite teammates
                  </span>
                </div>
                <ComingSoonPill />
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
