// apps/web/components/dashboard/SlimesSplitPanel.tsx
"use client";

import { useState, useTransition } from "react";
// [Change 1] — SLIME_BASE_TYPE_LABELS and SlimeBaseType imported; local arrays removed
import { SLIME_BASE_TYPE_LABELS, SlimeBaseType } from "@/lib/types";
// Audit hp-24 (2026-07-09): use the shared browser singleton.
import { createClient } from "@/lib/supabase/client";
// [Track 3a] — promote a community-added row to official.
import { approveSlimeAsOfficial } from "@/lib/brand-catalog-actions";
// Polish (2026-07-23): SCALE_BANDS is the single source of truth for the
// See-scale band colors, shared with /how-to-rate and the slime detail page.
// We reuse it to color the rating breakdown bars by band.
import { SCALE_BANDS } from "@/app/how-to-rate/content";

const supabase = createClient();

type FilterTab = "all" | "active" | "limited" | "discontinued";
// [Track 3a] — catalog-status filter, independent of the state tabs above.
type CatalogFilter = "all" | "official" | "community";

// [Change 2] — Slime interface uses base_type: SlimeBaseType
interface Slime {
  id: string;
  name: string;
  base_type: SlimeBaseType;
  description: string | null;
  colors: string[] | null;
  scent: string | null;
  retail_price: number | null;
  is_limited: boolean;
  is_discontinued: boolean;
  // [Track 3a] — false = community-added (auto-created by a user log),
  // true = official brand catalog entry.
  is_brand_official: boolean;
  avg_texture: number | null;
  avg_scent: number | null;
  avg_sound: number | null;
  avg_drizzle: number | null;
  avg_creativity: number | null;
  avg_sensory_fit: number | null;
  avg_overall: number | null;
  total_ratings: number | null;
  image_url: string | null;
}

interface SlimesSplitPanelProps {
  brandId: string;
  userId: string;
  initialSlimes: Slime[];
}

type PanelMode = "empty" | "detail" | "add" | "edit";

const DIMENSIONS = [
  { key: "avg_texture", label: "Texture" },
  { key: "avg_sound", label: "Sound / ASMR" },
  { key: "avg_drizzle", label: "Aesthetic" },
  { key: "avg_sensory_fit", label: "Quality" },
  { key: "avg_creativity", label: "Creativity" },
];

// Polish (2026-07-23): map a rating value to its See-scale band color so a
// 4.x reads "Great" green and a 2.x reads "Under" orange at a glance. Mirrors
// ratingBandColor() on the slime detail page; sourced from SCALE_BANDS.
function ratingBandColor(value: number): string {
  const idx = Math.min(
    SCALE_BANDS.length - 1,
    Math.max(0, Math.floor(value) - 1),
  );
  return SCALE_BANDS[idx].accentColor;
}

