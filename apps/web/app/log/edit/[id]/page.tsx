"use client";
// apps/web/app/log/edit/[id]/page.tsx
// Updated: Bundle T72+T73+T75 — scent_strength pill picker, KeywordTagInput,
// removed scent text input, removed rating_scent from RATING_FIELDS,
// removed color_description, SVG checkmark in StepIndicator
// Updated: [T64] purchase_price fix, [scent_notes]
// [T98] Replace StarRating with RatingSlider (0.0–5.0, step 0.25)

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
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
import PageWrapper from "@/components/PageWrapper";
import BrandSearchInput from "@/components/BrandSearchInput";
import SubtypeAutocomplete from "@/components/SubtypeAutocomplete";
// 2026-07-16 Commit B-wizard — brand-scoped variant picker (with
// "Suggest a variant" fallback). Same conditional swap as /log so edit
// stays in visual + behavioral parity with create.
import BrandVariantPicker from "@/components/log/BrandVariantPicker";
import { KeywordTagInput } from "@/components/KeywordTagInput";
// [T-wizard 2026-07-13 rev2] Redesigned wizard chrome + shared
// widgets. Edit page now visually matches the create page — was
// previously stuck on the old StepIndicator + <select> base-type +
// plain rating stack even though the create page had been rebuilt.
import LogStepHeader from "@/components/log/LogStepHeader";
import LogStepFooter from "@/components/log/LogStepFooter";
import BaseTypePicker from "@/components/log/BaseTypePicker";
import {
  RATING_FIELDS,
  COLOR_SWATCHES,
  sectionCardStyle,
  fieldInputStyle,
  FieldLabel,
  PickChip,
  ToggleKnob,
  SummaryRow,
  RatingAxisCard,
  ColorPicker,
} from "@/components/log/LogWizardShared";

// Set of swatch value strings we recognize — used when hydrating the
// edit form to filter out any legacy color values stored on old
// collection_logs rows.
const KNOWN_COLOR_VALUES = COLOR_SWATCHES.map((s) => s.value);
// RatingSlider intentionally NOT imported here — the shared
// RatingAxisCard renders it. Left the ImageUpload + BrandSearchInput
// imports because the redesigned steps still use those primitives.

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

// [Change 2 — scent_notes] Added scent_notes: string to FormState
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
  // 2026-07-12: condition (personal + future marketplace).
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

// [T-wizard 2026-07-13 rev2] Local Field / ColorPicker / inputCls /
// cardStyle helpers retired. Wizard now imports FieldLabel +
// fieldInputStyle + ColorPicker + sectionCardStyle from
// `@/components/log/LogWizardShared`, same source as `/log/page.tsx`.

// ─── Edit Page Inner ──────────────────────────────────────────────────────────

