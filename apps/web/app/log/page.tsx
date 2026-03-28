"use client";
// apps/web/app/log/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logSlime } from "@/lib/slime-actions";
import type { LogSlimeInput } from "@/lib/slime-actions";
import { SLIME_TYPE_LABELS } from "@/lib/types";
import type { SlimeType } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = ["Identity", "Details", "Ratings", "Notes"] as const;
type Step = 0 | 1 | 2 | 3;

type RatingKey =
  | "rating_texture"
  | "rating_scent"
  | "rating_sound"
  | "rating_drizzle"
  | "rating_creativity"
  | "rating_sensory_fit"
  | "rating_overall";

const RATING_FIELDS: {
  key: RatingKey;
  label: string;
  emoji: string;
}[] = [
  { key: "rating_texture", label: "Texture", emoji: "🤲" },
  { key: "rating_scent", label: "Scent", emoji: "🌸" },
  { key: "rating_sound", label: "Sound", emoji: "🔊" },
  { key: "rating_drizzle", label: "Drizzle", emoji: "💧" },
  { key: "rating_creativity", label: "Creativity", emoji: "✨" },
  { key: "rating_sensory_fit", label: "Sensory Fit", emoji: "🧠" },
  { key: "rating_overall", label: "Overall", emoji: "⭐" },
];

// ─── Color presets ────────────────────────────────────────────────────────────

interface ColorSwatch {
  label: string;
  /** CSS color value used for the swatch circle */
  hex: string;
  /** The string stored in the colors[] array */
  value: string;
  /** Light swatches need a dark border so they're visible on light cards */
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
  { label: "Black", hex: "#1A1A1A", value: "black" },
  {
    label: "Holographic",
    hex: "conic-gradient(from 0deg, #ff6ec7, #a855f7, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ff6ec7)",
    value: "holographic",
  },
];

// ─── Local form state ─────────────────────────────────────────────────────────

interface FormState {
  slime_name: string;
  brand_name_raw: string;
  slime_type: SlimeType | "";
  scent: string;
  purchase_price: string;
  // Color picker
  selected_color_values: string[];
  color_description: string;
  // Shipping dates
  order_date: string;
  ship_date: string;
  received_date: string;
  // Ratings
  rating_texture: number | null;
  rating_scent: number | null;
  rating_sound: number | null;
  rating_drizzle: number | null;
  rating_creativity: number | null;
  rating_sensory_fit: number | null;
  rating_overall: number | null;
  notes: string;
  in_wishlist: boolean;
  in_collection: boolean;
}