function RatingBar({ label, value }: { label: string; value: number | null }) {
  const pct = value ? (value / 5) * 100 : 0;
  // Polish (2026-07-23): color the fill + value by its See-scale band. Null
  // ratings keep the empty-bar treatment (no fill, muted dash).
  const bandColor = value ? ratingBandColor(value) : null;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span
          className="text-xs"
          style={{
            color: "#8f83b0",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {label}
        </span>
        <span
          className="text-xs font-semibold"
          style={{
            color: bandColor ?? "rgba(245,245,245,0.2)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {value ? value.toFixed(1) : "—"}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: bandColor ?? "transparent",
            boxShadow: bandColor ? `0 0 6px ${bandColor}55` : undefined,
          }}
        />
      </div>
    </div>
  );
}

function FormInput({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs font-bold uppercase tracking-widest mb-1.5"
        style={{
          color: "#8f83b0",
          fontFamily: "Montserrat, sans-serif",
        }}
      >
        {label}
        {required && <span style={{ color: "#ff2bd6" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// [T137 Batch 2a] Soft-violet dashboard tokens — match DashboardLayout + mockup.
// Magenta is the primary/selected accent across the redesigned dashboard; cyan
// is reserved for small-caps section labels.
const MAGENTA_GRADIENT = "linear-gradient(135deg, #ff2bd6, #a855f7)";

const inputClass =
  "w-full rounded-xl px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:ring-1 focus:ring-[#ff2bd6]/40";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(150,110,240,0.24)",
  fontFamily: "Inter, sans-serif",
};

export default function SlimesSplitPanel({
  brandId,
  userId,
  initialSlimes,
}: SlimesSplitPanelProps) {
  const [slimes, setSlimes] = useState<Slime[]>(initialSlimes);
  const [filter, setFilter] = useState<FilterTab>("all");
  // [Track 3a] — Official / Community / All catalog-status filter.
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>("empty");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [colorInput, setColorInput] = useState("");
  const [colors, setColors] = useState<string[]>([]);
  // [Track 3a] — approve flow: pending transition + inline result banner.
  const [approving, startApprove] = useTransition();
  const [approveError, setApproveError] = useState<string | null>(null);

  // [Change 3] — emptyForm uses base_type
  const emptyForm = {
    name: "",
    base_type: "butter" as SlimeBaseType,
    description: "",
    scent: "",
    retail_price: "",
    is_limited: false,
    is_discontinued: false,
  };
  const [form, setForm] = useState(emptyForm);

  const selected = slimes.find((s) => s.id === selectedId) ?? null;

  const filtered = slimes.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"
        ? true
        : filter === "active"
          ? !s.is_discontinued
          : filter === "limited"
            ? s.is_limited
            : filter === "discontinued"
              ? s.is_discontinued
              : true;
    // [Track 3a] — narrow by catalog status, independent of the state tabs.
    const matchCatalog =
      catalogFilter === "all"
        ? true
        : catalogFilter === "official"
          ? s.is_brand_official === true
          : s.is_brand_official === false;
    return matchSearch && matchFilter && matchCatalog;
  });

  // [Track 3a] — approve a community-added row. Optimistic flip on
  // success; inline red banner on failure (surfaces the action's error).
  const handleApprove = (slime: Slime) => {
    if (slime.is_brand_official) return;
    setApproveError(null);
    startApprove(async () => {
      const res = await approveSlimeAsOfficial(slime.id);
      if (!res.ok) {
        setApproveError(res.error);
        return;
      }
      setSlimes((prev) =>
        prev.map((s) =>
          s.id === slime.id ? { ...s, is_brand_official: true } : s,
        ),
      );
    });
  };

  const startAdd = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setColors([]);
    setColorInput("");
    setError(null);
    setMode("add");
  };

  // [Change 4] — startEdit sets base_type
  const startEdit = (slime: Slime) => {
    setForm({
      name: slime.name,
      base_type: slime.base_type,
      description: slime.description ?? "",
      scent: slime.scent ?? "",
      retail_price: slime.retail_price?.toString() ?? "",
      is_limited: slime.is_limited,
      is_discontinued: slime.is_discontinued,
    });
    setColors(slime.colors ?? []);
    setColorInput("");
    setError(null);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Slime name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    // [Change 5] — payload uses base_type
    const payload = {
      name: form.name.trim(),
      base_type: form.base_type,
      description: form.description || null,
      colors: colors.length > 0 ? colors : null,
      scent: form.scent || null,
      retail_price: form.retail_price ? parseFloat(form.retail_price) : null,
      is_limited: form.is_limited,
      is_discontinued: form.is_discontinued,
    };
    if (mode === "add") {
      const { data, error: err } = await supabase
        .from("slimes")
        .insert({
          ...payload,
          brand_id: brandId,
          is_brand_official: true,
          created_by: userId,
        })
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data) {
        setSlimes([data as Slime, ...slimes]);
        setSelectedId(data.id);
        setMode("detail");
      }
    } else if (mode === "edit" && selectedId) {
      const { data, error: err } = await supabase
        .from("slimes")
        .update(payload)
        .eq("id", selectedId)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      if (data) {
        setSlimes(
          slimes.map((s) => (s.id === selectedId ? (data as Slime) : s)),
        );
        setMode("detail");
      }
    }
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "limited", label: "Limited" },
    { key: "discontinued", label: "Discontinued" },
  ];

  // [Track 3a] — catalog-status chips.
  const catalogTabs: { key: CatalogFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "official", label: "Official" },
    { key: "community", label: "Community" },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden flex"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(150,110,240,0.18)",
        height: "calc(100vh - 200px)",
        minHeight: "520px",
      }}
    >
      {/* ── Left Panel: List ── */}
      <div
        className="flex flex-col flex-shrink-0 w-full md:w-80"
        style={{ borderRight: "1px solid rgba(150,110,240,0.14)" }}
      >
        {/* Search */}
        <div
          className="p-3"
          style={{ borderBottom: "1px solid rgba(150,110,240,0.14)" }}
        >
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: "#6b6180" }}
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M10.5 10.5L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slimes..."
              className="w-full pl-9 pr-3 py-3 text-sm rounded-xl outline-none text-white placeholder:text-[#6b6180]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(150,110,240,0.24)",
                fontFamily: "Inter, sans-serif",
              }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        {/* [Change 10] — type="button" on all filter tab buttons */}
        <div
          className="flex overflow-x-auto scrollbar-none px-3 py-2 gap-1.5"
          style={{ borderBottom: "1px solid rgba(150,110,240,0.14)" }}
        >
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background:
                  filter === tab.key
                    ? "rgba(255,43,214,0.12)"
                    : "rgba(255,255,255,0.03)",
                color: filter === tab.key ? "#ff2bd6" : "#8f83b0",
                border:
                  filter === tab.key
                    ? "1px solid rgba(255,43,214,0.35)"
                    : "1px solid rgba(150,110,240,0.14)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* [Track 3a] Catalog-status filter — All / Official / Community.
            Independent of the state tabs above; lets an owner review the
            community-added rows that Track 1b auto-creates. */}
        <div
          className="flex overflow-x-auto scrollbar-none px-3 py-2 gap-1.5"
          style={{ borderBottom: "1px solid rgba(150,110,240,0.14)" }}
        >
          {catalogTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCatalogFilter(tab.key)}
              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background:
                  catalogFilter === tab.key
                    ? "rgba(255,43,214,0.12)"
                    : "rgba(255,255,255,0.03)",
                color: catalogFilter === tab.key ? "#ff2bd6" : "#8f83b0",
                border:
                  catalogFilter === tab.key
                    ? "1px solid rgba(255,43,214,0.35)"
                    : "1px solid rgba(150,110,240,0.14)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Slime list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center">
              <p
                className="text-sm"
                style={{
                  color: "#8f83b0",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                No slimes found
              </p>
            </div>
          ) : (
            filtered.map((slime) => {
              const isSel = selectedId === slime.id;
              return (
                // [Change 10] — type="button" on list item buttons
                <button
                  key={slime.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(slime.id);
                    setMode("detail");
                    setApproveError(null);
                  }}
                  className="w-full text-left rounded-[14px] px-4 py-3 transition-all"
                  style={{
                    background: isSel
                      ? "linear-gradient(90deg, rgba(255,43,214,0.10), rgba(255,43,214,0.02))"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${
                      isSel ? "rgba(255,43,214,0.35)" : "rgba(150,110,240,0.14)"
                    }`,
                    borderLeft: `3px solid ${isSel ? "#ff2bd6" : "transparent"}`,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="text-base font-black text-white truncate"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {slime.name}
                      </p>
                      {/* [Change 6] — use SLIME_BASE_TYPE_LABELS */}
                      <p
                        className="text-xs mt-0.5"
                        style={{
                          color: "#8f83b0",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {SLIME_BASE_TYPE_LABELS[slime.base_type] ??
                          slime.base_type}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {/* [Track 3a] — catalog-status pill on every row.
                            OFFICIAL = magenta (matches LIMITED family),
                            COMMUNITY = muted violet. */}
                        {slime.is_brand_official ? (
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-[5px] tracking-widest"
                            style={{
                              color: "#ff2bd6",
                              border: "1px solid rgba(255,43,214,0.5)",
                            }}
                          >
                            OFFICIAL
                          </span>
                        ) : (
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-[5px] tracking-widest"
                            style={{
                              color: "#8f83b0",
                              border: "1px solid rgba(150,110,240,0.3)",
                            }}
                          >
                            COMMUNITY
                          </span>
                        )}
                        {slime.is_limited && (
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-[5px] tracking-widest"
                            style={{
                              color: "#FFD24A",
                              border: "1px solid rgba(255,210,74,0.5)",
                              backgroundColor: "rgba(255,210,74,0.10)",
                            }}
                          >
                            LIMITED
                          </span>
                        )}
                        {slime.is_discontinued && (
                          <span
                            className="text-[9px] font-black px-2 py-0.5 rounded-[5px] tracking-widest"
                            style={{
                              color: "#8f83b0",
                              border: "1px solid rgba(150,110,240,0.3)",
                            }}
                          >
                            DISC
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="flex-none text-[11px] font-bold"
                      style={{
                        color: "#6b6180",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {slime.total_ratings ?? 0} rated
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Add button */}
        {/* [Change 10] — type="button" */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(150,110,240,0.14)" }}
        >
          <button
            type="button"
            onClick={startAdd}
            className="w-full py-3 rounded-xl text-sm font-black text-white transition-opacity hover:opacity-90"
            style={{
              background: MAGENTA_GRADIENT,
              boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            + Add Slime
          </button>
        </div>
      </div>

      {/* ── Mobile sheet overlay ──
          2026-07-09: switched from a bottom-anchored sheet
          (alignItems: flex-end + absolute bottom-0) to a viewport-
          centered fixed modal. Matches the report + delete modal
          pattern from earlier today's UX pass. The old bottom-sheet
          layout felt cramped with too much of the parent list
          peeking through the top; centering fills the visual weight
          properly and keeps things consistent across the app.
          Full-screen edit form is queued as a pre-launch polish
          item (Option C in the design conversation). */}
      {(mode === "detail" || mode === "add" || mode === "edit") && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(10,10,10,0.8)", padding: 16 }}
          onClick={() => setMode("empty")}
        >
          <div
            className="rounded-2xl overflow-y-auto w-full"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#0d0817",
              border: "1px solid rgba(150,110,240,0.2)",
              maxWidth: 480,
              maxHeight: "calc(100dvh - 32px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            {/* Handle + close */}
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3"
              style={{
                background: "#0d0817",
                borderBottom: "1px solid rgba(150,110,240,0.14)",
              }}
            >
              {/* 2026-07-09: drag handle removed — no longer a bottom
                  sheet (now viewport-centered), so the swipe-to-dismiss
                  affordance would be misleading. */}
              <p
                className="text-sm font-bold text-white mt-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {mode === "add"
                  ? "Add Slime"
                  : mode === "edit"
                    ? "Edit Slime"
                    : selected?.name}
              </p>
              {/* [Change 10] — type="button" on mobile close */}
              <button
                type="button"
                onClick={() => setMode("empty")}
                className="mt-2 p-1.5 rounded-lg"
                style={{
                  color: "#8f83b0",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1l12 12M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 pb-10">
              {mode === "detail" && selected && (
                <div className="space-y-5">
                  {/* [Track 3a] — Approve banner for community-added rows. */}
                  {selected.is_brand_official === false && (
                    <div
                      className="rounded-2xl p-4"
                      style={{
                        background: "rgba(255,43,214,0.06)",
                        border: "1px solid rgba(255,43,214,0.25)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleApprove(selected)}
                        disabled={approving}
                        className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                        style={{
                          background: MAGENTA_GRADIENT,
                          boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                          fontFamily: "Montserrat, sans-serif",
                        }}
                      >
                        {approving ? "Approving..." : "Approve → Official"}
                      </button>
                      <p
                        className="text-xs mt-2.5"
                        style={{
                          color: "#8f83b0",
                          fontFamily: "Inter, sans-serif",
                          lineHeight: 1.5,
                        }}
                      >
                        Community-added slime. Approving marks it as an official
                        catalog entry and lets you edit it going forward.
                      </p>
                      {approveError && (
                        <p
                          className="text-xs mt-2 text-red-400"
                          style={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {approveError}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label: "Overall",
                        value: selected.avg_overall?.toFixed(1) ?? "—",
                        accent: "#34e89e",
                      },
                      {
                        label: "Ratings",
                        value: selected.total_ratings?.toLocaleString() ?? "0",
                        accent: "#fff",
                      },
                      {
                        label: "Price",
                        value: selected.retail_price
                          ? `$${selected.retail_price}`
                          : "—",
                        accent: "rgba(245,245,245,0.5)",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl p-3 text-center"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(150,110,240,0.14)",
                        }}
                      >
                        <p
                          className="text-[10px] mb-1"
                          style={{
                            color: "#8f83b0",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {s.label}
                        </p>
                        <p
                          className="text-base font-bold"
                          style={{
                            color: s.accent,
                            fontFamily: "Montserrat, sans-serif",
                          }}
                        >
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {selected.description && (
                    <p
                      className="text-sm"
                      style={{
                        color: "rgba(245,245,245,0.6)",
                        fontFamily: "Inter, sans-serif",
                        lineHeight: 1.6,
                      }}
                    >
                      {selected.description}
                    </p>
                  )}
                  <div className="space-y-2.5">
                    {DIMENSIONS.map((d) => (
                      <RatingBar
                        key={d.key}
                        label={d.label}
                        value={
                          (
                            selected as unknown as Record<string, number | null>
                          )[d.key] ?? null
                        }
                      />
                    ))}
                  </div>
                  {/* [Change 10] — type="button" on mobile Edit button */}
                  <button
                    type="button"
                    onClick={() => startEdit(selected)}
                    className="w-full py-3 rounded-xl text-sm font-black text-white"
                    style={{
                      background: MAGENTA_GRADIENT,
                      boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    Edit Slime
                  </button>
                </div>
              )}

              {(mode === "add" || mode === "edit") && (
                <div className="space-y-4">
                  <FormInput label="Slime Name" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="e.g. Midnight Butter"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormInput>
                  {/* [Change 7] — mobile select uses SLIME_BASE_TYPE_LABELS */}
                  <FormInput label="Type">
                    <select
                      value={form.base_type}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          base_type: e.target.value as SlimeBaseType,
                        })
                      }
                      className={inputClass}
                      style={{ ...inputStyle, appearance: "none" as const }}
                    >
                      {Object.entries(SLIME_BASE_TYPE_LABELS).map(
                        ([value, label]) => (
                          <option
                            key={value}
                            value={value}
                            style={{ background: "#0F0A1A" }}
                          >
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </FormInput>
                  <FormInput label="Description">
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={3}
                      className={`${inputClass} resize-none`}
                      style={inputStyle}
                      placeholder="Describe this slime..."
                    />
                  </FormInput>
                  <FormInput label="Scent">
                    <input
                      type="text"
                      value={form.scent}
                      onChange={(e) =>
                        setForm({ ...form, scent: e.target.value })
                      }
                      placeholder="vanilla..."
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormInput>
                  <FormInput label="Retail Price (USD)">
                    <input
                      type="number"
                      value={form.retail_price}
                      onChange={(e) =>
                        setForm({ ...form, retail_price: e.target.value })
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </FormInput>
                  <div className="flex gap-4">
                    {[
                      { key: "is_limited", label: "Limited" },
                      { key: "is_discontinued", label: "Discontinued" },
                    ].map((tog) => (
                      <label
                        key={tog.key}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        {/* [Change 10] — type="button" on mobile toggles */}
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              [tog.key]: !(form as Record<string, unknown>)[
                                tog.key
                              ],
                            })
                          }
                          className="w-9 h-5 rounded-full relative transition-all"
                          style={{
                            background: (form as Record<string, unknown>)[
                              tog.key
                            ]
                              ? "#ff2bd6"
                              : "rgba(255,255,255,0.12)",
                          }}
                          aria-pressed={
                            !!(form as Record<string, unknown>)[tog.key]
                          }
                          aria-label={`Toggle ${tog.label}`}
                        >
                          <span
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                            style={{
                              left: (form as Record<string, unknown>)[tog.key]
                                ? "18px"
                                : "2px",
                            }}
                          />
                        </button>
                        <span
                          className="text-sm"
                          style={{
                            color: "rgba(245,245,245,0.6)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {tog.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {error && <p className="text-xs text-red-400">{error}</p>}
                  {/* [Change 10] — type="button" on mobile save */}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                    style={{
                      background: MAGENTA_GRADIENT,
                      boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : mode === "add"
                        ? "Add to Catalog"
                        : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Right Panel ── */}
      <div className="hidden md:flex flex-1 flex-col overflow-y-auto">
        {mode === "empty" && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: "rgba(150,110,240,0.1)",
                  border: "1px solid rgba(150,110,240,0.2)",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ color: "#6b6180" }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p
                className="text-sm"
                style={{
                  color: "#8f83b0",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Select a slime to view details or add a new one
              </p>
            </div>
          </div>
        )}

        {mode === "detail" && selected && (
          <div className="p-6">
            {/* [Track 3a] — Approve banner shows only for community-added
                (unofficial) rows. Approving promotes the row to official. */}
            {selected.is_brand_official === false && (
              <div
                className="mb-6 rounded-2xl p-4"
                style={{
                  background: "rgba(255,43,214,0.06)",
                  border: "1px solid rgba(255,43,214,0.25)",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleApprove(selected)}
                  disabled={approving}
                  className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                  style={{
                    background: MAGENTA_GRADIENT,
                    boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  {approving ? "Approving..." : "Approve → Official"}
                </button>
                <p
                  className="text-xs mt-2.5"
                  style={{
                    color: "#8f83b0",
                    fontFamily: "Inter, sans-serif",
                    lineHeight: 1.5,
                  }}
                >
                  Community-added slime. Approving marks it as an official
                  catalog entry and lets you edit it going forward.
                </p>
                {approveError && (
                  <p
                    className="text-xs mt-2 text-red-400"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {approveError}
                  </p>
                )}
              </div>
            )}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2
                  className="text-xl font-bold text-white"
                  style={{ fontFamily: "Montserrat, sans-serif" }}
                >
                  {selected.name}
                </h2>
                {/* [Change 6] — use SLIME_BASE_TYPE_LABELS in detail panel */}
                <p
                  className="text-sm mt-1"
                  style={{
                    color: "#8f83b0",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  {SLIME_BASE_TYPE_LABELS[selected.base_type] ??
                    selected.base_type}
                  {selected.retail_price && ` · $${selected.retail_price}`}
                </p>
              </div>
              {/* [Change 10] — type="button" on desktop Edit button */}
              <button
                type="button"
                onClick={() => startEdit(selected)}
                className="px-4 py-2 rounded-full text-xs font-black transition-all"
                style={{
                  background: "rgba(255,43,214,0.08)",
                  border: "1px solid rgba(255,43,214,0.25)",
                  color: "#ff2bd6",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Edit
              </button>
            </div>

            {selected.description && (
              <p
                className="text-sm mb-6"
                style={{
                  color: "rgba(245,245,245,0.6)",
                  fontFamily: "Inter, sans-serif",
                  lineHeight: 1.6,
                }}
              >
                {selected.description}
              </p>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                {
                  label: "Overall",
                  value: selected.avg_overall?.toFixed(1) ?? "—",
                  accent: "#34e89e",
                },
                {
                  label: "Total Ratings",
                  value: selected.total_ratings?.toLocaleString() ?? "0",
                  accent: "#fff",
                },
                {
                  label: "Price",
                  value: selected.retail_price
                    ? `$${selected.retail_price}`
                    : "—",
                  accent: "rgba(245,245,245,0.5)",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3 text-center"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(150,110,240,0.14)",
                  }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{
                      color: "#8f83b0",
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {s.label}
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color: s.accent,
                      fontFamily: "Montserrat, sans-serif",
                    }}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Rating dimensions */}
            <div className="mb-6 space-y-3">
              <p
                className="text-xs font-bold uppercase tracking-widest"
                style={{
                  color: "#22d3ee",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Rating Breakdown
              </p>
              {DIMENSIONS.map((d) => (
                <RatingBar
                  key={d.key}
                  label={d.label}
                  value={
                    (selected as unknown as Record<string, number | null>)[
                      d.key
                    ] ?? null
                  }
                />
              ))}
            </div>

            {/* Colors & Scent */}
            {(selected.colors?.length || selected.scent) && (
              <div className="space-y-3">
                {selected.colors && selected.colors.length > 0 && (
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{
                        color: "#22d3ee",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Colors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.colors.map((c) => (
                        <span
                          key={c}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            background: "rgba(150,110,240,0.14)",
                            color: "#cdbdf2",
                            border: "1px solid rgba(150,110,240,0.3)",
                            fontFamily: "Inter, sans-serif",
                          }}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selected.scent && (
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-1"
                      style={{
                        color: "#22d3ee",
                        fontFamily: "Montserrat, sans-serif",
                      }}
                    >
                      Scent
                    </p>
                    <p
                      className="text-sm"
                      style={{
                        color: "rgba(245,245,245,0.6)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {selected.scent}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {(mode === "add" || mode === "edit") && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-xl font-bold text-white"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                {mode === "add" ? "Add New Slime" : "Edit Slime"}
              </h2>
              {/* [Change 10] — type="button" on Cancel */}
              <button
                type="button"
                onClick={() => setMode(selectedId ? "detail" : "empty")}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  color: "#8f83b0",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(150,110,240,0.18)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                Cancel
              </button>
            </div>

            <div className="space-y-5 max-w-xl">
              {/* [T137 Batch 2a] Soft-violet field-group card — Basics */}
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(150,110,240,0.18)",
                }}
              >
                <p
                  className="text-xs font-black uppercase tracking-widest mb-1"
                  style={{
                    color: "#22d3ee",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Basics
                </p>
              <FormInput label="Slime Name" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Midnight Butter"
                  className={inputClass}
                  style={inputStyle}
                />
              </FormInput>

              {/* [Change 7] — desktop select uses SLIME_BASE_TYPE_LABELS */}
              <FormInput label="Type">
                <select
                  value={form.base_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      base_type: e.target.value as SlimeBaseType,
                    })
                  }
                  className={inputClass}
                  style={{ ...inputStyle, appearance: "none" as const }}
                >
                  {Object.entries(SLIME_BASE_TYPE_LABELS).map(
                    ([value, label]) => (
                      <option
                        key={value}
                        value={value}
                        style={{ background: "#0F0A1A" }}
                      >
                        {label}
                      </option>
                    ),
                  )}
                </select>
              </FormInput>

              <FormInput label="Description">
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                  placeholder="Describe this slime..."
                />
              </FormInput>
              </div>

              {/* [T137 Batch 2a] Soft-violet field-group card — Catalog details */}
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(150,110,240,0.18)",
                }}
              >
                <p
                  className="text-xs font-black uppercase tracking-widest mb-1"
                  style={{
                    color: "#22d3ee",
                    fontFamily: "Montserrat, sans-serif",
                  }}
                >
                  Catalog details
                </p>
              <FormInput label="Colors (Enter to add)">
                <input
                  type="text"
                  value={colorInput}
                  onChange={(e) => setColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && colorInput.trim()) {
                      e.preventDefault();
                      if (!colors.includes(colorInput.trim()))
                        setColors([...colors, colorInput.trim()]);
                      setColorInput("");
                    }
                  }}
                  placeholder="pink, lavender..."
                  className={inputClass}
                  style={inputStyle}
                />
                {colors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {colors.map((c) => (
                      <span
                        key={c}
                        className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5"
                        style={{
                          background: "rgba(150,110,240,0.14)",
                          color: "#cdbdf2",
                          border: "1px solid rgba(150,110,240,0.3)",
                          fontFamily: "Inter, sans-serif",
                        }}
                      >
                        {c}
                        {/* [Change 9] — × replaced with SVG; type="button" added */}
                        <button
                          type="button"
                          onClick={() =>
                            setColors(colors.filter((x) => x !== c))
                          }
                          className="opacity-60 hover:opacity-100 leading-none"
                          aria-label={`Remove ${c}`}
                        >
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="none"
                          >
                            <path
                              d="M8 2L2 8M2 2l6 6"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormInput>

              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Scent">
                  <input
                    type="text"
                    value={form.scent}
                    onChange={(e) =>
                      setForm({ ...form, scent: e.target.value })
                    }
                    placeholder="vanilla..."
                    className={inputClass}
                    style={inputStyle}
                  />
                </FormInput>
                <FormInput label="Retail Price (USD)">
                  <input
                    type="number"
                    value={form.retail_price}
                    onChange={(e) =>
                      setForm({ ...form, retail_price: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={inputClass}
                    style={inputStyle}
                  />
                </FormInput>
              </div>

              <div className="flex gap-6">
                {[
                  { key: "is_limited", label: "Limited Edition" },
                  { key: "is_discontinued", label: "Discontinued" },
                ].map((tog) => (
                  <label
                    key={tog.key}
                    className="flex items-center gap-2.5 cursor-pointer"
                  >
                    {/* [Change 10] — type="button" on desktop toggles */}
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          [tog.key]: !(form as Record<string, unknown>)[
                            tog.key
                          ],
                        })
                      }
                      className="w-9 h-5 rounded-full relative transition-all"
                      style={{
                        background: (form as Record<string, unknown>)[tog.key]
                          ? "#ff2bd6"
                          : "rgba(255,255,255,0.12)",
                      }}
                      aria-pressed={
                        !!(form as Record<string, unknown>)[tog.key]
                      }
                      aria-label={`Toggle ${tog.label}`}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{
                          left: (form as Record<string, unknown>)[tog.key]
                            ? "18px"
                            : "2px",
                        }}
                      />
                    </button>
                    <span
                      className="text-sm"
                      style={{
                        color: "rgba(245,245,245,0.6)",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {tog.label}
                    </span>
                  </label>
                ))}
              </div>
              </div>

              {error && (
                <p
                  className="text-xs text-red-400"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {error}
                </p>
              )}

              {/* [Change 10] — type="button" on desktop save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{
                  background: MAGENTA_GRADIENT,
                  boxShadow: "0 8px 24px -6px rgba(255,43,214,0.5)",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {saving
                  ? "Saving..."
                  : mode === "add"
                    ? "Add to Catalog"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