function EditLogPageInner() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [step, setStep] = useState<Step>(0);
  const [loadingLog, setLoadingLog] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // [Bundle E] Privacy toggle state
  const [isPrivate, setIsPrivate] = useState(false);

  // [Change 3 — scent_notes] Added scent_notes: "" to initial state
  const [form, setForm] = useState<FormState>({
    slime_name: "",
    brand_name_raw: "",
    brand_id: null,
    collection_name: "",
    base_type: "",
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

  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from("collection_logs")
        .select("*, subtype:subtypes(name)")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoadingLog(false);
        return;
      }

      const storedColors: string[] = data.colors ?? [];
      const knownSelected = storedColors.filter((c) =>
        KNOWN_COLOR_VALUES.includes(c),
      );

      const joinedSubtype = (data as { subtype?: { name: string } | null })
        .subtype;
      const subtypeName = joinedSubtype?.name ?? "";

      setForm({
        slime_name: data.slime_name ?? "",
        brand_name_raw: data.brand_name_raw ?? "",
        brand_id: data.brand_id ?? null,
        collection_name: data.collection_name ?? "",
        base_type: (data.base_type as SlimeBaseType) ?? "",
        subtype_id: data.subtype_id ?? null,
        subtype_name: subtypeName,
        scent_strength: (data.scent_strength as ScentStrength) ?? null,
        // [Change 4 — scent_notes] Hydrate from DB
        scent_notes: data.scent_notes ?? "",
        // 2026-07-12: hydrate condition from DB when present.
        condition: (data.condition as SlimeCondition) ?? null,
        keywords: [],
        // [Change 1 — T64] Fix: use purchase_price not cost_paid
        purchase_price:
          data.purchase_price != null ? String(data.purchase_price) : "",
        selected_color_values: knownSelected,
        image_url: data.image_url ?? null,
        rating_texture: data.rating_texture ?? null,
        rating_sound: data.rating_sound ?? null,
        rating_drizzle: data.rating_drizzle ?? null,
        rating_creativity: data.rating_creativity ?? null,
        rating_sensory_fit: data.rating_sensory_fit ?? null,
        rating_overall: data.rating_overall ?? null,
        notes: data.notes ?? "",
        in_wishlist: data.in_wishlist ?? false,
        in_collection: data.in_collection ?? true,
      });

      // [Bundle E] Hydrate privacy toggle
      setIsPrivate(!data.is_public);

      // [T72] Fetch existing tags for this log
      const { data: tagData } = await supabase
        .from("log_tags")
        .select("tags(name)")
        .eq("log_id", id);

      // [T67] Fix: PostgREST to-one join returns plain object, not array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingKeywords = (tagData ?? [])
        .map((row: any) => row.tags?.name as string | undefined)
        .filter((n): n is string => Boolean(n));

      setForm((f) => ({ ...f, keywords: existingKeywords }));

      setLoadingLog(false);
    });
  }, [id, router]);

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
      const finalColors =
        form.base_type === "clear"
          ? ["clear"]
          : buildColorsArray(form.selected_color_values);

      // [Change 6 — scent_notes] Added scent_notes to updates payload
      const updates: Partial<LogSlimeInput> & { colors?: string[] } = {
        slime_name: form.slime_name.trim() || undefined,
        brand_name_raw: form.brand_name_raw.trim() || undefined,
        brand_id: form.brand_id ?? undefined,
        base_type: form.base_type as SlimeBaseType,
        subtype_id: form.subtype_id,
        scent_strength: form.scent_strength,
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
        scent_notes: form.scent_notes.trim() || undefined,
        // 2026-07-12: null when cleared so users can un-tag.
        condition: form.condition,
        is_public: !isPrivate,
      };

      const { error } = await supabaseRef.current
        .from("collection_logs")
        .update(updates)
        .eq("id", id);

      if (error) throw new Error(error.message);

      // [T72] Keywords: full replace strategy
      const supabase = supabaseRef.current;
      await supabase.from("log_tags").delete().eq("log_id", id);

      if (form.keywords.length > 0) {
        const normalized = form.keywords
          .map((k) => k.toLowerCase().trim())
          .filter(Boolean)
          .slice(0, 10);

        const { data: tagRows } = await supabase
          .from("tags")
          .upsert(
            normalized.map((name) => ({ name })),
            { onConflict: "name", ignoreDuplicates: false },
          )
          .select("id");

        if (tagRows && tagRows.length > 0) {
          await supabase
            .from("log_tags")
            .insert(tagRows.map((t) => ({ log_id: id, tag_id: t.id })));
        }
      }

      router.push(`/slimes/${id}`);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loadingLog) {
    return (
      <PageWrapper dots glow="cyan">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-slime-accent text-sm font-medium animate-pulse">
            Loading\u2026
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (notFound) {
    return (
      <PageWrapper dots glow="cyan">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-slime-muted text-sm">Log not found.</p>
            <button
              type="button"
              onClick={() => router.back()}
              className="mt-4 text-slime-accent text-sm font-semibold"
            >
              Go back
            </button>
          </div>
        </div>
      </PageWrapper>
    );
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

// ─── Loading fallback ─────────────────────────────────────────────────────────

function EditLogPageLoading() {
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

export default function EditLogPage() {
  return (
    <Suspense fallback={<EditLogPageLoading />}>
      <EditLogPageInner />
    </Suspense>
  );
}