const EMPTY_FORM: FormState = {
  slime_name: "",
  brand_name_raw: "",
  slime_type: "",
  scent: "",
  purchase_price: "",
  selected_color_values: [],
  color_description: "",
  order_date: "",
  ship_date: "",
  received_date: "",
  rating_texture: null,
  rating_scent: null,
  rating_sound: null,
  rating_drizzle: null,
  rating_creativity: null,
  rating_sensory_fit: null,
  rating_overall: null,
  notes: "",
  in_wishlist: false,
  in_collection: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Combines selected swatch values and a free-text description into the
 * `colors` string[] that gets written to collection_logs.
 */
function buildColorsArray(
  selectedValues: string[],
  description: string,
): string[] | undefined {
  const trimmed = description.trim();
  const parts = [...selectedValues, ...(trimmed ? [trimmed] : [])];
  return parts.length > 0 ? parts : undefined;
}

// ─── Star Rating Component ─────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  label,
  emoji,
}: {
  value: number | null;
  onChange: (v: number) => void;
  label: string;
  emoji: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-center justify-between py-3 border-b border-slime-border last:border-0">
      <span className="flex items-center gap-2 text-sm font-medium text-slime-text">
        <span>{emoji}</span>
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
              className={`w-8 h-8 rounded-full text-lg transition-all duration-100 ${
                filled
                  ? "text-slime-accent scale-110"
                  : "text-slime-muted hover:text-slime-accent"
              }`}
              aria-label={`${star} star`}
            >
              {filled ? "●" : "○"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all duration-200 ${
              i < step
                ? "bg-slime-accent text-white"
                : i === step
                  ? "bg-slime-accent text-white ring-4 ring-slime-accent/30"
                  : "bg-slime-surface text-slime-muted border border-slime-border"
            }`}
          >
            {i < step ? "✓" : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-6 rounded transition-all duration-300 ${
                i < step ? "bg-slime-accent" : "bg-slime-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Field Component ───────────────────────────────────────────────────────────

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
        <label className="text-xs font-semibold uppercase tracking-wider text-slime-muted">
          {label}
        </label>
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
  "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder:text-slime-muted focus:outline-none focus:ring-2 focus:ring-slime-accent/50 transition";

// ─── Color Picker Component ───────────────────────────────────────────────────

function ColorPicker({
  selectedValues,
  onToggle,
  description,
  onDescriptionChange,
}: {
  selectedValues: string[];
  onToggle: (value: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Swatch grid — 7 columns, large tap targets */}
      <div className="grid grid-cols-7 gap-2">
        {COLOR_SWATCHES.map((swatch) => {
          const isSelected = selectedValues.includes(swatch.value);
          const isGradient = swatch.hex.startsWith("conic-gradient");

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
              style={
                isGradient
                  ? { background: swatch.hex }
                  : { backgroundColor: swatch.hex }
              }
            >
              {isSelected && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                  style={{
                    color:
                      swatch.dark || swatch.value === "holographic"
                        ? "#1A1A1A"
                        : "#FFFFFF",
                    textShadow:
                      swatch.value === "holographic"
                        ? "0 0 4px rgba(255,255,255,0.8)"
                        : undefined,
                  }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected pills */}
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
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Free-text description */}
      <input
        className={inputCls}
        placeholder='e.g. "galaxy swirl" or "mint chocolate chip"'
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
      />
    </div>
  );
}

// ─── Shipping Dates Section ────────────────────────────────────────────────────

function ShippingDates({
  orderDate,
  shipDate,
  receivedDate,
  onChange,
}: {
  orderDate: string;
  shipDate: string;
  receivedDate: string;
  onChange: (
    field: "order_date" | "ship_date" | "received_date",
    value: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Community note */}
      <div className="flex items-start gap-2.5 rounded-xl bg-slime-surface border border-slime-border px-3.5 py-3">
        <span className="text-base mt-0.5">📦</span>
        <p className="text-xs text-slime-muted leading-relaxed">
          Shipping data helps the community rate brands accurately.
        </p>
      </div>

      <Field label="Order Date" optional>
        <input
          type="date"
          className={inputCls}
          value={orderDate}
          onChange={(e) => onChange("order_date", e.target.value)}
        />
      </Field>

      <Field
        label="Ship Date"
        optional
        hint="When you received tracking/shipping notification"
      >
        <input
          type="date"
          className={inputCls}
          value={shipDate}
          onChange={(e) => onChange("ship_date", e.target.value)}
        />
      </Field>

      <Field
        label="Received Date"
        optional
        hint="When the slime physically arrived"
      >
        <input
          type="date"
          className={inputCls}
          value={receivedDate}
          onChange={(e) => onChange("received_date", e.target.value)}
        />
      </Field>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LogPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    if (!form.slime_type) {
      setSaveError("Please select a slime type.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const colors = buildColorsArray(
        form.selected_color_values,
        form.color_description,
      );

      const input: LogSlimeInput = {
        slime_name: form.slime_name.trim() || undefined,
        brand_name_raw: form.brand_name_raw.trim() || undefined,
        slime_type: form.slime_type as SlimeType,
        scent: form.scent.trim() || undefined,
        purchase_price:
          form.purchase_price !== ""
            ? parseFloat(form.purchase_price)
            : undefined,
        in_collection: form.in_collection,
        in_wishlist: form.in_wishlist,
        colors,
        order_date: form.order_date || undefined,
        ship_date: form.ship_date || undefined,
        received_date: form.received_date || undefined,
        rating_texture: form.rating_texture ?? undefined,
        rating_scent: form.rating_scent ?? undefined,
        rating_sound: form.rating_sound ?? undefined,
        rating_drizzle: form.rating_drizzle ?? undefined,
        rating_creativity: form.rating_creativity ?? undefined,
        rating_sensory_fit: form.rating_sensory_fit ?? undefined,
        rating_overall: form.rating_overall ?? undefined,
        notes: form.notes.trim() || undefined,
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
    <div className="min-h-screen bg-slime-bg px-4 py-8 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <h1 className="text-2xl font-extrabold text-slime-text tracking-tight">
          Log a Slime <span className="text-slime-accent">✦</span>
        </h1>
        <p className="text-sm text-slime-muted mt-1">
          {form.in_wishlist ? "Adding to wishlist" : "Adding to collection"}
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-slime-card rounded-2xl shadow-slime p-6">
        <StepIndicator step={step} />

        {/* ── Step 0: Identity ── */}
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slime-text">
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
              <input
                className={inputCls}
                placeholder="e.g. Peachybbies"
                value={form.brand_name_raw}
                onChange={(e) => set("brand_name_raw", e.target.value)}
              />
            </Field>

            <Field label="Slime Type *">
              <select
                className={inputCls}
                value={form.slime_type}
                onChange={(e) =>
                  set("slime_type", e.target.value as SlimeType | "")
                }
              >
                <option value="">— Pick a type —</option>
                {(
                  Object.entries(SLIME_TYPE_LABELS) as [SlimeType, string][]
                ).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            {/* Wishlist toggle */}
            <button
              type="button"
              onClick={() => {
                set("in_wishlist", !form.in_wishlist);
                set("in_collection", form.in_wishlist);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-medium ${
                form.in_wishlist
                  ? "border-slime-accent bg-slime-accent/10 text-slime-accent"
                  : "border-slime-border text-slime-muted hover:border-slime-accent/50"
              }`}
            >
              <span className="text-xl">{form.in_wishlist ? "💜" : "🤍"}</span>
              {form.in_wishlist ? "Wishlist item" : "Add to wishlist instead"}
            </button>
          </div>
        )}

        {/* ── Step 1: Details ── */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slime-text">Tell us more</h2>

            <Field label="Scent" optional>
              <input
                className={inputCls}
                placeholder="e.g. Watermelon candy"
                value={form.scent}
                onChange={(e) => set("scent", e.target.value)}
              />
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

            {/* ── Color Picker ── */}
            <Field label="Colors" optional>
              <ColorPicker
                selectedValues={form.selected_color_values}
                onToggle={toggleColor}
                description={form.color_description}
                onDescriptionChange={(v) => set("color_description", v)}
              />
            </Field>

            {/* ── Shipping Dates ── */}
            <div className="pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slime-muted mb-3">
                Shipping Dates
              </p>
              <ShippingDates
                orderDate={form.order_date}
                shipDate={form.ship_date}
                receivedDate={form.received_date}
                onChange={(field, value) => set(field, value)}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Ratings ── */}
        {step === 2 && (
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-slime-text mb-3">Rate it</h2>
            {RATING_FIELDS.map(({ key, label, emoji }) => (
              <StarRating
                key={key}
                value={form[key] as number | null}
                onChange={(v) => set(key, v)}
                label={label}
                emoji={emoji}
              />
            ))}
          </div>
        )}

        {/* ── Step 3: Notes ── */}
        {step === 3 && (
          <div className="flex flex-col gap-5">
            <h2 className="text-lg font-bold text-slime-text">Any notes?</h2>

            <Field label="Notes" optional>
              <textarea
                className={`${inputCls} resize-none h-36`}
                placeholder="Texture thoughts, storage tips, first impressions…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </Field>

            {/* Summary pill */}
            <div className="rounded-xl bg-slime-surface border border-slime-border p-4 text-sm text-slime-muted space-y-1">
              <p>
                <span className="font-semibold text-slime-text">
                  {form.slime_name || "Unnamed slime"}
                </span>
                {form.brand_name_raw ? ` by ${form.brand_name_raw}` : ""}
              </p>
              {form.slime_type && (
                <p>Type: {SLIME_TYPE_LABELS[form.slime_type as SlimeType]}</p>
              )}
              {form.selected_color_values.length > 0 ||
              form.color_description.trim() ? (
                <p>
                  Colors:{" "}
                  {buildColorsArray(
                    form.selected_color_values,
                    form.color_description,
                  )?.join(", ")}
                </p>
              ) : null}
              {form.rating_overall && (
                <p>Overall rating: {form.rating_overall}/5</p>
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
              className="flex-1 py-3 rounded-xl border border-slime-border text-sm font-semibold text-slime-muted hover:border-slime-accent/50 transition"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 0 && !form.slime_name.trim()}
              className="flex-1 py-3 rounded-xl bg-slime-accent text-white text-sm font-bold hover:bg-slime-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-slime-accent text-white text-sm font-bold hover:bg-slime-accent-hover transition disabled:opacity-60"
            >
              {saving
                ? "Saving…"
                : form.in_wishlist
                  ? "Add to Wishlist 💜"
                  : "Save to Collection ✨"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
