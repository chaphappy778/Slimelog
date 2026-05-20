"use client";
// apps/web/app/log/page.tsx
// Updated: Bundle T72+T73+T75 — scent_strength pill picker, KeywordTagInput,
// removed scent text input, removed rating_scent from RATING_FIELDS,
// removed color_description, SVG checkmark in StepIndicator
// Updated: [scent_notes]

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logSlime } from "@/lib/slime-actions";
import type { LogSlimeInput } from "@/lib/slime-actions";
import { SLIME_BASE_TYPE_LABELS, SCENT_STRENGTH_LABELS } from "@/lib/types";
import type { SlimeBaseType, ScentStrength } from "@/lib/types";
import { ImageUpload } from "@/components/ImageUpload";
import { createBrowserClient } from "@supabase/ssr";
import PageWrapper from "@/components/PageWrapper";
import FloatingPills from "@/components/FloatingPills";
import BrandSearchInput from "@/components/BrandSearchInput";
import SubtypeAutocomplete from "@/components/SubtypeAutocomplete";
import { KeywordTagInput } from "@/components/KeywordTagInput";

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

// [T75] Removed rating_scent entry
const RATING_FIELDS: { key: RatingKey; label: string }[] = [
  { key: "rating_texture", label: "Texture" },
  { key: "rating_sound", label: "Sound / ASMR" },
  { key: "rating_drizzle", label: "Aesthetic" },
  { key: "rating_creativity", label: "Creativity" },
  { key: "rating_sensory_fit", label: "Quality" },
  { key: "rating_overall", label: "Overall" },
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

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div
      className="flex items-center justify-between py-3 border-b last:border-0"
      style={{ borderColor: "rgba(45,10,78,0.5)" }}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-slime-text">
        {label}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled =
            hovered !== null ? star <= hovered : star <= (value ?? 0);
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(null)}
              className={`w-8 h-8 rounded-full text-lg transition-all duration-100 ${filled ? "text-slime-accent scale-110" : "text-slime-muted hover:text-slime-accent"}`}
              aria-label={`${star} star`}
            >
              {filled ? "\u25cf" : "\u25cb"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-200 ${
              i < step
                ? "text-slime-bg shadow-glow-green"
                : i === step
                  ? "text-slime-bg ring-4 ring-slime-accent/30"
                  : "bg-slime-surface text-slime-muted border border-slime-border"
            }`}
            style={
              i <= step
                ? { background: "linear-gradient(135deg, #39FF14, #00F0FF)" }
                : undefined
            }
          >
            {i < step ? (
              <svg
                width="12"
                height="12"
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
            ) : (
              i + 1
            )}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-6 rounded transition-all duration-300 ${i < step ? "bg-slime-accent" : "bg-slime-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

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

// ─── Step card style ──────────────────────────────────────────────────────────

const cardStyle = {
  background: "rgba(45,10,78,0.3)",
  border: "1px solid rgba(45,10,78,0.8)",
  boxShadow: "inset 0 0 30px rgba(45,10,78,0.2), 0 8px 32px rgba(0,0,0,0.4)",
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
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
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
        is_public: !isPrivate,
      };
      await logSlime(input);
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
    <PageWrapper dots glow="cyan">
      <div className="px-4 py-8 flex flex-col items-center">
        {/* Header with floating pills */}
        <div
          className="relative w-full max-w-md mb-6 overflow-hidden rounded-2xl px-5 py-5"
          style={{
            background: "rgba(45,10,78,0.2)",
            border: "1px solid rgba(45,10,78,0.5)",
          }}
        >
          <FloatingPills area="section" density="low" zIndex={0} />
          <div className="relative z-10">
            <h1
              className="text-2xl font-extrabold tracking-tight"
              style={{
                background:
                  "linear-gradient(90deg, #00F0FF 0%, #39FF14 50%, #FF00E5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Log a Slime
            </h1>
            <p className="text-sm text-slime-muted mt-1">
              {form.in_wishlist ? "Adding to wishlist" : "Adding to collection"}
            </p>
          </div>
        </div>

        {/* Step card */}
        <div className="w-full max-w-md rounded-2xl p-6" style={cardStyle}>
          <StepIndicator step={step} />

          {/* ── Step 0: Identity ── */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold text-slime-cyan">
                What slime is this?
              </h2>

              <Field label="Slime Name *">
                <input
                  className={inputCls}
                  placeholder="e.g. Honeydew Dreams"
                  value={form.slime_name}
                  onChange={(e) => set("slime_name", e.target.value)}
                />
              </Field>

              <Field label="Brand / Shop Name" optional>
                <BrandSearchInput
                  value={form.brand_name_raw}
                  onChange={(name: string, id: string | null) => {
                    set("brand_name_raw", name);
                    setForm((f) => ({ ...f, brand_id: id }));
                  }}
                  placeholder="Search brands..."
                />
              </Field>

              <Field label="Collection" optional>
                <input
                  className={inputCls}
                  placeholder="e.g. Sundae Funday"
                  value={form.collection_name}
                  onChange={(e) => set("collection_name", e.target.value)}
                />
              </Field>

              {/* [G2] Base Type selector — clears subtype on change */}
              <Field label="Base Type *">
                <select
                  className={inputCls}
                  value={form.base_type}
                  onChange={(e) => {
                    const newBase = e.target.value as SlimeBaseType | "";
                    setForm((f) => ({
                      ...f,
                      base_type: newBase,
                      subtype_id: null,
                      subtype_name: "",
                    }));
                  }}
                >
                  <option value="">— Pick a type —</option>
                  {(
                    Object.entries(SLIME_BASE_TYPE_LABELS) as [
                      SlimeBaseType,
                      string,
                    ][]
                  ).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* [G2] Subtype autocomplete (optional) */}
              <Field label="Subtype" optional>
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
                      ? "Search subtypes (optional)"
                      : "Pick a base type first"
                  }
                />
              </Field>

              {/* Wishlist toggle */}
              <button
                type="button"
                onClick={() => {
                  set("in_wishlist", !form.in_wishlist);
                  set("in_collection", form.in_wishlist);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium"
                style={
                  form.in_wishlist
                    ? {
                        borderColor: "rgba(57,255,20,0.4)",
                        background: "rgba(57,255,20,0.08)",
                        color: "#39FF14",
                      }
                    : {
                        borderColor: "rgba(45,10,78,0.6)",
                        background: "rgba(45,10,78,0.2)",
                        color: "#888888",
                      }
                }
              >
                {form.in_wishlist ? "Wishlist item" : "Add to wishlist instead"}
              </button>
            </div>
          )}

          {/* ── Step 1: Details ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold text-slime-cyan">
                Tell us more
              </h2>

              <Field label="Photo" optional>
                {userId ? (
                  <ImageUpload
                    bucket="slime-photos"
                    userId={userId}
                    existingUrl={form.image_url}
                    onUploadComplete={(url) => set("image_url", url)}
                    onRemove={() => set("image_url", null)}
                    label="Add a photo (optional)"
                    aspectRatio="4:3"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] rounded-2xl bg-slime-surface border border-slime-border animate-pulse" />
                )}
              </Field>

              {/* [T73] Scent Strength 4-pill picker */}
              <Field label="Scent Strength" optional>
                <div className="flex gap-2 flex-wrap">
                  {(
                    ["unscented", "weak", "medium", "strong"] as ScentStrength[]
                  ).map((level) => {
                    const active = form.scent_strength === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() =>
                          set("scent_strength", active ? null : level)
                        }
                        className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                        style={{
                          background: active
                            ? "rgba(57,255,20,0.15)"
                            : "rgba(45,10,78,0.3)",
                          border: active
                            ? "1px solid rgba(57,255,20,0.4)"
                            : "1px solid rgba(45,10,78,0.5)",
                          color: active ? "#39FF14" : "rgba(245,245,245,0.4)",
                        }}
                      >
                        {SCENT_STRENGTH_LABELS[level]}
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* [Change 3 — scent_notes] Scent Description textarea below Scent Strength */}
              <Field label="Scent Description" optional>
                <textarea
                  className={`${inputCls} resize-none h-20`}
                  placeholder="e.g. warm vanilla with a hint of brown sugar"
                  maxLength={100}
                  value={form.scent_notes}
                  onChange={(e) => set("scent_notes", e.target.value)}
                />
                <p className="text-right text-[11px] text-slime-muted">
                  {form.scent_notes.length}/100
                </p>
              </Field>

              <Field label="Purchase Price ($)" optional>
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.purchase_price}
                  onChange={(e) => set("purchase_price", e.target.value)}
                />
              </Field>

              {/* [G2] base_type === "clear" check */}
              <Field label="Colors" optional>
                <ColorPicker
                  selectedValues={form.selected_color_values}
                  onToggle={toggleColor}
                />
              </Field>

              {/* [T72] Keywords tag input */}
              <Field
                label="Keywords"
                optional
                hint="Tag your slime \u2014 up to 10 keywords"
              >
                <KeywordTagInput
                  value={form.keywords}
                  onChange={(tags) => set("keywords", tags)}
                  placeholder="e.g. pastel, glitter, kawaii"
                />
              </Field>
            </div>
          )}

          {/* ── Step 2: Ratings ── */}
          {step === 2 && (
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-bold text-slime-cyan mb-3">
                Rate it
              </h2>
              {RATING_FIELDS.map(({ key, label }) => (
                <StarRating
                  key={key}
                  value={form[key] as number | null}
                  onChange={(v) => set(key, v)}
                  label={label}
                />
              ))}
            </div>
          )}

          {/* ── Step 3: Notes ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <h2 className="text-lg font-bold text-slime-cyan">Any notes?</h2>

              <Field label="Notes" optional>
                <textarea
                  className={`${inputCls} resize-none h-36`}
                  placeholder="Texture thoughts, storage tips, first impressions\u2026"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </Field>

              {/* [Bundle E] Privacy toggle */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(45,10,78,0.25)",
                  border: "1px solid rgba(45,10,78,0.7)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <svg
                      width="18"
                      height="18"
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
                    <div className="min-w-0">
                      <p
                        className="text-base font-bold text-white"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {isPrivate ? "Private log" : "Public log"}
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#888888" }}
                      >
                        {isPrivate
                          ? "Only you will see this. It won\u2019t appear in the activity feed or on your public profile."
                          : "This will appear in your followers\u2019 activity feed and on your public profile."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPrivate((v) => !v)}
                    role="switch"
                    aria-checked={isPrivate}
                    aria-label="Toggle log privacy"
                    className="relative inline-flex shrink-0 h-7 w-12 rounded-full transition-colors"
                    style={{
                      background: isPrivate
                        ? "#FFB800"
                        : "rgba(255,255,255,0.12)",
                      border: "1px solid rgba(255,255,255,0.18)",
                    }}
                  >
                    <span
                      className="absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white transition-transform"
                      style={{
                        transform: isPrivate
                          ? "translateX(22px)"
                          : "translateX(2px)",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Summary card */}
              <div
                className="rounded-xl px-4 py-4 text-sm text-slime-muted space-y-1"
                style={{
                  background: "rgba(45,10,78,0.3)",
                  border: "1px solid rgba(45,10,78,0.6)",
                }}
              >
                {form.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image_url}
                    alt="Slime photo"
                    className="w-full aspect-[4/3] object-cover rounded-xl mb-3"
                  />
                )}
                <p>
                  <span className="font-semibold text-slime-cyan">
                    {form.slime_name || "Unnamed slime"}
                  </span>
                  {form.brand_name_raw ? (
                    <span className="text-slime-magenta">
                      {" "}
                      by {form.brand_name_raw}
                    </span>
                  ) : (
                    ""
                  )}
                </p>
                {form.collection_name && (
                  <p>Collection: {form.collection_name}</p>
                )}
                {form.base_type && (
                  <p>
                    Type:{" "}
                    <span className="text-slime-accent">
                      {SLIME_BASE_TYPE_LABELS[form.base_type as SlimeBaseType]}
                    </span>
                  </p>
                )}
                {form.subtype_name && (
                  <p>
                    Subtype:{" "}
                    <span className="text-slime-accent">
                      {form.subtype_name}
                    </span>
                  </p>
                )}
                {form.selected_color_values.length > 0 && (
                  <p>
                    Colors:{" "}
                    <span className="text-slime-accent">
                      {form.selected_color_values.join(", ")}
                    </span>
                  </p>
                )}
                {form.scent_strength && (
                  <p>
                    Scent:{" "}
                    <span className="text-slime-accent">
                      {SCENT_STRENGTH_LABELS[form.scent_strength]}
                    </span>
                  </p>
                )}
                {/* [Change 5 — scent_notes] Summary line */}
                {form.scent_notes.trim() && (
                  <p>
                    Scent notes:{" "}
                    <span className="text-slime-accent">
                      {form.scent_notes.trim()}
                    </span>
                  </p>
                )}
                {form.keywords.length > 0 && (
                  <p>
                    Keywords:{" "}
                    <span className="text-slime-accent">
                      {form.keywords.join(", ")}
                    </span>
                  </p>
                )}
                {form.rating_overall && (
                  <p>
                    Overall:{" "}
                    <span className="text-slime-accent font-bold">
                      {form.rating_overall}/5
                    </span>
                  </p>
                )}
              </div>

              {saveError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                  {saveError}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slime-muted transition"
                style={{
                  border: "1px solid rgba(45,10,78,0.6)",
                  background: "rgba(45,10,78,0.2)",
                }}
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as Step)}
                disabled={step === 0 && !form.slime_name.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slime-bg shadow-glow-green transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                }}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slime-bg shadow-glow-green transition disabled:opacity-60 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #39FF14, #00F0FF)",
                }}
              >
                {saving
                  ? "Saving\u2026"
                  : form.in_wishlist
                    ? "Add to Wishlist"
                    : "Save to Collection"}
              </button>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
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
