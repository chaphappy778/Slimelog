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

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { logSlime } from "@/lib/slime-actions";
import type { LogSlimeInput } from "@/lib/slime-actions";
import {
  SLIME_BASE_TYPE_LABELS,
  SCENT_STRENGTH_LABELS,
  SLIME_CONDITION_LABELS,
  SLIME_CONDITION_DESCRIPTIONS,
  SLIME_SKILL_LEVEL_LABELS,
  SLIME_SKILL_LEVEL_COLORS,
} from "@/lib/types";
import type {
  SlimeBaseType,
  ScentStrength,
  SlimeCondition,
  SlimeSkillLevel,
} from "@/lib/types";
import { ImageUpload } from "@/components/ImageUpload";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
import PageWrapper from "@/components/PageWrapper";
import BrandSearchInput from "@/components/BrandSearchInput";
import SubtypeAutocomplete from "@/components/SubtypeAutocomplete";
// 2026-07-16 Commit B-wizard — brand-scoped variant picker (with
// "Suggest a variant" fallback + POST to /api/variant-suggestions).
// Renders only when brand_id is a catalog brand; free-text brands keep
// falling through to SubtypeAutocomplete.
import BrandVariantPicker from "@/components/log/BrandVariantPicker";
import { KeywordTagInput } from "@/components/KeywordTagInput";
// [Change 2 — T98]
import { RatingSlider } from "@/components/RatingSlider";
// [T-wizard 2026-07-13]
import LogStepHeader from "@/components/log/LogStepHeader";
import LogStepFooter from "@/components/log/LogStepFooter";
import BaseTypePicker from "@/components/log/BaseTypePicker";
// [T-wizard 2026-07-13 rev2] Shared wizard tokens + widgets so the
// create + edit pages don't drift again.
import {
  RATING_FIELDS,
  sectionCardStyle,
  fieldInputStyle,
  FieldLabel,
  PickChip,
  ToggleKnob,
  SummaryRow,
  RatingAxisCard,
  ColorPicker,
} from "@/components/log/LogWizardShared";
import type { RatingAxisMeta } from "@/components/log/LogWizardShared";

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

// [T-wizard 2026-07-13 rev2] RatingAxisMeta / RATING_FIELDS /
// COLOR_SWATCHES moved to `@/components/log/LogWizardShared` so the
// edit page (`/log/edit/[id]/page.tsx`) draws from the same source
// and no longer drifts visually.

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
  // T158 (2026-07-16): optional per-log difficulty tag. "" is the
  // unpicked / "Skip" state, kept as an empty string (not null) so it
  // aligns with base_type's convention above.
  skill_level: SlimeSkillLevel | "";
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

// [T-wizard 2026-07-13 rev2] Local `Field`, `ColorPicker`, and
// `inputCls` retired. New wizard uses `FieldLabel` +
// `fieldInputStyle` + `ColorPicker` from
// `@/components/log/LogWizardShared`.

// cardStyle retired 2026-07-13 — the wizard no longer wraps every
// step in a single card. Content flows through the sticky header +
// footer, individual sections use the standard glass card treatment
// via `sectionCardStyle` where appropriate.

// [T-wizard 2026-07-13 rev2] sectionCardStyle, FieldLabel, and
// fieldInputStyle moved to `@/components/log/LogWizardShared`.

// ─── Inner Page ───────────────────────────────────────────────────────────────

function LogPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(0);

  // 2026-07-16 (Jennifer feedback): stepping from Identity to Details
  // preserved the previous scroll position, so users landed at the
  // bottom of step 1 instead of the top. Reset on every step change.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

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
    skill_level: "",
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
        // T158 (2026-07-16): send null (not undefined) when unpicked
        // so the payload matches "cleared" semantics on the server.
        skill_level: form.skill_level || null,
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
      // 2026-07-17 T39-H1: route to the new slime's detail page with
      // ?justLogged=1 so the detail view can render a "share your log"
      // CTA at the top. Previously we dumped users on /collection, which
      // is a passive grid view; the highest-emotional moment (they JUST
      // rated a slime) was going unused. The detail view is also where
      // the reshare-tuned OG preview lives, so this doubles as a
      // dry-run of what their post would look like on IG.
      // For wishlist-only logs we keep the old /collection destination
      // since sharing a wishlist entry has no "I rated this" hook and
      // brand notifications would fire on a slime the user hasn't
      // actually held yet.
      router.push(
        form.in_wishlist
          ? "/collection?tab=wishlist"
          : `/slimes/${result.id}?justLogged=1`,
      );
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
                {form.brand_id && form.base_type ? (
                  // Catalog brand + base type known: render the brand-scoped
                  // chip picker. If the brand has no tracked variants for
                  // this base yet, the picker shows a "Suggest a variant"
                  // CTA (POST /api/variant-suggestions).
                  <BrandVariantPicker
                    brandId={form.brand_id}
                    brandName={form.brand_name_raw}
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
                  />
                ) : (
                  // Free-text brand (or brand not yet chosen): fall back to
                  // the global variant autocomplete so the user can still
                  // pick a canonical subtype for their base type.
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
                )}
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

              {/* T158 (2026-07-16) — optional skill_level. Same PickChip
                  rhythm as scent-strength + condition above. Each level
                  chip tints in its signature color; the Skip chip
                  clears the value using the muted purple treatment. */}
              <div>
                <FieldLabel optional>Skill level</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.entries(SLIME_SKILL_LEVEL_LABELS) as [
                      SlimeSkillLevel,
                      string,
                    ][]
                  ).map(([level, label]) => {
                    const active = form.skill_level === level;
                    return (
                      <PickChip
                        key={level}
                        selected={active}
                        selectedTint={SLIME_SKILL_LEVEL_COLORS[level].text}
                        onClick={() =>
                          set("skill_level", active ? "" : level)
                        }
                      >
                        {label}
                      </PickChip>
                    );
                  })}
                  <PickChip
                    selected={form.skill_level === ""}
                    selectedTint="#CC44FF"
                    onClick={() => set("skill_level", "")}
                  >
                    Skip
                  </PickChip>
                </div>
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
// [T-wizard 2026-07-13 rev2] RatingAxisCard, ToggleKnob,
// PickChip, SummaryRow moved to `@/components/log/LogWizardShared`.

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
