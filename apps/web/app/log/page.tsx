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

// ─── Local form state ─────────────────────────────────────────────────────────

interface FormState {
  slime_name: string;
  brand_name_raw: string;
  slime_type: SlimeType | "";
  scent: string;
  purchase_price: string;
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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slime-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-slime-surface border border-slime-border px-4 py-3 text-sm text-slime-text placeholder:text-slime-muted focus:outline-none focus:ring-2 focus:ring-slime-accent/50 transition";

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

  async function handleSubmit() {
    if (!form.slime_type) {
      setSaveError("Please select a slime type.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
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

            <Field label="Brand / Shop Name">
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

            <Field label="Scent">
              <input
                className={inputCls}
                placeholder="e.g. Watermelon candy"
                value={form.scent}
                onChange={(e) => set("scent", e.target.value)}
              />
            </Field>

            <Field label="Purchase Price ($)">
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

            <Field label="Notes">
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
