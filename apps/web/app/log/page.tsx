"use client";
// apps/web/app/log/page.tsx
// Updated: Bundle T72+T73+T75 — scent_strength pill picker, KeywordTagInput,
// removed scent text input, removed rating_scent from RATING_FIELDS,
// removed color_description, SVG checkmark in StepIndicator
// Updated: [scent_notes]
// [T36] Added step-0 Cancel button
// [T98] Replace StarRating with RatingSlider (0.0–5.0, step 0.25)
// [T-wizard 2026-07-13] Full log-wizard redesign per Design's mockup.
//   Sticky pill header + sticky Back/Next footer, per-axis tinted
//   rating cards with rainbow Overall + "Almost done" eyebrow,
//   horizontal photo carousel for base type (replaces native
//   dropdown), photo tile moved to Identity (step 0), summary
//   preview card on Notes. Form state + submit logic UNCHANGED —
//   only the visual shell and step layout are new.

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logSlime } from "@/lib/slime-actions";
import type { LogSlimeInput } from "@/lib/slime-actions";
import {
  SLIME_BASE_TYPE_LABELS,
  SCENT_STRENGTH_LABELS,
  SLIME_CONDITION_LABELS,
  SLIME_CONDITION_DESCRIPTIONS,
} from "@/lib/types";
import type {
  SlimeBaseType,
  ScentStrength,
  SlimeCondition,
} from "@/lib/types";
import { ImageUpload } from "@/components/ImageUpload";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
import PageWrapper from "@/components/PageWrapper";
import BrandSearchInput from "@/components/BrandSearchInput";
import SubtypeAutocomplete from "@/components/SubtypeAutocomplete";
import { KeywordTagInput } from "@/components/KeywordTagInput";
// [Change 2 — T98]
import { RatingSlider } from "@/components/RatingSlider";
// [T-wizard 2026-07-13]
import LogStepHeader from "@/components/log/LogStepHeader";
import LogStepFooter from "@/components/log/LogStepFooter";
import BaseTypePicker from "@/components/log/BaseTypePicker";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Identity", "Details", "Ratings", "Notes"] as const;
type Step = 0 | 1 | 2 | 3;

type RatingKey =
  | "rating_texture"
  | "rating_sound"
  | "rating_drizzle"
  | "rating_creativity"
  | "rating_sensory_fit"
  | "rating_overall";

// [T-wizard 2026-07-13] Extended per-axis metadata for the Ratings
// step. `accent` matches the how-to-rate axis palette exactly; `hint`
// is a one-line reminder we render under the axis title. `overall`
// marks the last axis so it can render with the rainbow border +
// "Almost done" eyebrow.
interface RatingAxisMeta {
  key: RatingKey;
  label: string;
  accent: string;
  hint: string;
  overall?: true;
}
const RATING_FIELDS: RatingAxisMeta[] = [
  {
    key: "rating_texture",
    label: "Texture",
    accent: "#39FF14",
    hint: "How it feels in hand: the poke, the pull, the squish.",
  },
  {
    key: "rating_sound",
    label: "Sound / ASMR",
    accent: "#00F0FF",
    hint: "Crunch, click, bubble. The audio payoff.",
  },
  {
    key: "rating_drizzle",
    label: "Aesthetic",
    accent: "#FF00E5",
    hint: "Color, mix-ins, how it reads on the shelf.",
  },
  {
    key: "rating_creativity",
    label: "Creativity",
    accent: "#FFD24A",
    hint: "Original concept, add-ins, theme follow-through.",
  },
  {
    key: "rating_sensory_fit",
    label: "Quality",
    accent: "#8B5CF6",
    hint: "Build, hold, no over-stick, ages well.",
  },
  {
    key: "rating_overall",
    label: "Overall",
    accent: "#00F0FF",
    hint: "Your one number for the whole tub.",
    overall: true,
  },
];

interface ColorSwatch {
  label: string;
  hex: string;
  value: string;
  dark?: boolean;
}

const COLOR_SWATCHES: ColorSwatch[] = [
  { label: "White", hex: "#FFFFFF", value: "white", dark: true },
  { label: "Cream", hex: "#FFF5DC", value: "cream", dark: true },
  { label: "Pink", hex: "#FFB6C1", value: "pink" },
  { label: "Hot Pink", hex: "#FF3E8A", value: "hot pink" },
  { label: "Purple", hex: "#9B5DE5", value: "purple" },
  { label: "Lavender", hex: "#C9B8F5", value: "lavender" },
  { label: "Blue", hex: "#4A90E2", value: "blue" },
  { label: "Mint", hex: "#98E4C8", value: "mint" },
  { label: "Green", hex: "#4CAF50", value: "green" },
  { label: "Yellow", hex: "#FFE135", value: "yellow", dark: true },
  { label: "Orange", hex: "#FF8C42", value: "orange" },
  { label: "Red", hex: "#E94040", value: "red" },
  { label: "Brown", hex: "#8B4513", value: "brown" },
  { label: "Black", hex: "#1A1A1A", value: "black" },
];

// [Change 1 — scent_notes] Added scent_notes: string to FormState
interface FormState {
  slime_name: string;
  brand_name_raw: string;
  brand_id: string | null;
  collection_name: string;
  base_type: SlimeBaseType | "";
  subtype_id: string | null;
  subtype_name: string;
  scent_strength: ScentStrength | null;
  scent_notes: string;
  // 2026-07-12: condition of the slime (personal + future marketplace).
  condition: SlimeCondition | null;
  keywords: string[];
  purchase_price: string;
  selected_color_values: string[];
  image_url: string | null;
  rating_texture: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;
  notes: string;
  in_wishlist: boolean;
  in_collection: boolean;
}

function buildColorsArray(selectedValues: string[]): string[] | undefined {
  return selectedValues.length > 0 ? selectedValues : undefined;
}

// StepIndicator retired 2026-07-13 — replaced by LogStepHeader
// (sticky pill row + eyebrow + big title). Import from
// `@/components/log/LogStepHeader`.

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  optional,
  hint,
  children,
}: {
  label: string;
  optional?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <label className="section-label">{label}</label>
        {optional && (
          <span className="text-xs text-slime-muted/60 normal-case tracking-normal font-normal">
            optional
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-slime-muted/70 mt-0.5">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder:text-slime-muted focus:outline-none focus:ring-1 focus:ring-slime-accent/40 focus:border-slime-accent/50 transition";

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  selectedValues,
  onToggle,
}: {
  selectedValues: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-2">
        {COLOR_SWATCHES.map((swatch) => {
          const isSelected = selectedValues.includes(swatch.value);
          return (
            <button
              key={swatch.value}
              type="button"
              onClick={() => onToggle(swatch.value)}
              aria-label={`${swatch.label}${isSelected ? " (selected)" : ""}`}
              aria-pressed={isSelected}
              className={`relative w-full aspect-square rounded-full transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-slime-accent ${
                isSelected
                  ? "ring-2 ring-slime-accent ring-offset-2 ring-offset-slime-card scale-110"
                  : swatch.dark
                    ? "ring-1 ring-slime-border hover:scale-105"
                    : "hover:scale-105"
              }`}
              style={{ backgroundColor: swatch.hex }}
            >
              {isSelected && (
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: swatch.dark ? "#1A1A1A" : "#FFFFFF" }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="2,6 5,9 10,3" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedValues.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slime-accent/15 border border-slime-accent/30 text-xs font-medium text-slime-accent"
            >
              {val}
              <button
                type="button"
                onClick={() => onToggle(val)}
                className="ml-0.5 hover:text-slime-text transition"
                aria-label={`Remove ${val}`}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// cardStyle retired 2026-07-13 — the wizard no longer wraps every
// step in a single card. Content flows through the sticky header +
// footer, individual sections use the standard glass card treatment
// via `sectionCardStyle` where appropriate.

// Standard glass card treatment used across the wizard for the
// wishlist toggle, the public toggle on Notes, the summary card, etc.
const sectionCardStyle: React.CSSProperties = {
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.7)",
  borderRadius: 20,
  padding: 16,
};

// Field label — Montserrat 800, cyan uppercase, matches Design's
// mockup. Includes required (magenta *) or optional treatment.
function FieldLabel({
  children,
  optional,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div
      className="flex items-baseline gap-1.5 mb-2"
      style={{
        fontFamily: "Montserrat, sans-serif",
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: "0.13em",
        textTransform: "uppercase",
        color: "#00F0FF",
      }}
    >
      {children}
      {optional ? (
        <span
          style={{
            color: "rgba(245,245,245,0.42)",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 500,
            fontSize: 11,
            letterSpacing: 0,
            textTransform: "none",
          }}
        >
          optional
        </span>
      ) : (
        <span style={{ color: "#FF00E5" }}>*</span>
      )}
    </div>
  );
}

// Common input field style — matches Design's `.field` treatment.
const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.7)",
  borderRadius: 14,
  padding: "14px 15px",
  color: "#FFFFFF",
  fontFamily: "system-ui, sans-serif",
  fontSize: 15,
  outline: "none",
};

// ─── Inner Page ───────────────────────────────────────────────────────────────

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(0);

  const [userId, setUserId] = useState<string | null>(null);
  const userIdFetchedRef = useRef(false);

  if (typeof window !== "undefined" && !userIdFetchedRef.current) {
    userIdFetchedRef.current = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }

  // [Change 2 — scent_notes] Added scent_notes: "" to initial state
  const [form, setForm] = useState<FormState>({
    slime_name: searchParams.get("slime_name") ?? "",
    brand_name_raw: searchParams.get("brand") ?? "",
    brand_id: null,
    collection_name: searchParams.get("collection") ?? "",
    base_type: (searchParams.get("base_type") as SlimeBaseType) ?? "",
    subtype_id: null,
    subtype_name: "",
    scent_strength: null,
    scent_notes: "",
    condition: null,
    keywords: [],
    purchase_price: "",
    selected_color_values: [],
    image_url: null,
    rating_texture: null,
    rating_sound: null,
    rating_drizzle: null,
    rating_creativity: null,
    rating_sensory_fit: null,
    rating_overall: null,
    notes: "",
    in_wishlist: false,
    in_collection: true,
  });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // [Bundle E] Privacy toggle state
  const [isPrivate, setIsPrivate] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleColor(value: string) {
    setForm((f) => {
      const already = f.selected_color_values.includes(value);
      return {
        ...f,
        selected_color_values: already
          ? f.selected_color_values.filter((v) => v !== value)
          : [...f.selected_color_values, value],
      };
    });
  }

  async function handleSubmit() {
    if (!form.base_type) {
      setSaveError("Please select a base type.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const finalColors = buildColorsArray(form.selected_color_values);

      const input: LogSlimeInput = {
        slime_name: form.slime_name.trim() || undefined,
        brand_name_raw: form.brand_name_raw.trim() || undefined,
        brand_id: form.brand_id ?? undefined,
        base_type: form.base_type as SlimeBaseType,
        subtype_id: form.subtype_id ?? null,
        scent_strength: form.scent_strength ?? null,
        keywords: form.keywords,
        purchase_price:
          form.purchase_price !== ""
            ? parseFloat(form.purchase_price)
            : undefined,
        in_collection: form.in_collection,
        in_wishlist: form.in_wishlist,
        colors: finalColors,
        image_url: form.image_url ?? undefined,
        rating_texture: form.rating_texture ?? undefined,
        rating_sound: form.rating_sound ?? undefined,
        rating_drizzle: form.rating_drizzle ?? undefined,
        rating_creativity: form.rating_creativity ?? undefined,
        rating_sensory_fit: form.rating_sensory_fit ?? undefined,
        rating_overall: form.rating_overall ?? undefined,
        notes: form.notes.trim() || undefined,
        // [Change 4 — scent_notes]
        scent_notes: form.scent_notes.trim() || undefined,
        condition: form.condition ?? undefined,
        is_public: !isPrivate,
      };
      // 2026-07-12: logSlime now returns a result union so moderation
      // failures surface as friendly copy instead of Next.js's generic
      // "specific message is omitted in production builds" error.
      const result = await logSlime(input);
      if (!result.ok) {
        setSaveError(result.error);
        return;
      }
      router.push("/collection");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper dots glow="cyan" orbs>
      <div className="flex flex-col min-h-screen">
        {/* Sticky pill header */}
        <LogStepHeader step={step} />

        {/* Content — scrollable region between the sticky header and
            sticky footer. `pb-[100px]` clears the sticky footer +
            bottom nav. */}
        <main
          className="flex-1 w-full mx-auto"
          style={{ maxWidth: 440, padding: "0 18px 100px" }}
        >
          {/* ── Step 0: Identity ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5 pt-4">
              {/* Photo tile — moved here from Details per Design's
                  Q3 answer. Identify + capture in one pass. Dashed
                  placeholder when no photo yet so an empty state
                  reads as "add a photo," not "we forgot to render." */}
              <div>
                <FieldLabel optional>Photo</FieldLabel>
                {userId ? (
                  <ImageUpload
                    bucket="slime-photos"
                    userId={userId}
                    existingUrl={form.image_url}
                    onUploadComplete={(url) => set("image_url", url)}
                    onRemove={() => set("image_url", null)}
                    label="Add a photo"
                    aspectRatio="4:3"
                  />
                ) : (
                  <div
                    className="w-full aspect-[4/3] rounded-2xl animate-pulse"
                    style={{
                      background: "rgba(45,10,78,0.2)",
                      border: "1px dashed rgba(120,60,180,0.5)",
                    }}
                  />
                )}
              </div>

              <div>
                <FieldLabel>Slime name</FieldLabel>
                <input
                  style={fieldInputStyle}
                  placeholder="e.g. Honeydew Dreams"
                  value={form.slime_name}
                  onChange={(e) => set("slime_name", e.target.value)}
                />
              </div>

              <div>
                <FieldLabel optional>Brand / shop name</FieldLabel>
                <BrandSearchInput
                  value={form.brand_name_raw}
                  onChange={(name: string, id: string | null) => {
                    set("brand_name_raw", name);
                    setForm((f) => ({ ...f, brand_id: id }));
                  }}
                  placeholder="Search brands..."
                />
              </div>

              <div>
                <FieldLabel optional>Collection</FieldLabel>
                <input
                  style={fieldInputStyle}
                  placeholder="e.g. Sundae Funday"
                  value={form.collection_name}
                  onChange={(e) => set("collection_name", e.target.value)}
                />
              </div>

              <div>
                <FieldLabel>Base type</FieldLabel>
                <BaseTypePicker
                  value={form.base_type}
                  onChange={(newBase) =>
                    setForm((f) => ({
                      ...f,
                      base_type: newBase,
                      subtype_id: null,
                      subtype_name: "",
                    }))
                  }
                />
              </div>

              <div>
                <FieldLabel optional>Variant</FieldLabel>
                <SubtypeAutocomplete
                  baseType={form.base_type}
                  value={form.subtype_name}
                  subtypeId={form.subtype_id}
                  onChange={(id, name) => {
                    setForm((f) => ({
                      ...f,
                      subtype_id: id,
                      subtype_name: name,
                    }));
                  }}
                  placeholder={
                    form.base_type
                      ? "Search variants (optional)"
                      : "Pick a base type first"
                  }
                />
              </div>

              {/* Wishlist toggle card */}
              <button
                type="button"
                onClick={() => {
                  set("in_wishlist", !form.in_wishlist);
                  set("in_collection", form.in_wishlist);
                }}
                style={{
                  ...sectionCardStyle,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    color: form.in_wishlist
                      ? "#39FF14"
                      : "rgba(245,245,245,0.72)",
                    fontWeight: 700,
                    fontSize: 15,
                    fontFamily: "system-ui, sans-serif",
                  }}
                >
                  Add to wishlist instead
                </span>
                <ToggleKnob on={form.in_wishlist} />
              </button>
            </div>
          )}

          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5 pt-4">
              <div>
                <FieldLabel optional>Scent strength</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {(
                    ["unscented", "weak", "medium", "strong"] as ScentStrength[]
                  ).map((level) => {
                    const active = form.scent_strength === level;
                    return (
                      <PickChip
                        key={level}
                        selected={active}
                        selectedTint="#39FF14"
                        onClick={() =>
                          set("scent_strength", active ? null : level)
                        }
                      >
                        {SCENT_STRENGTH_LABELS[level]}
                      </PickChip>
                    );
                  })}
                </div>
              </div>

              <div>
                <FieldLabel optional>Condition</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(SLIME_CONDITION_LABELS) as [
                      SlimeCondition,
                      string,
                    ][]
                  ).map(([level, label]) => {
                    const active = form.condition === level;
                    return (
                      <PickChip
                        key={level}
                        selected={active}
                        selectedTint="#00F0FF"
                        onClick={() =>
                          set("condition", active ? null : level)
                        }
                      >
                        {label}
                      </PickChip>
                    );
                  })}
                </div>
                {form.condition && (
                  <p
                    className="mt-2"
                    style={{
                      color: "rgba(245,245,245,0.55)",
                      fontSize: 13,
                    }}
                  >
                    {SLIME_CONDITION_DESCRIPTIONS[form.condition]}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel optional>Scent description</FieldLabel>
                <textarea
                  style={{
                    ...fieldInputStyle,
                    resize: "none",
                    height: 88,
                    lineHeight: 1.4,
                  }}
                  placeholder="What does it smell like?"
                  maxLength={100}
                  value={form.scent_notes}
                  onChange={(e) => set("scent_notes", e.target.value)}
                />
                <p
                  className="text-right mt-1.5"
                  style={{
                    color: "rgba(245,245,245,0.45)",
                    fontSize: 11,
                  }}
                >
                  {form.scent_notes.length}/100
                </p>
              </div>

              <div>
                <FieldLabel optional>Purchase price ($)</FieldLabel>
                <input
                  style={fieldInputStyle}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={form.purchase_price}
                  onChange={(e) => set("purchase_price", e.target.value)}
                />
              </div>

              <div>
                <FieldLabel optional>Colors</FieldLabel>
                <ColorPicker
                  selectedValues={form.selected_color_values}
                  onToggle={toggleColor}
                />
              </div>

              <div>
                <FieldLabel optional>Keywords</FieldLabel>
                <KeywordTagInput
                  value={form.keywords}
                  onChange={(tags) => set("keywords", tags)}
                  placeholder="e.g. pastel, glitter, kawaii"
                />
                <p
                  style={{
                    color: "rgba(245,245,245,0.42)",
                    fontSize: 12,
                    margin: "8px 2px 0",
                  }}
                >
                  Tag your slime, up to 10 keywords
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Ratings ── */}
          {step === 2 && (
            <div className="flex flex-col gap-3.5 pt-4">
              {RATING_FIELDS.map((axis) => (
                <RatingAxisCard
                  key={axis.key}
                  axis={axis}
                  value={form[axis.key] as number | null}
                  onChange={(v) => set(axis.key, v)}
                />
              ))}
            </div>
          )}

          {/* ── Step 3: Notes ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5 pt-4">
              <div>
                <FieldLabel optional>Notes</FieldLabel>
                <textarea
                  style={{
                    ...fieldInputStyle,
                    resize: "none",
                    height: 140,
                    lineHeight: 1.45,
                  }}
                  placeholder="Anything to remember about this one?"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>

              {/* Public / private toggle card */}
              <button
                type="button"
                onClick={() => setIsPrivate((v) => !v)}
                role="switch"
                aria-checked={!isPrivate}
                aria-label="Toggle log privacy"
                style={{
                  ...sectionCardStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <svg
                  width={22}
                  height={22}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isPrivate ? "#FFB800" : "#39FF14"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                  aria-hidden="true"
                >
                  {isPrivate ? (
                    <>
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
                <div className="flex-1 min-w-0">
                  <div
                    style={{
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: 16,
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {isPrivate ? "Private log" : "Public log"}
                  </div>
                  <div
                    className="mt-0.5"
                    style={{
                      color: "rgba(245,245,245,0.55)",
                      fontSize: 12.5,
                      lineHeight: 1.35,
                    }}
                  >
                    {isPrivate
                      ? "Only you will see this. It will not appear in the activity feed or on your public profile."
                      : "This will appear in your followers' activity feed and on your public profile."}
                  </div>
                </div>
                <ToggleKnob on={!isPrivate} />
              </button>

              {/* Summary preview — added per Design's Notes card.
                  Confirms what you're about to save. */}
              <div style={sectionCardStyle}>
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image_url}
                    alt=""
                    style={{
                      width: "100%",
                      aspectRatio: "4/3",
                      objectFit: "cover",
                      borderRadius: 14,
                      display: "block",
                      marginBottom: 12,
                    }}
                  />
                )}
                <div
                  style={{
                    fontFamily: "Montserrat, sans-serif",
                    fontWeight: 800,
                    fontSize: 19,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ color: "#00F0FF" }}>
                    {form.slime_name || "Untitled slime"}
                  </span>
                  {form.brand_name_raw && (
                    <>
                      <span
                        style={{
                          color: "rgba(245,245,245,0.55)",
                          fontWeight: 600,
                        }}
                      >
                        {" by "}
                      </span>
                      <span style={{ color: "#FF00E5" }}>
                        {form.brand_name_raw}
                      </span>
                    </>
                  )}
                </div>
                <SummaryRow
                  label="Type"
                  value={
                    form.base_type
                      ? SLIME_BASE_TYPE_LABELS[
                          form.base_type as SlimeBaseType
                        ]
                      : "—"
                  }
                />
                {form.subtype_name && (
                  <SummaryRow label="Variant" value={form.subtype_name} />
                )}
                <SummaryRow
                  label="Colors"
                  value={
                    form.selected_color_values.length > 0
                      ? form.selected_color_values.join(", ")
                      : "—"
                  }
                />
                <SummaryRow
                  label="Scent"
                  value={
                    form.scent_strength
                      ? SCENT_STRENGTH_LABELS[form.scent_strength]
                      : "—"
                  }
                />
                {form.rating_overall !== null && (
                  <SummaryRow
                    label="Overall"
                    value={
                      parseFloat(form.rating_overall.toFixed(2)).toString() +
                      " / 5"
                    }
                    valueColor="#39FF14"
                  />
                )}
              </div>

              {saveError && (
                <div
                  className="rounded-xl px-4 py-3 text-sm"
                  style={{
                    background: "rgba(255,60,60,0.10)",
                    border: "1px solid rgba(255,60,60,0.35)",
                    color: "#FF7B7B",
                  }}
                >
                  {saveError}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Sticky Back / Next footer */}
        <LogStepFooter
          step={step}
          nextDisabled={step === 0 && !form.slime_name.trim()}
          saving={saving}
          onBack={() =>
            step === 0 ? router.back() : setStep((s) => (s - 1) as Step)
          }
          onNext={
            step === 3
              ? handleSubmit
              : () => setStep((s) => (s + 1) as Step)
          }
        />
      </div>
    </PageWrapper>
  );
}

// ─── Rating axis card ─────────────────────────────────────────────────
// Wraps a `RatingSlider` in a per-axis tinted card. Overall gets a
// rainbow border + "Almost done" eyebrow + larger padding.

function RatingAxisCard({
  axis,
  value,
  onChange,
}: {
  axis: RatingAxisMeta;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const cardStyle: React.CSSProperties = axis.overall
    ? {
        background: "rgba(45,10,78,0.34)",
        border: "1.5px solid transparent",
        // Two-layer background trick: inner card fill + rainbow border.
        backgroundImage:
          "linear-gradient(rgba(20,4,38,0.75), rgba(20,4,38,0.75)), linear-gradient(90deg, #FF3D6E 0%, #FFAE3B 22%, #FFD24A 40%, #39FF14 58%, #00F0FF 76%, #FF00E5 100%)",
        backgroundOrigin: "border-box",
        backgroundClip: "padding-box, border-box",
        boxShadow:
          "0 0 30px -6px rgba(204,68,255,0.35), inset 0 0 40px -18px rgba(0,240,255,0.4)",
        padding: "20px 18px 22px",
        borderRadius: 20,
      }
    : {
        background: "rgba(45,10,78,0.3)",
        border: `1px solid ${axis.accent}66`,
        boxShadow: `inset 0 0 34px -20px ${axis.accent}`,
        padding: "16px 16px 18px",
        borderRadius: 20,
      };

  return (
    <div style={cardStyle}>
      {axis.overall && (
        <p
          className="uppercase mb-2"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "#FFFFFF",
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#FFFFFF",
              boxShadow: "0 0 10px #FFFFFF",
              display: "inline-block",
            }}
          />
          Almost done, final call
        </p>
      )}
      <p
        className="mb-3"
        style={{
          color: "rgba(245,245,245,0.65)",
          fontSize: 12.5,
          lineHeight: 1.35,
          margin: 0,
          marginBottom: 12,
        }}
      >
        {axis.hint}
      </p>
      <RatingSlider
        label={axis.label}
        value={value}
        onChange={onChange}
        isOverall={axis.overall}
      />
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────

function ToggleKnob({ on }: { on: boolean }) {
  return (
    <div
      className="flex-none relative"
      aria-hidden="true"
      style={{
        width: 52,
        height: 30,
        borderRadius: 999,
        background: on ? "linear-gradient(135deg, #39FF14, #00F0FF)" : "rgba(45,10,78,0.6)",
        border: on ? "1px solid transparent" : "1px solid rgba(120,60,180,0.5)",
        boxShadow: on ? "0 0 14px rgba(57,255,20,0.4)" : "none",
        transition: "background 140ms ease",
      }}
    >
      <div
        className="absolute"
        style={{
          top: 3,
          left: on ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#FFFFFF",
          transition: "left 140ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

function PickChip({
  selected,
  selectedTint,
  onClick,
  children,
}: {
  selected: boolean;
  selectedTint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="active:scale-[0.96] transition-transform"
      style={{
        padding: "9px 15px",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "system-ui, sans-serif",
        cursor: "pointer",
        border: selected
          ? `1px solid ${selectedTint}88`
          : "1px solid rgba(120,60,180,0.5)",
        background: selected
          ? `${selectedTint}18`
          : "rgba(45,10,78,0.4)",
        color: selected ? selectedTint : "rgba(245,245,245,0.6)",
        boxShadow: selected ? `0 0 12px ${selectedTint}55` : "none",
      }}
    >
      {children}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <p
      style={{
        color: "rgba(245,245,245,0.55)",
        fontSize: 15,
        margin: "3px 0",
      }}
    >
      {label}:{" "}
      <b
        style={{
          color: valueColor ?? "#FFFFFF",
          fontWeight: 600,
        }}
      >
        {value}
      </b>
    </p>
  );
}

// ─── Loading fallback ─────────────────────────────────────────────────────────

function LogPageLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse 100% 60% at 50% 0%, #2D0A4E 0%, #100020 35%, #0A0A0A 65%)",
      }}
    >
      <div className="text-slime-accent text-sm font-medium animate-pulse">
        Loading\u2026
      </div>
    </div>
  );
}

// ─── Default export ───────────────────────────────────────────────────────────

export default function LogPage() {
  return (
    <Suspense fallback={<LogPageLoading />}>
      <LogPageInner />
    </Suspense>
  );
}
